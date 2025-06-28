'use server';
/**
 * @fileOverview An AI agent for answering questions using general knowledge.
 *
 * - useImagination - A function that answers user questions using general knowledge.
 * - ImaginationInput - The input type for the useImagination function.
 * - ImaginationOutput - The return type for the useImagination function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ImaginationInputSchema = z.object({
  userQuestion: z.string().describe('The user question to be answered from general knowledge.'),
});
export type ImaginationInput = z.infer<typeof ImaginationInputSchema>;

export const ImaginationOutputSchema = z.object({
  answer: z.string().describe('The imaginative answer to the user question.'),
});
export type ImaginationOutput = z.infer<typeof ImaginationOutputSchema>;

export async function useImagination(input: ImaginationInput): Promise<ImaginationOutput> {
  return useImaginationFlow(input);
}

const useImaginationPrompt = ai.definePrompt({
  name: 'useImaginationPrompt',
  input: {schema: ImaginationInputSchema},
  output: {schema: ImaginationOutputSchema},
  prompt: `You are a helpful AI assistant. Answer the following user question to the best of your ability using your general knowledge. Be creative and comprehensive.

  User Question: {{{userQuestion}}}`,
});

const useImaginationFlow = ai.defineFlow(
  {
    name: 'useImaginationFlow',
    inputSchema: ImaginationInputSchema,
    outputSchema: ImaginationOutputSchema,
  },
  async input => {
    const {output} = await useImaginationPrompt(input);
    return output!;
  }
);
