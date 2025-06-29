import { NextResponse } from 'next/server';
import { complianceQuestionAnsweringFlow } from '@/ai/flows';
import type { ComplianceQuestionAnsweringInput } from '@/ai/types';

export async function POST(req: Request) {
  try {
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
