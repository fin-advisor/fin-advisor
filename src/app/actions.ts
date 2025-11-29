

"use server";

import { ai } from "@/ai/genkit";
import type { RiskTolerance } from "@/lib/types";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";
import { generateChatTitle } from "@/ai/flows/generate-chat-title";
import { doc, updateDoc } from "firebase/firestore";
import { getSdks } from "@/firebase";

// ====================================================================================
// Type Definitions and Schemas
// ====================================================================================

type ActionProfile = {
  age: number;
  monthlyIncome: number;
  monthlySavingsAmount: number;
  riskTolerance: RiskTolerance;
  financialGoals: string[];
  startingCapital: number;
} | null;

const OnboardingResultSchema = z.object({
    isComplete: z.boolean().describe("Whether all onboarding questions have been answered."),
    startingCapital: z.number().optional().describe("The user's starting capital."),
    monthlyIncome: z.number().optional().describe("The user's monthly income."),
    monthlySavingsAmount: z.number().optional().describe("The user's monthly savings amount."),
    age: z.number().optional().describe("The user's age."),
    riskTolerance: z.enum(['low', 'medium', 'high']).optional().describe("The user's risk tolerance."),
    financialGoals: z.array(z.string()).optional().describe("The user's main financial goals."),
    response: z.string().describe("The AI's response to the user."),
});
export type OnboardingResult = z.infer<typeof OnboardingResultSchema>;

const FinancialQueryResponseSchema = z.object({
    isSafe: z.boolean().describe("Whether the model judged the query to be safe and answerable within the strict educational-only guidelines."),
    response: z.string().describe("The compliant, safe, and helpful response to the user. If unsafe, this contains the polite refusal and general educational content."),
});

const OnboardingExtractionSchema = z.object({
    startingCapital: z.number().optional().describe("The user's starting capital."),
    monthlyIncome: z.number().optional().describe("The user's monthly income."),
    monthlySavingsAmount: z.number().optional().describe("The user's monthly savings amount."),
    age: z.number().optional().describe("The user's age."),
    riskTolerance: z.enum(['low', 'medium', 'high']).optional().describe("The user's risk tolerance."),
    financialGoals: z.array(z.string()).optional().describe("The user's main financial goals."),
});

type OnboardingState = z.infer<typeof OnboardingExtractionSchema>;


type MessageMode = "GREETING" | "PROFILE_RECALL" | "UNSAFE_FINANCIAL" | "SAFE_FINANCIAL";

// ====================================================================================
// PDF Reading Utility
// ====================================================================================

async function getDocumentContext(): Promise<string> {
    const documentsDir = path.join(process.cwd(), 'src', 'ai', 'resources');
    try {
        const files = await fs.readdir(documentsDir);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

        if (pdfFiles.length === 0) {
            console.log("No PDF files found in src/ai/resources.");
            return "";
        }

        const allText = [];
        for (const pdfFile of pdfFiles) {
            const pdfPath = path.join(documentsDir, pdfFile);
            const dataBuffer = await fs.readFile(pdfPath);
            const data = await pdf(dataBuffer);
            allText.push(data.text);
        }

        const combinedText = allText.join('\n\n---\n\n');

        if (pdfFiles.length > 10) {
            console.log(`Summarizing ${pdfFiles.length} PDF files...`);
            const summaryPrompt = `Please provide a concise summary of the following content. The content is extracted from multiple financial documents. Focus on the key concepts, principles, and educational takeaways. The summary will be used as a knowledge base for a financial literacy chatbot.

<DOCUMENT_CONTENT>
${combinedText}
</DOCUMENT_CONTENT>

Summarize the key information into a dense, coherent text.`;
            
            const llmResponse = await ai.generate({ prompt: summaryPrompt });
            return `Summary of Internal Knowledge Base:\n${llmResponse.text}`;
        }
        
        return combinedText;
    } catch (error) {
        console.error("Error reading or parsing PDF documents:", error);
        if (error instanceof Error && (error as any).code === 'ENOENT') {
            console.log("src/ai/resources directory not found. Skipping document context.");
            return "";
        }
        return "";
    }
}


// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_
// Main Entry Point
// =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_

