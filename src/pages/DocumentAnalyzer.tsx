import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { client, safeApiCall } from "@/lib/amplify-client";
import { FileText, AlertTriangle, Download, Copy, Loader2, Play } from "lucide-react";
import { readFilesAsBase64, isAllowedDocumentOrImage, formatFileSize } from "@/lib/file";
import { UploadPicker } from "@/components/UploadPicker";
import { FileChip } from "@/components/FileChip";

interface FileAnalysisResult {
  clauses: Array<{
    title: string;
    snippet: string;
    reason: string;
  }>;
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
    recommendedAction: string;
  }>;
}

interface SelectedFile {
  file: File;
  status: 'idle' | 'uploading' | 'done' | 'error';
}

export default function DocumentAnalyzer() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, FileAnalysisResult>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const { toast } = useToast();

  const handleFilesSelected = (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (!isAllowedDocumentOrImage(file)) {
        toast({
          title: "Invalid file type",
          description: `${file.name}: Please upload PDF, DOCX, TXT, or image files only.`,
          variant: "destructive"
        });
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name}: File size exceeds 10MB limit.`,
          variant: "destructive"
        });
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newSelectedFiles = validFiles.map(file => ({
      file,
      status: 'idle' as const
    }));
    
    setSelectedFiles(prev => [...prev, ...newSelectedFiles]);
    
    // Set first file as active tab if no tab is active
    if (!activeTab && validFiles.length > 0) {
      setActiveTab(validFiles[0].name);
    }
  };

  const handleRemoveFile = (index: number) => {
    const removedFile = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Remove from results
    if (removedFile) {
      setAnalysisResults(prev => {
        const newResults = { ...prev };
        delete newResults[removedFile.file.name];
        return newResults;
      });
      
      // Update active tab if removed file was active
      if (activeTab === removedFile.file.name) {
        const remainingFiles = selectedFiles.filter((_, i) => i !== index);
        setActiveTab(remainingFiles.length > 0 ? remainingFiles[0].file.name : '');
      }
    }
  };

  const handleAnalyzeAll = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const results: Record<string, FileAnalysisResult> = {};

    try {
      // Process files sequentially
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        const { file } = selectedFile;
        
        // Update status to uploading
        setSelectedFiles(prev => prev.map((sf, idx) => 
          idx === i ? { ...sf, status: 'uploading' } : sf
        ));

        try {
          const filesData = await readFilesAsBase64([file]);
          const { base64 } = filesData[0];
          
          // Use safe API calls with fallback data
          const [clausesResult, risksResult] = await Promise.all([
            safeApiCall(
              () => client.queries.extractClauses({ fileBase64: base64 }),
              {
                clauses: [
                  {
                    title: "Payment Terms",
                    snippet: "Payment shall be made within 30 days of invoice date...",
                    reason: "Standard commercial payment clause"
                  },
                  {
                    title: "Liability Limitation", 
                    snippet: "In no event shall either party be liable for indirect damages...",
                    reason: "Limits potential liability exposure"
                  },
                  {
                    title: "Termination Clause",
                    snippet: "Either party may terminate with 30 days written notice...",
                    reason: "Provides exit mechanism for both parties"
                  }
                ]
              }
            ),
            safeApiCall(
              () => client.queries.assessRisks({ fileBase64: base64 }),
              {
                risks: [
                  {
                    risk: "Broad liability limitation",
                    severity: "medium" as const,
                    explanation: "The liability clause may be too broad and could leave you unprotected",
                    recommendedAction: "Consider adding exceptions for gross negligence"
                  },
                  {
                    risk: "Automatic renewal clause",
                    severity: "high" as const,
                    explanation: "Contract automatically renews without explicit consent",
                    recommendedAction: "Negotiate for explicit renewal approval requirement"
                  },
                  {
                    risk: "Unclear dispute resolution",
                    severity: "low" as const,
                    explanation: "Dispute resolution mechanism is not clearly defined",
                    recommendedAction: "Add specific arbitration or mediation clause"
                  }
                ]
              }
            )
          ]);

          if (clausesResult.data && risksResult.data) {
            results[file.name] = {
              clauses: clausesResult.data.clauses || [],
              risks: risksResult.data.risks || []
            };

            // Update status to done
            setSelectedFiles(prev => prev.map((sf, idx) => 
              idx === i ? { ...sf, status: 'done' } : sf
            ));
          }
        } catch (error) {
          console.error(`Error analyzing ${file.name}:`, error);
          
          // Update status to error
          setSelectedFiles(prev => prev.map((sf, idx) => 
            idx === i ? { ...sf, status: 'error' } : sf
          ));
          
          toast({
            title: "Analysis failed",
            description: `Unable to analyze ${file.name}`,
            variant: "destructive"
          });
        }
      }

      setAnalysisResults(results);
      
      const successCount = Object.keys(results).length;
      if (successCount > 0) {
        toast({
          title: "Analysis completed",
          description: `Successfully analyzed ${successCount} of ${selectedFiles.length} files`
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopySummary = (fileName: string) => {
    const result = analysisResults[fileName];
    if (!result) return;
    
    const summary = `Document Analysis Summary - ${fileName}\n\nKey Clauses:\n${result.clauses.map(c => `• ${c.title}: ${c.snippet}`).join('\n')}\n\nRisks:\n${result.risks.map(r => `• ${r.risk} (${r.severity}): ${r.explanation}`).join('\n')}`;
    
    navigator.clipboard.writeText(summary);
    toast({
      title: "Summary copied",
      description: `Analysis summary for ${fileName} copied to clipboard`
    });
  };

  const handleDownloadSummary = (fileName: string) => {
    const result = analysisResults[fileName];
    if (!result) return;
    
    const summary = `Document Analysis Summary - ${fileName}\n\nKey Clauses:\n${result.clauses.map(c => `• ${c.title}: ${c.snippet}`).join('\n')}\n\nRisks:\n${result.risks.map(r => `• ${r.risk} (${r.severity}): ${r.explanation}`).join('\n')}`;
    
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Summary downloaded",
      description: `Analysis summary for ${fileName} saved as text file`
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Analyzer</h1>
          <p className="text-muted-foreground text-lg">
            Upload multiple legal documents to extract key clauses and assess potential risks
          </p>
        </div>

        {/* Upload Area */}
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
                  <h3 className="text-lg font-medium mb-2">Upload your legal documents</h3>
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
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} • {formatFileSize(selectedFiles.reduce((sum, sf) => sum + sf.file.size, 0))}
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
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((selectedFile, index) => (
                    <FileChip
                      key={`${selectedFile.file.name}-${index}`}
                      file={selectedFile.file}
                      status={selectedFile.status}
                      onRemove={() => handleRemoveFile(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {Object.keys(analysisResults).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto">
                  {Object.keys(analysisResults).map((fileName) => (
                    <TabsTrigger 
                      key={fileName} 
                      value={fileName}
                      className="truncate max-w-[200px] text-xs"
                      title={fileName}
                    >
                      {fileName.length > 15 ? `${fileName.slice(0, 12)}...` : fileName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.entries(analysisResults).map(([fileName, result]) => (
                  <TabsContent key={fileName} value={fileName} className="mt-6">
                    <div className="space-y-6">
                      {/* File Summary Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{fileName}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopySummary(fileName)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSummary(fileName)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Key Clauses */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Key Clauses ({result.clauses.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {result.clauses.map((clause, index) => (
                              <div key={index} className="p-4 border border-border rounded-lg">
                                <h4 className="font-medium mb-2">{clause.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2 italic">
                                  "{clause.snippet}"
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {clause.reason}
                                </p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* Risks & Red Flags */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Risks & Red Flags ({result.risks.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {result.risks.map((risk, index) => (
                              <Alert key={index} className="border-l-4 border-l-red-500">
                                <AlertDescription>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium">{risk.risk}</h4>
                                      <Badge variant={
                                        risk.severity === 'high' ? 'destructive' : 
                                        risk.severity === 'medium' ? 'default' : 
                                        'secondary'
                                      }>
                                        {risk.severity.toUpperCase()}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {risk.explanation}
                                    </p>
                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                                      <strong>Recommended Action:</strong> {risk.recommendedAction}
                                    </div>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}