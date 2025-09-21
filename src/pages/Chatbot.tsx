import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { client, safeApiCall } from "@/lib/amplify-client";
import { Send, User, Bot, Loader2, CheckCircle, AlertCircle, FileText, ChevronLeft, ChevronRight, BarChart3, RefreshCw, Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
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
import { useUploadedFiles } from "@/hooks/uploadedFileContext";
import { useNavigate } from "react-router-dom";
import AnalysisSummaryPanel from "@/components/AnalysisSummaryPanel";
import { ChatService } from "@/services/chatService";
import { marked } from "marked";

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Support line breaks
  gfm: true, // GitHub Flavored Markdown
});

// Function to render markdown content safely
const renderMarkdown = (content: string): string => {
  try {
    return marked(content) as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to plain text if markdown parsing fails
    return content.replace(/\n/g, '<br>');
  }
};

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  file: File;
  status: "idle" | "extracting" | "uploading" | "done" | "error";
  editedText?: string;
  extractedText?: string;
  extractionResult?: UnifiedExtractionResult;
  progress?: number;
}

export default function Chatbot() {
  const { saveUploadedFiles, analysisResult, setUploadedFiles: setGlobalUploadedFiles, setAnalysisResult } = useUploadedFiles();
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isFilesCollapsed, setIsFilesCollapsed] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "👋 **Hello! I'm your AI Legal Assistant for Malaysian law.**\n\n## ✨ I can help you with:\n\n• **📄 Analyzing legal documents and contracts**\n• **⚖️ Explaining Malaysian legal procedures**\n• **🔍 Identifying important clauses and potential risks**\n• **💡 Providing legal guidance and recommendations**\n\n> **Note:** This is an AI assistant. For legally binding advice, please consult a licensed Malaysian lawyer.\n\n---\n\nFeel free to upload documents first in the **Document Analyzer**, then return here to ask me questions about your legal documents!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editingFile, setEditingFile] = useState<{
    file: File;
    text: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!saveUploadedFiles.length) {
      // Redirect user to Document Analyzer if no docs
      navigate("/analyzer");
    }
  }, [saveUploadedFiles, navigate]);

  useEffect(() => {
    const accepted = localStorage.getItem("disclaimerAccepted");
    if (accepted) setShowDisclaimer(false);
  }, []);

  // Keyboard shortcut listener for Ctrl+S to open analysis summary
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's' && analysisResult) {
        event.preventDefault();
        setShowSummaryPanel(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [analysisResult]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup effect - clear analysis data when leaving the chat
  useEffect(() => {
    return () => {
      // Clear analysis result and uploaded files when component unmounts
      setAnalysisResult(null);
      setGlobalUploadedFiles([]);
      
      // Show a toast message for user feedback (Note: toast might not show if component is unmounting)
      console.log("Chatbot session cleared - analysis data and uploaded files removed");
    };
  }, [setAnalysisResult, setGlobalUploadedFiles]);

  const handleAccept = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  const handleStartNewSession = () => {
    setShowNewSessionConfirm(true);
  };

  const confirmNewSession = () => {
    // Clear all data
    setAnalysisResult(null);
    setGlobalUploadedFiles([]);
    setMessages([
      {
        id: "1",
        type: "assistant",
        content: "**Hello! I'm your AI Legal Assistant.**\n\nI can help you:\n- Understand legal documents\n- Answer questions about contracts\n- Provide guidance on Malaysian law\n\n*How can I assist you today?*",
        timestamp: new Date(),
      },
    ]);
    
    setShowNewSessionConfirm(false);
    
    // Show confirmation toast
    toast({
      title: "New Session Started",
      description: "Previous analysis cleared. Redirecting to document analyzer...",
    });
    
    // Navigate to document analyzer after a short delay
    setTimeout(() => {
      navigate("/analyzer");
    }, 1000);
  };

  // Helper function to truncate filename while preserving extension
  // Examples: 
  // "very-long-document-name.pdf" → "very-long-document-n....pdf"
  // "contract.docx" → "contract.docx" (no truncation needed)
  // "extremely-long-legal-document-with-many-details.pdf" → "extremely-long-legal-do....pdf"
  const getTruncatedFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;
    
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension, just truncate normally
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    
    // Reserve space for extension and ellipsis
    const availableLength = maxLength - extension.length - 3;
    
    if (availableLength <= 3) {
      // If extension is very long or name would be too short, show more of the name
      const minNameLength = Math.max(3, maxLength - extension.length - 3);
      return name.substring(0, minNameLength) + '...' + extension;
    }
    
    return name.substring(0, availableLength) + '...' + extension;
  };

  if (!saveUploadedFiles.length) return null;

  async function queryBedrock(userQuestion: string, snippets: string[]) {
    try {
      const res = await fetch(
        "https://f9jekjb575.execute-api.ap-southeast-1.amazonaws.com/devmhtwo/bedrockapi",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userQuestion, snippets }),
        }
      );
      const data = await res.json();
      return data.answer?.choices?.[0]?.message?.content || "No answer from Bedrock.";
    } catch (error) {
      console.error("Bedrock query failed:", error);
      return "I’m currently unable to answer your question. Please try again later.";
    }
  }


