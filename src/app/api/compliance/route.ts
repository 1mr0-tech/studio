
import { NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { ComplianceQuestionAnsweringInput } from '@/ai/types';
import {
  ComplianceQuestionAnsweringInputSchema,
  ComplianceQuestionAnsweringOutputSchema,
} from '@/ai/types';

export async function POST(req: Request) {
  const apiKey = req.headers.get('X-Gemini-API-Key');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is missing.', details: 'Please provide the Gemini API key in the X-Gemini-API-Key header.' },
      { status: 401 }
    );
  }

  try {
    const ai = genkit({
      plugins: [googleAI({ apiKey })],
      model: 'googleai/gemini-2.0-flash',
    });

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

4.  **Schema Adherence**: Structure your entire response according to the output schema.
`,
    });

    const complianceQuestionAnsweringFlow = ai.defineFlow(
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

    const body = (await req.json()) as ComplianceQuestionAnsweringInput;
    const result = await complianceQuestionAnsweringFlow(body);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Compliance API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process compliance question.', details: errorMessage },
      { status: 500 }
    );
  }
}
