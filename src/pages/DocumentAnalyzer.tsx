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
  Shield,
  Scale,
  BookOpen,
  ExternalLink,
  MessageSquare,
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
import DisclaimerModal from "@/components/ui/disclaimer";
import { useEffect } from "react";
import { saveUploadedFiles, useUploadedFiles, DocumentAnalysisResult, ImportantClause, LegalRisk } from "@/hooks/uploadedFileContext";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DocumentAnalysisService } from "@/services/documentAnalysisService";

interface SelectedFile {
  file: File;
  status: "idle" | "extracting" | "uploading" | "done" | "error";
  editedText?: string;
  extractedText?: string;
  extractionResult?: UnifiedExtractionResult;
  progress?: number;
}

export default function DocumentAnalyzer() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [editingFile, setEditingFile] = useState<{
    file: File;
    text: string;
  } | null>(null);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const { toast } = useToast();
  const { saveUploadedFiles, setUploadedFiles, analysisResult, setAnalysisResult } = useUploadedFiles();
  const navigate = useNavigate();

  // Helper function to check if all files are ready for analysis
  const areAllFilesReadyForAnalysis = () => {
    if (selectedFiles.length === 0) return false;
    return selectedFiles.every(file => 
      file.status === "done" && 
      (file.extractedText || file.editedText)
    );
  };

  // Helper function to get extraction progress summary
  const getExtractionProgress = () => {
    const completedFiles = selectedFiles.filter(file => 
      file.status === "done" && (file.extractedText || file.editedText)
    ).length;
    return { completed: completedFiles, total: selectedFiles.length };
  };

  useEffect(() => {
    const accepted = localStorage.getItem("disclaimerAccepted");
    if (accepted) setShowDisclaimer(false);
  }, []);
  
  const handleAccept = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  const handleFilesSelected = async (files: File[]) => {
     const newFiles: saveUploadedFiles[] = files.map(file => ({
    file
     }));
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

    setUploadedFiles((prev) => [...prev, ...newFiles]);

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
            status: 'done', 
            extractedText: result.text,
            extractionResult: result,
            progress: 100 
          } : f
        ));

        toast({
          title: "Text extracted successfully",
          description: `Extracted ${result.text.length} characters from ${file.name}`,
        });

        // Show privacy protection dialog after successful extraction
        setShowPrivacyDialog(true);

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
          ? { ...sf, editedText: newText, status: 'done' }
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

    // If there are no more files, clear the analysis result
    const remainingFiles = selectedFiles.filter((_, i) => i !== index);
    if (remainingFiles.length === 0) {
      setAnalysisResult(null);
    }

    if (removedFile && activeTab === removedFile.file.name) {
      setActiveTab(
        remainingFiles.length > 0 ? remainingFiles[0].file.name : ""
      );
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

  const getRiskSeverityColor = (riskArea: string) => {
    // Simple heuristic to assign severity based on risk area keywords
    const highRiskTerms = ['termination', 'liability', 'penalty', 'breach', 'dispute'];
    const mediumRiskTerms = ['payment', 'delivery', 'performance', 'intellectual', 'confidentiality'];
    
    const lowerRiskArea = riskArea.toLowerCase();
    
    if (highRiskTerms.some(term => lowerRiskArea.includes(term))) {
      return { color: 'text-red-600', bg: 'bg-red-50 border-red-200', severity: 'High' };
    } else if (mediumRiskTerms.some(term => lowerRiskArea.includes(term))) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', severity: 'Medium' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-50 border-green-200', severity: 'Low' };
    }
  };



  const handleAnalyzeAll = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const fileNames = selectedFiles.map(sf => sf.file.name);

    try {
      // Update all files to "uploading" status
      setSelectedFiles((prev) =>
        prev.map((sf) => ({ ...sf, status: "uploading" }))
      );

      // Collect all document texts for analysis
      const documentTexts: string[] = [];
      for (const selectedFile of selectedFiles) {
        // Use edited text if available, otherwise use extracted text
        const textToAnalyze = selectedFile.editedText || selectedFile.extractedText || "";
        if (textToAnalyze.trim()) {
          documentTexts.push(textToAnalyze);
        }
      }

      // Validate document texts before sending to API
      DocumentAnalysisService.validateDocumentTexts(documentTexts);

      // Prepare and clean document texts
      const preparedTexts = DocumentAnalysisService.prepareDocumentTexts(documentTexts);

      try {
        // Call the real API to analyze documents
        const analysisResult = await DocumentAnalysisService.analyzeDocuments(
          preparedTexts,
          "Please analyze these legal documents and identify important clauses and potential legal risks according to Malaysian law."
        );

        // Add analyzed file names to the result
        analysisResult.analyzed_files = fileNames;
        analysisResult.document_title = fileNames.length === 1 
          ? `Legal Analysis: ${fileNames[0]}` 
          : `Combined Legal Document Analysis (${fileNames.length} files)`;

        // Update all files to "done" status
        setSelectedFiles((prev) =>
          prev.map((sf) => ({ ...sf, status: "done" }))
        );

        // Save to context
        setAnalysisResult(analysisResult);
        
        // Show success message
        toast({
          title: "Analysis Complete!",
          description: `Successfully analyzed ${fileNames.length} document(s) using AI. ${analysisResult.important_clauses.length} clauses and ${analysisResult.legal_risks.length} risks identified.`,
        });

      } catch (error) {
        console.error('Analysis error:', error);
        
        // Update all files to "error" status
        setSelectedFiles((prev) =>
          prev.map((sf) => ({ ...sf, status: "error" }))
        );

        const errorMessage = error instanceof Error ? error.message : "Unable to analyze the documents";
        
        toast({
          title: "Analysis failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <DisclaimerModal isOpen={showDisclaimer} onAccept={handleAccept} />
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
          <p className="mb-4 text-red-500">
        Chatting is based on uploaded file(s). Please upload first.
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
                      disabled={isAnalyzing || !areAllFilesReadyForAnalysis()}
                      size="sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : !areAllFilesReadyForAnalysis() ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          {(() => {
                            const progress = getExtractionProgress();
                            return `Extracting... (${progress.completed}/${progress.total})`;
                          })()}
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

        {/* Analysis Results Section */}
        {analysisResult && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Analysis Complete!</strong> Your documents have been successfully analyzed as one combined legal document. 
                Review the results below and proceed to the chatbot for detailed discussions.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                  📊 Analysis Results
                </h2>
                <p className="text-muted-foreground text-lg">
                  Combined analysis of {analysisResult.analyzed_files?.length || 0} documents treated as one legal document
                </p>
              </div>
              <Button
                onClick={() => navigate("/chatbot")}
                size="lg"
                className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Continue to Chatbot
              </Button>
            </div>

            <Card className="shadow-lg border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  {analysisResult.document_title || "Combined Legal Document Analysis"}
                </CardTitle>
                {analysisResult.analyzed_files && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Analyzed Files:</strong> {analysisResult.analyzed_files.join(", ")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Important Clauses Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Important Clauses
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {analysisResult.important_clauses.length} found
                    </Badge>
                  </div>
                  <div className="grid gap-4">
                    {analysisResult.important_clauses.map((clause, index) => (
                      <Card key={index} className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-blue-900 flex-1">
                                {clause.clause_title}
                              </h4>
                              {clause.relevant_law && (
                                <Badge variant="outline" className="text-xs">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  Legal Reference
                                </Badge>
                              )}
                            </div>
                            <div className="bg-white p-3 rounded border border-blue-200">
                              <p className="text-sm font-mono text-gray-700 leading-relaxed">
                                "{clause.clause_text}"
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-blue-800">
                                <strong>Summary:</strong> {clause.summary}
                              </p>
                              {clause.relevant_law && (
                                <p className="text-sm text-blue-700">
                                  <strong>Relevant Law:</strong> {clause.relevant_law}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Legal Risks Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Legal Risks Assessment
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {analysisResult.legal_risks.length} identified
                    </Badge>
                  </div>
                  <div className="grid gap-4">
                    {analysisResult.legal_risks.map((risk, index) => {
                      const severityStyle = getRiskSeverityColor(risk.risk_area);
                      return (
                        <Card key={index} className={`${severityStyle.bg} border-2`}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-medium ${severityStyle.color} flex-1`}>
                                  {risk.risk_area}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${severityStyle.color}`}>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {severityStyle.severity} Risk
                                  </Badge>
                                  {risk.relevant_law && (
                                    <Badge variant="outline" className="text-xs">
                                      <BookOpen className="w-3 h-3 mr-1" />
                                      Legal Reference
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <strong>Description:</strong> {risk.description}
                                </p>
                                <p className="text-sm">
                                  <strong>Potential Consequence:</strong> {risk.potential_consequence}
                                </p>
                                <p className="text-sm">
                                  <strong>Related Clause:</strong> {risk.related_clause}
                                </p>
                                {risk.relevant_law && (
                                  <p className="text-sm">
                                    <strong>Relevant Law:</strong> {risk.relevant_law}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Legal Disclaimer */}
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Legal Disclaimer:</strong> {analysisResult.notes}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    <div className="flex flex-col items-center justify-center p-6">
      {/* Show navigation button only if analysis is complete */}
      {saveUploadedFiles.length > 0 && !analysisResult && (
        <Alert className="mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please analyze your documents first before proceeding to the chatbot.
          </AlertDescription>
        </Alert>
      )}
      
      {analysisResult && (
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Analysis complete! You can now chat with our AI about your combined legal document.
          </p>
          <Button
            onClick={() => navigate("/chatbot")}
            size="lg"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Continue to Chatbot
          </Button>
        </div>
      )}
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

      {/* Privacy Protection Dialog */}
      <AlertDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Shield className="w-5 h-5" />
              Privacy Protection Reminder
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                  🔒 Important: Protect your sensitive information
                </p>
                <p className="text-orange-700 dark:text-orange-300">
                  Your documents may contain sensitive information that should be reviewed before AI analysis.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Personal Information:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Full names and signatures</li>
                    <li>• Home/business addresses</li>
                    <li>• Phone numbers</li>
                    <li>• Email addresses</li>
                    <li>• IC/Passport numbers</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Financial Information:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bank account numbers</li>
                    <li>• Credit card details</li>
                    <li>• Salary/income amounts</li>
                    <li>• Tax identification numbers</li>
                    <li>• Company registration numbers</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  💡 <strong>Recommendation:</strong> If your documents contain sensitive information, consider using the "Edit Text" feature to remove or replace private details with placeholders before analysis.
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  ✅ <strong>Our Commitment:</strong> Your data is processed securely and is not stored permanently. However, protecting your privacy is ultimately your responsibility.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction
              onClick={() => setShowPrivacyDialog(false)}
              className="bg-primary hover:bg-primary-hover"
            >
              I understand, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}