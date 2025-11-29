'use server';

/**
 * @fileOverview Generates budget suggestions based on user profile data using the 50/30/20 rule.
 *
 * - generateBudgetSuggestion -  A function that generates budget suggestions.
 * - BudgetSuggestionInput - The input type for the generateBudgetSuggestion function.
 * - BudgetSuggestionOutput - The return type for the generateBudgetSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BudgetSuggestionInputSchema = z.object({
  monthlyIncome: z
    .number()
    .describe("The user's monthly income in CHF.")
});
export type BudgetSuggestionInput = z.infer<typeof BudgetSuggestionInputSchema>;

const BudgetSuggestionOutputSchema = z.object({
  needs: z
    .number()
    .describe('50% of monthly income allocated to needs (e.g., housing, transportation).'),
  wants: z
    .number()
    .describe('30% of monthly income allocated to wants (e.g., entertainment, dining out).'),
  savings: z
    .number()
    .describe('20% of monthly income allocated to savings and debt repayment.'),
  disclaimer: z.string().describe('Disclaimer to be added to the response')
});
export type BudgetSuggestionOutput = z.infer<typeof BudgetSuggestionOutputSchema>;

export async function generateBudgetSuggestion(input: BudgetSuggestionInput): Promise<BudgetSuggestionOutput> {
  return budgetSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'budgetSuggestionPrompt',
  input: {schema: BudgetSuggestionInputSchema},
  output: {schema: BudgetSuggestionOutputSchema},
  prompt: `Based on the user's monthly income of CHF {{{monthlyIncome}}}, suggest a budget based on the 50/30/20 rule.

Needs (50%): CHF {{needs}}
Wants (30%): CHF {{wants}}
Savings/Debt Repayment (20%): CHF {{savings}}
{{{disclaimer}}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const budgetSuggestionFlow = ai.defineFlow(
  {
    name: 'budgetSuggestionFlow',
    inputSchema: BudgetSuggestionInputSchema,
    outputSchema: BudgetSuggestionOutputSchema,
  },
  async input => {
    const monthlyIncome = input.monthlyIncome;
    const needs = monthlyIncome * 0.5;
    const wants = monthlyIncome * 0.3;
    const savings = monthlyIncome * 0.2;

    const disclaimer = 'This is not investment advice in the legal sense, but general financial orientation.';

    const {output} = await prompt({
      monthlyIncome: monthlyIncome,
      needs: needs,
      wants: wants,
      savings: savings,
      disclaimer: disclaimer
    });
    return output!;
  }
);
