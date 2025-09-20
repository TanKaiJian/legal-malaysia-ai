import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  extractText, 
  extractTextFromMultipleFiles, 
  getExtractionSummary, 
  validateFile,
  SupportedFileType,
  UnifiedExtractionResult 
} from '@/services/textExtractor';
import { Upload, FileText, Image, FileSpreadsheet, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface ProcessingFile {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: UnifiedExtractionResult;
  progress?: number;
}

export default function TextExtractionTest() {
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<UnifiedExtractionResult | null>(null);

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const newFiles: ProcessingFile[] = uploadedFiles.map(file => ({
      file,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Process single file
  const processSingleFile = async (fileIndex: number) => {
    const fileToProcess = files[fileIndex];
    if (!fileToProcess) return;

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'processing', progress: 0 } : f
    ));

    try {
      const result = await extractText(fileToProcess.file, {
        fallbackToOCR: true,
        ocrOptions: {
          logger: (info) => {
            setFiles(prev => prev.map((f, i) => 
              i === fileIndex ? { ...f, progress: info.progress } : f
            ));
          }
        }
      });

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'completed', result, progress: 100 } : f
      ));
    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'error', result: {
          text: '',
          fileType: SupportedFileType.UNSUPPORTED,
          extractionMethod: 'ocr',
          success: false,
          processingTime: 0,
          fileSize: fileToProcess.file.size,
          fileName: fileToProcess.file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as UnifiedExtractionResult } : f
      ));
    }
  };

  // Process all files
  const processAllFiles = async () => {
    setIsProcessing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await processSingleFile(i);
      }
    }
    
    setIsProcessing(false);
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setSelectedResult(null);
  };

  // Get file type icon
  const getFileTypeIcon = (fileType: SupportedFileType) => {
    switch (fileType) {
      case SupportedFileType.PDF:
        return <FileText className="h-4 w-4 text-red-500" />;
      case SupportedFileType.DOCX:
        return <FileSpreadsheet className="h-4 w-4 text-blue-500" />;
      case SupportedFileType.IMAGE:
        return <Image className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: ProcessingFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Calculate summary
  const summary = files.length > 0 ? getExtractionSummary(
    files.filter(f => f.result).map(f => f.result!)
  ) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Text Extraction Test</h1>
        <p className="text-muted-foreground">
          Test PDF, DOCX, and Image text extraction capabilities
        </p>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, JPEG, PNG, GIF, BMP, TIFF, WebP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button 
              onClick={processAllFiles} 
              disabled={files.length === 0 || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process All'
              )}
            </Button>
            <Button variant="outline" onClick={clearFiles}>
              Clear All
            </Button>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{summary.successRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((fileItem, index) => {
                const validation = validateFile(fileItem.file);
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileTypeIcon(validation.fileType)}
                      {getStatusIcon(fileItem.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{fileItem.file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(fileItem.file.size / 1024).toFixed(1)} KB • {validation.fileType}
                        {fileItem.result && (
                          <> • {fileItem.result.processingTime}ms • {fileItem.result.extractionMethod}</>
                        )}
                      </div>
                      
                      {fileItem.status === 'processing' && fileItem.progress !== undefined && (
                        <Progress value={fileItem.progress} className="mt-2" />
                      )}
                      
                      {fileItem.result?.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{fileItem.result.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant={fileItem.status === 'completed' ? 'default' : 
                                   fileItem.status === 'error' ? 'destructive' : 'secondary'}>
                        {fileItem.status}
                      </Badge>
                      
                      {fileItem.status === 'pending' && (
                        <Button size="sm" onClick={() => processSingleFile(index)}>
                          Process
                        </Button>
                      )}
                      
                      {fileItem.result && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedResult(fileItem.result!)}
                        >
                          View Result
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Viewer */}
      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extraction Result: {selectedResult.fileName}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)}>
                Close
              </Button>
            </CardTitle>
            <CardDescription>
              Method: {selectedResult.extractionMethod} • 
              Type: {selectedResult.fileType} • 
              Time: {selectedResult.processingTime}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList>
                <TabsTrigger value="text">Extracted Text</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                {selectedResult.docxResult?.html && (
                  <TabsTrigger value="html">HTML</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="text" className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Characters: {selectedResult.text.length}</span>
                  <span>Words: {selectedResult.text.split(/\s+/).filter(w => w.length > 0).length}</span>
                  {selectedResult.ocrResult && (
                    <span>Confidence: {selectedResult.ocrResult.confidence.toFixed(1)}%</span>
                  )}
                </div>
                <Textarea 
                  value={selectedResult.text} 
                  readOnly 
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="No text extracted"
                />
              </TabsContent>
              
              <TabsContent value="metadata">
                <div className="space-y-4">
                  {selectedResult.warnings && selectedResult.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {selectedResult.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                    {JSON.stringify({
                      fileType: selectedResult.fileType,
                      extractionMethod: selectedResult.extractionMethod,
                      processingTime: selectedResult.processingTime,
                      fileSize: selectedResult.fileSize,
                      success: selectedResult.success,
                      ...(selectedResult.pdfResult?.metadata && { pdfMetadata: selectedResult.pdfResult.metadata }),
                      ...(selectedResult.docxResult?.metadata && { docxMetadata: selectedResult.docxResult.metadata }),
                      ...(selectedResult.ocrResult && { ocrMetadata: { confidence: selectedResult.ocrResult.confidence, processingTime: selectedResult.ocrResult.processingTime } }),
                    }, null, 2)}
                  </pre>
                </div>
              </TabsContent>
              
              {selectedResult.docxResult?.html && (
                <TabsContent value="html">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-background">
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedResult.docxResult.html }} 
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">Raw HTML</summary>
                      <pre className="bg-muted p-4 rounded-lg mt-2 overflow-auto">
                        {selectedResult.docxResult.html}
                      </pre>
                    </details>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}