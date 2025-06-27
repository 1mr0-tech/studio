"use client";

import { useState } from 'react';
import { complianceQuestionAnswering, type ComplianceQuestionAnsweringOutput } from '@/ai/flows/compliance-question-answering';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { BrainCircuit, FileText, Send, Loader, Bot, ExternalLink, ChevronRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CodeBlock } from '@/components/code-block';
import { Separator } from '@/components/ui/separator';

const COMPLIANCE_DOCS_MOCK = `
GDPR - Article 32: Security of processing
1. Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including inter alia as appropriate:
(a) the pseudonymisation and encryption of personal data;
...

HIPAA Security Rule - § 164.312 Technical safeguards.
(a) Standard: Access control. Implement technical policies and procedures for electronic information systems that maintain electronic protected health information to allow access only to those persons or software programs that have been granted access rights as specified in § 164.308(a)(4).
...
(e)(1) Standard: Transmission security. Implement technical security measures to guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network.
(e)(2)(ii) Standard: Encryption. Implement a mechanism to encrypt electronic protected health information whenever deemed appropriate.
`;

const USER_QUESTION_MOCK = "How do I ensure data is encrypted in transit and at rest on GCP to comply with GDPR and HIPAA?";


export default function CompliancePage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState(USER_QUESTION_MOCK);
  const [result, setResult] = useState<ComplianceQuestionAnsweringOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        complianceDocuments: COMPLIANCE_DOCS_MOCK,
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

  return (
    <SidebarProvider>
      <Sidebar>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-primary w-8 h-8" />
              <h1 className="text-2xl font-headline font-bold">Compliance Copilot</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4 flex flex-col gap-6">
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Compliance Document</Label>
              <Card className="bg-background">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-medium">gcp_compliance_pack.txt</p>
                    <p className="text-xs text-muted-foreground">GDPR, HIPAA policies</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="question-input">Your Question</Label>
              <Textarea
                id="question-input"
                placeholder="Ask about compliance requirements..."
                className="flex-1 resize-none bg-background"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
          </SidebarContent>
          <SidebarFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Asking...
                </>
              ) : (
                <>
                  Ask Copilot
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
              <p className="text-lg font-semibold">Generating compliance guidance</p>
              <p className="text-muted-foreground">Please wait while our AI analyzes your request...</p>
            </div>
          )}

          {!isLoading && !result && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold font-headline">Ready to Assist</h3>
              <p className="text-muted-foreground max-w-md">
                Ask a question about your compliance documents to get AI-powered answers and actionable GCP implementation steps.
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
