"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { complianceQuestionAnswering, type ComplianceQuestionAnsweringOutput } from '@/ai/flows/compliance-question-answering';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Send, Loader, Upload, ExternalLink, Info, User, AlertCircle, Wrench } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CodeBlock } from '@/components/code-block';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type ImplementationStep = ComplianceQuestionAnsweringOutput['implementationSteps'][0];

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
  const [documentContent, setDocumentContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedImplementationSteps, setSelectedImplementationSteps] = useState<ImplementationStep[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName('');
    setDocumentContent('');
    setMessages([]);
    setSelectedImplementationSteps(null);
    setActiveTab("chat");
    setIsParsing(true);

    const supportedTypes = ['.txt', '.pdf', '.docx', '.xlsx'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

    if (!supportedTypes.includes(fileExtension)) {
        toast({
            variant: "destructive",
            title: "Unsupported file type",
            description: `Please upload one of the following file types: ${supportedTypes.join(', ')}`,
        });
        setIsParsing(false);
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
      
      setDocumentContent(textContent);
      setFileName(file.name);
      setMessages([{ 
        id: Date.now(), 
        role: 'ai', 
        content: `Document "${file.name}" loaded. How can I help you with your compliance requirements?` 
      }]);
    } catch (error) {
        console.error("Error parsing file:", error);
        toast({
            variant: "destructive",
            title: "File parsing error",
            description: "Could not read the content of the file. It may be corrupted.",
        });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImplementClick = (steps: ImplementationStep[]) => {
    setSelectedImplementationSteps(steps);
    setActiveTab('implementation');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    if (!documentContent) {
      toast({
        variant: "destructive",
        title: "No document loaded",
        description: "Please upload a compliance document first.",
      });
      return;
    }

    const userMessage: Message = { id: Date.now(), role: 'user', content: question };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuestion('');
    setIsLoading(true);

    try {
      const aiResult = await complianceQuestionAnswering({
        complianceDocuments: documentContent,
        userQuestion: question,
      });

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: aiResult.answer,
        implementationSteps: aiResult.implementationSteps,
        googleCloudDocUrl: aiResult.googleCloudDocUrl
      };
      setMessages([...newMessages, aiMessage]);

      if (aiResult.implementationSteps && aiResult.implementationSteps.length > 0 && !selectedImplementationSteps) {
        setSelectedImplementationSteps(aiResult.implementationSteps);
      }

    } catch (error) {
      console.error("Error calling AI:", error);
      const errorMessage: Message = { 
        id: Date.now() + 1,
        role: 'ai', 
        content: "Sorry, I encountered an error while processing your request. Please try again."
      };
      setMessages([...newMessages, errorMessage]);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get a response from the AI. The response may have been blocked due to safety settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-muted/40 font-body">
      <aside className="w-[400px] flex-shrink-0 bg-background p-4 flex flex-col gap-6 border-r">
        <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">Compliance Assist</h1>
        </div>
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg">Upload Section</CardTitle>
            <CardDescription>Upload your compliance document to get started.</CardDescription>
          </CardHeader>
          <CardContent>
             <Label
                htmlFor="doc-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">TXT, PDF, DOCX, or XLSX</p>
                </div>
                <Input
                  id="doc-upload"
                  type="file"
                  className="hidden"
                  accept=".txt,.pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={isParsing}
                />
              </Label>
              {isParsing && (
                  <div className="mt-4 flex items-center text-sm text-muted-foreground">
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Parsing document...
                  </div>
              )}
              {fileName && !isParsing && (
                <div className="mt-4 rounded-md border p-3 flex items-center gap-3 text-sm">
                  <FileText className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium truncate">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Document loaded successfully.
                    </p>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Tool Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Upload a compliance document (e.g., GDPR, HIPAA text).</p>
            <p>2. Ask specific questions about the document in the chat.</p>
            <p>3. Use the 'Implement' button on an answer to see the steps in the Implementation tab.</p>
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1 flex flex-col h-screen">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="p-4 border-b">
                <TabsList>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="implementation" disabled={!selectedImplementationSteps}>Implementation</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((message) => (
                        <div key={message.id} className={cn("flex items-start gap-4", message.role === 'user' ? "justify-end" : "")}>
                            {message.role === 'ai' && (
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn("max-w-[75%] rounded-lg p-3", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border")}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                {message.role === 'ai' && (message.googleCloudDocUrl || (message.implementationSteps && message.implementationSteps.length > 0)) && (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {message.googleCloudDocUrl && (
                                      <Button asChild variant="outline" size="sm">
                                        <a href={message.googleCloudDocUrl} target="_blank" rel="noopener noreferrer">
                                          <Info className="mr-2 h-4 w-4" /> Know More
                                        </a>
                                      </Button>
                                    )}
                                    {message.implementationSteps && message.implementationSteps.length > 0 && (
                                      <Button variant="secondary" size="sm" onClick={() => handleImplementClick(message.implementationSteps!)}>
                                        <Wrench className="mr-2 h-4 w-4" /> Implement
                                      </Button>
                                    )}
                                  </div>
                                )}
                            </div>
                             {message.role === 'user' && (
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                            </Avatar>
                            <div className="bg-muted rounded-lg p-3 flex items-center">
                                <Loader className="w-5 h-5 animate-spin"/>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {!documentContent && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <FileText className="w-16 h-16 mb-4" />
                    <h3 className="text-2xl font-bold font-headline text-foreground">Upload a Document</h3>
                    <p className="max-w-md">
                      Start by uploading a compliance document to begin your session.
                    </p>
                  </div>
                )}
                
                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSubmit} className="flex items-start gap-4">
                        <Textarea
                            placeholder={documentContent ? "Ask a question about your document..." : "Please upload a document first"}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="flex-1 resize-none"
                            disabled={!documentContent || isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <Button type="submit" disabled={!question.trim() || isLoading || !documentContent}>
                           <Send className="w-5 h-5" />
                           <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </div>
            </TabsContent>
            <TabsContent value="implementation" className="flex-1 overflow-y-auto p-4 mt-0">
              {selectedImplementationSteps && selectedImplementationSteps.length > 0 ? (
                 <Card>
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl">Implementation Steps</CardTitle>
                    <CardDescription>Step-by-step guide to implement this compliance measure on GCP.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full space-y-2">
                      {selectedImplementationSteps.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="bg-muted/50 rounded-lg border px-4">
                          <AccordionTrigger className="text-left hover:no-underline">
                             <div className="flex-1 text-left">
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
                          Open GCP Console
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <AlertCircle className="w-16 h-16 mb-4" />
                    <h3 className="text-2xl font-bold font-headline text-foreground">No Implementation Steps Selected</h3>
                    <p className="max-w-md">
                      Click the 'Implement' button on a chat answer to see the steps here.
                    </p>
                </div>
              )}
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
