# Compliance Assist

Compliance Assist is an AI-powered assistant designed to help developers and security professionals navigate the complex world of compliance. By uploading your organization's compliance documents (like GDPR, SOC 2, or HIPAA policies), you can ask plain-language questions and receive direct, context-aware answers grounded in your own policies.

Beyond simple Q&A, the tool generates actionable, step-by-step implementation guides for Google Cloud Platform (GCP), Amazon Web Services (AWS), and Microsoft Azure, turning high-level policy requirements into concrete technical steps.

![Compliance Assist Screenshot](https://placehold.co/800x600.png)

---

## Core Features

-   **Multi-Format Document Upload**: Upload compliance documents in various formats, including `.txt`, `.pdf`, `.docx`, and `.xlsx`. The tool parses and unifies them into a single knowledge base.
-   **Context-Aware Q&A**: Ask questions against all uploaded documents or focus the AI's attention on a single document for targeted inquiries.
-   **Document-Grounded Answers**: The AI prioritizes finding answers directly within your uploaded documents, ensuring responses are relevant to your organization's specific policies.
-   **Automated Implementation Guides**: For every answer, the tool generates detailed implementation steps for GCP, AWS, and Azure, complete with CLI commands and links to official documentation.
-   **"Imagination Mode"**: If an answer isn't found in your documents, you can switch to Imagination Mode. This allows the AI to use its general knowledge to answer your question, providing a helpful fallback.
-   **Interactive Chat**: Edit your previous questions to refine the conversation and guide the AI toward the most accurate answer without starting over.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **UI Library**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI Orchestration**: [Google Genkit](https://firebase.google.com/docs/genkit)
-   **Schema Validation**: [Zod](https://zod.dev/)

## Getting Started

This application is designed to run in a cloud development environment like Firebase Studio, but you can also run it locally.

### Prerequisites

-   Node.js (v20 or later)
-   npm or a compatible package manager
-   A Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:9002`.

### Usage

1.  When you first open the application, a popup will appear asking for your Gemini API Key.
2.  Paste your key into the input field and save it. This key is stored in your browser's session storage and is not saved on any server.
3.  Use the "Upload" area in the sidebar to upload one or more compliance documents.
4.  Once uploaded, you can select which document(s) to use as context for your questions.
5.  Type your question into the chat input at the bottom and press Enter.
6.  Review the AI's answer, and use the "Implement" or "Use Imagination" buttons as needed.
