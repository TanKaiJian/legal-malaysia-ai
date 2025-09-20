import { extractTextFromPDF, PdfExtractionOptions, PdfExtractionResult } from './pdfExtractor';
import { extractTextFromDOCX, DocxExtractionOptions, DocxExtractionResult } from './docxExtractor';
import { extractTextFromImage, OCRExtractionOptions, OCRExtractionResult, isSupportedImageFormat } from './ocrExtractor';

export enum SupportedFileType {
  PDF = 'pdf',
  DOCX = 'docx',
  IMAGE = 'image',
  UNSUPPORTED = 'unsupported'
}

export interface TextExtractionOptions {
  // PDF specific options
  pdfOptions?: PdfExtractionOptions;
  
  // DOCX specific options
  docxOptions?: DocxExtractionOptions;
  
  // OCR specific options
  ocrOptions?: OCRExtractionOptions;
  
  // General options
  fallbackToOCR?: boolean; // If true, try OCR if primary extraction fails
  preprocessImage?: boolean; // Preprocess images for better OCR accuracy
}

export interface UnifiedExtractionResult {
  text: string;
  fileType: SupportedFileType;
  extractionMethod: 'pdf' | 'docx' | 'ocr';
  success: boolean;
  
  // Original results from specific extractors
  pdfResult?: PdfExtractionResult;
  docxResult?: DocxExtractionResult;
  ocrResult?: OCRExtractionResult;
  
  // Metadata
  processingTime: number;
  fileSize: number;
  fileName: string;
  
  // Error information
  error?: string;
  warnings?: string[];
}

/**
 * Determine the file type based on file extension and MIME type
 * @param file - File to analyze
 * @returns File type enum
 */
export function detectFileType(file: File): SupportedFileType {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Check PDF
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return SupportedFileType.PDF;
  }
  
  // Check DOCX
  if (fileName.endsWith('.docx') || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return SupportedFileType.DOCX;
  }
  
  // Check image formats
  if (isSupportedImageFormat(file)) {
    return SupportedFileType.IMAGE;
  }
  
  return SupportedFileType.UNSUPPORTED;
}

/**
 * Extract text from any supported file type
 * This is the main function that automatically chooses the appropriate extraction method
 * @param file - File to extract text from
 * @param options - Extraction options for different file types
 * @returns Promise containing unified extraction result
 */
