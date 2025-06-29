
"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { complianceQuestionAnswering, type ComplianceQuestionAnsweringOutput, useImagination } from '@/server/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Send, Loader, Upload, ExternalLink, Info, User, AlertCircle, Wrench, Pencil, Save, Trash2, BrainCircuit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CodeBlock } from '@/components/code-block';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ModeToggle } from '@/components/mode-toggle';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Implementation = NonNullable<ComplianceQuestionAnsweringOutput['implementation']>;
type ImplementationStep = NonNullable<Implementation['gcp']>[0];
type UploadedDoc = { name: string; content: string; };

type Message = {
  id: number;
  role: 'user' | 'ai';
  content: string;
  implementation?: Implementation;
  googleCloudDocUrl?: string;
  answerFound?: boolean;
  userQuestion?: string;
};

const renderImplementationSteps = (steps: ImplementationStep[] | undefined) => {
  if (!steps || steps.length === 0) {
      return <div className="p-6 text-center text-muted-foreground">No implementation steps provided for this cloud.</div>;
  }
  return (
      <div className="p-1 pt-4">
          <Accordion type="multiple" className="w-full space-y-2">
              {steps.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="bg-muted/50 rounded-lg border px-4">
                      <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex-1 pr-4 min-w-0">
                              <span className="font-semibold">Step {index + 1}:</span> {item.step}
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 space-y-4">
                          {item.bestPractice && (
                              <div>
                                  <h4 className="font-semibold text-sm mb-1">Best Practice:</h4>
                                  <p className="text-sm text-muted-foreground">{item.bestPractice}</p>
                              </div>
                          )}
                          <div>
                              <h4 className="font-semibold text-sm mb-1">Command:</h4>
                              <CodeBlock code={item.command} />
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              ))}
          </Accordion>
      </div>
  );
};

