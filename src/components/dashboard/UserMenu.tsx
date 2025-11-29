
"use client";

import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Languages } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Language } from "@/context/LanguageContext";
import { ThemeToggle } from "./ThemeToggle";

export default function UserMenu() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { translations, language, setLanguage, availableLanguages } = useLanguage();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "?";
    return email.charAt(0).toUpperCase();
  }

  if (!user) return null;

  return (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    <SelectValue placeholder="Language" />
                </div>
            </SelectTrigger>
            <SelectContent>
                {availableLanguages.map(({key, name}) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            <ThemeToggle />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-start gap-3 w-full p-2 h-auto hover:bg-secondary">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{user.email}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">FinAdvisor</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{translations.signOut || "Sign Out"}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
