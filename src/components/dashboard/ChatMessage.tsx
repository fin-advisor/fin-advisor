
"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { format } from 'date-fns';
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

export default function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  const getTimestamp = () => {
    if (!message.timestamp) return '';
    const date = (message.timestamp as any).toDate ? (message.timestamp as any).toDate() : message.timestamp;
    try {
        return format(date, 'p');
    } catch (e) {
        return '';
    }
  }

  return (
    <div className={cn("flex items-start gap-3 my-4", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
            <Avatar className="h-10 w-10 flex-shrink-0">
                <div className="flex h-full w-full items-center justify-center rounded-full">
                    <GeminiStarIcon className="h-7 w-7" />
                </div>
            </Avatar>
        )}
        <div className={cn("w-full max-w-2xl flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            <div className={cn(
                "p-3 rounded-2xl prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1 max-w-none",
                isUser 
                ? "gemini-gradient-button text-primary-foreground" 
                : "bg-secondary"
            )}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
             <p className="text-xs text-muted-foreground px-2">{getTimestamp()}</p>
        </div>
         {isUser && (
            <Avatar className="h-8 w-8 flex-shrink-0">
                 <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User size={20} />
                </div>
            </Avatar>
        )}
    </div>
  );
}
