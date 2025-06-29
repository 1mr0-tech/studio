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
- Base your answer strictly on the information within the provided documents.
- Format your answers using Markdown, especially for tables, lists, and code blocks.
- If the documents do not contain the answer, you MUST state that you cannot find the answer in the provided context and set the 'answerFound' field to false. In this case, suggest that the user could try the "Imagination" feature for a general knowledge answer.

- **Implementation Steps vs. Creative Plans:** You must distinguish between two types of requests:
    1.  **Specific Implementation Steps:** If the user asks a direct "how-to" question (e.g., "how do I enable X?", "steps to configure Y"), you MUST provide concrete, technical steps in the 'implementation' object. Prioritize command-line instructions and include best practices.
    2.  **Creative Content Generation:** If the user asks for a high-level plan, playbook, or checklist (e.g., "create a security playbook," "design an implementation plan," "make me a checklist for SOC 2"), this requires creative generation. In this case, you MUST set the 'suggestsImagination' field to true and the 'imaginationSuggestion' field to a message like "I can generate that for you using my general knowledge. Would you like me to proceed?". DO NOT populate the 'implementation' object for these creative requests.

- **Populating the 'implementation' object:** When providing specific implementation steps as described above, you must populate the 'implementation' object. You can provide steps for GCP, AWS, and Azure.
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
