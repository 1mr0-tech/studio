"use client";

import { useState, type ChangeEvent } from 'react';
import { complianceQuestionAnswering, type ComplianceQuestionAnsweringOutput } from '@/ai/flows/compliance-question-answering';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { BrainCircuit, FileText, Send, Loader, Bot, ExternalLink, ChevronRight, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function CompliancePage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("How do I ensure data is encrypted in transit and at rest on GCP to comply with GDPR and HIPAA?");
  const [documentContent, setDocumentContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [result, setResult] = useState<ComplianceQuestionAnsweringOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName('');
    setDocumentContent('');
    setIsLoading(true);

    const supportedTypes = ['.txt', '.pdf', '.docx', '.xlsx'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

    if (!supportedTypes.includes(fileExtension)) {
        toast({
            variant: "destructive",
            title: "Unsupported file type",
            description: `Please upload one of the following file types: ${supportedTypes.join(', ')}`,
        });
        setIsLoading(false);
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
    } catch (error) {
        console.error("Error parsing file:", error);
        toast({
            variant: "destructive",
            title: "File parsing error",
            description: "Could not read the content of the file. It may be corrupted.",
        });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentContent) {
      toast({
        variant: "destructive",
        title: "No document loaded",
        description: "Please upload and wait for a compliance document to be processed.",
      });
      return;
    }

    if (!question.trim()) {
      toast({
        variant: "destructive",
        title: "Question is empty",
        description: "Please enter a question about compliance requirements.",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setShowSteps(false);

    try {
      const aiResult = await complianceQuestionAnswering({
        complianceDocuments: documentContent,
        userQuestion: question,
      });
      setResult(aiResult);
    } catch (error) {
      console.error("Error calling AI:", error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get a response from the AI. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadingText = isLoading && !result ? 
    (fileName && !documentContent ? 'Parsing document...' : 'Generating compliance guidance') : 
    'Generating compliance guidance';

  return (
    <SidebarProvider>
      <Sidebar>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-primary w-8 h-8" />
              <h1 className="text-2xl font-headline font-bold">Compliance Assist</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4 flex flex-col gap-6">
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Compliance Document</Label>
              <div className="flex items-center justify-center w-full">
                <Label
                  htmlFor="doc-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground text-center">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-muted-foreground">TXT, PDF, DOCX, XLSX</p>
                  </div>
                  <Input
                    id="doc-upload"
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </Label>
              </div>

              {fileName && (
                <Card className="bg-background mt-4">
                  <CardContent className="p-3 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {documentContent ? 'Document loaded.' : 'Parsing...'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="question-input">Your Question</Label>
              <Textarea
                id="question-input"
                placeholder="Ask about your compliance document..."
                className="flex-1 resize-none bg-background"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </SidebarContent>
          <SidebarFooter>
            <Button type="submit" className="w-full" disabled={isLoading || !documentContent}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {fileName && !documentContent ? 'Parsing...' : 'Asking...'}
                </>
              ) : (
                <>
                  Ask Assist
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </SidebarFooter>
        </form>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <h2 className="font-semibold text-lg md:text-xl font-headline">Results</h2>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold">{loadingText}</p>
              <p className="text-muted-foreground">Please wait while our AI analyzes your request...</p>
            </div>
          )}

          {!isLoading && !result && (
             <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold font-headline">Ready to Assist</h3>
              <p className="text-muted-foreground max-w-md">
                Upload a compliance document and ask a question to get AI-powered answers and actionable GCP implementation steps.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-3">
                    <Bot className="w-8 h-8 text-primary" />
                    AI-Generated Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-relaxed">{result.answer}</p>
                  <Separator className="my-6" />
                  {!showSteps && (
                    <Button onClick={() => setShowSteps(true)}>
                      View Implementation Steps
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {showSteps && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl">Implementation Steps</CardTitle>
                    <CardDescription>Step-by-step guide to implement this compliance measure on GCP.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full space-y-2">
                      {result.implementationSteps.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="bg-background/50 rounded-lg border px-4">
                          <AccordionTrigger className="text-left hover:no-underline">
                            <span className="font-semibold">Step {index + 1}:</span> {item.step}
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
                          Implement on GCP
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