export async function generate(
  profile: ActionProfile,
  history: { role: "user" | "assistant"; content: string }[],
  newMessage: string,
  language: string,
  threadId?: string | null,
  isNewThread?: boolean
): Promise<OnboardingResult | string> {
    if (isNewThread && threadId) {
        // Don't await, let it run in the background
        generateChatTitle({ prompt: newMessage, language: language })
            .then(titleResult => {
                const { firestore } = getSdks();
                const { auth } = getSdks();
                if (auth.currentUser) {
                    const threadRef = doc(firestore, "users", auth.currentUser.uid, "threads", threadId);
                    updateDoc(threadRef, { name: titleResult.title });
                }
            })
            .catch(err => console.error("Failed to generate chat title:", err));
    }


    if (!profile) {
        return await handleOnboarding(history, newMessage, language);
    }

    const mode = classifyMessage(newMessage);

    switch (mode) {
        case "GREETING":
            return handleGreeting(language);
        case "PROFILE_RECALL":
            return handleProfileRecall(newMessage, profile, language);
        case "UNSAFE_FINANCIAL":
            // For unsafe messages, we still call the main handler,
            // but the prompt will instruct the AI to decline and explain.
            return handleFinancialQuery(profile, history, newMessage, language, false);
        case "SAFE_FINANCIAL":
            return handleFinancialQuery(profile, history, newMessage, language, true);
    }
}

// ====================================================================================
// Deterministic Message Classification
// ====================================================================================

function classifyMessage(message: string): MessageMode {
    const lowerMessage = message.toLowerCase().trim();

    // 1. Greeting / Small Talk Mode
    const greetingTerms = ['hallo', 'hi', 'hey', 'hello', 'bonjour', 'ciao', 'guten tag', 'moin', 'servus', 'grüezi', 'good morning', 'good afternoon', 'good evening'];
    const identityTerms = ['who are you', 'what are you', 'what is your name', 'wer bist du', 'was bist du', 'bist du echt', 'qui es-tu', 'chi sei', 'are you real'];
    const howAreYouTerms = ['how are you', 'what\'s up', 'wie geht es', 'wie gehts', 'ça va', 'come stai'];
    const casualChatTerms = ['danke', 'thank you', 'thanks', 'merci', 'grazie', 'bitte', 'you\'re welcome'];
    const emojiGreetings = ['👋', '🙂', '😊'];
    if (greetingTerms.some(term => lowerMessage.includes(term)) ||
        identityTerms.some(term => lowerMessage.includes(term)) ||
        howAreYouTerms.some(term => lowerMessage.includes(term)) ||
        casualChatTerms.some(term => lowerMessage.includes(term)) ||
        emojiGreetings.some(emoji => message.includes(emoji))
      ) {
        return "GREETING";
    }

    // 2. Profile Recall Mode
    const recallTriggers = {
        income: ['income', 'einkommen', 'revenu', 'reddito'],
        savings: ['save', 'savings', 'sparen', 'ersparnisse', 'épargne', 'risparmi'],
        age: ['age', 'alt', 'alter', 'âge', 'età'],
        goals: ['goal', 'goals', 'ziel', 'ziele', 'objectif', 'objectifs', 'obiettivo', 'obiettivi'],
        capital: ['capital', 'kapital', 'startkapital', 'capitale'],
        risk: ['risk', 'risiko', 'risque', 'rischio'],
    };

    if (Object.values(recallTriggers).flat().some(term => lowerMessage.includes(term))) {
        const questionStarters = ['what is my', 'how much', 'how old', 'what are my', 'wie hoch ist mein', 'was ist mein', 'wie viel', 'wie alt bin ich', 'was sind meine'];
        if (questionStarters.some(starter => lowerMessage.startsWith(starter))) {
             return "PROFILE_RECALL";
        }
    }


    // 3. Unsafe Mode
    const unsafeTerms = [
        'should i invest', 'what to invest in', 'which stock', 'what etf', 'which crypto', 'welche aktie', 'welchen etf', 'welche krypto',
        'buy now', 'good time to invest', 'best portfolio', 'my portfolio', 'asset allocation', 'jetzt kaufen', 'guter zeitpunkt', 'bestes portfolio', 'mein portfolio',
        'how much in stocks', 'how much in bonds', 'rate of return', 'guarantee', 'forecast', 'wie viel in aktien', 'wie viel in anleihen', 'rendite', 'garantie', 'prognose',
        'devrais-je investir', 'dans quoi investir', 'quelle action', 'quel etf', 'quelle crypto', 'acheter maintenant', 'bon moment pour investir', 'meilleur portefeuille', 'mon portefeuille',
        'répartition d\'actifs', 'combien en actions', 'combien en obligations', 'taux de rendement', 'garantie', 'prévision',
        'dovrei investire', 'in cosa investire', 'quale azione', 'quale etf', 'quale crypto', 'comprare ora', 'buon momento per investire', 'miglior portafoglio', 'il mio portafoglio',
        'allocazione di attivi', 'quanto in azioni', 'quanto in obbligazioni', 'tasso di rendimento', 'garanzia', 'previsione'
    ];

    if (unsafeTerms.some(term => lowerMessage.includes(term))) {
        return "UNSAFE_FINANCIAL";
    }

    // 4. Default to Safe Financial Education
    return "SAFE_FINANCIAL";
}

