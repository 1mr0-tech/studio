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
    prompt: `You are an expert compliance assistant. Your primary task is to answer user questions based *only* on the provided compliance documents.

Analyze the following compliance documents:
---
{{{complianceDocuments}}}
---

Now, answer this user question: "{{userQuestion}}"

Your response MUST follow these rules, in this order:

1.  **Answer from Documents**: Provide a direct, concise answer to the user's question in the 'answer' field. This answer must be based strictly on the information within the provided documents. Format the answer using Markdown.

2.  **Generate Implementation/Best Practices**: You MUST ALWAYS populate the 'implementation' field for GCP, AWS, and Azure.
    *   **If the user's question asks for technical implementation steps** (e.g., "how do I...", "what are the steps for...", "implement X", or questions about technical controls), provide a detailed, step-by-step technical guide in the 'implementation' field. For each step, you MUST provide a specific, executable CLI command or a clear, actionable description of console steps in the 'command' field. You MUST also try to find and include an official documentation link for the step in the 'referenceUrl' field.
    *   **If the user's question is NOT about implementation**, provide a list of general security best practices and considerations that are relevant to the topic of your answer in the 'implementation' field. For these general best practices, the 'command' field can be a brief note like 'N/A' or a link to relevant documentation, and the 'referenceUrl' can be left empty.
    *   In both cases, set 'answerFound' to true.

3.  **Handle Missing Answers**: If you absolutely cannot find the answer in the documents for the user's question, you MUST set 'answerFound' to false. In this case, the 'answer' field should state that the information was not found. Then, set 'suggestsImagination' to true and provide a message in 'imaginationSuggestion' inviting the user to try answering from your general knowledge. The 'implementation' field should still be populated with general best practices if possible, or left empty if not.

4.  **Formatting and Links**: If you find a relevant official Google Cloud documentation link while answering, include it in the 'googleCloudDocUrl' field.

5.  **Schema Adherence**: Structure your entire response according to the output schema.
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
