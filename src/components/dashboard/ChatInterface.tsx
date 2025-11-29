
"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, setDoc, doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import type { UserProfile, ChatMessage as ChatMessageType } from "@/lib/types";
import { generate } from "@/app/actions";
import ChatMessageBubble from "./ChatMessage";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

export default function ChatInterface({ profile, needsOnboarding, onProfileCreate, activeThreadId, onNewThreadCreated }: { profile: UserProfile | null, needsOnboarding: boolean, onProfileCreate: () => void, activeThreadId: string | null, onNewThreadCreated: (threadId: string) => void }) {
  const [inputValue, setInputValue] = useState("");
  const { user } = useUser();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { language, translations } = useLanguage();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onboardingInitiated = useRef(false);
  const [isNewChat, setIsNewChat] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);
  
  useEffect(() => {
    // Reset isNewChat when the activeThreadId changes (i.e., a thread is loaded or created)
    if (activeThreadId) {
      setIsNewChat(false);
    }
  }, [activeThreadId]);


    const handleOnboardingStart = useCallback(async () => {
        if (!user || !firestore || isAiThinking) return;
        
        setIsAiThinking(true);
        
        const newThreadRef = doc(collection(firestore, "users", user.uid, "threads"));
        const newThreadId = newThreadRef.id;

        onNewThreadCreated(newThreadId);

        await setDoc(newThreadRef, {
            userId: user.uid,
            name: "Onboarding Conversation",
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
        });
        
        const response = await generate(null, [], "", language, newThreadId);
        
        if (response && typeof response === 'object' && 'response' in response) {
        const aiMessage: Omit<ChatMessageType, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: response.response,
            userId: user.uid,
            threadId: newThreadId,
        };
        const messagesCollection = collection(firestore, "users", user.uid, "threads", newThreadId, "messages");
        await addDoc(messagesCollection, { ...aiMessage, timestamp: serverTimestamp() });
        }
        setIsAiThinking(false);
  }, [user, firestore, isAiThinking, language, onNewThreadCreated]);

  useEffect(() => {
    if (!user || !firestore) {
      setMessages([]);
      return;
    };
    
    if (needsOnboarding && !activeThreadId && !onboardingInitiated.current) {
        onboardingInitiated.current = true;
        handleOnboardingStart();
    }
    
    if (!activeThreadId) {
        if (!isNewChat) { // Don't clear messages if we are in the middle of creating a new chat
          setMessages([]);
        }
        return;
    }

    const messagesQuery = query(collection(firestore, "users", user.uid, "threads", activeThreadId, "messages"), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ChatMessageType);
      setMessages(history);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [user, firestore, activeThreadId, needsOnboarding, handleOnboardingStart, isNewChat]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !inputValue.trim() || isAiThinking) return;

    const userMessageContent = inputValue;
    setInputValue("");
    
    let currentThreadId = activeThreadId;
    let isNewThread = false;

    // Handle new chat creation
    if (!currentThreadId) {
      isNewThread = true;
      setIsNewChat(true); // Optimistically hide the welcome screen

      // Optimistically update the UI with the user's message
      const optimisticUserMessage: ChatMessageType = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content: userMessageContent,
        userId: user.uid,
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, optimisticUserMessage]);
      
      const newThreadRef = doc(collection(firestore, "users", user.uid, "threads"));
      await setDoc(newThreadRef, {
          userId: user.uid,
          name: "New Chat",
          createdAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
      });
      currentThreadId = newThreadRef.id;
      onNewThreadCreated(currentThreadId);
    }

    if (!currentThreadId) {
        console.error("No active thread ID to send message to.");
        return;
    }

    const messagesCollectionPath = collection(firestore, "users", user.uid, "threads", currentThreadId, "messages");

    const userMessageForDb = { 
      role: 'user' as const,
      content: userMessageContent,
      userId: user.uid,
      threadId: currentThreadId,
      timestamp: serverTimestamp() 
    };

    if (!isNewThread) {
      await addDoc(messagesCollectionPath, userMessageForDb);
    } else {
      addDoc(messagesCollectionPath, userMessageForDb);
    }

    const threadRef = doc(firestore, "users", user.uid, "threads", currentThreadId);
    updateDoc(threadRef, { lastUpdatedAt: serverTimestamp() });

    setIsAiThinking(true);
    
    const profileForAction = profile ? {
      age: profile.age,
      monthlyIncome: profile.monthlyIncome,
      monthlySavingsAmount: profile.monthlySavingsAmount,
      riskTolerance: profile.riskTolerance,
      financialGoals: profile.financialGoals,
      startingCapital: profile.startingCapital,
    } : null;
    
    const conversationHistory = messages
        .filter(m => !m.id.startsWith('optimistic')) // Exclude optimistic messages from history
        .map(m => ({role: m.role, content: m.content}));
    
    // Manually add the current user message if it's not already in the history from a listener
    if (!conversationHistory.some(m => m.content === userMessageContent && m.role === 'user')) {
        conversationHistory.push({role: 'user', content: userMessageContent});
    }

    const response = await generate(profileForAction, conversationHistory, userMessageContent, language, currentThreadId, isNewThread);
    
    setIsAiThinking(false);

    if (!response) {
      return;
    }

    let responseText: string;
    
    if (typeof response === 'object' && 'isComplete' in response && response.isComplete) {
      responseText = response.response;
      
      const onboardingData = response;
      if (onboardingData.startingCapital && onboardingData.age && onboardingData.monthlyIncome && onboardingData.monthlySavingsAmount && onboardingData.riskTolerance && onboardingData.financialGoals && user) {
        const profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
            startingCapital: onboardingData.startingCapital,
            age: onboardingData.age,
            monthlyIncome: onboardingData.monthlyIncome,
            monthlySavingsAmount: onboardingData.monthlySavingsAmount,
            riskTolerance: onboardingData.riskTolerance,
            financialGoals: onboardingData.financialGoals,
        };
        const docRef = doc(firestore, 'users', user.uid, 'profiles', user.uid);
        await setDoc(docRef, {
          ...profileData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        onProfileCreate();
      }
    } else if (typeof response === 'object' && 'isComplete' in response && !response.isComplete) {
      responseText = response.response;
    } else {
      responseText = response as string;
    }
    
    const aiMessage = {
      role: 'assistant',
      content: responseText,
      userId: user.uid,
      threadId: currentThreadId,
    };
    await addDoc(messagesCollectionPath, { ...aiMessage, timestamp: serverTimestamp() });
  };

  const WelcomeScreen = () => (
     <div className="flex flex-col items-center justify-center h-full">
      <div className="p-8 mb-4">
        <GeminiStarIcon className="w-16 h-16 text-primary" />
      </div>
      <h1 className="text-4xl font-medium text-center">
        {translations.welcome}
      </h1>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-20 md:pt-24">
        <div className="max-w-3xl mx-auto">
          {(!activeThreadId && !needsOnboarding && !isNewChat) && <WelcomeScreen />}

          {messages.map((message) => (
             <ChatMessageBubble key={message.id} message={message} />
          ))}

          {isAiThinking && (
            <div className="flex justify-start items-end gap-3 my-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0">
                <GeminiStarIcon className="h-7 w-7" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>FinAdvisor is thinking</span>
                <span className="thinking-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
            <form 
                onSubmit={handleSubmit}
                className="flex items-end gap-2 p-2 bg-secondary/50 dark:bg-secondary/20 rounded-2xl shadow-sm border"
            >
                <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as unknown as FormEvent);
                        }
                    }}
                    placeholder={translations.placeholder || "Ask something about your finances..."}
                    className="flex-1 resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 max-h-48"
                    rows={1}
                />
                 <Button type="submit" size="icon" disabled={isAiThinking || !inputValue.trim()} className="flex-shrink-0 gemini-gradient-button text-primary-foreground hover:opacity-90">
                    <Send className="h-5 w-5" />
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
}
