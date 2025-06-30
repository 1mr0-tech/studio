
'use client';

import { useState, useEffect, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeBlock } from '@/components/code-block';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Implementation, Message } from '@/ai/types';
import { AlertCircle, Bot, BrainCircuit, ExternalLink, FileText, Info, Loader, Pencil, Send, User, Wrench } from 'lucide-react';

type ImplementationStep = NonNullable<Implementation['gcp']>[0];

const consoleUrls: Record<string, { name: string; url: string }> = {
  gcp: { name: 'GCP', url: 'https://console.cloud.google.com/' },
  aws: { name: 'AWS', url: 'https://console.aws.amazon.com/' },
  azure: { name: 'Azure', url: 'https://portal.azure.com/' },
};

function renderImplementationSteps(steps: ImplementationStep[] | undefined) {
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
                              <h4 className="font-semibold text-sm mb-1">Instructions:</h4>
                              <CodeBlock code={item.command} />
                          </div>
                          {item.referenceUrl && (
                              <div>
                                <Button asChild variant="link" size="sm" className="p-0 h-auto font-normal text-muted-foreground hover:text-primary">
                                    <a href={item.referenceUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Reference Documentation
                                    </a>
                                </Button>
                              </div>
                          )}
                      </AccordionContent>
                  </AccordionItem>
              ))}
          </Accordion>
      </div>
  );
}


interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  question: string;
  documentsAvailable: boolean;
  editingMessageId: number | null;
  editingText: string;
  isImplSheetOpen: boolean;
  selectedImplementation: Implementation | null;
  messagesEndRef: RefObject<HTMLDivElement>;
  onQuestionChange: (value: string) => void;
  onFormSubmit: (e: React.FormEvent) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSetEditingText: (value: string) => void;
  onImplementClick: (implementation: Implementation) => void;
  onImaginationClick: (userQuestion: string) => void;
  onGlobalImaginationClick: () => void;
  onImplSheetOpenChange: (open: boolean) => void;
  // Imagination Props
  isImaginationSheetOpen: boolean;
  imaginationMessages: Message[];
  isImaginationLoading: boolean;
  currentImaginationQuery: string;
  imaginationQuestion: string;
  onImaginationQuestionChange: (value: string) => void;
  onImaginationSubmit: (e: React.FormEvent) => void;
  onImaginationSheetOpenChange: (open: boolean) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  question,
  documentsAvailable,
  editingMessageId,
  editingText,
  isImplSheetOpen,
  selectedImplementation,
  messagesEndRef,
  onQuestionChange,
  onFormSubmit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetEditingText,
  onImplementClick,
  onImaginationClick,
  onGlobalImaginationClick,
  onImplSheetOpenChange,
  // Imagination Props
  isImaginationSheetOpen,
  imaginationMessages,
  isImaginationLoading,
  currentImaginationQuery,
  imaginationQuestion,
  onImaginationQuestionChange,
  onImaginationSubmit,
  onImaginationSheetOpenChange,
}: ChatInterfaceProps) {
  const [activeCloudTab, setActiveCloudTab] = useState('gcp');

  useEffect(() => {
    if (isImplSheetOpen && selectedImplementation) {
      const defaultTab = 
        selectedImplementation.gcp?.length ? 'gcp' :
        selectedImplementation.aws?.length ? 'aws' :
        selectedImplementation.azure?.length ? 'azure' : 'gcp';
      setActiveCloudTab(defaultTab);
    }
  }, [isImplSheetOpen, selectedImplementation]);

  const markdownComponents = {
    p: ({node, ...props}: any) => <p className="whitespace-pre-wrap break-words mb-2 last:mb-0" {...props} />,
    table: ({node, ...props}: any) => <table className="w-full my-2 border-collapse" {...props} />,
    thead: ({node, ...props}: any) => <thead className="bg-muted/50" {...props} />,
    tr: ({node, ...props}: any) => <tr className="border-b last:border-b-0" {...props} />,
    th: ({node, ...props}: any) => <th className="border p-2 text-left font-semibold" {...props} />,
    td: ({node, ...props}: any) => <td className="border p-2" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-2" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-2" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      return !inline ? (
        <CodeBlock code={String(children).replace(/\n$/, '')} />
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded-md font-code text-sm" {...props}>
          {children}
        </code>
      );
    }
  };
  
  return (
    <>
      <main className="flex-1 flex flex-col h-screen">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex items-start gap-4", message.role === 'user' ? "justify-end" : "")}>
                {message.role === 'ai' && <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback></Avatar>}
                <div className={cn("max-w-[75%] rounded-lg p-3 group relative", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border")}>
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <Textarea value={editingText} onChange={(e) => onSetEditingText(e.target.value)} className="bg-background text-foreground" />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
                        <Button size="sm" onClick={onSaveEdit}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        {message.role === 'ai' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="text-sm"
                              components={markdownComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                      </div>

                      {message.role === 'ai' && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                          {message.implementation && <Button variant="secondary" size="sm" onClick={() => onImplementClick(message.implementation!)}><Wrench className="mr-2 h-4 w-4" /> Implement</Button>}
                          {message.answerFound === false && message.userQuestion && <Button variant="secondary" size="sm" onClick={() => onImaginationClick(message.userQuestion!)}><BrainCircuit className="mr-2 h-4 w-4" /> Use Imagination</Button>}
                        </div>
                      )}
                      {message.role === 'user' && !isLoading && (
                        <Button variant="ghost" size="icon" className="absolute -left-10 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100" onClick={() => onStartEdit(message)}><Pencil className="w-4 h-4" /></Button>
                      )}
                    </>
                  )}
                </div>
                {message.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><User className="w-5 h-5" /></AvatarFallback></Avatar>}
              </div>
            ))}
            {isLoading && <div className="flex items-start gap-4"><Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback></Avatar><div className="bg-muted rounded-lg p-3 flex items-center"><Loader className="w-5 h-5 animate-spin" /></div></div>}
            <div ref={messagesEndRef} />
          </div>
          {!documentsAvailable && messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><FileText className="w-16 h-16 mb-4" /><h3 className="text-2xl font-bold font-headline text-foreground">Upload Documents</h3><p className="max-w-md">Start by uploading one or more compliance documents to begin.</p></div>}
          <div className="p-4 border-t bg-background">
            <form onSubmit={onFormSubmit} className="flex items-start gap-4">
              <Textarea placeholder={documentsAvailable ? "Ask a question about your document(s)..." : "Please upload a document first"} value={question} onChange={(e) => onQuestionChange(e.target.value)} className="flex-1 resize-none" disabled={!documentsAvailable || isLoading} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onFormSubmit(e); } }} />
              <Button type="submit" disabled={!question.trim() || isLoading || !documentsAvailable}><Send className="w-5 h-5" /><span className="sr-only">Send</span></Button>
            </form>
            <div className="flex items-center justify-center pt-2">
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGlobalImaginationClick}
                  disabled={!question.trim() || isLoading}
              >
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  Or, ask with Imagination
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Sheet open={isImplSheetOpen} onOpenChange={onImplSheetOpenChange}>
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
                    <Tabs value={activeCloudTab} onValueChange={setActiveCloudTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gcp" disabled={!selectedImplementation.gcp || selectedImplementation.gcp.length === 0}>GCP</TabsTrigger>
                        <TabsTrigger value="aws" disabled={!selectedImplementation.aws || selectedImplementation.aws.length === 0}>AWS</TabsTrigger>
                        <TabsTrigger value="azure" disabled={!selectedImplementation.azure || selectedImplementation.azure.length === 0}>Azure</TabsTrigger>
                      </TabsList>
                      <TabsContent value="gcp">{renderImplementationSteps(selectedImplementation.gcp)}</TabsContent>
                      <TabsContent value="aws">{renderImplementationSteps(selectedImplementation.aws)}</TabsContent>
                      <TabsContent value="azure">{renderImplementationSteps(selectedImplementation.azure)}</TabsContent>
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
                <a href={consoleUrls[activeCloudTab]?.url} target="_blank" rel="noopener noreferrer">
                  Open {consoleUrls[activeCloudTab]?.name} Console<ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isImaginationSheetOpen} onOpenChange={onImaginationSheetOpenChange}>
        <SheetContent className="w-[50vw] sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-headline text-2xl flex items-center gap-2"><BrainCircuit /> Imagination Mode</SheetTitle>
            <SheetDescription>Answering "{currentImaginationQuery}" using general AI knowledge.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {imaginationMessages.map((message) => (
              <div key={message.id} className={cn("flex items-start gap-4", message.role === 'user' ? "justify-end" : "")}>
                {message.role === 'ai' && <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback></Avatar>}
                <div className={cn("max-w-[85%] rounded-lg p-3", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-card border")}>
                  <div className="overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="text-sm"
                      components={markdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
                {message.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><User className="w-5 h-5" /></AvatarFallback></Avatar>}
              </div>
            ))}
            {isImaginationLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback></Avatar>
                <div className="bg-muted rounded-lg p-3 flex items-center">
                  <Loader className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t bg-background">
            <form onSubmit={onImaginationSubmit} className="flex items-start gap-4">
              <Textarea 
                placeholder="Ask a follow-up question..." 
                value={imaginationQuestion} 
                onChange={(e) => onImaginationQuestionChange(e.target.value)} 
                className="flex-1 resize-none" 
                disabled={isImaginationLoading} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onImaginationSubmit(e); } }} 
              />
              <Button type="submit" disabled={!imaginationQuestion.trim() || isImaginationLoading}><Send className="w-5 h-5" /><span className="sr-only">Send</span></Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
