import { NextResponse } from 'next/server';
import { useImaginationFlow } from '@/ai/flows';
import type { ImaginationInput } from '@/ai/types';

export async function POST(req: Request) {
  try {
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
