
import {ai} from '@/lib/genkit';
import {
    ComplianceQuestionAnsweringInputSchema,
    ComplianceQuestionAnsweringOutputSchema,
    ImaginationInputSchema,
    ImaginationOutputSchema,
} from '@/ai/types';

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

export const complianceQuestionAnsweringFlow = ai.defineFlow(
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

const imaginationPrompt = ai.definePrompt({
  name: 'imaginationPrompt',
  input: { schema: ImaginationInputSchema },
  output: { schema: ImaginationOutputSchema },
  prompt: `You are a helpful assistant. Answer the following question based on your general knowledge.

Question: {{{userQuestion}}}`,
});

export const useImaginationFlow = ai.defineFlow(
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
