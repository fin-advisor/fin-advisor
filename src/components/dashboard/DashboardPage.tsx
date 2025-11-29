
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import ChatInterface from "./ChatInterface";
import Sidebar from "./Sidebar";
import { Loader2, PanelRightOpen, PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "../ui/button";
import FinancialOverviewPanel from "./FinancialOverviewPanel";
import { cn } from "@/lib/utils";
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(!isMobile);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(!isMobile);
  
  const activeThreadId = searchParams.get('threadId');

  useEffect(() => {
    setIsLeftSidebarOpen(!isMobile);
    setIsRightSidebarOpen(!isMobile);
  }, [isMobile]);


  const fetchProfile = useCallback(() => {
    if (!user || !firestore) return;
    setProfileLoading(true);
    const profileDocRef = doc(firestore, 'users', user.uid, 'profiles', user.uid);
    getDoc(profileDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile({ ...data, id: docSnap.id });
      } else {
        setProfile(null);
      }
    }).catch(error => {
      console.error("Error fetching user profile:", error);
      setProfile(null);
    }).finally(() => {
      setProfileLoading(false);
    });
  }, [user, firestore]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchProfile();
  }, [user, isUserLoading, router, fetchProfile]);

  const handleThreadSelect = (threadId: string) => {
    router.push(`/?threadId=${threadId}`);
    if (isMobile) setIsLeftSidebarOpen(false);
  };
  
  const handleNewChat = () => {
    router.push('/');
    if (isMobile) setIsLeftSidebarOpen(false);
  };

  if (isUserLoading || profileLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  const needsOnboarding = !profile;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {isMobile ? (
         <Sheet open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen}>
            <SheetContent side="left" className="p-0 w-72 bg-card border-none">
                 <Sidebar activeThreadId={activeThreadId} onThreadSelect={handleThreadSelect} onNewChat={handleNewChat} needsOnboarding={needsOnboarding} />
            </SheetContent>
        </Sheet>
      ) : (
        <aside className={cn("transition-all duration-300 ease-in-out", isLeftSidebarOpen ? "w-[280px]" : "w-0")}>
            {isLeftSidebarOpen && <Sidebar activeThreadId={activeThreadId} onThreadSelect={handleThreadSelect} onNewChat={handleNewChat} needsOnboarding={needsOnboarding} />}
        </aside>
      )}

      <main className="flex-1 flex flex-col transition-all duration-300 ease-in-out relative">
          <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 md:p-4 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} className="hover:bg-secondary">
                    <PanelLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <GeminiStarIcon className="h-6 w-6" />
                    <h1 className="hidden md:block">FinAdvisor</h1>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} className="hover:bg-secondary">
                <PanelRightOpen className="h-5 w-5" />
            </Button>
          </header>
          <ChatInterface 
            profile={profile} 
            needsOnboarding={needsOnboarding}
            onProfileCreate={fetchProfile}
            activeThreadId={activeThreadId}
            onNewThreadCreated={handleThreadSelect}
          />
      </main>

      {isMobile ? (
        <Sheet open={isRightSidebarOpen} onOpenChange={setIsRightSidebarOpen}>
          <SheetContent side="right" className="w-[340px] p-0 bg-secondary/30 border-none">
            <FinancialOverviewPanel profile={profile} />
          </SheetContent>
        </Sheet>
      ) : (
         <aside className={cn("transition-all duration-300 ease-in-out bg-secondary/30", isRightSidebarOpen ? "w-[360px]" : "w-0")}>
            {isRightSidebarOpen && <FinancialOverviewPanel profile={profile} />}
        </aside>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
