import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { client, safeApiCall } from "@/lib/amplify-client";
import {
  FileText,
  AlertTriangle,
  Download,
  Copy,
  Loader2,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  readFilesAsBase64,
  isAllowedDocumentOrImage,
  formatFileSize,
} from "@/lib/file";
import { UploadPicker } from "@/components/UploadPicker";
import { FileChip } from "@/components/FileChip";
import { EditDocumentModal } from "@/components/EditDocumentModal";
import { extractText, UnifiedExtractionResult } from "@/services/textExtractor";

interface FileAnalysisResult {
  clauses: Array<{
    title: string;
    snippet: string;
    reason: string;
  }>;
  risks: Array<{
    risk: string;
    severity: "low" | "medium" | "high";
    explanation: string;
    recommendedAction: string;
  }>;
}

interface SelectedFile {
  file: File;
  status: "idle" | "extracting" | "uploading" | "done" | "error";
  editedText?: string;
  extractedText?: string;
  extractionResult?: UnifiedExtractionResult;
  progress?: number;
}

export default function DocumentAnalyzer() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<
    Record<string, FileAnalysisResult>
  >({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [editingFile, setEditingFile] = useState<{
    file: File;
    text: string;
  } | null>(null);
  const { toast } = useToast();

  const handleFilesSelected = async (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];

    for (const file of files) {
      if (!isAllowedDocumentOrImage(file)) {
        toast({
          title: "Invalid file type",
          description: `${file.name}: Please upload PDF, DOCX, TXT, or image files only.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name}: File size exceeds 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newSelectedFiles = validFiles.map((file) => ({
      file,
      status: "idle" as const,
    }));

    setSelectedFiles((prev) => [...prev, ...newSelectedFiles]);

    // Set first file as active tab if no tab is active
    if (!activeTab && validFiles.length > 0) {
      setActiveTab(validFiles[0].name);
    }

    // Start extracting text from uploaded files
    await extractTextFromFiles(newSelectedFiles.length - validFiles.length, validFiles);
  };

  const extractTextFromFiles = async (startIndex: number, files: File[]) => {
    for (let i = 0; i < files.length; i++) {
      const fileIndex = startIndex + i;
      const file = files[i];
      
      // Update status to extracting
      setSelectedFiles(prev => prev.map((f, idx) =>
        idx === fileIndex ? { ...f, status: 'extracting', progress: 0 } : f
      ));

      try {
        const result = await extractText(file, {
          fallbackToOCR: true,
          ocrOptions: {
            logger: (info) => {
              setSelectedFiles(prev => prev.map((f, idx) =>
                idx === fileIndex ? { ...f, progress: info.progress } : f
              ));
            }
          }
        });

        // Update with extraction results
        setSelectedFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? { 
            ...f, 
            status: 'idle', 
            extractedText: result.text,
            extractionResult: result,
            progress: 100 
          } : f
        ));

        toast({
          title: "Text extracted successfully",
          description: `Extracted ${result.text.length} characters from ${file.name}`,
        });

      } catch (error) {
        setSelectedFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? { 
            ...f, 
            status: 'error',
            progress: 0
          } : f
        ));

        toast({
          title: "Text extraction failed",
          description: `Unable to extract text from ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleEditFile = async (index: number) => {
    const selectedFile = selectedFiles[index];
    if (!selectedFile) return;

    try {
      let initialText = selectedFile.editedText || "";

      if (!initialText) {
        // Use extracted text if available
        if (selectedFile.extractedText) {
          initialText = selectedFile.extractedText;
        } else if (selectedFile.file.type === "text/plain") {
          initialText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(selectedFile.file);
          });
        } else {
          initialText = `[Content of ${selectedFile.file.name}]\n\nThis is a placeholder for the document content. You can edit this text and it will be used instead of the original file content when analyzing the document.`;
        }
      }

      setEditingFile({ file: selectedFile.file, text: initialText });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to read file content for editing",
        variant: "destructive",
      });
    }
  };

  const handleSaveEditedText = (newText: string) => {
    if (!editingFile) return;

    setSelectedFiles((prev) =>
      prev.map((sf) =>
        sf.file.name === editingFile.file.name &&
        sf.file.size === editingFile.file.size
          ? { ...sf, editedText: newText }
          : sf
      )
    );

    setEditingFile(null);

    toast({
      title: "Document updated",
      description: "Your edits have been saved and will be used for analysis",
    });
  };

  const handleRemoveFile = (index: number) => {
    const removedFile = selectedFiles[index];
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

    if (removedFile) {
      setAnalysisResults((prev) => {
        const newResults = { ...prev };
        delete newResults[removedFile.file.name];
        return newResults;
      });

      if (activeTab === removedFile.file.name) {
        const remainingFiles = selectedFiles.filter((_, i) => i !== index);
        setActiveTab(
          remainingFiles.length > 0 ? remainingFiles[0].file.name : ""
        );
      }
    }
  };

  const getStatusIcon = (status: SelectedFile['status']) => {
    switch (status) {
      case 'idle':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'extracting':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleAnalyzeAll = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const results: Record<string, FileAnalysisResult> = {};

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        const { file } = selectedFile;

        setSelectedFiles((prev) =>
          prev.map((sf, idx) =>
            idx === i ? { ...sf, status: "uploading" } : sf
          )
        );

        try {
          let contentToAnalyze: any = {};

          // Use edited text, extracted text, or fallback to base64
          if (selectedFile.editedText) {
            contentToAnalyze.text = selectedFile.editedText;
          } else if (selectedFile.extractedText) {
            contentToAnalyze.text = selectedFile.extractedText;
          } else {
            const filesData = await readFilesAsBase64([file]);
            contentToAnalyze.fileBase64 = filesData[0].base64;
          }

          const [clausesResult, risksResult] = await Promise.all([
            safeApiCall(
              () =>
                contentToAnalyze.text
                  ? client.queries.extractClauses({
                      text: contentToAnalyze.text,
                    })
                  : client.queries.extractClauses({
                      fileBase64: contentToAnalyze.fileBase64,
                    }),
              { clauses: [] }
            ),
            safeApiCall(
              () =>
                contentToAnalyze.text
                  ? client.queries.assessRisks({ text: contentToAnalyze.text })
                  : client.queries.assessRisks({
                      fileBase64: contentToAnalyze.fileBase64,
                    }),
              { risks: [] }
            ),
          ]);

          if (clausesResult.data && risksResult.data) {
            results[file.name] = {
              clauses: clausesResult.data.clauses || [],
              risks: risksResult.data.risks || [],
            };

            setSelectedFiles((prev) =>
              prev.map((sf, idx) =>
                idx === i ? { ...sf, status: "done" } : sf
              )
            );
          }
        } catch (error) {
          setSelectedFiles((prev) =>
            prev.map((sf, idx) => (idx === i ? { ...sf, status: "error" } : sf))
          );

          toast({
            title: "Analysis failed",
            description: `Unable to analyze ${file.name}`,
            variant: "destructive",
          });
        }
      }

      setAnalysisResults(results);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload multiple legal documents to extract key clauses and assess
            potential risks
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Upload your legal documents
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Select multiple files to analyze them all at once
                  </p>
                  <UploadPicker
                    mode="document"
                    multiple={true}
                    onFilesSelected={handleFilesSelected}
                    disabled={isAnalyzing}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports PDF, DOCX, TXT, and image files (max 10MB each)
                  </p>
                </div>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selected Files</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedFiles.length} file
                      {selectedFiles.length !== 1 ? "s" : ""} •{" "}
                      {formatFileSize(
                        selectedFiles.reduce((sum, sf) => sum + sf.file.size, 0)
                      )}
                    </span>
                    <Button
                      onClick={handleAnalyzeAll}
                      disabled={isAnalyzing}
                      size="sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Analyze All
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedFiles.map((selectedFile, index) => (
                    <div key={`${selectedFile.file.name}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {getStatusIcon(selectedFile.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{selectedFile.file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(selectedFile.file.size / 1024).toFixed(1)} KB
                          {selectedFile.extractedText && (
                            <> • {selectedFile.extractedText.length} characters extracted</>
                          )}
                          {selectedFile.editedText && (
                            <> • Text edited</>
                          )}
                        </div>
                        
                        {selectedFile.status === 'extracting' && selectedFile.progress !== undefined && (
                          <Progress value={selectedFile.progress} className="mt-2" />
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Badge variant={
                          selectedFile.status === 'done' ? 'default' : 
                          selectedFile.status === 'error' ? 'destructive' : 
                          selectedFile.status === 'extracting' ? 'secondary' :
                          'secondary'
                        }>
                          {selectedFile.status === 'extracting' ? 'Extracting...' : selectedFile.status}
                        </Badge>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditFile(index)}
                          disabled={selectedFile.status === 'extracting'}
                        >
                          Edit Text
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleRemoveFile(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingFile && (
        <EditDocumentModal
          file={editingFile.file}
          initialText={editingFile.text}
          isOpen={!!editingFile}
          onSave={handleSaveEditedText}
          onClose={() => setEditingFile(null)}
        />
      )}
    </div>
  );
}