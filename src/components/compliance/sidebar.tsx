
'use client';

import type { ChangeEvent } from 'react';
import { Bot, FileText, Info, KeyRound, Loader, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeToggle } from '@/components/mode-toggle';
import type { UploadedDoc } from '@/ai/types';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ComplianceSidebarProps {
  isParsing: boolean;
  uploadedDocuments: UploadedDoc[];
  selectedContext: string;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDeleteDocument: (docName: string) => void;
  onContextChange: (value: string) => void;
  onApiKeyClick: () => void;
}

export function ComplianceSidebar({
  isParsing,
  uploadedDocuments,
  selectedContext,
  handleFileChange,
  handleDeleteDocument,
  onContextChange,
  onApiKeyClick,
}: ComplianceSidebarProps) {
  return (
    <aside className="w-[400px] flex-shrink-0 bg-background p-4 flex flex-col gap-6 border-r">
      <div className="flex flex-col gap-6 overflow-y-auto pr-2 -mr-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">Compliance Connect</h1>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onApiKeyClick}>
                    <KeyRound className="w-5 h-5" />
                    <span className="sr-only">API Key</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage API Key</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ModeToggle />
          </div>
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
                <Select value={selectedContext} onValueChange={onContextChange}>
                  <SelectTrigger><SelectValue placeholder="Select context..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    {uploadedDocuments.map(doc => <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <ScrollArea className="h-40">
                  <div className="space-y-2 pt-2 pr-4">
                    <TooltipProvider delayDuration={100}>
                      {uploadedDocuments.map(doc => (
                        <div key={doc.name} className="rounded-md border p-2 flex items-center gap-2 text-sm">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 min-w-0 truncate font-medium" title={doc.name}>
                                {doc.name.length > 30 ? `${doc.name.substring(0, 30)}...` : doc.name}
                              </div>
                            </TooltipTrigger>
                            {doc.name.length > 30 && <TooltipContent><p>{doc.name}</p></TooltipContent>}
                          </Tooltip>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleDeleteDocument(doc.name)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="flex-shrink-0">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5" />Tool Instructions</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                <p>1. Upload one or more compliance documents (e.g., GDPR, HIPAA, SOC 2).</p>
                <p>2. Use the dropdown to select which document(s) to use as context for the AI.</p>
                <p>3. Ask specific questions about compliance requirements, controls, or procedures.</p>
                <p>4. If the AI can't find an answer in the docs, you can use the 'Imagination' button to get a general knowledge-based response.</p>
                <p>5. Click the 'Implement' button on an answer to see detailed, multi-cloud (GCP, AWS, Azure) implementation steps with best practices.</p>
                <p>6. You can edit your questions by clicking the pencil icon to refine the conversation.</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <div className="mt-auto pt-4 text-center text-sm text-muted-foreground">
        <p>Made with {'<3'} by @imranfosec</p>
      </div>
    </aside>
  );
}
