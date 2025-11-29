import type { Timestamp } from 'firebase/firestore';

export type RiskTolerance = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  userId: string;
  startingCapital: number;
  monthlyIncome: number;
  monthlySavingsAmount: number;
  age: number;
  riskTolerance: RiskTolerance;
  financialGoals: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatThread {
  id: string;
  userId: string;
  name: string;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  userId: string;
  threadId?: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  timestamp: Timestamp | Date;
}
