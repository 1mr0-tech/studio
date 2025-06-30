
"use client";

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { ComplianceSidebar } from '@/components/compliance/sidebar';
import { ChatInterface } from '@/components/compliance/chat-interface';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import type { UploadedDoc, Message, Implementation } from '@/ai/types';
import type { ComplianceQuestionAnsweringOutput, ImaginationOutput } from '@/ai/types';

const parseDocx = async (file: File) => {
  const mammoth = (await import('mammoth')).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const parseXlsx = async (file: File) => {
  const xlsx = (await import('xlsx')).default;
  const arrayBuffer = await file.arrayBuffer();
  const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
  let content = '';
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    content += xlsx.utils.sheet_to_csv(worksheet);
  });
  return content;
};

const parseTxt = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    const { version } = await import('pdfjs-dist/package.json');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let content = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        content += textContent.items.map((item: any) => item.str).join(' ');
    }
    return content;
};


export default function CompliancePage() {
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('googleai/gemini-2.5-flash-latest');
  const [tempSelectedModel, setTempSelectedModel] = useState<string>('googleai/gemini-2.5-flash-latest');

  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [selectedContext, setSelectedContext] = useState<string>('all');

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const [isImplSheetOpen, setIsImplSheetOpen] = useState<boolean>(false);
  const [selectedImplementation, setSelectedImplementation] = useState<Implementation | null>(null);

  const [isImaginationSheetOpen, setIsImaginationSheetOpen] = useState<boolean>(false);
  const [imaginationMessages, setImaginationMessages] = useState<Message[]>([]);
  const [isImaginationLoading, setIsImaginationLoading] = useState<boolean>(false);
  const [imaginationQuestion, setImaginationQuestion] = useState<string>('');
  const [currentImaginationQuery, setCurrentImaginationQuery] = useState<string>('');

  const documentsAvailable = uploadedDocuments.length > 0;

  useEffect(() => {
    const storedKey = sessionStorage.getItem('gemini-api-key');
    const storedModel = sessionStorage.getItem('gemini-model');
    if (storedKey) {
      setApiKey(storedKey);
      setTempApiKey(storedKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
    if (storedModel) {
      setSelectedModel(storedModel);
      setTempSelectedModel(storedModel);
    }
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, imaginationMessages]);

  const handleApiKeySave = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey);
      setSelectedModel(tempSelectedModel);
      sessionStorage.setItem('gemini-api-key', tempApiKey);
      sessionStorage.setItem('gemini-model', tempSelectedModel);
      setIsApiKeyModalOpen(false);
      toast({
        title: "API Key Saved",
        description: "Your API key and model selection have been saved for this session.",
      });
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsParsing(true);
    try {
      const newDocsPromises = Array.from(files).map(async file => {
        let content = '';
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'txt':
            content = await parseTxt(file);
            break;
          case 'pdf':
            content = await parsePdf(file);
            break;
          case 'docx':
            content = await parseDocx(file);
            break;
          case 'xlsx':
            content = await parseXlsx(file);
            break;
          default:
            toast({
              variant: "destructive",
              title: "Unsupported File Type",
              description: `The file "${file.name}" is not supported.`,
            });
            return null;
        }
        return { name: file.name, content };
      });

      const newDocs = (await Promise.all(newDocsPromises)).filter((doc): doc is UploadedDoc => doc !== null);
      
      setUploadedDocuments(prev => {
          const existingNames = new Set(prev.map(d => d.name));
          const uniqueNewDocs = newDocs.filter(d => !existingNames.has(d.name));
          return [...prev, ...uniqueNewDocs];
      });

    } catch (error) {
      console.error("Error parsing files:", error);
      toast({
        variant: "destructive",
        title: "File Parsing Error",
        description: "An error occurred while parsing the documents.",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDeleteDocument = (docName: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.name !== docName));
    if (selectedContext === docName) {
      setSelectedContext('all');
    }
  };

  const getContextDocuments = () => {
    if (selectedContext === 'all') {
      return uploadedDocuments;
    }
    return uploadedDocuments.filter(doc => doc.name === selectedContext);
  };

  const handleFormSubmit = async (e: React.FormEvent, query?: string) => {
    e.preventDefault();
    const userQuestion = query || question;
    if (!userQuestion.trim() || isLoading) return;

    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter your Gemini API key to continue.",
      });
      return;
    }

    setIsLoading(true);
    setQuestion('');

    const newUserMessage: Message = { id: Date.now(), role: 'user', content: userQuestion };
    setMessages(prev => [...prev, newUserMessage]);

    const contextDocs = getContextDocuments();
    const complianceDocuments = contextDocs.map(doc => `Document: ${doc.name}\n\n${doc.content}`).join('\n\n---\n\n');

    try {
      const response = await fetch('/api/compliance/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
        body: JSON.stringify({ model: selectedModel, userQuestion, complianceDocuments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'The request failed.');
      }

      const result: ComplianceQuestionAnsweringOutput = await response.json();
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: result.answer,
        implementation: result.implementation,
        answerFound: result.answerFound,
        suggestsImagination: result.suggestsImagination,
        imaginationSuggestion: result.imaginationSuggestion,
        userQuestion: userQuestion,
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      const aiErrorMessage: Message = { id: Date.now() + 1, role: 'ai', content: `Error: ${errorMessage}` };
      setMessages(prev => [...prev, aiErrorMessage]);
      toast({
        variant: "destructive",
        title: "API Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };
  
  const handleSaveEdit = () => {
    if (!editingMessageId || !editingText.trim()) return;
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    const newMessages = messages.slice(0, messageIndex + 1);
    newMessages[messageIndex].content = editingText;
    setMessages(newMessages);

    handleFormSubmit({ preventDefault: () => {} } as React.FormEvent, editingText);
    
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleImplementClick = (implementation: Implementation) => {
    setSelectedImplementation(implementation);
    setIsImplSheetOpen(true);
  };

  const handleImaginationClick = (userQuestion: string) => {
    setCurrentImaginationQuery(userQuestion);
    setImaginationMessages([]);
    setIsImaginationSheetOpen(true);
    handleImaginationSubmit(undefined, userQuestion, true);
  };

  const handleGlobalImaginationClick = () => {
    if (!question.trim()) return;
    setCurrentImaginationQuery(question);
    setImaginationMessages([]);
    setIsImaginationSheetOpen(true);
    handleImaginationSubmit(undefined, question, true);
    setQuestion('');
  };

  const handleImaginationSubmit = async (e?: React.FormEvent, initialQuery?: string, isFirstQuery: boolean = false) => {
    e?.preventDefault();
    const userQuestion = initialQuery || imaginationQuestion;
    if (!userQuestion.trim() || isImaginationLoading) return;
  
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter your Gemini API key to continue.",
      });
      return;
    }
  
    setIsImaginationLoading(true);
    if (!isFirstQuery) {
      setImaginationQuestion('');
    }
  
    const newUserMessage: Message = { id: Date.now(), role: 'user', content: userQuestion };
    setImaginationMessages(prev => [...prev, newUserMessage]);
  
    const contextDocs = getContextDocuments();
    const complianceDocuments = contextDocs.map(doc => `Document: ${doc.name}\n\n${doc.content}`).join('\n\n---\n\n');
    const chatHistory = imaginationMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  
    try {
      const response = await fetch('/api/imagination/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
        body: JSON.stringify({ model: selectedModel, userQuestion, complianceDocuments, chatHistory }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'The request failed.');
      }
  
      const result: ImaginationOutput = await response.json();
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: result.answer,
      };
      setImaginationMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      const aiErrorMessage: Message = { id: Date.now() + 1, role: 'ai', content: `Error: ${errorMessage}` };
      setImaginationMessages(prev => [...prev, aiErrorMessage]);
      toast({
        variant: "destructive",
        title: "API Error",
        description: errorMessage,
      });
    } finally {
      setIsImaginationLoading(false);
    }
  };


  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-body antialiased">
      <ComplianceSidebar
        isParsing={isParsing}
        uploadedDocuments={uploadedDocuments}
        selectedContext={selectedContext}
        handleFileChange={handleFileChange}
        handleDeleteDocument={handleDeleteDocument}
        onContextChange={setSelectedContext}
        onApiKeyClick={() => setIsApiKeyModalOpen(true)}
      />
      
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        question={question}
        documentsAvailable={documentsAvailable}
        editingMessageId={editingMessageId}
        editingText={editingText}
        isImplSheetOpen={isImplSheetOpen}
        selectedImplementation={selectedImplementation}
        messagesEndRef={messagesEndRef}
        onQuestionChange={setQuestion}
        onFormSubmit={handleFormSubmit}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onSetEditingText={setEditingText}
        onImplementClick={handleImplementClick}
        onImaginationClick={handleImaginationClick}
        onGlobalImaginationClick={handleGlobalImaginationClick}
        onImplSheetOpenChange={setIsImplSheetOpen}
        isImaginationSheetOpen={isImaginationSheetOpen}
        imaginationMessages={imaginationMessages}
        isImaginationLoading={isImaginationLoading}
        currentImaginationQuery={currentImaginationQuery}
        imaginationQuestion={imaginationQuestion}
        onImaginationQuestionChange={setImaginationQuestion}
        onImaginationSubmit={handleImaginationSubmit}
        onImaginationSheetOpenChange={setIsImaginationSheetOpen}
      />

      <AlertDialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gemini API Key Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide your Gemini API key to use the AI features. Your key is stored only in your browser for this session.
              You can get a free API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Google AI Studio
              </a>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} placeholder="Enter your key here" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-select">Gemini Model</Label>
              <Select value={tempSelectedModel} onValueChange={setTempSelectedModel}>
                <SelectTrigger id="model-select" className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="googleai/gemini-2.5-pro-latest">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 2.5 Pro</span>
                      <span className="text-xs text-muted-foreground">Most powerful, for complex reasoning.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="googleai/gemini-2.5-flash-latest">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 2.5 Flash</span>
                      <span className="text-xs text-muted-foreground">Newest generation, for speed and cost. (Default)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="googleai/gemini-2.0-flash">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 2.0 Flash</span>
                      <span className="text-xs text-muted-foreground">Next-gen speed and efficiency.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="googleai/gemini-2.0-flash-lite">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 2.0 Flash Lite</span>
                      <span className="text-xs text-muted-foreground">Lightweight and fast for simple tasks.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="googleai/gemini-1.5-flash-latest">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 1.5 Flash</span>
                      <span className="text-xs text-muted-foreground">Fast, with a large context window.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="googleai/gemini-1.5-pro-latest">
                    <div className="flex flex-col">
                      <span className="font-medium">Gemini 1.5 Pro</span>
                      <span className="text-xs text-muted-foreground">Powerful, with a large context window.</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleApiKeySave}>Save Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
