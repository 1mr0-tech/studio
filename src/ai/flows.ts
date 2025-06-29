/**
 * @fileOverview This file contains the core Genkit flow definitions for the application.
 * It is imported by the Genkit development server to register the flows and by the
 * Next.js server actions to execute the logic. This file should not contain
 * any Next.js-specific directives like 'use server'.
 */

import {ai} from '@/lib/genkit';
import {
    ComplianceQuestionAnsweringInputSchema,
    ComplianceQuestionAnsweringOutputSchema,
    ImaginationInputSchema,
    ImaginationOutputSchema,
} from '@/ai/types';

// --- Genkit Flow Definitions ---

const complianceQuestionAnsweringPrompt = ai.definePrompt({
    name: 'complianceQuestionAnsweringPrompt',
    input: {schema: ComplianceQuestionAnsweringInputSchema},
    output: {schema: ComplianceQuestionAnsweringOutputSchema},
    prompt: `You are an expert compliance assistant. Your task is to answer user questions based *only* on the provided compliance documents.

Analyze the following compliance documents:
---
{{{complianceDocuments}}}
---

Now, answer this user question: "{{userQuestion}}"

IMPORTANT:
- Base your answer strictly on the information within the provided documents. Format your answers using Markdown.
- **If the user asks for implementation steps** (e.g., "how do I enable X?"), you MUST provide concrete, technical steps in the 'implementation' object. Provide steps for GCP, AWS, and Azure if possible. If no steps are found, leave the 'implementation' object empty.
- **If the answer is not in the documents**, you MUST state that you cannot find the answer in the provided context. In this case, you must set the 'answerFound' field to false, set 'suggestsImagination' to true, and set 'imaginationSuggestion' to a message like "The answer isn't in your documents, but I can try to answer from my general knowledge. Would you like to proceed?". Do not provide an answer in the 'answer' field.
- **If the answer IS in the documents**, provide it in the 'answer' field and set 'answerFound' to true.
- If you find a relevant official Google Cloud documentation link while answering, include it in the 'googleCloudDocUrl' field.
- Structure your entire response according to the output schema.
`,
});

export const complianceQuestionAnsweringFlow = ai.defineFlow(
    {
        name: 'complianceQuestionAnsweringFlow',
        inputSchema: ComplianceQuestionAnsweringInputSchema,
        outputSchema: ComplianceQuestionAnsweringOutputSchema,
    },
    async (input) => {
        const {output} = await complianceQuestionAnsweringPrompt(input);
        return output!;
    }
);

const imaginationPrompt = ai.definePrompt({
  name: 'imaginationPrompt',
  input: { schema: ImaginationInputSchema },
  output: { schema: ImaginationOutputSchema },
  prompt: `You are a helpful and creative assistant with access to the internet. Your task is to answer the user's question based on the full context provided.

You have access to three sources of information:
1. Your general knowledge and access to the internet.
2. The history of the current conversation.
3. A set of compliance documents provided by the user.

Use all available context to formulate a comprehensive and relevant response. Format your answers using Markdown.

{{#if chatHistory}}
CONVERSATION HISTORY:
---
{{{chatHistory}}}
---
{{/if}}

{{#if complianceDocuments}}
COMPLIANCE DOCUMENTS:
---
{{{complianceDocuments}}}
---
{{/if}}

Now, answer this user question: "{{userQuestion}}"`,
});

export const useImaginationFlow = ai.defineFlow(
  {
    name: 'useImaginationFlow',
    inputSchema: ImaginationInputSchema,
    outputSchema: ImaginationOutputSchema,
  },
  async (input) => {
    const { output } = await imaginationPrompt(input);
    return output!;
  }
);
