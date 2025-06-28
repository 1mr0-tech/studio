"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { complianceQuestionAnswering, type ComplianceQuestionAnsweringOutput } from '@/ai/flows/compliance-question-answering';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, FileText, Send, Loader, Upload, ExternalLink, Info, User, AlertCircle, Wrench, Pencil, Save, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CodeBlock } from '@/components/code-block';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ModeToggle } from '@/components/mode-toggle';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type ImplementationStep = ComplianceQuestionAnsweringOutput['implementationSteps'][0];
type UploadedDoc = { name: string; content: string; };

type Message = {
  id: number;
  role: 'user' | 'ai';
  content: string;
  implementationSteps?: ImplementationStep[];
  googleCloudDocUrl?: string;
};

export default function CompliancePage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDoc[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedImplementationSteps, setSelectedImplementationSteps] = useState<ImplementationStep[] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);

    const filePromises = Array.from(files).map(file => {
      return new Promise<UploadedDoc | null>(async (resolve) => {
        const supportedTypes = ['.txt', '.pdf', '.docx', '.xlsx'];
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!supportedTypes.includes(fileExtension)) {
          toast({
            variant: "destructive",
            title: "Unsupported file type",
            description: `Skipping ${file.name}. Please use: ${supportedTypes.join(', ')}`,
          });
          resolve(null);
          return;
        }

        try {
          const arrayBuffer = await file.arrayBuffer();
          let textContent = '';
          if (file.name.endsWith('.txt')) {
            textContent = new TextDecoder().decode(arrayBuffer);
          } else if (file.name.endsWith('.pdf')) {
            const typedarray = new Uint8Array(arrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let pdfText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const text = await page.getTextContent();
              pdfText += text.items.map(s => (s as any).str).join(' ');
            }
            textContent = pdfText;
          } else if (file.name.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ arrayBuffer });
            textContent = result.value;
          } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let excelContent = '';
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              excelContent += json.map(row => (row as any[]).join(' ')).join('\n');
            });
            textContent = excelContent;
          }
          resolve({ name: file.name, content: textContent });
        } catch (error) {
          console.error("Error parsing file:", error);
          toast({ variant: "destructive", title: "File parsing error", description: `Could not read ${file.name}.` });
          resolve(null);
        }
      });
    });

    const newDocs = (await Promise.all(filePromises)).filter((doc): doc is UploadedDoc => doc !== null);
    
    setUploadedDocuments(prevDocs => {
      const existingNames = new Set(prevDocs.map(d => d.name));
      const uniqueNewDocs = newDocs.filter(d => !existingNames.has(d.name));
      return [...prevDocs, ...uniqueNewDocs];
    });

    if (messages.length === 0) {
      setMessages([{ id: Date.now(), role: 'ai', content: `Document(s) loaded. How can I help you?` }]);
    }
    
    setIsParsing(false);
    // Reset file input
    e.target.value = '';
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
        implementationSteps: aiResult.implementationSteps,
        googleCloudDocUrl: aiResult.googleCloudDocUrl,
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

    // Create a new history up to the point of the edited message
    const newMessages = messages.slice(0, messageIndex);
    const updatedUserMessage: Message = { ...messages[messageIndex], content: editingText };
    newMessages.push(updatedUserMessage);

    setMessages(newMessages);
    setEditingMessageId(null);
    setEditingText('');

    await askAI(editingText, newMessages);
  };

  const handleImplementClick = (steps: ImplementationStep[]) => {
    setSelectedImplementationSteps(steps);
    setIsSheetOpen(true);
  };

  const documentsAvailable = uploadedDocuments.length > 0;
  
  return (
    <div className="flex h-screen bg-muted/40 font-body">
      <aside className="w-[400px] flex-shrink-0 bg-background p-4 flex flex-col gap-6 border-r">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold font-headline">Compliance Assist</h1>
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
              <p>1. Upload compliance documents (e.g., GDPR, HIPAA).</p>
              <p>2. Select which document(s) to use for context.</p>
              <p>3. Ask questions. Use the 'Implement' button for steps.</p>
              <p>4. Edit your questions using the pencil icon.</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-auto pt-4 text-center text-sm text-muted-foreground">
          <p>Made with &lt;3 by @imranfosec</p>
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
                          {message.role === 'ai' && (message.googleCloudDocUrl || (message.implementationSteps && message.implementationSteps.length > 0)) && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                              {message.googleCloudDocUrl && <Button asChild variant="outline" size="sm"><a href={message.googleCloudDocUrl} target="_blank" rel="noopener noreferrer"><Info className="mr-2 h-4 w-4" /> Know More</a></Button>}
                              {message.implementationSteps && message.implementationSteps.length > 0 && <Button variant="secondary" size="sm" onClick={() => handleImplementClick(message.implementationSteps!)}><Wrench className="mr-2 h-4 w-4" /> Implement</Button>}
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
            {!documentsAvailable && messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><FileText className="w-16 h-16 mb-4" /><h3 className="text-2xl font-bold font-headline text-foreground">Upload Documents</h3><p className="max-w-md">Start by uploading one or more compliance documents to begin.</p></div>}
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleFormSubmit} className="flex items-start gap-4">
                    <Textarea placeholder={documentsAvailable ? "Ask a question about your document(s)..." : "Please upload a document first"} value={question} onChange={(e) => setQuestion(e.target.value)} className="flex-1 resize-none" disabled={!documentsAvailable || isLoading} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }}/>
                    <Button type="submit" disabled={!question.trim() || isLoading || !documentsAvailable}><Send className="w-5 h-5" /><span className="sr-only">Send</span></Button>
                </form>
            </div>
        </div>
      </main>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[50vw] sm:max-w-2xl p-0">
          <div className="h-full overflow-y-auto p-4">
            {selectedImplementationSteps && selectedImplementationSteps.length > 0 ? (
              <Card className="border-0 shadow-none">
                <SheetHeader className="p-2">
                  <SheetTitle className="font-headline text-2xl">Implementation Steps</SheetTitle>
                  <SheetDescription>Step-by-step guide to implement this compliance measure on GCP.</SheetDescription>
                </SheetHeader>
                <CardContent className="p-2">
                  <Accordion type="multiple" className="w-full space-y-2">
                    {selectedImplementationSteps.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`} className="bg-muted/50 rounded-lg border px-4">
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex-1 pr-4 min-w-0">
                            <span className="font-semibold">Step {index + 1}:</span> {item.step}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <CodeBlock code={item.gcpSdkCommand} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="mt-6 flex justify-end">
                    <Button asChild>
                      <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                        Open GCP Console<ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <AlertCircle className="w-16 h-16 mb-4" />
                <h3 className="text-2xl font-bold font-headline text-foreground">No Implementation Steps Selected</h3>
                <p className="max-w-md">Click the 'Implement' button on a chat answer to see the steps here.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
