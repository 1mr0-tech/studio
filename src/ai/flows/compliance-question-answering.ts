'use server';
/**
 * @fileOverview An AI agent for answering questions about compliance requirements based on uploaded documents.
 *
 * - complianceQuestionAnswering - A function that answers user questions about compliance requirements.
 * - ComplianceQuestionAnsweringInput - The input type for the complianceQuestionAnswering function.
 * - ComplianceQuestionAnsweringOutput - The return type for the complianceQuestionAnswering function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComplianceQuestionAnsweringInputSchema = z.object({
  complianceDocuments: z.string().describe('The uploaded compliance documents.'),
  userQuestion: z.string().describe('The user question about compliance requirements.'),
});
export type ComplianceQuestionAnsweringInput = z.infer<typeof ComplianceQuestionAnsweringInputSchema>;

const ComplianceQuestionAnsweringOutputSchema = z.object({
  answer: z.string().describe('The answer to the user question.'),
  implementationSteps: z.array(
    z.object({
      step: z.string().describe('A step to implement the compliance measure.'),
      gcpSdkCommand: z.string().describe('The GCP SDK command for the step.'),
    })
  ).describe('Step-by-step instructions for implementing the compliance measure on GCP.'),
  googleCloudDocUrl: z.string().url().optional().describe('A relevant Google Cloud documentation URL to learn more.'),
});
export type ComplianceQuestionAnsweringOutput = z.infer<typeof ComplianceQuestionAnsweringOutputSchema>;

export async function complianceQuestionAnswering(input: ComplianceQuestionAnsweringInput): Promise<ComplianceQuestionAnsweringOutput> {
  return complianceQuestionAnsweringFlow(input);
}

const complianceQuestionAnsweringPrompt = ai.definePrompt({
  name: 'complianceQuestionAnsweringPrompt',
  input: {schema: ComplianceQuestionAnsweringInputSchema},
  output: {schema: ComplianceQuestionAnsweringOutputSchema},
  prompt: `You are an expert compliance officer specializing in GCP implementations.
  
  Analyze the provided compliance documents and the user's question to perform the following tasks:

  1.  **Answer the Question**: Provide a clear, concise answer to the user's question based strictly on the provided compliance documents.
  2.  **Generate Implementation Steps**: Create a step-by-step guide for implementing the compliance measure on GCP. Include specific GCP services, required configurations, and the corresponding GCP SDK commands. If a step requires the GCP Console, provide those instructions instead.
  3.  **Provide Documentation**: Find a single, highly relevant Google Cloud documentation URL that offers more information on the core topic of the answer.

  Compliance Documents: {{{complianceDocuments}}}
  User Question: {{{userQuestion}}}`,
});

const complianceQuestionAnsweringFlow = ai.defineFlow(
  {
    name: 'complianceQuestionAnsweringFlow',
    inputSchema: ComplianceQuestionAnsweringInputSchema,
    outputSchema: ComplianceQuestionAnsweringOutputSchema,
  },
  async input => {
    const {output} = await complianceQuestionAnsweringPrompt(input);
    return output!;
  }
);
