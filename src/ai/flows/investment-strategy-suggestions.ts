'use server';

/**
 * @fileOverview Provides investment strategy suggestions based on user risk tolerance.
 *
 * - suggestInvestmentStrategy - A function that suggests an investment strategy.
 * - InvestmentStrategyInput - The input type for the suggestInvestmentStrategy function.
 * - InvestmentStrategyOutput - The return type for the suggestInvestmentStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvestmentStrategyInputSchema = z.object({
  riskTolerance: z
    .enum(['low', 'medium', 'high'])
    .describe('The user’s risk tolerance level (low, medium, or high).'),
});
export type InvestmentStrategyInput = z.infer<typeof InvestmentStrategyInputSchema>;

const InvestmentStrategyOutputSchema = z.object({
  strategy: z
    .string()
    .describe(
      'A high-level ETF/Bond allocation strategy suggestion based on the risk tolerance.'
    ),
});
export type InvestmentStrategyOutput = z.infer<typeof InvestmentStrategyOutputSchema>;

export async function suggestInvestmentStrategy(
  input: InvestmentStrategyInput
): Promise<InvestmentStrategyOutput> {
  return investmentStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'investmentStrategyPrompt',
  input: {schema: InvestmentStrategyInputSchema},
  output: {schema: InvestmentStrategyOutputSchema},
  prompt: `Based on the user's risk tolerance ({{riskTolerance}}), suggest a simple, high-level ETF/Bond allocation strategy.

Low risk tolerance: 20% ETFs / 80% Bonds
Medium risk tolerance: 60% ETFs / 40% Bonds
High risk tolerance: 80% ETFs / 20% Bonds

Respond with a short sentence. No single stocks, no complex derivatives, no detailed tax advice.`, 
});

const investmentStrategyFlow = ai.defineFlow(
  {
    name: 'investmentStrategyFlow',
    inputSchema: InvestmentStrategyInputSchema,
    outputSchema: InvestmentStrategyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
