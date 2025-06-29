
'use server';

import {
    complianceQuestionAnsweringFlow,
    useImaginationFlow,
} from '@/ai/flows';
import type {
    ComplianceQuestionAnsweringInput,
    ComplianceQuestionAnsweringOutput,
    ImaginationInput,
    ImaginationOutput,
    Implementation,
    UploadedDoc,
    Message
} from '@/ai/types';

export async function complianceQuestionAnswering(
    input: ComplianceQuestionAnsweringInput
): Promise<ComplianceQuestionAnsweringOutput> {
    return complianceQuestionAnsweringFlow(input);
}

export async function useImagination(input: ImaginationInput): Promise<ImaginationOutput> {
  return useImaginationFlow(input);
}

// Re-export types for the UI
export type { Implementation, UploadedDoc, Message };
