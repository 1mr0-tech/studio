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
  implementationSteps: z
    .array(
      z.object({
        step: z.string().describe('A step to implement the compliance measure.'),
        gcpSdkCommand: z.string().describe('The GCP SDK command for the step.'),
      })
    )
    .optional()
    .describe('Step-by-step instructions for implementing the compliance measure on GCP.'),
  googleCloudDocUrl: z.string().optional().describe('A relevant Google Cloud documentation URL to learn more.'),
});
export type ComplianceQuestionAnsweringOutput = z.infer<typeof ComplianceQuestionAnsweringOutputSchema>;

export async function complianceQuestionAnswering(input: ComplianceQuestionAnsweringInput): Promise<ComplianceQuestionAnsweringOutput> {
  return complianceQuestionAnsweringFlow(input);
}

const complianceQuestionAnsweringPrompt = ai.definePrompt({
  name: 'complianceQuestionAnsweringPrompt',
  input: {schema: ComplianceQuestionAnsweringInputSchema},
  output: {schema: ComplianceQuestionAnsweringOutputSchema},
  prompt: `You are an expert compliance officer specializing in GCP implementations. Your goal is to provide helpful answers based strictly on the provided compliance documents.

  You MUST follow these steps:
  1. **Analyze**: Carefully read the provided compliance documents to understand their content in relation to the user's question.
  2. **Answer**:
      - If you can find the answer within the documents, provide a clear and concise answer. Then, generate a step-by-step guide for implementing the compliance measure on GCP, including specific services and SDK commands if possible. Also, find a relevant Google Cloud documentation URL.
      - If you cannot find the answer in the documents, your answer MUST be a polite statement explaining that the information is not in the provided text. For example: "I'm sorry, but I was unable to find an answer to your question in the provided document(s)." In this case, you MUST NOT generate implementation steps or a documentation URL.

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
