'use server';

import {ai} from '@/server/genkit';
import {z} from 'genkit';

const ImplementationStepSchema = z.object({
  step: z.string().describe('A clear, concise title for the implementation step.'),
  command: z
    .string()
    .describe('The CLI command or code snippet for this step.'),
  bestPractice: z
    .string()
    .optional()
    .describe('A best practice or important consideration for this step.'),
});

const ImplementationSchema = z.object({
  gcp: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Google Cloud Platform."),
  aws: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Amazon Web Services."),
  azure: z.array(ImplementationStepSchema).optional().describe("Implementation steps for Microsoft Azure."),
});

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
});
export type ComplianceQuestionAnsweringOutput = z.infer<
  typeof ComplianceQuestionAnsweringOutputSchema
>;

export const ImaginationInputSchema = z.object({
    userQuestion: z.string().describe('The user question that needs to be answered.'),
});
export type ImaginationInput = z.infer<typeof ImaginationInputSchema>;

export const ImaginationOutputSchema = z.object({
    answer: z.string().describe("The AI's answer based on its general knowledge."),
});
export type ImaginationOutput = z.infer<typeof ImaginationOutputSchema>;

const complianceQuestionAnsweringPrompt = ai.definePrompt({
    name: 'complianceQuestionAnsweringPrompt',
    input: {schema: ComplianceQuestionAnsweringInputSchema},
    output: {schema: ComplianceQuestionAnsweringOutputSchema},
    prompt: `You are an expert compliance assistant. Your task is to answer user questions based *only* on the provided compliance documents.

Analyze the following compliance documents:
---
{{{complianceDocuments}}}
---

Now, answer this user question: "{{userQuestion}}"

IMPORTANT:
- Base your answer strictly on the information within the provided documents.
- If the documents do not contain the answer, you MUST state that you cannot find the answer in the provided context and set answerFound to false. In this case, suggest that the user could try the "Imagination" feature for a general knowledge answer.
- If the question asks for implementation steps (e.g., "how do I..."), provide practical, command-line based steps for GCP, and optionally for AWS and Azure if relevant.
- If you provide implementation steps, also include relevant best practices for each step.
- If you can find a relevant official Google Cloud documentation link, include it in the 'googleCloudDocUrl' field.
- Structure your entire response according to the output schema.
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

export async function complianceQuestionAnswering(
    input: ComplianceQuestionAnsweringInput
): Promise<ComplianceQuestionAnsweringOutput> {
    return complianceQuestionAnsweringFlow(input);
}

const imaginationPrompt = ai.definePrompt({
  name: 'imaginationPrompt',
  input: { schema: ImaginationInputSchema },
  output: { schema: ImaginationOutputSchema },
  prompt: `You are a helpful assistant. Answer the following question based on your general knowledge.

Question: {{{userQuestion}}}`,
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

export async function useImagination(input: ImaginationInput): Promise<ImaginationOutput> {
  return useImaginationFlow(input);
}
