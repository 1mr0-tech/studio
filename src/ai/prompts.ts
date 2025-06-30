
export const COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE = `Analyze the following compliance documents:
{{{complianceDocuments}}}
Now, answer this user question: "{{userQuestion}}"

Your response MUST follow these rules, in this order:

1. Answer from Documents: Provide a direct, concise answer to the user's question in the 'answer' field. This answer must be based strictly on the information within the provided documents.
2. Generate Implementation Guide: You MUST ALWAYS populate the 'implementation' field for GCP, AWS, and Azure. Your decision on what to provide is based on the user's question:
    For Technical Implementation Questions: If the user asks a question like "how do I...", "what are the steps to...", "show me the command for...", or anything asking for a technical procedure, you MUST provide a detailed, step-by-step guide. For EACH step in this guide, you MUST provide:
        'command': A specific, executable CLI command or a clear, actionable description of console steps. DO NOT put "N/A" here for technical questions.
        'referenceUrl': A valid, official documentation URL from the cloud provider that is relevant to the step. DO NOT leave this empty for technical questions.
    For General/Non-Technical Questions: If the user's question is not about implementation, you MUST provide a list of general security best practices and considerations relevant to your answer. For these best practices:
        'command': Can be a brief note like "N/A", a summary of the action, or a link to a relevant documentation.
        'referenceUrl': Can be a link to a relevant article or can be left empty if not applicable.
3. Handle Missing Answers: If you absolutely cannot find the answer in the documents for the user's question, you MUST set 'answerFound' to false. In this case, the 'answer' field should state that the information was not found. Then, set 'suggestsImagination' to true and provide a message in 'imaginationSuggestion' inviting the user to try answering from your general knowledge. The 'implementation' field should still be populated with general best practices if possible.
4. Schema Adherence: Structure your entire response according to the output schema.
`;

export const IMAGINATION_PROMPT_TEMPLATE = `You are a helpful and creative assistant with access to the internet. Your task is to answer the user's question based on the full context provided.

You have access to three sources of information:
1. Your general knowledge and access to the internet.
2. The history of the current conversation.
3. A set of compliance documents provided by the user.

Use all available context to formulate a comprehensive and relevant response.

{{#if chatHistory}}
CONVERSATION HISTORY:
{{{chatHistory}}}
{{/if}}

{{#if complianceDocuments}}
COMPLIANCE DOCUMENTS:
{{{complianceDocuments}}}
{{/if}}

Now, answer this user question: "{{userQuestion}}"`;
