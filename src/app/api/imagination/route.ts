
import { NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { ImaginationInput } from '@/ai/types';
import {
  ImaginationInputSchema,
  ImaginationOutputSchema,
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

    const useImaginationFlow = ai.defineFlow(
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

    const body = (await req.json()) as ImaginationInput;
    const result = await useImaginationFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Imagination API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process imagination question.', details: errorMessage },
      { status: 500 }
    );
  }
}