// ====================================================================================
// Mode-Specific Handlers
// ====================================================================================

function handleGreeting(language: string): string {
    const greetings: Record<string, string> = {
        en: "Hi! I'm FinAdvisor 😊 How can I help you understand something about finance today?",
        de: "Hallo! Ich bin FinAdvisor 😊 Wie kann ich dir heute helfen, etwas über Finanzen zu verstehen?",
        fr: "Bonjour ! Je suis FinAdvisor 😊 Comment puis-je vous aider à comprendre quelque chose sur la finance aujourd'hui ?",
        it: "Ciao! Sono FinAdvisor 😊 Come posso aiutarti a capire qualcosa sulla finanza oggi?",
    };
    return greetings[language] || greetings.en;
}


function handleProfileRecall(message: string, profile: NonNullable<ActionProfile>, language: string): string {
    const lowerMessage = message.toLowerCase();
    const translations: Record<string, any> = {
        en: {
            income: `You've stated your monthly income is ${profile.monthlyIncome.toLocaleString('de-CH')} CHF.`,
            savings: `You've stated you save ${profile.monthlySavingsAmount.toLocaleString('de-CH')} CHF per month.`,
            age: `You've stated your age is ${profile.age}.`,
            goals: `Your main financial goal is: "${profile.financialGoals.join(', ')}".`,
            capital: `You've stated your starting capital is ${profile.startingCapital.toLocaleString('de-CH')} CHF.`,
            risk: `You've stated your risk tolerance is ${profile.riskTolerance}.`,
            notFound: "I couldn't find that specific information in your profile, but feel free to ask me other financial questions!"
        },
        de: {
            income: `Du hast angegeben, dass dein monatliches Einkommen ${profile.monthlyIncome.toLocaleString('de-CH')} CHF beträgt.`,
            savings: `Du hast angegeben, dass du ${profile.monthlySavingsAmount.toLocaleString('de-CH')} CHF pro Monat sparst.`,
            age: `Du hast angegeben, dass dein Alter ${profile.age} ist.`,
            goals: `Dein finanzielles Hauptziel lautet: "${profile.financialGoals.join(', ')}".`,
            capital: `Du hast angegeben, dass dein Startkapital ${profile.startingCapital.toLocaleString('de-CH')} CHF beträgt.`,
            risk: `Du hast angegeben, dass deine Risikobereitschaft ${profile.riskTolerance} ist.`,
            notFound: "Diese spezifische Information konnte ich in deinem Profil nicht finden, aber stelle mir gerne andere finanzielle Fragen!"
        },
         fr: {
            income: `Vous avez déclaré que votre revenu mensuel est de ${profile.monthlyIncome.toLocaleString('de-CH')} CHF.`,
            savings: `Vous avez déclaré que vous épargnez ${profile.monthlySavingsAmount.toLocaleString('de-CH')} CHF par mois.`,
            age: `Vous avez déclaré que votre âge est de ${profile.age}.`,
            goals: `Votre principal objectif financier est : "${profile.financialGoals.join(', ')}".`,
            capital: `Vous avez déclaré que votre capital de départ est de ${profile.startingCapital.toLocaleString('de-CH')} CHF.`,
            risk: `Vous avez déclaré que votre tolérance au risque est ${profile.riskTolerance}.`,
            notFound: "Je n'ai pas trouvé cette information spécifique dans votre profil, mais n'hésitez pas à me poser d'autres questions financières !"
        },
        it: {
            income: `Hai dichiarato che il tuo reddito mensile è di ${profile.monthlyIncome.toLocaleString('de-CH')} CHF.`,
            savings: `Hai dichiarato che risparmi ${profile.monthlySavingsAmount.toLocaleString('de-CH')} CHF al mese.`,
            age: `Hai dichiarato che la tua età è ${profile.age}.`,
            goals: `Il tuo obiettivo finanziario principale è: "${profile.financialGoals.join(', ')}".`,
            capital: `Hai dichiarato che il tuo capitale iniziale è di ${profile.startingCapital.toLocaleString('de-CH')} CHF.`,
            risk: `Hai dichiarato che la tua tolleranza al rischio è ${profile.riskTolerance}.`,
            notFound: "Non sono riuscito a trovare questa informazione specifica nel tuo profilo, ma sentiti libero di farmi altre domande finanziarie!"
        }
    };
    const t = translations[language] || translations.en;

    const recallTriggers = {
        income: ['income', 'einkommen', 'revenu', 'reddito'],
        savings: ['save', 'savings', 'sparen', 'ersparnisse', 'épargne', 'risparmi'],
        age: ['age', 'alt', 'alter', 'âge', 'età'],
        goals: ['goal', 'goals', 'ziel', 'ziele', 'objectif', 'objectifs', 'obiettivo', 'obiettivi'],
        capital: ['capital', 'kapital', 'startkapital', 'capitale'],
        risk: ['risk', 'risiko', 'risque', 'rischio'],
    };

    for (const [key, terms] of Object.entries(recallTriggers)) {
        if (terms.some(term => lowerMessage.includes(term))) {
            return t[key];
        }
    }

    return t.notFound;
}