export default function CompliancePage() {
  const { toast } = useToast();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
      e.target.value = '';
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
      <aside className="w-[400px] flex-shrink-0 bg-background p-4 flex flex-col gap-6 border-r">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold font-headline">Compliance Copilot</h1>
            </div>
            <ModeToggle />
          </div>
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-lg">Compliance Documents</CardTitle>
              <CardDescription>Upload one or more documents to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label
                  htmlFor="doc-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground">TXT, PDF, DOCX, XLSX</p>
                  </div>
                  <Input id="doc-upload" type="file" className="hidden" multiple accept=".txt,.pdf,.docx,.xlsx" onChange={handleFileChange} disabled={isParsing} />
                </Label>
                {isParsing && <div className="mt-4 flex items-center text-sm text-muted-foreground"><Loader className="mr-2 h-4 w-4 animate-spin" />Parsing documents...</div>}
                {uploadedDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Document Context</Label>
                    <Select value={selectedContext} onValueChange={setSelectedContext}>
                      <SelectTrigger><SelectValue placeholder="Select context..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        {uploadedDocuments.map(doc => <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 pt-2">
                    {uploadedDocuments.map(doc => (
                      <div key={doc.name} className="rounded-md border p-2 flex items-center gap-2 text-sm">
                        <FileText className="w-5 h-5 text-primary" />
                        <p className="font-medium truncate flex-1">{doc.name}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDocument(doc.name)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
          <Card className="flex-shrink-0">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5" />Tool Instructions</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Upload one or more compliance documents (e.g., GDPR, HIPAA, SOC 2).</p>
                <p>2. Use the dropdown to select which document(s) to use as context for the AI.</p>
                <p>3. Ask specific questions about compliance requirements, controls, or procedures.</p>
                <p>4. If the AI can't find an answer in the docs, you can use the 'Imagination' button to get a general knowledge-based response.</p>
                <p>5. Click the 'Implement' button on an answer to see detailed, multi-cloud (GCP, AWS, Azure) implementation steps with best practices.</p>
                <p>6. You can edit your questions by clicking the pencil icon to refine the conversation.</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-auto pt-4 text-center text-sm text-muted-foreground">
          <p>Made with <3 by @imranfosec</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen">
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex items-start gap-4", message.role === 'user' ? "justify-end" : "")}>
                    {message.role === 'ai' && <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback></Avatar>}
                    <div className={cn("max-w-[75%] rounded-lg p-3 group relative", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border")}>
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="bg-background text-foreground" />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.role === 'ai' && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                               {message.googleCloudDocUrl && <Button asChild variant="outline" size="sm"><a href={message.googleCloudDocUrl} target="_blank" rel="noopener noreferrer"><Info className="mr-2 h-4 w-4" /> Know More</a></Button>}
                               {message.implementation && <Button variant="secondary" size="sm" onClick={() => handleImplementClick(message.implementation!)}><Wrench className="mr-2 h-4 w-4" /> Implement</Button>}
                               {message.answerFound === false && message.userQuestion && <Button variant="secondary" size="sm" onClick={() => handleImaginationClick(message.userQuestion!)}><BrainCircuit className="mr-2 h-4 w-4" /> Use Imagination</Button>}
                            </div>
                          )}
                          {message.role === 'user' && !isLoading && (
                            <Button variant="ghost" size="icon" className="absolute -left-10 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100" onClick={() => handleStartEdit(message)}><Pencil className="w-4 h-4" /></Button>
                          )}
                        </>
                      )}
                    </div>
                    {message.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><User className="w-5 h-5"/></AvatarFallback></Avatar>}
                  </div>
                ))}
                {isLoading && <div className="flex items-start gap-4"><Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback></Avatar><div className="bg-muted rounded-lg p-3 flex items-center"><Loader className="w-5 h-5 animate-spin"/></div></div>}
                <div ref={messagesEndRef} />
            </div>
            {uploadedDocuments.length === 0 && messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><FileText className="w-16 h-16 mb-4" /><h3 className="text-2xl font-bold font-headline text-foreground">Upload Documents</h3><p className="max-w-md">Start by uploading one or more compliance documents to begin.</p></div>}
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleFormSubmit} className="flex items-start gap-4">
                    <Textarea placeholder={uploadedDocuments.length > 0 ? "Ask a question about your document(s)..." : "Please upload a document first"} value={question} onChange={(e) => setQuestion(e.target.value)} className="flex-1 resize-none" disabled={uploadedDocuments.length === 0 || isLoading} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }}/>
                    <Button type="submit" disabled={!question.trim() || isLoading || uploadedDocuments.length === 0}><Send className="w-5 h-5" /><span className="sr-only">Send</span></Button>
                </form>
            </div>
        </div>
      </main>
      <Sheet open={isImplSheetOpen} onOpenChange={setIsImplSheetOpen}>
        <SheetContent className="w-[60vw] sm:max-w-3xl p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="font-headline text-2xl">Implementation Guide</SheetTitle>
              <SheetDescription>Step-by-step guide to implement this compliance measure.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {selectedImplementation ? (
                <Card className="border-0 shadow-none">
                  <CardContent className="p-4">
                    <Tabs defaultValue="gcp" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="gcp" disabled={!selectedImplementation.gcp || selectedImplementation.gcp.length === 0}>GCP</TabsTrigger>
                          <TabsTrigger value="aws" disabled={!selectedImplementation.aws || selectedImplementation.aws.length === 0}>AWS</TabsTrigger>
                          <TabsTrigger value="azure" disabled={!selectedImplementation.azure || selectedImplementation.azure.length === 0}>Azure</TabsTrigger>
                      </TabsList>
                      <TabsContent value="gcp">
                          {renderImplementationSteps(selectedImplementation.gcp)}
                      </TabsContent>
                      <TabsContent value="aws">
                          {renderImplementationSteps(selectedImplementation.aws)}
                      </TabsContent>
                      <TabsContent value="azure">
                          {renderImplementationSteps(selectedImplementation.azure)}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <AlertCircle className="w-16 h-16 mb-4" />
                    <h3 className="text-2xl font-bold font-headline text-foreground">No Implementation Steps</h3>
                    <p className="max-w-md">No implementation steps were generated for this response.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t mt-auto">
              <Button asChild className="w-full">
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                  Open Cloud Console<ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isImaginationSheetOpen} onOpenChange={setIsImaginationSheetOpen}>
        <SheetContent className="w-[50vw] sm:max-w-2xl">
          <SheetHeader>
              <SheetTitle className="font-headline text-2xl flex items-center gap-2"><BrainCircuit /> Imagination Mode</SheetTitle>
              <SheetDescription>Answering your question using general AI knowledge, not your documents.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-80px)]">
              <div>
                <h4 className="font-semibold mb-2 text-sm">Your Question:</h4>
                <p className="text-muted-foreground p-3 border rounded-md text-sm">{currentImaginationQuery}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">AI Answer:</h4>
                <div className="p-3 border rounded-md min-h-[100px]">
                  {isImaginationLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader className="w-5 h-5 animate-spin"/>Generating...</div>}
                  {imaginationError && <p className="text-destructive text-sm">{imaginationError}</p>}
                  {imaginationResult && <p className="whitespace-pre-wrap text-sm">{imaginationResult}</p>}
                </div>
              </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
