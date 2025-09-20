import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { client, safeApiCall } from "@/lib/amplify-client";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { readFilesAsBase64, isAllowedDocumentOrImage, formatFileSize } from "@/lib/file";
import { UploadPicker } from "@/components/UploadPicker";
import { FileChip } from "@/components/FileChip";
import { EditDocumentModal } from "@/components/EditDocumentModal";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  file: File;
  status: 'idle' | 'uploading' | 'done' | 'error';
  editedText?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Legal Assistant. I can help you understand legal documents, answer questions about contracts, and provide guidance on Malaysian law. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editingFile, setEditingFile] = useState<{ file: File; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use safe API call with fallback data
      const result = await safeApiCall(
        () => client.queries.sayHello({ name: inputValue }),
        `Hello, ${inputValue}! I'm your MyLegal AI assistant. I can help you understand legal documents and answer questions about Malaysian law. Note: This is running in preview mode - deploy the backend for full AI functionality.`
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.data || 'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (result.error) {
        console.warn("API call handled gracefully:", result.error);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I\'m currently experiencing some technical difficulties. This is a preview version - please deploy the backend to enable full functionality.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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

    // Add files to state
    const newUploadedFiles = validFiles.map(file => ({
      file,
      status: 'idle' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Process files sequentially
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileIndex = uploadedFiles.length + i;
      
      // Update status to uploading
      setUploadedFiles(prev => prev.map((uf, idx) => 
        idx === fileIndex ? { ...uf, status: 'uploading' } : uf
      ));

      try {
        // Find the current uploaded file after state update
        const currentUploadedFile = uploadedFiles.find((uf, idx) => idx === fileIndex);
        let contentToAnalyze: string;
        
        if (currentUploadedFile?.editedText) {
          // Use edited text if available
          contentToAnalyze = currentUploadedFile.editedText;
        } else {
          // Use original file content
          const filesData = await readFilesAsBase64([file]);
          contentToAnalyze = filesData[0].base64;
        }
        
        // Use safe API call with fallback data
        const result = await safeApiCall(
          () => currentUploadedFile?.editedText 
            ? client.queries.analyzeDocument({ 
                fileName: file.name, 
                text: contentToAnalyze 
              })
            : client.queries.analyzeDocument({ 
                fileName: file.name, 
                fileBase64: contentToAnalyze 
              }),
          {
            summary: `Mock analysis of ${file.name}: This appears to be a legal document with standard contractual terms. Key areas include payment terms, liability clauses, and termination conditions.`,
            keyPoints: [
              "Payment terms: Standard commercial terms",
              "Liability limitations present", 
              "Termination clause: Standard notice requirements",
              "Malaysian law jurisdiction specified"
            ]
          }
        );

        if (result.data) {
          const data = result.data as any;
          const analysisMessage: Message = {
            id: Date.now().toString() + i,
            type: 'assistant',
            content: `📄 **Document Analysis: ${file.name}**\n\n${data.summary || 'Analysis completed successfully.'}\n\n**Key Points:**\n${data.keyPoints?.map((point: string) => `• ${point}`).join('\n') || 'No key points extracted'}`,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, analysisMessage]);
          
          // Update status to done
          setUploadedFiles(prev => prev.map((uf, idx) => 
            idx === fileIndex ? { ...uf, status: 'done' } : uf
          ));
        }
      } catch (error) {
        console.error('Error analyzing document:', error);
        
        // Update status to error
        setUploadedFiles(prev => prev.map((uf, idx) => 
          idx === fileIndex ? { ...uf, status: 'error' } : uf
        ));
        
        toast({
          title: "Analysis failed",
          description: `Unable to analyze ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditFile = async (index: number) => {
    const uploadedFile = uploadedFiles[index];
    if (!uploadedFile) return;

    try {
      // For text files, read as text; for others, show placeholder
      let initialText = uploadedFile.editedText || '';
      
      if (!initialText) {
        if (uploadedFile.file.type === 'text/plain') {
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
        variant: "destructive"
      });
    }
  };

  const handleSaveEditedText = (newText: string) => {
    if (!editingFile) return;

    setUploadedFiles(prev => prev.map(uf => 
      uf.file.name === editingFile.file.name && uf.file.size === editingFile.file.size
        ? { ...uf, editedText: newText }
        : uf
    ));
    
    setEditingFile(null);
    
    toast({
      title: "Document updated",
      description: "Your edits have been saved and will be used for analysis"
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">AI Legal Chatbot</h1>
          <p className="text-muted-foreground">Ask questions about legal documents and get instant AI-powered answers</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-accent text-accent-foreground'
                }`}>
                  {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border shadow-card'
                }`}>
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 opacity-70 ${
                    message.type === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
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
      </div>

      {/* Selected Files */}
      {uploadedFiles.length > 0 && (
        <div className="border-t border-border bg-card/50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Recent uploads</h3>
                <span className="text-xs text-muted-foreground">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} • {formatFileSize(uploadedFiles.reduce((sum, uf) => sum + uf.file.size, 0))}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((uploadedFile, index) => (
                  <FileChip
                    key={`${uploadedFile.file.name}-${index}`}
                    file={uploadedFile.file}
                    status={uploadedFile.status}
                    onRemove={() => handleRemoveFile(index)}
                    onEdit={() => handleEditFile(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <UploadPicker
                mode="document"
                multiple={true}
                onFilesSelected={handleFilesSelected}
                disabled={isLoading}
              />
            </div>
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
            Upload multiple documents (PDF, DOCX, TXT, images) or ask questions about Malaysian legal matters
          </p>
        </div>
      </div>

      {/* Edit Document Modal */}
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