async function handleFinancialQuery(
    profile: NonNullable<ActionProfile>,
    history: { role: "user" | "assistant"; content: string }[],
    newMessage: string,
    language: string,
    isSafe: boolean,
): Promise<string> {
    const disclaimers: Record<string, string> = {
        en: "This is not investment advice in the legal sense, but general financial orientation.",
        de: "Dies ist keine Anlageberatung im rechtlichen Sinn, sondern allgemeine finanzielle Orientierung.",
        fr: "Ceci n'est pas un conseil en investissement au sens juridique, mais une orientation financière générale.",
        it: "Questa non è una consulenza in materia di investimenti in senso legale, ma un orientamento finanziario generale."
    };

    const documentContext = await getDocumentContext();

    const systemInstruction = `
      ${documentContext ? `You have the following internal knowledge base to answer questions. Use it as your primary source of truth:\n\n<KNOWLEDGE_BASE>\n${documentContext}\n</KNOWLEDGE_BASE>\n\n` : ''}
      You are FinAdvisor, a GenAI financial literacy assistant from the seminar thesis “FinAdvisor” (Puschmann, 2025).
      Your response MUST be in ${language}.

      Your purpose is to provide financial education, not advice.
      You MUST follow these rules:
      - NEVER recommend specific investment actions (buy/sell/hold).
      - NEVER recommend specific products (stocks, ETFs, crypto).
      - NEVER suggest portfolio allocations or strategies.
      - NEVER make financial forecasts or guarantees.
      - You MAY use the user's profile for educational context (e.g., "At your age, long-term planning is relevant") but NOT for advice (e.g., "At your age, you should...").

      The user's query has been pre-classified by the system as ${isSafe ? 'SAFE' : 'UNSAFE'}.

      IF THE QUERY WAS PRE-CLASSIFIED AS UNSAFE:
      1. Your 'isSafe' output field MUST be false.
      2. Politely decline the user's request.
      3. Provide a GENERAL educational explanation about the underlying financial concept (e.g., if asked for a stock, explain diversification).
      4. DO NOT answer the user's direct question.
      5. Your explanation MUST be general and not tailored to the user.

      IF THE QUERY WAS PRE-CLASSIFIED AS SAFE:
      1. Your 'isSafe' output field MUST be true.
      2. Answer the user's question by explaining the financial concept in a general, educational way. If the knowledge base provides relevant information, use it to form your answer.
      3. Structure your response using Markdown for clarity. Use headings (###), bold text, and bullet points to create a well-organized and easy-to-read explanation. For example:
         ### What is Diversification?
         Diversification is a strategy that involves spreading your investments across various financial instruments...
         - **Asset Classes:** Stocks, bonds, real estate.
         - **Geographies:** Investing in different countries.
         - **Sectors:** Spreading investments across technology, healthcare, etc.
         This helps to reduce risk.
      
      For ALL financial queries, do NOT include a disclaimer in your 'response' field. It will be added by the system.

      User Profile for context ONLY:
      - Age: ${profile.age}
      - Starting Capital: ${profile.startingCapital} CHF
      - Monthly Income: ${profile.monthlyIncome} CHF
      - Monthly Savings: ${profile.monthlySavingsAmount} CHF
      - Risk Tolerance: ${profile.riskTolerance}
      - Financial Goals: ${profile.financialGoals.join(", ")}
    `;

    const llmResponse = await ai.generate({
        prompt: [
            { text: systemInstruction },
            ...history.map(h => ({ text: `${h.role}: ${h.content}`})),
            { text: `user: ${newMessage}` },
        ],
        output: { schema: FinancialQueryResponseSchema }
    });

    const output = llmResponse.output;

    if (!output) {
        return "I'm sorry, I'm having trouble responding right now.";
    }

    let finalResponse = output.response;

    // Add disclaimer
    const disclaimer = disclaimers[language] || disclaimers.en;
    finalResponse += `\n\n*${disclaimer}*`;

    return finalResponse;
}

