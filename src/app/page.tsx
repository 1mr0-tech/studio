"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { complianceQuestionAnswering, useImagination } from '@/app/actions';
import type { Implementation, UploadedDoc, Message } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ComplianceSidebar } from '@/components/compliance/sidebar';
import { ChatInterface } from '@/components/compliance/chat-interface';

export default function CompliancePage() {
  const { toast } = useToast();

  // State Management
  const [question, setQuestion] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedImplementation, setSelectedImplementation] = useState<Implementation | null>(null);
  const [isImplSheetOpen, setIsImplSheetOpen] = useState(false);
  const [isImaginationSheetOpen, setIsImaginationSheetOpen] = useState(false);
  const [imaginationResult, setImaginationResult] = useState<string | null>(null);
  const [isImaginationLoading, setIsImaginationLoading] = useState(false);
  const [imaginationError, setImaginationError] = useState<string | null>(null);
  const [currentImaginationQuery, setCurrentImaginationQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Effects
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handlers
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setIsParsing(true);
    const newDocs: UploadedDoc[] = [];

    try {
      for (const file of Array.from(e.target.files)) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        let content = '';

        const fileContent = await new Promise<string | ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result!);
          reader.onerror = reject;
          if (extension === 'pdf' || extension === 'docx' || extension === 'xlsx') {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        });

        switch (extension) {
          case 'txt':
            content = fileContent as string;
            break;
          case 'pdf': {
            const data = new Uint8Array(fileContent as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              text += textContent.items.map(item => (item as any).str).join(' ');
            }
            content = text;
            break;
          }
          case 'docx': {
            const result = await mammoth.extractRawText({ arrayBuffer: fileContent as ArrayBuffer });
            content = result.value;
            break;
          }
          case 'xlsx': {
            const workbook = XLSX.read(fileContent, { type: 'buffer' });
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              text += XLSX.utils.sheet_to_csv(worksheet);
            });
            content = text;
            break;
          }
          default:
            toast({
              variant: "destructive",
              title: "Unsupported File Type",
              description: `File type for ${file.name} is not supported.`,
            });
            continue;
        }

        newDocs.push({ name: file.name, content });
      }

      setUploadedDocuments(docs => [...docs, ...newDocs]);

    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        variant: "destructive",
        title: "File Parsing Error",
        description: "There was an error processing one or more of your files.",
      });
    } finally {
      setIsParsing(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDeleteDocument = (docName: string) => {
    setUploadedDocuments(docs => docs.filter(d => d.name !== docName));
    if (selectedContext === docName) {
      setSelectedContext('all');
    }
  };

  const askAI = async (questionToAsk: string, existingMessages: Message[]) => {
    setIsLoading(true);
    let contextDocs = uploadedDocuments;
    if (selectedContext !== 'all') {
      contextDocs = uploadedDocuments.filter(d => d.name === selectedContext);
    }

    if (contextDocs.length === 0) {
      toast({ variant: "destructive", title: "No document context", description: "Please upload a document or select 'All Documents'." });
      setIsLoading(false);
      return;
    }

    const combinedContent = contextDocs.map(d => `Document: ${d.name}\n${d.content}`).join('\n\n---\n\n');

    try {
      const aiResult = await complianceQuestionAnswering({
        complianceDocuments: combinedContent,
        userQuestion: questionToAsk,
      });

      const aiMessage: Message = {
        id: Date.now(),
        role: 'ai',
        content: aiResult.answer,
        implementation: aiResult.implementation,
        googleCloudDocUrl: aiResult.googleCloudDocUrl,
        answerFound: aiResult.answerFound,
        userQuestion: questionToAsk,
      };
      setMessages([...existingMessages, aiMessage]);
      
    } catch (error) {
      console.error("Error calling AI:", error);
      const errorMessage: Message = { id: Date.now(), role: 'ai', content: "Sorry, I encountered an error. The response may have been blocked." };
      setMessages([...existingMessages, errorMessage]);
      toast({ variant: "destructive", title: "An error occurred", description: "Failed to get a response from the AI." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', content: question };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const questionToSubmit = question;
    setQuestion('');
    
    await askAI(questionToSubmit, newMessages);
  };
  
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    const newMessages = messages.slice(0, messageIndex);
    const updatedUserMessage: Message = { ...messages[messageIndex], content: editingText };
    newMessages.push(updatedUserMessage);

    setMessages(newMessages);
    setEditingMessageId(null);
    setEditingText('');

    await askAI(editingText, newMessages);
  };

  const handleImplementClick = (implementation: Implementation) => {
    setSelectedImplementation(implementation);
    setIsImplSheetOpen(true);
  };

  const handleImaginationClick = async (userQuestion: string) => {
    if (!userQuestion) return;
    setCurrentImaginationQuery(userQuestion);
    setIsImaginationSheetOpen(true);
    setIsImaginationLoading(true);
    setImaginationResult(null);
    setImaginationError(null);
    try {
        const result = await useImagination({ userQuestion });
        setImaginationResult(result.answer);
    } catch (error) {
        console.error("Error calling imagination AI:", error);
        setImaginationError("Sorry, I encountered an error while trying to generate a response.");
        toast({ variant: "destructive", title: "An error occurred", description: "Failed to get a response from the imagination AI." });
    } finally {
        setIsImaginationLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-muted/40 font-body">
      <ComplianceSidebar
        isParsing={isParsing}
        uploadedDocuments={uploadedDocuments}
        selectedContext={selectedContext}
        handleFileChange={handleFileChange}
        handleDeleteDocument={handleDeleteDocument}
        onContextChange={setSelectedContext}
      />
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        question={question}
        documentsAvailable={uploadedDocuments.length > 0}
        editingMessageId={editingMessageId}
        editingText={editingText}
        isImplSheetOpen={isImplSheetOpen}
        selectedImplementation={selectedImplementation}
        isImaginationSheetOpen={isImaginationSheetOpen}
        imaginationResult={imaginationResult}
        isImaginationLoading={isImaginationLoading}
        imaginationError={imaginationError}
        currentImaginationQuery={currentImaginationQuery}
        messagesEndRef={messagesEndRef}
        onQuestionChange={setQuestion}
        onFormSubmit={handleFormSubmit}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onSetEditingText={setEditingText}
        onImplementClick={handleImplementClick}
        onImaginationClick={handleImaginationClick}
        onImplSheetOpenChange={setIsImplSheetOpen}
        onImaginationSheetOpenChange={setIsImaginationSheetOpen}
      />
    </div>
  );
}
