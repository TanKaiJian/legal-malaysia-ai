import { DocumentAnalysisResult } from '@/hooks/uploadedFileContext';

const CHAT_API_ENDPOINT = 'https://f9jekjb575.execute-api.ap-southeast-1.amazonaws.com/devmhtwo/chat';

export interface ChatRequest {
  userMessage: string;
  legalText: string;
  summarizedJson: DocumentAnalysisResult;
}

// Response structure from the Lambda function (similar to Bedrock chat completion format)
export interface ChatResponse {
  answer: {
    choices: Array<{
      finish_reason: string;
      index: number;
      logprobs: null | object;
      message: {
        content: string;
        refusal: null | string;
        role: string;
      };
    }>;
    created: number;
    id: string;
    model: string;
    object: string;
    service_tier: string;
    usage: {
      completion_tokens: number;
      prompt_tokens: number;
      total_tokens: number;
    };
  };
}

export class ChatService {
  /**
   * Send a chat message to the legal assistant API
   */
  static async sendMessage(
    userMessage: string,
    legalText: string,
    analysisResult: DocumentAnalysisResult
  ): Promise<string> {
    try {
      const requestBody: ChatRequest = {
        userMessage,
        legalText,
        summarizedJson: analysisResult
      };

      console.log('Sending chat request:', requestBody); // Debug log

      const response = await fetch(CHAT_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorMessage += ` - ${errorData.details}`;
            }
          }
        } catch (parseError) {
          // Use the default error message if we can't parse the error response
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      console.log('Chat API response:', responseData); // Debug log
      
      // Parse the response similar to the document analysis service
      if (responseData.answer && responseData.answer.choices && responseData.answer.choices.length > 0) {
        const chatResponse = responseData as ChatResponse;
        const firstChoice = chatResponse.answer.choices[0];
        
        if (!firstChoice.message || !firstChoice.message.content) {
          throw new Error('Missing message content in chat response');
        }
        
        return firstChoice.message.content;
        
      } else {
        console.error('Invalid chat response structure:', responseData);
        throw new Error('Invalid response format from chat service');
      }

    } catch (error) {
      console.error('Chat service error:', error);
      
      // Provide more specific error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the chat service. Please check your internet connection and try again.');
      }

      // Handle specific Lambda function errors
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          throw new Error('The chat service encountered an internal error. Please try again in a few minutes.');
        }

        throw error;
      }
      
      throw new Error('An unexpected error occurred during chat. Please try again later.');
    }
  }

  /**
   * Prepare legal text from uploaded files
   */
  static prepareLegalText(uploadedFiles: Array<{file: File, extractedText?: string, editedText?: string}>): string {
    const documentTexts = uploadedFiles
      .map(file => {
        // Prefer edited text over extracted text
        const fileContent = file.editedText || file.extractedText || '';
        if (fileContent.trim()) {
          return `Document "${file.file.name}":\n${fileContent}\n`;
        }
        return '';
      })
      .filter(text => text.length > 0);

    return documentTexts.join('\n---\n\n');
  }

  /**
   * Validate chat request data
   */
  static validateChatRequest(userMessage: string, legalText: string, analysisResult: DocumentAnalysisResult): void {
    if (!userMessage || userMessage.trim().length === 0) {
      throw new Error('User message cannot be empty');
    }

    if (!analysisResult) {
      throw new Error('Analysis result is required for chat. Please analyze documents first.');
    }

    if (!analysisResult.important_clauses || !analysisResult.legal_risks) {
      throw new Error('Invalid analysis result: missing clauses or risks data');
    }

    // Check message length (reasonable limit for API)
    if (userMessage.length > 2000) {
      throw new Error('Message is too long. Please keep your question under 2000 characters.');
    }

    // Check legal text length
    if (legalText.length > 50000) { // 50KB limit
      throw new Error('Legal document text is too large for chat processing. Please try with smaller documents.');
    }
  }
}