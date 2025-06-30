
"use client";

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const BlogCode = ({ code, language = 'javascript' }: { code: string, language?: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-lg bg-card border font-code text-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-muted-foreground">{language}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopy}>
          {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default function BlogPage() {
    return (
        <div className="bg-background text-foreground min-h-screen font-body">
            <header className="bg-primary/10 border-b">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold font-headline text-primary">The Developer's Log</h1>
                        <Button asChild variant="outline">
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                Back to App
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <article className="max-w-4xl mx-auto">
                    <header className="mb-12 text-center">
                        <h1 className="text-5xl font-bold font-headline text-primary leading-tight tracking-tighter">From Concept to Copilot: The Development Journey of an AI-Powered Compliance Tool</h1>
                        <p className="mt-4 text-lg text-muted-foreground">A deep dive into the creation of Compliance Copilot, built from the ground up with an AI partner in Firebase Studio.</p>
                        <p className="mt-2 text-sm text-muted-foreground">Authored by Imran Fosec, with the assistance of the Firebase Studio AI</p>
                    </header>

                    <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
                        <section>
                            <h2 className="text-3xl font-bold font-headline">1. The Spark of an Idea: Why Compliance Copilot?</h2>
                            <p>In the world of software development, "compliance" is a word that often evokes a collective groan. It's a landscape filled with dense, jargon-laden documents, ever-shifting regulations, and the constant, looming pressure of audits. For developers, security engineers, and even seasoned compliance officers, navigating frameworks like GDPR, HIPAA, SOC 2, or ISO 27001 is a Herculean task. The process is manual, tedious, and fraught with the risk of misinterpretation.</p>
                            <p>The core problem is one of information overload and accessibility. Critical requirements are buried deep within hundreds of pages of legalese. Finding a specific control, understanding its implications, and then figuring out how to implement it on a modern cloud stack is a multi-step process that involves endless searching, context-switching, and a healthy dose of guesswork. This friction doesn't just slow down development; it introduces risk. A missed requirement or a poorly implemented control can lead to security vulnerabilities, failed audits, hefty fines, and reputational damage.</p>
                            <p>This was the problem space that ignited the idea for Compliance Copilot. The motivation was simple but powerful: what if we could transform this mountain of static, impenetrable text into an interactive, intelligent conversation? What if you could simply ask a compliance document a question and get a direct, actionable answer? What if the tool could not only tell you *what* to do but also *how* to do it, with ready-to-use commands for your specific cloud provider?</p>
                            <p>The vision was to create an AI partner—a copilot—that empowers teams to tackle compliance with confidence and clarity. It wasn’t about replacing human expertise but augmenting it. By automating the drudgery of document analysis and providing instant, context-aware guidance, we could free up professionals to focus on what truly matters: building secure, robust, and compliant systems. This was the 'why' behind the tool: to demystify compliance and turn a source of friction into a catalyst for best practices.</p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold font-headline">2. The Blueprint: Core Functionality and User Experience</h2>
                            <p>With a clear motivation, the next step was to define the core functionality. We designed Compliance Copilot around a central, intuitive workflow that mirrors how a human expert would approach the task. The user experience is centered on a conversational chat interface, supported by a suite of powerful features working behind the scenes.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">A. Document Upload and Parsing</h3>
                            <p>The foundation of the tool is its ability to understand the user's specific compliance context. This starts with uploading the relevant documents. We designed the system to accept a variety of common formats—TXT, PDF, DOCX, and even XLSX—to ensure flexibility. When a user uploads a file, it's parsed on the client-side. This was a key architectural decision. Processing files in the browser reduces server load, enhances privacy by not transmitting raw files, and, as we'll see later, helped us overcome a significant performance bottleneck.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">B. Context-Aware Question Answering</h3>
                            <p>This is the heart of Compliance Copilot. Once documents are uploaded, users can ask questions in natural language. The AI's primary directive is to ground its answers *exclusively* in the content of the provided documents. This ensures that the guidance is tailored to the user's specific framework and policies, not just generic advice. The user can choose to query a single document or all uploaded documents at once, providing granular control over the context.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">C. Multi-Cloud Implementation Guides</h3>
                            <p>Answering "what" is only half the battle. The real power of Compliance Copilot lies in its ability to answer "how." For any given query, the tool generates a detailed, step-by-step implementation guide for the three major cloud providers: Google Cloud Platform (GCP), Amazon Web Services (AWS), and Microsoft Azure. If the user's question is technical (e.g., "How do I enable encryption for database backups?"), the guide provides specific CLI commands and console instructions. If the question is more general, it provides relevant security best practices. Each step includes a link to official documentation, bridging the gap between knowledge and action.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">D. "Imagination Mode" for Broader Context</h3>
                            <p>We recognized that sometimes the documents just don't have the answer. In these cases, the AI is programmed to acknowledge the gap. It will state that the answer wasn't found and then suggest using "Imagination Mode." This feature allows the user to re-ask the question, but this time the AI is free to use its general knowledge base. It becomes a creative brainstorming partner, capable of answering broader questions, explaining concepts, or providing context that extends beyond the uploaded files. This feature acts as an intelligent fallback, ensuring the user is never left at a dead end.</p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold font-headline">3. Building the Foundation: Our Development Journey, Step-by-Step</h2>
                            <p>Bringing Compliance Copilot to life was an iterative process, built on a modern, robust technology stack. The development was done entirely within Firebase Studio, leveraging its AI assistant for coding, debugging, and refactoring.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">Phase 1: Project Setup & UI Foundation</h3>
                            <p>We chose Next.js with the App Router as our framework. Its support for Server Components was a natural fit, allowing us to build a fast, responsive UI while keeping the client-side JavaScript bundle lean. For styling, we combined the power of Tailwind CSS for utility-first styling with the elegance of ShadCN UI for our component library. This combination provided a library of professionally designed, accessible, and easily customizable components (buttons, cards, dialogs, etc.), which dramatically accelerated UI development. The entire application was written in TypeScript to ensure type safety and reduce runtime errors.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">Phase 2: The AI Brain with Genkit</h3>
                            <p>The AI capabilities are powered by Google's Genkit, an open-source framework for building production-ready AI applications. Genkit's flow-based architecture was perfect for our needs. We defined two core flows:</p>
                            <ul>
                                <li><strong>complianceQuestionAnsweringFlow:</strong> This is the main flow that takes the user's question and the document context, and is strictly instructed to answer only from the provided text.</li>
                                <li><strong>useImaginationFlow:</strong> This flow is triggered for "Imagination Mode" and has a more open-ended prompt, allowing it to use its general knowledge.</li>
                            </ul>
                            <p>A key aspect of using Genkit was defining structured input and output schemas with Zod. By defining a clear Zod schema for the AI's response (including fields like `answerFound`, `answer`, and the nested `implementation` object), we could force the Language Model to return data in a predictable JSON format. This made the integration between the AI backend and the React frontend incredibly reliable.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">Phase 3: Crafting the Conversational UI</h3>
                            <p>The frontend was built as a single-page application experience. We used React's `useState` and `useEffect` hooks extensively to manage the application's state, including the list of uploaded documents, the conversation history, and loading/parsing states. The `ChatInterface` component is the central hub, rendering messages and handling user input. We broke down the UI into logical components like `ComplianceSidebar` and `ChatInterface` to keep the codebase organized and maintainable. Asynchronous API calls to our Genkit flows were handled with `fetch`, with robust error handling to inform the user if something went wrong.</p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold font-headline">4. The Art of Collaboration: Fixing Bugs with an AI Partner</h2>
                            <p>No development process is without its challenges. Throughout this project, I wasn't working alone. My partner was the AI assistant built into Firebase Studio. This collaborative model, where I would describe a problem or provide an error log and the AI would propose and apply a fix, was instrumental in overcoming several tricky bugs.</p>
                            <h3 className="text-2xl font-semibold font-headline mt-6">Example 1: The Markdown Menace</h3>
                            <p>An early and persistent issue was a build error caused by our prompt engineering. To provide detailed instructions to the AI, I initially wrote the prompt template using markdown for lists and code formatting. However, because the prompt itself was a JavaScript template literal (using backticks), the backticks within the prompt for code formatting caused a syntax conflict. The error was "Unexpected token `div`. Expected jsx identifier".</p>
                            <p>My AI partner in Firebase Studio and I went back and forth on this. The first attempt was to escape the characters, but that proved to be fragile. After a few failed attempts, the AI proposed a much more robust solution: externalizing the prompts.</p>
                            <p>Here is what the code looked like before the fix:</p>
                            <BlogCode code={`
// Inside src/app/api/compliance/route.ts
// ...
const complianceQuestionAnsweringFlow = ai.defineFlow(
    {
        name: 'complianceQuestionAnsweringFlow',
        // ...
        prompt: \`You are a compliance agent...
        * For EACH step, you MUST provide:
            * \`command\`: A specific CLI command.
            * \`referenceUrl\`: An official documentation URL.
        \`
    },
    // ...
);
`} />
                            <p>This code would fail to build. The AI then refactored the code to move the prompt into a dedicated file, completely resolving the syntax issue.</p>
                            <p>This is the final, working code:</p>
                            <BlogCode code={`
// src/ai/prompts.ts
export const COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE = \`You are a compliance analysis agent... For each step, provide a command and a referenceUrl...\`;

// src/app/api/compliance/route.ts
import { COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE } from '@/ai/prompts';

const complianceQuestionAnsweringPrompt = ai.definePrompt({
    name: 'complianceQuestionAnsweringPrompt',
    // ...
    prompt: COMPLIANCE_QUESTION_ANSWERING_PROMPT_TEMPLATE,
});
`} />
                            <p>This change, proposed and executed by the AI, not only fixed the bug but also improved the project's architecture by separating concerns.</p>

                            <h3 className="text-2xl font-semibold font-headline mt-6">Example 2: The Slow Startup and the \`pdfjs-dist\` Warning</h3>
                            <p>After implementing the PDF parsing functionality, the application's startup time plummeted. The Next.js development server would take over 25 seconds to compile the main page. Additionally, a cryptic warning appeared in the logs: \`Warning: Please use the \`legacy\` build in Node.js environments.\`</p>
                            <p>I presented the server logs to the Firebase Studio AI. It correctly diagnosed that both issues stemmed from the static import of the \`pdfjs-dist\` library. This large library was being included in the initial server-side bundle, causing bloat and the environment-specific warning.</p>
                            <p>The solution was to switch to a dynamic import. This meant the library would only be loaded on the client-side at the moment a user actually tried to upload a PDF file.</p>
                            <p>The code before the fix:</p>
                            <BlogCode code={`
// At the top of src/app/page.tsx
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// ...
const parsePdf = async (file: File): Promise<string> => {
    // ... uses pdfjsLib
};
`} />
                            <p>The AI refactored this to:</p>
                             <BlogCode code={`
// No import at the top of the file

const parsePdf = async (file: File): Promise<string> => {
    // Dynamically import the library ONLY when needed
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    const { version } = await import('pdfjs-dist/package.json');
    pdfjsLib.GlobalWorkerOptions.workerSrc = \`//unpkg.com/pdfjs-dist@\${version}/build/pdf.worker.min.mjs\`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    // ... rest of the parsing logic
};
`} />
                            <p>This single change reduced the initial compile time from 25 seconds to under 5 and eliminated the warning. It was a perfect example of how the AI could identify a performance optimization and implement it correctly.</p>

                        </section>

                        <section>
                            <h2 className="text-3xl font-bold font-headline">5. Communicating Change: The AI's Method of Operation</h2>
                            <p>One of the most unique aspects of developing in Firebase Studio is how the AI partner communicates and applies changes. It doesn't just provide a snippet of code in the chat; it proposes a complete, machine-readable plan for file modifications. This approach is built on a specific XML format that ensures clarity, precision, and safety.</p>
                            <p>When I request a change, the AI responds with a conversational preamble, followed by a special \`<changes>\` block. This block acts as a transaction, detailing every file that will be touched.</p>
                            <p>The structure looks like this:</p>
                            <BlogCode language="xml" code={`
<changes>
  <description>[A concise summary of the overall changes being made]</description>
  
  <change>
    <file>[The ABSOLUTE, FULL path to the file being modified]</file>
    <content><![CDATA[
      The ENTIRE, FINAL, intended content of the file goes here.
      It is not a diff or a patch, but the complete file content.
    
    