import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/amplify-client";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Download, 
  Copy, 
  CheckCircle,
  Loader2,
  Shield,
  Eye
} from "lucide-react";
import { readFileAsBase64, isValidFileType, formatFileSize } from "@/lib/file";

interface Clause {
  title: string;
  snippet: string;
  reason: string;
}

interface Risk {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  recommendedAction: string;
}

interface AnalysisResults {
  clauses: Clause[];
  risks: Risk[];
  summary: string;
}

export default function DocumentAnalyzer() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!isValidFileType(file)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, DOCX, TXT, or image files only.",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    setResults(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const analyzeDocument = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    try {
      const base64 = await readFileAsBase64(uploadedFile);
      
      // Call both analysis functions in parallel
      const [clausesResponse, risksResponse] = await Promise.all([
        client.queries.extractClauses({ fileBase64: base64 }),
        client.queries.assessRisks({ fileBase64: base64 })
      ]);

      if (clausesResponse.data && risksResponse.data) {
        const clausesData = clausesResponse.data as any; // Type assertion for API response
        const risksData = risksResponse.data as any; // Type assertion for API response
        
        const analysisResults: AnalysisResults = {
          clauses: clausesData.clauses || [],
          risks: risksData.risks || [],
          summary: `Analysis of ${uploadedFile.name} completed. Found ${clausesData.clauses?.length || 0} key clauses and identified ${risksData.risks?.length || 0} potential risks.`
        };

        setResults(analysisResults);
        
        toast({
          title: "Analysis complete",
          description: `Successfully analyzed ${uploadedFile.name}`
        });
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "Analysis failed",
        description: "Unable to analyze the document. Please ensure the backend is deployed and try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const copySummary = () => {
    if (results) {
      const summary = `Document Analysis Summary\n\n${results.summary}\n\nKey Clauses (${results.clauses.length}):\n${results.clauses.map((clause, index) => `${index + 1}. ${clause.title}: ${clause.snippet}`).join('\n\n')}\n\nRisk Assessment (${results.risks.length}):\n${results.risks.map((risk, index) => `${index + 1}. ${risk.risk} (${risk.severity.toUpperCase()}): ${risk.explanation}`).join('\n\n')}`;
      
      navigator.clipboard.writeText(summary);
      toast({
        title: "Summary copied",
        description: "Analysis summary copied to clipboard"
      });
    }
  };

  const downloadSummary = () => {
    if (results && uploadedFile) {
      const summary = `Document Analysis Summary - ${uploadedFile.name}\nGenerated on: ${new Date().toLocaleString()}\n\n${results.summary}\n\nKEY CLAUSES (${results.clauses.length}):\n${'='.repeat(50)}\n${results.clauses.map((clause, index) => `${index + 1}. ${clause.title}\n   ${clause.snippet}\n   Reason: ${clause.reason}\n`).join('\n')}\n\nRISK ASSESSMENT (${results.risks.length}):\n${'='.repeat(50)}\n${results.risks.map((risk, index) => `${index + 1}. ${risk.risk} (${risk.severity.toUpperCase()})\n   ${risk.explanation}\n   Recommended Action: ${risk.recommendedAction}\n`).join('\n')}`;
      
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${uploadedFile.name}_analysis.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Analyzer</h1>
          <p className="text-muted-foreground text-lg">
            Upload legal documents to extract key clauses and assess potential risks
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Drag and drop or click to select PDF, DOCX, TXT, or image files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary hover:bg-primary-light/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="space-y-4">
                      <FileText className="w-12 h-12 mx-auto text-primary" />
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeDocument();
                        }}
                        disabled={isAnalyzing}
                        className="w-full"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          'Analyze Document'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">Drop your document here</p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse files
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, DOCX, TXT, and image files up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {results ? (
              <div className="space-y-6">
                {/* Summary and Actions */}
                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Analysis Summary</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copySummary}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadSummary}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {results.summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Key Clauses */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Key Clauses ({results.clauses.length})
                    </CardTitle>
                    <CardDescription>
                      Important contractual terms and conditions found in the document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.clauses.map((clause, index) => (
                        <div key={index} className="border border-border rounded-lg p-4 bg-card-elevated">
                          <h4 className="font-semibold text-lg mb-2">{clause.title}</h4>
                          <p className="text-muted-foreground mb-3 leading-relaxed">
                            "{clause.snippet}"
                          </p>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground">
                              <strong>Why it matters:</strong> {clause.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Risk Assessment ({results.risks.length})
                    </CardTitle>
                    <CardDescription>
                      Potential legal risks and recommended actions to address them
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.risks.map((risk, index) => (
                        <div key={index} className="border border-border rounded-lg p-4 bg-card-elevated">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h4 className="font-semibold text-lg">{risk.risk}</h4>
                            <Badge className={`${getSeverityColor(risk.severity)} flex items-center gap-1`}>
                              {getSeverityIcon(risk.severity)}
                              {risk.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3 leading-relaxed">
                            {risk.explanation}
                          </p>
                          <Separator className="my-3" />
                          <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium mb-1">Recommended Action:</p>
                              <p className="text-sm text-muted-foreground">{risk.recommendedAction}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="shadow-card h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Document Analyzed</h3>
                  <p className="text-muted-foreground">
                    Upload a document to see detailed analysis results here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}