import mammoth from 'mammoth';

// Simple type definitions for mammoth results
interface MammothMessage {
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface MammothResult {
  value: string;
  messages: MammothMessage[];
}

export interface DocxExtractionOptions {
  includeStyleInfo?: boolean; // Include basic style information
  ignoreEmptyParagraphs?: boolean; // Skip empty paragraphs
  styleMap?: string[]; // Custom style mappings
}

export interface DocxExtractionResult {
  text: string;
  html?: string;
  messages: MammothMessage[];
  metadata?: {
    wordCount: number;
    paragraphCount: number;
    hasImages: boolean;
  };
}

/**
 * Extract text from a DOCX file using Mammoth.js
 * @param file - DOCX file to extract text from
 * @param options - Extraction options
 * @returns Promise containing extracted text and metadata
 */
export async function extractTextFromDOCX(
  file: File,
  options: DocxExtractionOptions = {}
): Promise<DocxExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Configure mammoth options
    const mammothOptions: Record<string, unknown> = {};
    
    if (options.styleMap) {
      mammothOptions.styleMap = options.styleMap;
    }

    // Extract text
    const textResult: MammothResult = await mammoth.extractRawText({ arrayBuffer });
    
    let html: string | undefined;
    let htmlMessages: MammothMessage[] = [];
    
    // Extract HTML if style info is requested
    if (options.includeStyleInfo) {
      const htmlResult: MammothResult = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
      html = htmlResult.value;
      htmlMessages = htmlResult.messages;
    }

    // Process text
    let processedText = textResult.value;
    if (options.ignoreEmptyParagraphs) {
      processedText = processedText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n');
    }

    // Calculate metadata
    const wordCount = processedText.trim().split(/\s+/).filter(word => word.length > 0).length;
    const paragraphCount = processedText.split('\n').filter(para => para.trim().length > 0).length;
    const hasImages = textResult.messages.some(msg => 
      msg.message.includes('image') || msg.type === 'warning'
    );

    const result: DocxExtractionResult = {
      text: processedText,
      html,
      messages: [...textResult.messages, ...htmlMessages],
      metadata: {
        wordCount,
        paragraphCount,
        hasImages,
      }
    };

    return result;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract plain text only from a DOCX file
 * @param file - DOCX file to extract text from
 * @returns Promise containing extracted text
 */
export async function extractPlainTextFromDOCX(file: File): Promise<string> {
  const result = await extractTextFromDOCX(file, { ignoreEmptyParagraphs: true });
  return result.text;
}

/**
 * Extract HTML content from a DOCX file with styling preserved
 * @param file - DOCX file to extract HTML from
 * @param styleMap - Optional custom style mappings
 * @returns Promise containing HTML content
 */
export async function extractHTMLFromDOCX(
  file: File,
  styleMap?: string[]
): Promise<{ html: string; messages: MammothMessage[] }> {
  const result = await extractTextFromDOCX(file, {
    includeStyleInfo: true,
    styleMap,
    ignoreEmptyParagraphs: true,
  });
  
  return {
    html: result.html || '',
    messages: result.messages,
  };
}

/**
 * Get basic information about a DOCX file
 * @param file - DOCX file to analyze
 * @returns Promise containing DOCX information
 */
export async function getDOCXInfo(file: File): Promise<{
  wordCount: number;
  paragraphCount: number;
  hasImages: boolean;
  hasWarnings: boolean;
  fileSize: number;
  messages: MammothMessage[];
}> {
  try {
    const result = await extractTextFromDOCX(file);
    
    return {
      wordCount: result.metadata?.wordCount || 0,
      paragraphCount: result.metadata?.paragraphCount || 0,
      hasImages: result.metadata?.hasImages || false,
      hasWarnings: result.messages.some(msg => msg.type === 'warning'),
      fileSize: file.size,
      messages: result.messages,
    };
  } catch (error) {
    console.error('Error getting DOCX info:', error);
    throw new Error(`Failed to get DOCX information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert DOCX to HTML with basic options
 * @param file - DOCX file to convert
 * @returns Promise containing HTML content
 */
export async function convertDOCXToHTML(
  file: File
): Promise<{ html: string; messages: MammothMessage[] }> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const result: MammothResult = await mammoth.convertToHtml({ arrayBuffer });
    return {
      html: result.value,
      messages: result.messages,
    };
  } catch (error) {
    console.error('Error converting DOCX to HTML:', error);
    throw new Error(`Failed to convert DOCX to HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a file is a valid DOCX file
 * @param file - File to validate
 * @returns Promise<boolean> indicating if the file is a valid DOCX
 */
export async function isValidDOCX(file: File): Promise<boolean> {
  try {
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return false;
    }
    
    // Try to extract text - if it succeeds, it's likely a valid DOCX
    const arrayBuffer = await file.arrayBuffer();
    await mammoth.extractRawText({ arrayBuffer });
    return true;
  } catch {
    return false;
  }
}