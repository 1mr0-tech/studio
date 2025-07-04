
import { NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { ImaginationInput } from '@/ai/types';
import {
  ImaginationInputSchema,
  ImaginationOutputSchema,
} from '@/ai/types';
import { IMAGINATION_PROMPT_TEMPLATE } from '@/ai/prompts';


export async function POST(req: Request) {
  const apiKey = req.headers.get('X-Gemini-API-Key');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is missing.', details: 'Please provide the Gemini API key in the X-Gemini-API-Key header.' },
      { status: 401 }
    );
  }
  
  try {
    const body = await req.json();
    const { model, ...imaginationInput } = body;

    const ai = genkit({
      plugins: [googleAI({ apiKey })],
    });

    const imaginationPrompt = ai.definePrompt({
      name: 'imaginationPrompt',
      input: { schema: ImaginationInputSchema },
      output: { schema: ImaginationOutputSchema },
      prompt: IMAGINATION_PROMPT_TEMPLATE,
      config: {
        model: model || 'googleai/gemini-2.5-flash-latest',
      }
    });

    const { output } = await imaginationPrompt(imaginationInput as ImaginationInput);
    
    if (!output) {
      throw new Error("The AI model did not return a valid output.");
    }

    return NextResponse.json(output);

  } catch (error) {
    console.error('[Imagination API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process imagination question.', details: errorMessage },
      { status: 500 }
    );
  }
}
