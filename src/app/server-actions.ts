'use server';
import { complianceQuestionAnsweringFlow, useImaginationFlow } from '@/ai/flows';
import type {
    ComplianceQuestionAnsweringInput,
    ComplianceQuestionAnsweringOutput,
    ImaginationInput,
    ImaginationOutput
} from '@/ai/types';


export async function complianceQuestionAnswering(
    input: ComplianceQuestionAnsweringInput
): Promise<ComplianceQuestionAnsweringOutput> {
    return complianceQuestionAnsweringFlow(input);
}

export async function useImagination(input: ImaginationInput): Promise<ImaginationOutput> {
  return useImaginationFlow(input);
}
