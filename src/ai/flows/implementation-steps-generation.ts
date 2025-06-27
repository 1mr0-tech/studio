// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Generates step-by-step instructions for implementing a compliance measure on GCP.
 *
 * - generateImplementationSteps - A function that generates implementation steps for a compliance measure on GCP.
 * - ImplementationStepsInput - The input type for the generateImplementationSteps function.
 * - ImplementationStepsOutput - The return type for the generateImplementationSteps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImplementationStepsInputSchema = z.object({
  complianceDocuments: z.string().describe('The compliance documents.'),
  userQuestion: z.string().describe('The user question about compliance requirements.'),
  answer: z.string().describe('The answer to the user question.'),
});

export type ImplementationStepsInput = z.infer<typeof ImplementationStepsInputSchema>;

const ImplementationStepsOutputSchema = z.object({
  implementationSteps: z.array(
    z.object({
      step: z.string().describe('A step in the implementation process.'),
      gcpSdkCommand: z.string().describe('The GCP SDK command for the step, or instructions to use the GCP Console.'),
    })
  ).describe('The step-by-step implementation instructions.'),
});

export type ImplementationStepsOutput = z.infer<typeof ImplementationStepsOutputSchema>;

export async function generateImplementationSteps(input: ImplementationStepsInput): Promise<ImplementationStepsOutput> {
  return generateImplementationStepsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'implementationStepsPrompt',
  input: {
    schema: ImplementationStepsInputSchema,
  },
  output: {
    schema: ImplementationStepsOutputSchema,
  },
  prompt: `You are an expert in GCP compliance and infrastructure implementation. Based on the provided compliance documents, the user's question, and the answer provided, generate a step-by-step guide on how to implement the compliance measure on GCP. Be as specific as possible, including the GCP services and configurations required. For each step, provide the corresponding GCP SDK commands that the user can run to implement the step. If a step cannot be implemented via GCP SDK, explain how to achieve the same result through the GCP Console.

Compliance Documents: {{{complianceDocuments}}}
User Question: {{{userQuestion}}}
Answer: {{{answer}}}

Format the output as a JSON object with an array of implementation steps. Each step should have a "step" and a "gcpSdkCommand" field.
`,
});

const generateImplementationStepsFlow = ai.defineFlow(
  {
    name: 'generateImplementationStepsFlow',
    inputSchema: ImplementationStepsInputSchema,
    outputSchema: ImplementationStepsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
