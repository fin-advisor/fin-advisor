
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { translations } = useLanguage();

  const authImage = useMemo(() => {
    return PlaceHolderImages.find(p => p.id === 'auth-background');
  }, []);

  const isLoginPage = pathname === '/login';

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <Link href="/" className="flex items-center gap-2 font-semibold text-lg justify-center mb-4">
                <GeminiStarIcon className="h-6 w-6" />
                <span>FinAdvisor</span>
            </Link>
            <h1 className="text-3xl font-bold">
              {isLoginPage ? translations.loginTitle : translations.signUpTitle}
            </h1>
            <p className="text-balance text-muted-foreground">
              {isLoginPage ? translations.loginDescription : translations.signUpDescription}
            </p>
          </div>
          {children}
          <div className="mt-4 text-center text-sm">
            {isLoginPage ? translations.loginNoAccount : translations.signUpHaveAccount}{" "}
            <Link href={isLoginPage ? "/signup" : "/login"} className="underline">
              {isLoginPage ? translations.signUpLink : translations.signInLink}
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:flex items-center justify-center relative">
        {authImage && (
             <Image
                src={authImage.imageUrl}
                alt={authImage.description}
                layout="fill"
                objectFit="cover"
                data-ai-hint={authImage.imageHint}
                className="opacity-20"
            />
        )}
        <Link href="/" className="relative z-10 flex flex-row items-center gap-4 text-foreground hover:text-foreground/80 transition-colors">
          <GeminiStarIcon className="w-20 h-20" />
          <h1 className="text-6xl font-bold tracking-tight">FinAdvisor</h1>
        </Link>
      </div>
    </div>
  );
}
