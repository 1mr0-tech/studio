
import { NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { ComplianceQuestionAnsweringInput } from '@/ai/types';
import {
  ComplianceQuestionAnsweringInputSchema,
  ComplianceQuestionAnsweringOutputSchema,
} from '@/ai/types';
import { COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE } from '@/ai/prompts';

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
        prompt: COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE,
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
