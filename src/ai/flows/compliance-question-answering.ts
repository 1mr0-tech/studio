'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * @fileOverview AI agents for answering questions about compliance and using general knowledge.
 *
 * This file contains two main features:
 * - complianceQuestionAnswering: Answers questions based on provided compliance documents.
 * - useImagination: Answers questions using general knowledge.
 */

// == Compliance Question Answering Flow ==
const ComplianceQuestionAnsweringInputSchema = z.object({
  complianceDocuments: z.string().describe('The uploaded compliance documents.'),
  userQuestion: z.string().describe('The user question about compliance requirements.'),
});
export type ComplianceQuestionAnsweringInput = z.infer<typeof ComplianceQuestionAnsweringInputSchema>;

const ImplementationStepSchema = z.object({
    step: z.string().describe('A step to implement the compliance measure.'),
    command: z.string().optional().describe('The command-line interface (CLI) command for the step (e.g., gcloud, aws, az).'),
    bestPractice: z.string().optional().describe('An industry best practice related to this step.'),
});

const CloudImplementationSchema = z.array(ImplementationStepSchema);

const ComplianceQuestionAnsweringOutputSchema = z.object({
  answer: z.string().describe('The answer to the user question.'),
  answerFound: z.boolean().describe('Set to true if an answer was found in the documents, false otherwise.'),
  implementation: z.object({
      gcp: CloudImplementationSchema.optional().describe('Step-by-step instructions for implementing the compliance measure on GCP.'),
      aws: CloudImplementationSchema.optional().describe('Step-by-step instructions for implementing the compliance measure on AWS.'),
      azure: CloudImplementationSchema.optional().describe('Step-by-step instructions for implementing the compliance measure on Azure.'),
  }).optional().describe('Cloud-specific implementation steps.'),
  googleCloudDocUrl: z.string().optional().describe('A relevant Google Cloud documentation URL to learn more.'),
});
export type ComplianceQuestionAnsweringOutput = z.infer<typeof ComplianceQuestionAnsweringOutputSchema>;

export async function complianceQuestionAnswering(input: ComplianceQuestionAnsweringInput): Promise<ComplianceQuestionAnsweringOutput> {
  return complianceQuestionAnsweringFlow(input);
}

const complianceQuestionAnsweringPrompt = ai.definePrompt({
  name: 'complianceQuestionAnsweringPrompt',
  input: {schema: ComplianceQuestionAnsweringInputSchema},
  output: {schema: ComplianceQuestionAnsweringOutputSchema},
  prompt: `You are an expert multi-cloud compliance officer specializing in GCP, AWS, and Azure implementations. Your goal is to provide helpful answers based strictly on the provided compliance documents.

  You MUST follow these steps:
  1. **Analyze**: Carefully and exhaustively read the provided compliance documents to understand their content in relation to the user's question.
  2. **Answer**:
      - If you can find the answer within the documents, provide a clear and concise answer and set 'answerFound' to true. Then, for each cloud provider (GCP, AWS, Azure), generate a step-by-step guide for implementing the compliance measure. For each step, include relevant industry best practices and the specific CLI commands. Also, find a relevant Google Cloud documentation URL if applicable.
      - If you are 100% certain you cannot find the answer in the documents, your answer MUST be a polite statement explaining that the information is not in the provided text. For example: "I'm sorry, but I was unable to find an answer to your question in the provided document(s)." Set 'answerFound' to false. In this case, you MUST NOT generate implementation steps or a documentation URL.

  Compliance Documents: {{{complianceDocuments}}}
  User Question: {{{userQuestion}}}`,
});

const complianceQuestionAnsweringFlow = ai.defineFlow(
  {
    name: 'complianceQuestionAnsweringFlow',
    inputSchema: ComplianceQuestionAnsweringInputSchema,
    outputSchema: ComplianceQuestionAnsweringOutputSchema,
  },
  async input => {
    const {output} = await complianceQuestionAnsweringPrompt(input);
    return output!;
  }
);


// == Imagination Flow ==
export const ImaginationInputSchema = z.object({
  userQuestion: z.string().describe('The user question to be answered from general knowledge.'),
});
export type ImaginationInput = z.infer<typeof ImaginationInputSchema>;

export const ImaginationOutputSchema = z.object({
  answer: z.string().describe('The imaginative answer to the user question.'),
});
export type ImaginationOutput = z.infer<typeof ImaginationOutputSchema>;

export async function useImagination(input: ImaginationInput): Promise<ImaginationOutput> {
  return useImaginationFlow(input);
}

const useImaginationPrompt = ai.definePrompt({
  name: 'useImaginationPrompt',
  input: {schema: ImaginationInputSchema},
  output: {schema: ImaginationOutputSchema},
  prompt: `You are a helpful AI assistant. Answer the following user question to the best of your ability using your general knowledge. Be creative and comprehensive.

  User Question: {{{userQuestion}}}`,
});

const useImaginationFlow = ai.defineFlow(
  {
    name: 'useImaginationFlow',
    inputSchema: ImaginationInputSchema,
    outputSchema: ImaginationOutputSchema,
  },
  async input => {
    const {output} = await useImaginationPrompt(input);
    return output!;
  }
);
