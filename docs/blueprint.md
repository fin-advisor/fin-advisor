# **App Name**: GenAI Personal Finance Advisor

## Core Features:

- User Authentication: Secure email/password authentication using Firebase Auth to manage user accounts. Only logged-in users can access the onboarding, chat and dashboard. User-specific data is scoped by their Firebase UID.
- Financial Profile Onboarding: Guided wizard that collects the user’s basic financial profile: Monthly income, Monthly savings amount, Age, Risk tolerance (low / medium / high), Main financial goals (e.g. “Eigenkapital für Wohnung”, “Rente”, “Notgroschen”) Data is stored in Firestore in a `profiles` collection.
- AI-Powered Chat (Vertex AI Gemini): Conversational chat interface where users can ask questions in natural language (German or English). The backend uses Vertex AI Gemini as the reasoning engine. The chat request includes user profile + last messages as context. The system prompt clearly defines the AI as a cautious, non-licensed financial coach, not a financial advisor. Every response ends with a short disclaimer like: *“Dies ist keine Anlageberatung im rechtlichen Sinn, sondern allgemeine finanzielle Orientierung.”*
- Real-Time Advice and Suggestions: The AI provides tailored guidance such as: how much to save per month given income and goals, how to prioritize goals (Notgroschen, Schuldenabbau, langfristige Ziele), how risk tolerance affects investment strategy. Recommendations are high-level and product-agnostic (no single stock picks).
- Budgeting Assistance: Generate budget suggestions based on a standard 50/30/20-Regel and adapt it to the user’s situation: 50% für Fixkosten, 30% für variable Ausgaben, 20% für Sparen/Investieren. The backend includes a small helper function to calculate concrete CHF values from the user’s income.
- Personalized Investment Strategies (High-Level): Propose simple, high-level ETF/Bond allocation strategies depending on risk tolerance: Low: 20% ETFs / 80% Anleihen, Medium: 60% ETFs / 40% Anleihen, High: 80% ETFs / 20% Anleihen. No Einzeltitel, keine komplexen Derivate, keine steuerliche Detailberatung.
- Goal Projection Calculator: Offer a savings projection to estimate how long it may take to reach a target amount: Inputs: current savings per month, target amount, assumed annual return (e.g. 3–5% je nach Risiko). Outputs: approximate years to reach the goal. Implemented as a Java helper in the backend and summarized in the AI reply.
- Data Persistence: Use Firestore to persist: user profiles (`profiles` collection), chat messages (`messages` collection, with userId, sender, text, timestamp), optionally goals or settings Queries allow loading the last N messages for context and displaying a chat history in the UI.

## Style Guidelines:

- Primary color: Strong teal (#008080) for trustworthiness and stability.
- Background color: Light teal (#E0F8F8) for a calm, clear and approachable look.
- Accent color: Soft green (#8FBC8F) as a subtle signal for growth, progress and finance-related highlights (e.g. savings progress, positive messages).
- Body and headline font: “Inter”, sans-serif for clarity and a modern, professional feel.
- Headings should be clearly distinguished (font-weight, size) to separate sections like “Profil”, “Budget”, “Ziele”.
- Modern, intuitive layout with a clear separation between: left area (user profile & goals summary, budget overview), right area (chat interface with AI). Use crisp, simple icons for income, savings, goals, risk, and chat to support quick scanning. Card-based components for profile summary, goal projection and budget breakdown.
- Use crisp, simple icons for income, savings, goals, risk, and chat to support quick scanning.
- Gentle animations for: new messages appearing in the chat, profile data updates, loading states (“AI is thinking…”). Animations should be subtle and not distract from content.
- Layout must be responsive (desktop, tablet, mobile). Buttons and inputs should be large enough and have clear contrast. Use accessible color contrast and clear error messages (e.g. invalid income input).