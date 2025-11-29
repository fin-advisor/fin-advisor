
"use client";

import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, Target, TrendingUp, Zap } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Skeleton } from "../ui/skeleton";
import { Progress } from "../ui/progress";
import GoalProjection from "./GoalProjection";
import { GeminiStarIcon } from "../icons/GeminiStarIcon";

function FinancialCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-background shadow-sm border ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}

export default function FinancialOverviewPanel({ profile }: { profile: UserProfile | null }) {
    const { translations } = useLanguage();

    if (!profile) {
        return (
             <div className="h-full flex flex-col p-4 space-y-4">
                <h2 className="text-lg font-semibold px-2">{translations.financialOverview || "Financial Overview"}</h2>
                <div className="space-y-4 flex-1">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
             </div>
        )
    }

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('de-CH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    const goalAmount = 500000;
    const goalProgress = (profile.startingCapital / goalAmount) * 100;
  
  return (
    <div className="space-y-4 h-full flex flex-col p-4">
        <h2 className="text-lg font-semibold px-2">{translations.financialOverview || "Financial Overview"}</h2>
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            
            <FinancialCard title={"Your Financial Profile"} icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}>
                 <div className="space-y-2">
                    <InfoRow label="Starting Capital" value={formatNumber(profile.startingCapital)} />
                    <InfoRow label="Monthly Income" value={formatNumber(profile.monthlyIncome)} />
                    <InfoRow label="Monthly Savings" value={formatNumber(profile.monthlySavingsAmount)} />
                    <InfoRow label="Age" value={profile.age} />
                 </div>
            </FinancialCard>

            <FinancialCard title={"Risk Profile"} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}>
                 <div className="text-xl font-bold capitalize">{profile.riskTolerance}</div>
                <p className="text-xs text-muted-foreground">You are open to some risk for a balance of safety and growth.</p>
            </FinancialCard>

            <FinancialCard title={"Main Goal"} icon={<Target className="h-4 w-4 text-muted-foreground" />}>
                 <div className="text-xl font-bold capitalize">
                    {profile.financialGoals.join(', ')}
                 </div>
            </FinancialCard>

            <FinancialCard title={"Goal Progress (Retirement)"} icon={<Zap className="h-4 w-4 text-muted-foreground" />}>
                <div className="flex items-center justify-between mb-1">
                     <span className="text-2xl font-bold">{formatNumber(profile.startingCapital)}</span>
                     <span className="text-sm font-medium text-gradient">{goalProgress.toFixed(0)}%</span>
                </div>
                <Progress value={goalProgress} className="h-2" />
                <div className="text-right text-xs text-muted-foreground mt-1">
                    of {formatNumber(goalAmount)}
                </div>
            </FinancialCard>
            
             <FinancialCard title={"AI Insights"} icon={<GeminiStarIcon className="h-5 w-5" />}>
                <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                        <span>∙</span>
                        <span>Your savings rate is consistent.</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span>∙</span>
                        <span>Your risk profile suggests a balanced portfolio.</span>
                    </li>
                     <li className="flex items-center gap-2">
                        <span>∙</span>
                        <span>You are on track to reach your goal.</span>
                    </li>
                </ul>
            </FinancialCard>

            <GoalProjection />

        </div>
    </div>
  );
}
