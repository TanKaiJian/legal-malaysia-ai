import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/amplify-client";
import { Send, Upload, FileText, User, Bot, Loader2 } from "lucide-react";
import { readFileAsBase64, isValidFileType, formatFileSize } from "@/lib/file";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  name: string;
  size: number;
  status: 'ready' | 'analyzing' | 'done';
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
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      // Test sayHello function
      const response = await client.queries.sayHello({ name: inputValue });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data || 'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling sayHello:', error);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, DOCX, TXT, or image files only.",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile({
      name: file.name,
      size: file.size,
      status: 'analyzing'
    });

    try {
      const base64 = await readFileAsBase64(file);
      const response = await client.queries.analyzeDocument({ 
        fileName: file.name, 
        fileBase64: base64 
      });

      if (response.data) {
        const data = response.data as any; // Type assertion for API response
        const analysisMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `📄 **Document Analysis: ${file.name}**\n\n${data.summary || 'Analysis completed successfully.'}\n\n**Key Points:**\n${data.keyPoints?.map((point: string) => `• ${point}`).join('\n') || 'No key points extracted'}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, analysisMessage]);
        setUploadedFile(prev => prev ? { ...prev, status: 'done' } : null);

        toast({
          title: "Document analyzed successfully",
          description: `${file.name} has been processed and added to the conversation.`
        });
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setUploadedFile(null);
      
      toast({
        title: "Analysis failed",
        description: "Unable to analyze the document. Please try again or check that the backend is deployed.",
        variant: "destructive"
      });
    }
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

      {/* File Upload Status */}
      {uploadedFile && (
        <div className="border-t border-border bg-card/50 p-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                </div>
                <Badge variant={uploadedFile.status === 'done' ? 'default' : 'secondary'}>
                  {uploadedFile.status === 'analyzing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {uploadedFile.status === 'ready' && 'Ready for analysis'}
                  {uploadedFile.status === 'analyzing' && 'Analyzing...'}
                  {uploadedFile.status === 'done' && 'Analysis complete'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4" />
            </Button>
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
            Upload documents (PDF, DOCX, TXT, images) or ask questions about Malaysian legal matters
          </p>
        </div>
      </div>
    </div>
  );
}