const handleSendMessage = async () => {
  if (!inputValue.trim()) return;

  // Validate that we have both analysis result and uploaded files
  if (!analysisResult) {
    toast({
      title: "Analysis Required",
      description: "Please analyze your documents first before starting a conversation.",
      variant: "destructive",
    });
    return;
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    type: "user",
    content: inputValue,
    timestamp: new Date(),
  };

  // Add user's message to chat
  setMessages((prev) => [...prev, userMessage]);
  const currentMessage = inputValue;
  setInputValue("");
  setIsLoading(true);

  try {
    // Prepare legal text from uploaded files for context
    const legalText = ChatService.prepareLegalText(uploadedFiles);

    // Validate the chat request
    ChatService.validateChatRequest(currentMessage, legalText, analysisResult);

    // Send message to the chat API
    const chatResponse = await ChatService.sendMessage(
      currentMessage,
      legalText,
      analysisResult
    );

    // Add the AI's response as assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: chatResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    
  } catch (error) {
    console.error("Chat error:", error);
    
    let errorContent = "I'm currently experiencing some technical difficulties. Please try again later.";
    
    if (error instanceof Error) {
      // Use the specific error message from our service
      errorContent = error.message;
    }
    
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: errorContent,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};

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

    // Add files to state
    const newUploadedFiles = validFiles.map((file) => ({
      file,
      status: "idle" as const,
    }));

    setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);

    // Start extracting text from uploaded files
    await extractTextFromFiles(uploadedFiles.length, validFiles);
  };

  const extractTextFromFiles = async (startIndex: number, files: File[]) => {
    for (let i = 0; i < files.length; i++) {
      const fileIndex = startIndex + i;
      const file = files[i];
      
      // Update status to extracting
      setUploadedFiles(prev => prev.map((f, idx) =>
        idx === fileIndex ? { ...f, status: 'extracting', progress: 0 } : f
      ));

      try {
        const result = await extractText(file, {
          fallbackToOCR: true,
          ocrOptions: {
            logger: (info) => {
              setUploadedFiles(prev => prev.map((f, idx) =>
                idx === fileIndex ? { ...f, progress: info.progress } : f
              ));
            }
          }
        });

        // Update with extraction results
        setUploadedFiles(prev => prev.map((f, idx) =>
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

        // Automatically analyze the document after text extraction
        await analyzeDocument(fileIndex, result.text);

      } catch (error) {
        setUploadedFiles(prev => prev.map((f, idx) =>
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

  const analyzeDocument = async (fileIndex: number, extractedText?: string) => {
    const uploadedFile = uploadedFiles[fileIndex];
    if (!uploadedFile) return;

    // Update status to uploading
    setUploadedFiles((prev) =>
      prev.map((uf, idx) =>
        idx === fileIndex
          ? {
              ...uf,
              status: "uploading",
            }
          : uf
      )
    );

    try {
      let base64Content: string;

      if (uploadedFile.editedText) {
        // Use edited text
        base64Content = btoa(
          unescape(encodeURIComponent(uploadedFile.editedText))
        );
      } else if (extractedText) {
        // Use extracted text
        base64Content = btoa(
          unescape(encodeURIComponent(extractedText))
        );
      } else {
        // Fallback to original file
        const filesData = await readFilesAsBase64([uploadedFile.file]);
        base64Content = filesData[0].base64;
      }

      // ✅ Always send fileBase64 (never "text")
      const result = await safeApiCall(
        () =>
          client.queries.analyzeDocument({
            fileName: uploadedFile.file.name,
            fileBase64: base64Content,
          }),
        {
          summary: `Analysis of ${uploadedFile.file.name}: This appears to be a legal document with standard contractual terms. Key areas include payment terms, liability clauses, and termination conditions.`,
          keyPoints: [
            "Payment terms: Standard commercial terms",
            "Liability limitations present",
            "Termination clause: Standard notice requirements",
            "Malaysian law jurisdiction specified",
          ],
        }
      );

      if (result.data) {
        const data = result.data as {summary?: string; keyPoints?: string[]};
        const analysisMessage: Message = {
          id: Date.now().toString() + fileIndex,
          type: "assistant",
          content: `📄 **Document Analysis: ${
            uploadedFile.file.name
          }**\n\n${data.summary ||
            "Analysis completed successfully."}\n\n**Key Points:**\n${data.keyPoints
            ?.map((point: string) => `• ${point}`)
            .join("\n") || "No key points extracted"}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, analysisMessage]);

        setUploadedFiles((prev) =>
          prev.map((uf, idx) =>
            idx === fileIndex
              ? {
                  ...uf,
                  status: "done",
                }
              : uf
          )
        );
      }
    } catch (error) {
      console.error("Error analyzing document:", error);

      setUploadedFiles((prev) =>
        prev.map((uf, idx) =>
          idx === fileIndex
            ? {
                ...uf,
                status: "error",
              }
            : uf
        )
      );

      toast({
        title: "Analysis failed",
        description: `Unable to analyze ${uploadedFile.file.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditFile = async (index: number) => {
    const uploadedFile = uploadedFiles[index];
    if (!uploadedFile) return;

    try {
      let initialText = uploadedFile.editedText || "";

      if (!initialText) {
        // Use extracted text if available
        if (uploadedFile.extractedText) {
          initialText = uploadedFile.extractedText;
        } else if (uploadedFile.file.type === "text/plain") {
          initialText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(uploadedFile.file);
          });
        } else {
          initialText = `[Content of ${uploadedFile.file.name}]\n\nThis is a placeholder for the document content. You can edit this text and it will be used instead of the original file content when analyzing the document.`;
        }
      }

      setEditingFile({ file: uploadedFile.file, text: initialText });
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

    setUploadedFiles((prev) =>
      prev.map((uf) =>
        uf.file.name === editingFile.file.name &&
        uf.file.size === editingFile.file.size
          ? { ...uf, editedText: newText }
          : uf
      )
    );

    setEditingFile(null);

    toast({
      title: "Document updated",
      description: "Your edits have been saved and will be used for analysis",
    });
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
  <>
    <DisclaimerModal isOpen={showDisclaimer} onAccept={handleAccept} />

    <div className="h-full flex flex-col bg-background">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-1">
                AI Legal Assistant
              </h1>
              <p className="text-muted-foreground font-medium">
                🇲🇾 Malaysian Law Expert • Powered by Advanced AI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area (Chat + Sidebar) */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full relative">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col overflow-y-auto p-6 space-y-8 transition-all duration-300 scroll-smooth min-h-[calc(100vh-280px)] ${
          !isFilesCollapsed ? 'pr-80' : 'pr-6'
        }`}>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.type === "user" ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`flex gap-3 max-w-3xl ${
                  message.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-lg ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/25 ring-2 ring-primary/20"
                      : "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-500/25 ring-2 ring-blue-500/20"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div
                  className={`p-5 rounded-2xl transition-all duration-200 hover:shadow-lg group relative ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-lg hover:shadow-xl backdrop-blur-sm"
                  }`}
                >
                  <div className="break-words leading-relaxed">
                    {message.type === "assistant" ? (
                      <div 
                        className="markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                  </div>
                  
                  {/* Message Actions */}
                  {message.type === "assistant" && (
                    <div className="absolute -bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex gap-1 bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-lg">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-green-500/10 hover:text-green-600"
                          onClick={() => {
                            navigator.clipboard.writeText(message.content);
                            toast({ title: "Message copied to clipboard" });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-600"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-orange-500/10 hover:text-orange-600"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-xs mt-3 opacity-60 group-hover:opacity-80 transition-opacity font-medium ${
                      message.type === "user"
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start animate-fade-in">
              <div className="flex gap-3 max-w-3xl">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-500/25 ring-2 ring-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-muted-foreground font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sidebar (Uploaded Files & Analysis) */}
        <div className={`sticky top-[150px] right-0 transition-all duration-300 ease-in-out ${
          isFilesCollapsed ? 'translate-x-full' : 'translate-x-0'
        } w-80 h-[calc(100vh-240px)] flex flex-col bg-card border border-border rounded-lg overflow-hidden self-start`}>
          
          {/* Collapse/Expand Button */}
          <div className="absolute -left-6 top-1/2 transform -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilesCollapsed(!isFilesCollapsed)}
              className="h-12 w-6 rounded-l-lg rounded-r-none bg-card border border-r-0 border-border hover:bg-muted"
            >
              {isFilesCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!isFilesCollapsed && (
            <>
              {/* Analysis Summary Section */}
              {analysisResult && (
                <div className="p-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-medium">Analysis Summary</h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Combined analysis of {analysisResult.analyzed_files?.length || 0} documents
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {analysisResult.important_clauses.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Clauses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {analysisResult.legal_risks.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Risks</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      onClick={() => setShowSummaryPanel(true)}
                      className="w-full text-xs"
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      View Full Summary
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleStartNewSession}
                      className="w-full text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Start New Session
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+S</kbd> for quick access
                  </p>
                </div>
              )}

              {/* Uploaded Files Section */}
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Uploaded Files
                </h3>
                <span className="text-xs text-muted-foreground">
                  {saveUploadedFiles.length} file{saveUploadedFiles.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {saveUploadedFiles.map((uf, index) => (
                  <div
                    key={uf.file.name}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span 
                      className="text-sm flex-1 min-w-0"
                      title={uf.file.name}
                    >
                      {getTruncatedFileName(uf.file.name)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Input Area - Sticky */}
      <div className="sticky bottom-0 z-40 border-t border-border/50 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="💬 Ask me about legal documents, contracts, or Malaysian law..."
                  disabled={isLoading}
                  className="flex-1 h-12 pl-4 pr-4 rounded-xl border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-sm shadow-lg transition-all duration-200 focus:shadow-xl text-base placeholder:text-muted-foreground/70"
                />
                {inputValue && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge variant="secondary" className="text-xs">
                      {inputValue.length}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              🔒 Secure • 📄 Multi-format support • 🇲🇾 Malaysian law expertise
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI Online
            </div>
          </div>
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
    </div>

    {/* Analysis Summary Panel */}
    <AnalysisSummaryPanel
      analysisResult={analysisResult}
      isOpen={showSummaryPanel}
      onClose={() => setShowSummaryPanel(false)}
    />

    {/* New Session Confirmation Dialog */}
    {showNewSessionConfirm && (
      <div 
        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={() => setShowNewSessionConfirm(false)}
      >
        <div 
          className="bg-white dark:bg-card rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-6 h-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-foreground">Start New Session?</h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            This will clear all current analysis data, chat history, and uploaded files. 
            You'll be redirected to the Document Analyzer to start fresh.
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowNewSessionConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmNewSession}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start New Session
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
