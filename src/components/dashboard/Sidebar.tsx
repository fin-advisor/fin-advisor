
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { Plus } from "lucide-react";
import ThreadList from "./ThreadList";
import UserMenu from "./UserMenu";
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

type SidebarProps = {
    activeThreadId: string | null;
    onThreadSelect: (threadId: string) => void;
    onNewChat: () => void;
    needsOnboarding: boolean;
}

export default function Sidebar({ activeThreadId, onThreadSelect, onNewChat, needsOnboarding }: SidebarProps) {
    const { translations } = useLanguage();

    return (
        <aside className="h-full w-full flex flex-col p-3 bg-card border-r">
            <div className="p-2 flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <GeminiStarIcon className="h-6 w-6" />
                    <span>FinAdvisor</span>
                </div>
            </div>
            
            <Button onClick={onNewChat} disabled={needsOnboarding} className="w-full justify-start gap-2 text-base font-normal h-11 gemini-gradient-button text-primary-foreground hover:opacity-90">
                <Plus className="h-5 w-5" />
                <span>{translations.newChat || "New Chat"}</span>
            </Button>
            
            <ThreadList activeThreadId={activeThreadId} onThreadSelect={onThreadSelect} />
            
            <div className="mt-auto">
                <UserMenu />
            </div>
        </aside>
    );
}
