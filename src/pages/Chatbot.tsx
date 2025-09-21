import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { client, safeApiCall } from "@/lib/amplify-client";
import { Send, User, Bot, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
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
  const { saveUploadedFiles } = useUploadedFiles();
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
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

  const handleAccept = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  if (!saveUploadedFiles.length) return null;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your AI Legal Assistant. I can help you understand legal documents, answer questions about contracts, and provide guidance on Malaysian law. How can I assist you today?",
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function queryKendra(userQuestion: string) {
    try {
      const res = await fetch(
        "https://f9jekjb575.execute-api.ap-southeast-1.amazonaws.com/devmhtwo/toKendra",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userQuestion }),
        }
      );
      const data = await res.json();
      return data.snippets || [];
    } catch (error) {
      console.error("Kendra query failed:", error);
      return [];
    }
  }

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

  const userMessage: Message = {
    id: Date.now().toString(),
    type: "user",
    content: inputValue,
    timestamp: new Date(),
  };

  // Add user's message to chat
  setMessages((prev) => [...prev, userMessage]);
  setInputValue("");
  setIsLoading(true);

  try {
    // 1️⃣ Query Kendra to get context snippets
    const snippets = await queryKendra(inputValue);

    // 2️⃣ Query Bedrock using the question + Kendra snippets
    const bedrockAnswer = await queryBedrock(inputValue, snippets);

    // 3️⃣ Add Bedrock's response as assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: bedrockAnswer,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content:
        "I'm currently experiencing some technical difficulties. Please try again later.",
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
        const data = result.data as any;
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
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            AI Legal Chatbot
          </h1>
          <p className="text-muted-foreground">
            Ask questions about legal documents and get instant AI-powered
            answers
          </p>
        </div>
      </div>

      {/* Main Area (Chat + Sidebar) */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-3xl ${
                  message.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`p-4 rounded-2xl ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border shadow-card"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-2 opacity-70 ${
                      message.type === "user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="flex gap-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-card border border-border shadow-card">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sidebar (Uploaded Files) */}
        <div className="absolute top-18 right-0 h-[calc(90vh-10rem)] w-80 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium">Uploaded Files</h3>
            <span className="text-xs text-muted-foreground">
              {saveUploadedFiles.length} file{saveUploadedFiles.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {saveUploadedFiles.map((uf, index) => (
              <div
                key={uf.file.name}
                className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-background"
              >
                <span className="text-sm truncate">{uf.file.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about legal documents, contracts, or Malaysian law..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Upload multiple documents (PDF, DOCX, TXT, images) or ask questions
            about Malaysian legal matters
          </p>
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
  </>
);
}
