
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

2.  **Generate Implementation Guide**: You MUST ALWAYS populate the 'implementation' field for GCP, AWS, and Azure. Your decision on what to provide is based on the user's question:
    *   **For Technical Implementation Questions**: If the user asks a question like "how do I...", "what are the steps to...", "show me the command for...", or anything asking for a technical procedure, you MUST provide a detailed, step-by-step guide. For EACH step in this guide, you MUST provide:
        *   `command`: A specific, executable CLI command or a clear, actionable description of console steps. DO NOT put "N/A" here for technical questions.
        *   `referenceUrl`: A valid, official documentation URL from the cloud provider that is relevant to the step. DO NOT leave this empty for technical questions.
    *   **For General/Non-Technical Questions**: If the user's question is not about implementation, you MUST provide a list of general security best practices and considerations relevant to your answer. For these best practices:
        *   `command`: Can be a brief note like "N/A", a summary of the action, or a link to relevant documentation.
        *   `referenceUrl`: Can be a link to a relevant article or can be left empty if not applicable.

3.  **Handle Missing Answers**: If you absolutely cannot find the answer in the documents for the user's question, you MUST set 'answerFound' to false. In this case, the 'answer' field should state that the information was not found. Then, set 'suggestsImagination' to true and provide a message in 'imaginationSuggestion' inviting the user to try answering from your general knowledge. The 'implementation' field should still be populated with general best practices if possible.

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
