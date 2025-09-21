import { DocumentAnalysisResult } from '@/hooks/uploadedFileContext';

const API_ENDPOINT =
	"https://f9jekjb575.execute-api.ap-southeast-1.amazonaws.com/devmhtwo/bedrockapi";

export interface AnalysisRequest {
  userQuestion?: string;
  snippets: string[];
}

// Response structure from the new Lambda function (Bedrock chat completion format)
export interface LambdaResponse {
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

// Direct LLM response structure (what's inside the 'answer' field)
export interface LLMResponse {
  important_clauses: Array<{
    clause_title: string;
    clause_text: string;
    summary: string;
    relevant_law?: string;
  }>;
  legal_risks: Array<{
    risk_area: string;
    description: string;
    potential_consequence: string;
    related_clause: string;
    relevant_law?: string;
  }>;
  notes: string;
}

export class DocumentAnalysisService {
  /**
   * Analyze documents using the AWS Lambda function
   */
  static async analyzeDocuments(
    documentTexts: string[],
    userQuestion: string = "Please analyze these legal documents and identify important clauses and potential legal risks according to Malaysian law."
  ): Promise<DocumentAnalysisResult> {
    try {
      const requestBody: AnalysisRequest = {
        userQuestion,
        snippets: documentTexts
      };

      const response = await fetch(API_ENDPOINT, {
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
      
      console.log('Lambda response:', responseData); // Debug log
      
      let analysisData: LLMResponse;
      
      // Handle the new Lambda response format
      if (responseData.answer && responseData.answer.choices && responseData.answer.choices.length > 0) {
        // New Lambda response format with Bedrock chat completion structure
        const lambdaResponse = responseData as LambdaResponse;
        const firstChoice = lambdaResponse.answer.choices[0];
        
        if (!firstChoice.message || !firstChoice.message.content) {
          throw new Error('Missing message content in API response');
        }
        
        const messageContent = firstChoice.message.content;
        
        try {
          // Parse the JSON content from the message
          analysisData = JSON.parse(messageContent);
          
          // Additional validation of parsed content
          if (!analysisData.important_clauses || !analysisData.legal_risks) {
            console.error('Parsed content missing required fields:', analysisData);
            throw new Error('Parsed response missing required analysis fields');
          }
          
        } catch (parseError) {
          console.error('Failed to parse message content JSON:', parseError);
          console.error('Content that failed to parse:', messageContent);
          throw new Error('Invalid JSON format in response message content. The AI may have returned malformed data.');
        }
      } else if (responseData.important_clauses && responseData.legal_risks) {
        // Direct LLM response format (fallback)
        analysisData = responseData as LLMResponse;
      } else {
        console.error('Invalid response structure:', responseData);
        throw new Error('Invalid response format: missing expected data structure');
      }

      // Validate that we have the required fields
      if (!Array.isArray(analysisData.important_clauses) || !Array.isArray(analysisData.legal_risks)) {
        throw new Error('Invalid response format: clauses and risks must be arrays');
      }

      // Transform to our DocumentAnalysisResult format
      const result: DocumentAnalysisResult = {
        important_clauses: analysisData.important_clauses || [],
        legal_risks: analysisData.legal_risks || [],
        notes: analysisData.notes || "This analysis is for informational purposes only and does not constitute legal advice. Please consult a licensed lawyer for any legally sensitive decisions.",
        document_title: "AI-Powered Legal Document Analysis",
        analyzed_files: [] // This will be populated by the calling component
      };

      console.log('Transformed result:', result); // Debug log
      return result;

    } catch (error) {
      console.error('Document analysis service error:', error);
      
      // Provide more specific error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the analysis service. Please check your internet connection and try again.');
      }

      // Handle specific Lambda function errors
      if (error instanceof Error) {
        if (error.message.includes('422')) {
          throw new Error('The AI was unable to validate the analysis results reliably. This may happen with complex or unclear documents. Please try with clearer text or consult a legal professional.');
        }
        
        if (error.message.includes('500')) {
          throw new Error('The analysis service encountered an internal error. Please try again in a few minutes.');
        }

        throw error;
      }
      
      throw new Error('An unexpected error occurred during document analysis. Please try again later.');
    }
  }

  /**
   * Validate that the document texts are suitable for analysis
   */
  static validateDocumentTexts(documentTexts: string[]): void {
    if (!documentTexts || documentTexts.length === 0) {
      throw new Error('No documents provided for analysis');
    }

    // Check if any texts are empty or too short
    const minTextLength = 50; // Minimum characters for meaningful analysis
    const validTexts = documentTexts.filter(text => text && text.trim().length >= minTextLength);
    
    if (validTexts.length === 0) {
      throw new Error('Documents appear to be empty or too short for analysis. Please ensure your documents contain substantial text content.');
    }

    // Check if total text length is reasonable (not too long for the API)
    const totalLength = documentTexts.join('').length;
    const maxTotalLength = 100000; // 100KB limit
    
    if (totalLength > maxTotalLength) {
      throw new Error('Combined document text is too large for analysis. Please try with smaller documents or fewer files.');
    }
  }

  /**
   * Prepare document texts by cleaning and formatting them
   */
  static prepareDocumentTexts(documentTexts: string[]): string[] {
    return documentTexts.map(text => {
      // Clean up the text by removing excessive whitespace and normalizing line breaks
      return text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Reduce multiple consecutive line breaks
        .replace(/[ \t]{2,}/g, ' ') // Reduce multiple spaces/tabs to single space
        .trim();
    }).filter(text => text.length > 0);
  }
}