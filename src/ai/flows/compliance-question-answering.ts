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
  useImagination: z.boolean().optional().describe('Whether to use imagination for a better answer.'),
});
export type ComplianceQuestionAnsweringInput = z.infer<typeof ComplianceQuestionAnsweringInputSchema>;

const ComplianceQuestionAnsweringOutputSchema = z.object({
  needsImagination: z.boolean().describe('Whether the model suggests using imagination for a better answer.'),
  answer: z.string().describe('The answer to the user question.'),
  implementationSteps: z.array(
    z.object({
      step: z.string().describe('A step to implement the compliance measure.'),
      gcpSdkCommand: z.string().describe('The GCP SDK command for the step.'),
    })
  ).optional().describe('Step-by-step instructions for implementing the compliance measure on GCP.'),
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
  prompt: `You are an expert compliance officer specializing in GCP implementations. You will be acting in one of two modes.

  {{#if useImagination}}
  MODE: General Knowledge
  - Your goal is to provide the most helpful and comprehensive answer possible.
  - Use the provided compliance documents as primary context, but supplement with your general knowledge and expertise about GCP and compliance best practices to answer the user's question.
  - When you use information not explicitly found in the documents, please say so.
  - Based on your combined knowledge, perform the following tasks.
    1. **Answer the Question**: Provide a clear, concise answer to the user's question.
    2. **Generate Implementation Steps**: Create a step-by-step guide for implementing the compliance measure on GCP. Include specific GCP services, required configurations, and the corresponding GCP SDK commands. If a step requires the GCP Console, provide those instructions instead.
    3. **Provide Documentation**: Find a single, highly relevant Google Cloud documentation URL that offers more information on the core topic of the answer.
  - In your final output, you MUST set the 'needsImagination' field to false.
  {{else}}
  MODE: Strict Document Analysis
  - Your primary and ONLY goal is to act as a document analysis engine. Your response MUST be based *strictly and exclusively* on the information contained within the provided compliance documents.
  - You MUST NOT use any external knowledge or make any assumptions. Your entire analysis must be confined to the text provided in the documents.

  Follow these steps precisely:
  1.  **Exhaustive Search**: Meticulously search the entire text of the provided compliance documents to find information relevant to the user's question.
  2.  **Decision & Response**:
      - **If you find relevant information to answer the question**:
        - You MUST set the 'needsImagination' output field to 'false'.
        - Proceed to the "Tasks to perform" section below and generate a full response based ONLY on the document content.
      - **If, AND ONLY IF, after an exhaustive search you are 100% certain that the documents do not contain the information needed to answer the question**:
        - You MUST set the 'needsImagination' output field to 'true'.
        - For the 'answer' field, you MUST respond with the exact phrase: "I am sorry, but I was unable to find an answer in the document(s) provided. Would you like me to try and answer using my own knowledge?".
        - You MUST NOT generate implementation steps or a documentation URL. Do not perform the tasks below.

  Tasks to perform (only if answer is in document):
  1.  **Answer the Question**: Provide a clear, concise answer to the user's question based on the document.
  2.  **Generate Implementation Steps**: Create a step-by-step guide for implementing the compliance measure on GCP, based on the document's guidance. Include specific GCP services, configurations, and corresponding GCP SDK commands mentioned or implied.
  3.  **Provide Documentation**: If the document provides a URL, use it. Otherwise, find a single, highly relevant Google Cloud documentation URL that offers more information on the topic.
  {{/if}}

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