// ====================================================================================
// Onboarding Logic
// ====================================================================================

async function handleOnboarding(
    history: { role: "user" | "assistant"; content: string }[],
    newMessage: string,
    language: string
): Promise<OnboardingResult> {
    const t = (key: string) => getTranslation(key, language);

    const questions = [
        t("ask_starting_capital"),
        t("ask_monthly_income"),
        t("ask_monthly_savings"),
        t("ask_age"),
        t("ask_risk_tolerance"),
        t("ask_financial_goals"),
    ];

    const currentHistory = [...history, { role: 'user' as const, content: newMessage }];
    const assistantMessages = currentHistory.filter(m => m.role === 'assistant');
    const lastQuestion = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : "";
    
    // Find the index of the last question asked by the assistant
    const currentQuestionIndex = questions.findIndex(q => lastQuestion.includes(q.substring(0, 50)));

    // If it's the start of the conversation (no history)
    if (history.length === 0) {
        return { isComplete: false, response: questions[0] };
    }

    const isFinalAnswer = currentQuestionIndex === questions.length - 1;

    // If the user has just answered the last question
    if (isFinalAnswer) {
        const fullConversation = currentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        const extractionPrompt = `From the following conversation, extract the user's financial profile information. If a value is not mentioned, leave it out.
        Conversation:
        ${fullConversation}`;

        try {
            const llmResponse = await ai.generate({ prompt: extractionPrompt, output: { schema: OnboardingExtractionSchema } });
            const extractedData = llmResponse.output;

            if (extractedData && extractedData.startingCapital && extractedData.monthlyIncome && extractedData.monthlySavingsAmount && extractedData.age && extractedData.riskTolerance && extractedData.financialGoals) {
                 return {
                    isComplete: true,
                    response: t("onboarding_complete"),
                    ...extractedData,
                };
            } else {
                 // Not all data could be extracted, ask the last question again or show an error
                return { isComplete: false, response: t("parse_error_final") };
            }
        } catch (e) {
            console.error("Onboarding extraction failed:", e);
            // This can happen due to rate limits or other API issues.
            return { isComplete: false, response: t("api_error") };
        }
    }
    
    // Ask the next question in sequence
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < questions.length) {
        return { isComplete: false, response: questions[nextQuestionIndex] };
    }
    
    // Fallback in case the logic fails to find the next step
    return { isComplete: false, response: t("parse_error") };
}


