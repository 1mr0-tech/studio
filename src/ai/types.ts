
import {z} from 'zod';

export const ImplementationStepSchema = z.object({
  step: z.string().describe('A clear, concise title for the implementation step.'),
  command: z
    .string()
    .describe('The CLI command or code snippet for this step.'),
  bestPractice: z
    .string()
    .optional()
    .describe('A best practice or important consideration for this step.'),
});

export const ImplementationSchema = z.object({
  gcp: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Google Cloud Platform."),
  aws: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Amazon Web Services."),
  azure: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Microsoft Azure."),
});
export type Implementation = z.infer<typeof ImplementationSchema>;


export const ComplianceQuestionAnsweringInputSchema = z.object({
  complianceDocuments: z
    .string()
    .describe('The content of compliance documents provided by the user.'),
  userQuestion: z.string().describe('The specific compliance question asked by the user.'),
});
export type ComplianceQuestionAnsweringInput = z.infer<
  typeof ComplianceQuestionAnsweringInputSchema
>;

export const ComplianceQuestionAnsweringOutputSchema = z.object({
  answerFound: z.boolean().describe("Whether a direct answer was found in the provided documents."),
  answer: z
    .string()
    .describe(
      'The answer to the user question, based *only* on the provided compliance documents. If no answer is found, state that and suggest using the "Imagination" feature.'
    ),
  googleCloudDocUrl: z
    .string()
    .optional()
    .describe(
      'A relevant Google Cloud documentation URL, if applicable. Only include if highly relevant.'
    ),
  implementation: ImplementationSchema.optional().describe(
    'If the question involves implementation, provide step-by-step guidance for GCP, AWS, and Azure. Prioritize GCP.'
  ),
  suggestsImagination: z.boolean().optional().describe("True if the model suggests using the 'Imagination' feature for a better answer."),
  imaginationSuggestion: z.string().optional().describe("A brief message explaining why Imagination is suggested."),
});
export type ComplianceQuestionAnsweringOutput = z.infer<
  typeof ComplianceQuestionAnsweringOutputSchema
>;

export const ImaginationInputSchema = z.object({
    userQuestion: z.string().describe('The user question that needs to be answered.'),
    complianceDocuments: z.string().optional().describe("The content of the user's uploaded documents for context."),
    chatHistory: z.string().optional().describe("The history of the conversation so far, for context."),
});
export type ImaginationInput = z.infer<typeof ImaginationInputSchema>;

export const ImaginationOutputSchema = z.object({
    answer: z.string().describe("The AI's answer based on its general knowledge."),
});
export type ImaginationOutput = z.infer<typeof ImaginationOutputSchema>;

// Types for the UI
export type UploadedDoc = { name: string; content: string; };
export type Message = {
  id: number;
  role: 'user' | 'ai';
  content: string;
  implementation?: Implementation;
  googleCloudDocUrl?: string;
  answerFound?: boolean;
  userQuestion?: string;
  suggestsImagination?: boolean;
  imaginationSuggestion?: string;
};
