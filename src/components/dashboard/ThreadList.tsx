
"use client";

import { useState } from 'react';
import { useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import type { ChatThread } from "@/lib/types";
import { collection, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreHorizontal, Trash2, Edit, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

export default function ThreadList({ activeThreadId, onThreadSelect }: { activeThreadId: string | null; onThreadSelect: (threadId: string) => void; }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { translations } = useLanguage();
    const router = useRouter();

    const threadsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'threads'),
            orderBy('lastUpdatedAt', 'desc')
        );
    }, [user, firestore]);

    const { data: threads, isLoading } = useCollection<ChatThread>(threadsQuery);
    
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

    const handleDeleteConfirm = async () => {
        if (!user || !firestore || !threadToDelete) return;
        
        const threadToDeleteId = threadToDelete;
        setThreadToDelete(null);
        await deleteDoc(doc(firestore, "users", user.uid, "threads", threadToDeleteId));
        
        if (activeThreadId === threadToDeleteId) {
            router.push('/');
        }
    };

    const handleRename = async (threadId: string) => {
        const newName = prompt(translations.rename || "Enter new name");
        if (newName && newName.trim() !== '' && user && firestore) {
            await updateDoc(doc(firestore, "users", user.uid, "threads", threadId), { name: newName });
        }
    };

    return (
        <div className="flex-1 overflow-y-auto mt-4 space-y-1">
            <h2 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase my-2">{translations.chatTitle || "Recent"}</h2>
             {isLoading && (
                <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}
            <ul className="space-y-1">
                {threads?.map(thread => (
                    <li key={thread.id}>
                        <div
                            onClick={() => onThreadSelect(thread.id)}
                            className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group",
                                activeThreadId === thread.id 
                                    ? "bg-secondary text-secondary-foreground" 
                                    : "hover:bg-secondary/50"
                            )}
                        >
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 truncate text-sm">{thread.name}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-secondary">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRename(thread.id); }} className="focus:bg-secondary">
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>{translations.rename || "Rename"}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setThreadToDelete(thread.id); }} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>{translations.delete || "Delete"}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </li>
                ))}
            </ul>

            <AlertDialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{translations.clearChatConfirmTitle || "Are you sure?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {translations.clearChatConfirmDescription || "This will permanently delete this chat thread and all of its messages. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{translations.profileCancel || "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            {translations.delete || "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
