'use server';
/**
 * @fileOverview Generates a chat title from the user's first prompt.
 *
 * - generateChatTitle - A function that generates a chat title.
 * - GenerateChatTitleInput - The input type for the generateChatTitle function.
 * - GenerateChatTitleOutput - The return type for the generateChatTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  prompt: z.string().describe('The user’s initial prompt.'),
  language: z.string().describe('The language for the title.'),
});
export type GenerateChatTitleInput = z.infer<
  typeof GenerateChatTitleInputSchema
>;

const GenerateChatTitleOutputSchema = z.object({
  title: z
    .string()
    .describe('A short, descriptive title for the chat (max 5 words).'),
});
export type GenerateChatTitleOutput = z.infer<
  typeof GenerateChatTitleOutputSchema
>;

export async function generateChatTitle(
  input: GenerateChatTitleInput
): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Generate a short, descriptive title (maximum 5 words) in {{language}} for a chat that starts with the following user prompt:

"{{prompt}}"`,
});

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