function getTranslation(key: string, lang: string): string {
  const translations: Record<string, Record<string, string>> = {
    en: {
      ask_starting_capital: "Welcome to **FinAdvisor**! 👋\n\nTo get started, I need to understand your financial situation. Let's begin.\n\nHow much money do you have on the sideline that is ready to invest?",
      ask_monthly_income: "Got it. And what is your current **monthly income**?",
      ask_monthly_savings: "Thanks. How much money do you typically **save each month**?",
      ask_age: "Okay. What is your **current age**?",
      ask_risk_tolerance: "We're almost there. What is your **risk tolerance**?\n\nYou can choose between **low**, **medium**, or **high**.",
      ask_financial_goals: "Last question: what are your main **financial goals**? (e.g., save for retirement, buy a house)",
      onboarding_complete: "Great, thank you! I have everything I need. Your financial profile is now set up. Feel free to ask me anything about your finances.",
      parse_error: "I'm sorry, I didn't quite understand that. Could you please provide the information again?",
      parse_error_final: "I'm sorry, I wasn't able to gather all the required information. Let's try that last question again.",
      api_error: "I'm having trouble connecting to my services right now. Please try again in a moment.",
    },
    de: {
      ask_starting_capital: "Willkommen bei **FinAdvisor**! 👋\n\nUm loszulegen, muss ich Ihre finanzielle Situation verstehen. Fangen wir an.\n\nWie viel Geld haben Sie auf der Seite, das Sie investieren möchten?",
      ask_monthly_income: "Verstanden. Und was ist Ihr aktuelles **monatliches Einkommen**?",
      ask_monthly_savings: "Danke. Wie viel Geld sparen Sie normalerweise **pro Monat**?",
      ask_age: "Okay. Was ist Ihr **aktuelles Alter**?",
      ask_risk_tolerance: "Wir sind fast fertig. Was ist Ihre **Risikobereitschaft**?\n\nSie können zwischen **niedrig**, **mittel** oder **hoch** wählen.",
      ask_financial_goals: "Letzte Frage: Was sind Ihre wichtigsten **finanziellen Ziele**? (z.B. für den Ruhestand sparen, ein Haus kaufen)",
      onboarding_complete: "Super, vielen Dank! Ich habe alles, was ich brauche. Ihr Finanzprofil ist nun eingerichtet. Sie können mich alles über Ihre Finanzen fragen.",
      parse_error: "Entschuldigung, das habe ich nicht ganz verstanden. Könnten Sie die Informationen bitte noch einmal angeben?",
      parse_error_final: "Entschuldigung, ich konnte nicht alle erforderlichen Informationen sammeln. Versuchen wir die letzte Frage noch einmal.",
      api_error: "Ich habe im Moment Probleme, mich mit meinen Diensten zu verbinden. Bitte versuchen Sie es in einem Moment erneut.",
    },
    fr: {
      ask_starting_capital: "Bienvenue chez **FinAdvisor** ! 👋\n\nPour commencer, j'ai besoin de comprendre votre situation financière. Commençons.\n\nCombien d'argent avez-vous de côté, prêt à être investi ?",
      ask_monthly_income: "Compris. Et quel est votre **revenu mensuel** actuel ?",
      ask_monthly_savings: "Merci. Combien d'argent épargnez-vous généralement **chaque mois** ?",
      ask_age: "D'accord. Quel est votre **âge actuel** ?",
      ask_risk_tolerance: "Nous y sommes presque. Quelle est votre **tolérance au risque** ?\n\nVous pouvez choisir entre **faible**, **moyenne** ou **élevée**.",
      ask_financial_goals: "Dernière question : quels sont vos principaux **objectifs financiers** ? (par ex. épargner pour la retraite, acheter une maison)",
      onboarding_complete: "Parfait, merci ! J'ai tout ce dont j'ai besoin. Votre profil financier est maintenant configuré. N'hésitez pas à me poser des questions sur vos finances.",
      parse_error: "Je suis désolé, je n'ai pas bien compris. Pourriez-vous s'il vous plaît fournir à nouveau l'information ?",
      parse_error_final: "Désolé, je n'ai pas pu rassembler toutes les informations requises. Réessayons cette dernière question.",
      api_error: "J'ai des difficultés à me connecter à mes services en ce moment. Veuillez réessayer dans un instant.",
    },
    it: {
      ask_starting_capital: "Benvenuto in **FinAdvisor**! 👋\n\nPer iniziare, ho bisogno di capire la tua situazione finanziaria. Cominciamo.\n\nQuanti soldi hai da parte pronti per essere investiti?",
      ask_monthly_income: "Capito. E qual è il tuo **reddito mensile** attuale?",
      ask_monthly_savings: "Grazie. Quanti soldi risparmi in genere **ogni mese**?",
      ask_age: "Ok. Qual è la tua **età attuale**?",
      ask_risk_tolerance: "Ci siamo quasi. Qual è la tua **tolleranza al rischio**?\n\nPuoi scegliere tra **bassa**, **media** o **alta**.",
      ask_financial_goals: "Ultima domanda: quali sono i tuoi principali **obiettivi finanziari**? (es. risparmiare per la pensione, comprare una casa)",
      onboarding_complete: "Ottimo, grazie! Ho tutto ciò di cui ho bisogno. Il tuo profilo finanziario è ora impostato. Sentiti libero di chiedermi qualsiasi cosa sulle tue finanze.",
      parse_error: "Mi dispiace, non ho capito bene. Potresti fornire di nuovo l'informazione?",
      parse_error_final: "Mi dispiace, non sono riuscito a raccogliere tutte le informazioni richieste. Riprova con l'ultima domanda.",
      api_error: "Al momento ho problemi di connessione ai miei services. Riprova tra un istante.",
    }
  };
  return translations[lang as keyof typeof translations]?.[key] || translations.en[key];
}

    

    

    

    