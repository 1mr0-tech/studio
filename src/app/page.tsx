
"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import type { Implementation, UploadedDoc, Message } from '@/ai/types';
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ComplianceSidebar } from '@/components/compliance/sidebar';
import { ChatInterface } from '@/components/compliance/chat-interface';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit } from 'lucide-react';

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
  
  const [imaginationMessages, setImaginationMessages] = useState<Message[]>([]);
  const [imaginationQuestion, setImaginationQuestion] = useState("");
  const [isImaginationLoading, setIsImaginationLoading] = useState(false);

  const [currentImaginationQuery, setCurrentImaginationQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [suggestionDialog, setSuggestionDialog] = useState<{open: boolean; question: string; suggestion: string}>({ open: false, question: '', suggestion: '' });
  
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Effects
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setTempApiKey(storedApiKey);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imaginationMessages]);
  
  const handleApiKeySubmit = () => {
    if (tempApiKey && tempApiKey.trim()) {
      setApiKey(tempApiKey);
      localStorage.setItem('gemini-api-key', tempApiKey);
      setIsApiKeyModalOpen(false);
      toast({ title: "API Key Saved", description: "Your Gemini API key has been saved." });
    } else {
      toast({ variant: "destructive", title: "API Key Required", description: "Please enter a valid API key." });
    }
  };

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
      
      if (!localStorage.getItem('gemini-api-key') && newDocs.length > 0) {
        setIsApiKeyModalOpen(true);
      }

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
  
  const checkApiKey = () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      toast({ variant: 'destructive', title: 'API Key Missing', description: 'Please enter your Gemini API key to continue.' });
      return false;
    }
    return true;
  }

  const askAI = async (questionToAsk: string, existingMessages: Message[]) => {
    if (!checkApiKey()) {
      return;
    }
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
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey,
        },
        body: JSON.stringify({
          complianceDocuments: combinedContent,
          userQuestion: questionToAsk,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const aiResult = await response.json();

      const aiMessage: Message = {
        id: Date.now(),
        role: 'ai',
        content: aiResult.answer,
        implementation: aiResult.implementation,
        answerFound: aiResult.answerFound,
        userQuestion: questionToAsk,
        suggestsImagination: aiResult.suggestsImagination,
        imaginationSuggestion: aiResult.imaginationSuggestion,
      };
      setMessages([...existingMessages, aiMessage]);

      if (aiResult.suggestsImagination && aiResult.imaginationSuggestion) {
        setSuggestionDialog({
          open: true,
          question: questionToAsk,
          suggestion: aiResult.imaginationSuggestion,
        });
      }
      
    } catch (error) {
      console.error("Error calling AI:", error);
      const content = error instanceof Error ? error.message : "Sorry, I encountered an error. The response may have been blocked.";
      const errorMessage: Message = { id: Date.now(), role: 'ai', content: content };
      setMessages([...existingMessages, errorMessage]);
      toast({ variant: "destructive", title: "An error occurred", description: content });
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
    if (!userQuestion || isImaginationLoading || !checkApiKey()) return;
    
    setCurrentImaginationQuery(userQuestion);
    setIsImaginationSheetOpen(true);
    setIsImaginationLoading(true);
    setImaginationMessages([]);

    let contextDocs = uploadedDocuments;
    if (selectedContext !== 'all') {
      contextDocs = uploadedDocuments.filter(d => d.name === selectedContext);
    }
    const combinedContent = contextDocs.map(d => `Document: ${d.name}\n${d.content}`).join('\n\n---\n\n');

    const chatHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n\n');
    
    const initialUserMessage: Message = { id: Date.now(), role: 'user', content: userQuestion };

    try {
        const response = await fetch('/api/imagination', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Gemini-API-Key': apiKey,
          },
          body: JSON.stringify({ 
            userQuestion: userQuestion,
            complianceDocuments: combinedContent,
            chatHistory: chatHistory,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
        }

        const result = await response.json();
        const initialAiMessage: Message = { id: Date.now() + 1, role: 'ai', content: result.answer };
        setImaginationMessages([initialUserMessage, initialAiMessage]);

    } catch (error) {
        console.error("Error calling imagination AI:", error);
        const content = error instanceof Error ? error.message : "Sorry, I encountered an error while trying to generate a response.";
        const errorMessage: Message = { id: Date.now() + 1, role: 'ai', content: content };
        setImaginationMessages([initialUserMessage, errorMessage]);
        toast({ variant: "destructive", title: "An error occurred", description: content });
    } finally {
        setIsImaginationLoading(false);
    }
  };

  const handleImaginationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imaginationQuestion.trim() || isImaginationLoading || !checkApiKey()) return;

    const userMessage: Message = { id: Date.now(), role: 'user', content: imaginationQuestion };
    const newImaginationMessages = [...imaginationMessages, userMessage];
    setImaginationMessages(newImaginationMessages);
    
    const questionToSubmit = imaginationQuestion;
    setImaginationQuestion('');
    setIsImaginationLoading(true);

    const contextDocs = uploadedDocuments.filter(d => selectedContext === 'all' || d.name === selectedContext);
    const combinedContent = contextDocs.map(d => `Document: ${d.name}\n${d.content}`).join('\n\n---\n\n');
    
    const imaginationHistory = newImaginationMessages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n\n');

    try {
        const response = await fetch('/api/imagination', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Gemini-API-Key': apiKey,
          },
          body: JSON.stringify({ 
            userQuestion: questionToSubmit,
            complianceDocuments: combinedContent,
            chatHistory: imaginationHistory, 
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
        }
        const result = await response.json();
        const aiMessage: Message = { id: Date.now() + 1, role: 'ai', content: result.answer };
        setImaginationMessages(messages => [...messages, aiMessage]);
    } catch (error) {
        console.error("Error calling imagination AI:", error);
        const content = error instanceof Error ? error.message : "Sorry, I encountered an error.";
        const errorMessage: Message = { id: Date.now() + 1, role: 'ai', content: content };
        setImaginationMessages(messages => [...messages, errorMessage]);
        toast({ variant: "destructive", title: "An error occurred", description: content });
    } finally {
        setIsImaginationLoading(false);
    }
  }


  const handleGlobalImaginationClick = () => {
    if (!question.trim() || isLoading) return;
    handleImaginationClick(question);
    setQuestion('');
  };

  return (
    <>
      <div className="flex h-screen bg-muted/40 font-body">
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
          documentsAvailable={uploadedDocuments.length > 0}
          editingMessageId={editingMessageId}
          editingText={editingText}
          isImplSheetOpen={isImplSheetOpen}
          selectedImplementation={selectedImplementation}
          isImaginationSheetOpen={isImaginationSheetOpen}
          imaginationMessages={imaginationMessages}
          isImaginationLoading={isImaginationLoading}
          currentImaginationQuery={currentImaginationQuery}
          imaginationQuestion={imaginationQuestion}
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
          onImaginationSheetOpenChange={setIsImaginationSheetOpen}
          onImaginationQuestionChange={setImaginationQuestion}
          onImaginationSubmit={handleImaginationSubmit}
        />
      </div>
      <AlertDialog open={suggestionDialog.open} onOpenChange={(open) => setSuggestionDialog(prev => ({...prev, open}))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" /> Enhance with Imagination?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suggestionDialog.suggestion}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              handleImaginationClick(suggestionDialog.question);
            }}>
              Let's do it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter your Gemini API Key</DialogTitle>
            <DialogDescription>
              To use Compliance Connect, please provide your own Gemini API key.
              Your key is stored only in your browser and is not shared. You can
              generate a new key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Google AI Studio
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="api-key" className="text-right">
                API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="col-span-3"
                placeholder="Enter your API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleApiKeySubmit}>Save Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