export async function extractText(
  file: File,
  options: TextExtractionOptions = {}
): Promise<UnifiedExtractionResult> {
  const startTime = Date.now();
  const fileType = detectFileType(file);
  
  const baseResult: Partial<UnifiedExtractionResult> = {
    fileType,
    fileSize: file.size,
    fileName: file.name,
    warnings: [],
  };
  
  // Handle unsupported files
  if (fileType === SupportedFileType.UNSUPPORTED) {
    return {
      ...baseResult,
      text: '',
      extractionMethod: 'ocr',
      success: false,
      processingTime: Date.now() - startTime,
      error: `Unsupported file type: ${file.name}. Supported formats: PDF, DOCX, and images (JPEG, PNG, GIF, BMP, TIFF, WebP)`,
    } as UnifiedExtractionResult;
  }
  
  try {
    let result: UnifiedExtractionResult;
    
    switch (fileType) {
      case SupportedFileType.PDF:
        result = await extractFromPDF(file, options, baseResult, startTime);
        break;
        
      case SupportedFileType.DOCX:
        result = await extractFromDOCX(file, options, baseResult, startTime);
        break;
        
      case SupportedFileType.IMAGE:
        result = await extractFromImage(file, options, baseResult, startTime);
        break;
        
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try OCR as fallback if enabled and not already tried
    if (options.fallbackToOCR && fileType !== SupportedFileType.IMAGE) {
      try {
        console.warn(`Primary extraction failed for ${file.name}, trying OCR as fallback...`);
        const ocrResult = await extractFromImage(file, options, baseResult, startTime);
        ocrResult.warnings = ocrResult.warnings || [];
        ocrResult.warnings.push(`Primary ${fileType} extraction failed, used OCR as fallback`);
        return ocrResult;
      } catch (ocrError) {
        console.error('OCR fallback also failed:', ocrError);
      }
    }
    
    return {
      ...baseResult,
      text: '',
      extractionMethod: fileType === SupportedFileType.PDF ? 'pdf' : fileType === SupportedFileType.DOCX ? 'docx' : 'ocr',
      success: false,
      processingTime: Date.now() - startTime,
      error: errorMessage,
    } as UnifiedExtractionResult;
  }
}

/**
 * Extract text from PDF file
 */
async function extractFromPDF(
  file: File,
  options: TextExtractionOptions,
  baseResult: Partial<UnifiedExtractionResult>,
  startTime: number
): Promise<UnifiedExtractionResult> {
  const pdfResult = await extractTextFromPDF(file, options.pdfOptions);
  
  return {
    ...baseResult,
    text: pdfResult.text,
    extractionMethod: 'pdf',
    success: true,
    pdfResult,
    processingTime: Date.now() - startTime,
  } as UnifiedExtractionResult;
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(
  file: File,
  options: TextExtractionOptions,
  baseResult: Partial<UnifiedExtractionResult>,
  startTime: number
): Promise<UnifiedExtractionResult> {
  const docxResult = await extractTextFromDOCX(file, options.docxOptions);
  
  const warnings: string[] = [];
  if (docxResult.messages.some(msg => msg.type === 'warning')) {
    warnings.push('DOCX file contains warnings during extraction');
  }
  
  return {
    ...baseResult,
    text: docxResult.text,
    extractionMethod: 'docx',
    success: true,
    docxResult,
    processingTime: Date.now() - startTime,
    warnings: warnings.length > 0 ? warnings : undefined,
  } as UnifiedExtractionResult;
}

/**
 * Extract text from image file using OCR
 */
async function extractFromImage(
  file: File,
  options: TextExtractionOptions,
  baseResult: Partial<UnifiedExtractionResult>,
  startTime: number
): Promise<UnifiedExtractionResult> {
  const ocrResult = await extractTextFromImage(file, options.ocrOptions);
  
  const warnings: string[] = [];
  if (ocrResult.confidence < 50) {
    warnings.push(`Low OCR confidence: ${ocrResult.confidence.toFixed(1)}%`);
  }
  
  return {
    ...baseResult,
    text: ocrResult.text,
    extractionMethod: 'ocr',
    success: true,
    ocrResult,
    processingTime: Date.now() - startTime,
    warnings: warnings.length > 0 ? warnings : undefined,
  } as UnifiedExtractionResult;
}

/**
 * Extract text from multiple files
 * @param files - Array of files to process
 * @param options - Extraction options
 * @returns Promise containing array of extraction results
 */
export async function extractTextFromMultipleFiles(
  files: File[],
  options: TextExtractionOptions = {}
): Promise<UnifiedExtractionResult[]> {
  const results: UnifiedExtractionResult[] = [];
  
  for (const file of files) {
    try {
      const result = await extractText(file, options);
      results.push(result);
    } catch (error) {
      // Add failed result for tracking
      results.push({
        text: '',
        fileType: detectFileType(file),
        extractionMethod: 'ocr',
        success: false,
        processingTime: 0,
        fileSize: file.size,
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Get summary statistics from multiple extraction results
 * @param results - Array of extraction results
 * @returns Summary statistics
 */
export function getExtractionSummary(results: UnifiedExtractionResult[]) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  
  const byType = results.reduce((acc, result) => {
    acc[result.fileType] = (acc[result.fileType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byMethod = results.reduce((acc, result) => {
    acc[result.extractionMethod] = (acc[result.extractionMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalProcessingTime = results.reduce((sum, result) => sum + result.processingTime, 0);
  const averageProcessingTime = total > 0 ? totalProcessingTime / total : 0;
  
  const totalTextLength = results
    .filter(r => r.success)
    .reduce((sum, result) => sum + result.text.length, 0);
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    byType,
    byMethod,
    totalProcessingTime,
    averageProcessingTime,
    totalTextLength,
  };
}

/**
 * Validate if a file can be processed
 * @param file - File to validate
 * @returns Validation result with details
 */
export function validateFile(file: File): {
  isValid: boolean;
  fileType: SupportedFileType;
  reason?: string;
  maxSize?: number;
} {
  const fileType = detectFileType(file);
  
  if (fileType === SupportedFileType.UNSUPPORTED) {
    return {
      isValid: false,
      fileType,
      reason: 'Unsupported file format',
    };
  }
  
  // Check file size limits (adjust as needed)
  const maxSizes = {
    [SupportedFileType.PDF]: 50 * 1024 * 1024, // 50MB
    [SupportedFileType.DOCX]: 25 * 1024 * 1024, // 25MB
    [SupportedFileType.IMAGE]: 10 * 1024 * 1024, // 10MB
  };
  
  const maxSize = maxSizes[fileType];
  if (file.size > maxSize) {
    return {
      isValid: false,
      fileType,
      reason: `File size exceeds limit`,
      maxSize,
    };
  }
  
  return {
    isValid: true,
    fileType,
  };
}

// Export all types and functions
export * from './pdfExtractor';
export * from './docxExtractor';
export * from './ocrExtractor';