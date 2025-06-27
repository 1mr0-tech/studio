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

  You will use the provided compliance documents to answer the user's question accurately and concisely. You will also generate step-by-step instructions on how to implement the compliance measure on GCP, including the GCP services and configurations required, and the corresponding GCP SDK commands.

  Compliance Documents: {{{complianceDocuments}}}
  User Question: {{{userQuestion}}}

  Format your response as follows:

  Answer: [Your answer to the user's question]
  Implementation Steps:
  1. [Step 1]: [GCP SDK Command]
  2. [Step 2]: [GCP SDK Command]
  3. ...

  Important Considerations:

  Assume the user has a basic understanding of GCP.
  Focus on providing practical and actionable guidance.
  Ensure that the GCP SDK commands are accurate and up-to-date.
  If a step cannot be implemented via GCP SDK, explain how to achieve the same result through the GCP Console.`,
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
