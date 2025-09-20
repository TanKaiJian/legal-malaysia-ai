import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Set up the worker for PDF.js using modern import.meta.url
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// Interface for PDF metadata info
interface PDFInfoObject {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  [key: string]: unknown;
}

export interface PdfExtractionOptions {
  pageNumbers?: number[]; // Extract text from specific pages only
  includeMetadata?: boolean; // Include PDF metadata in the result
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Extract text from a PDF file using PDF.js
 * @param file - PDF file to extract text from
 * @param options - Extraction options
 * @returns Promise containing extracted text and metadata
 */
export async function extractTextFromPDF(
  file: File,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const result: PdfExtractionResult = {
      text: '',
      pageCount: pdf.numPages,
    };

    // Extract metadata if requested
    if (options.includeMetadata) {
      try {
        const metadata = await pdf.getMetadata();
        if (metadata.info) {
          const info = metadata.info as PDFInfoObject; // Type assertion for PDF metadata
          result.metadata = {
            title: info.Title || undefined,
            author: info.Author || undefined,
            subject: info.Subject || undefined,
            creator: info.Creator || undefined,
            producer: info.Producer || undefined,
            creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
            modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
          };
        }
      } catch (metadataError) {
        console.warn('Failed to extract PDF metadata:', metadataError);
      }
    }

    // Determine which pages to extract
    const pagesToExtract = options.pageNumbers || Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    
    // Extract text from each page
    const textPromises = pagesToExtract.map(async (pageNum) => {
      if (pageNum < 1 || pageNum > pdf.numPages) {
        console.warn(`Page ${pageNum} is out of range. PDF has ${pdf.numPages} pages.`);
        return '';
      }

      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items and join them (like in working example)
        const textItems = textContent.items
          .filter((item): item is TextItem => 'str' in item)
          .map((item) => item.str)
          .join(' ');
        
        return textItems;
      } catch (pageError) {
        console.error(`Error extracting text from page ${pageNum}:`, pageError);
        return '';
      }
    });

    const pageTexts = await Promise.all(textPromises);
    result.text = pageTexts.join('\n\n').trim();

    return result;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from specific pages of a PDF file
 * @param file - PDF file to extract text from
 * @param pageNumbers - Array of page numbers to extract (1-indexed)
 * @returns Promise containing extracted text
 */
export async function extractTextFromPDFPages(
  file: File,
  pageNumbers: number[]
): Promise<string> {
  const result = await extractTextFromPDF(file, { pageNumbers });
  return result.text;
}

/**
 * Get basic information about a PDF file
 * @param file - PDF file to analyze
 * @returns Promise containing PDF information
 */
export async function getPDFInfo(file: File): Promise<{
  pageCount: number;
  hasText: boolean;
  fileSize: number;
  metadata?: PdfExtractionResult['metadata'];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Check if PDF has extractable text by trying to extract from first page
    let hasText = false;
    try {
      const firstPage = await pdf.getPage(1);
      const textContent = await firstPage.getTextContent();
      hasText = textContent.items.length > 0;
    } catch {
      hasText = false;
    }

    // Get metadata
    let metadata: PdfExtractionResult['metadata'];
    try {
      const pdfMetadata = await pdf.getMetadata();
      if (pdfMetadata.info) {
        const info = pdfMetadata.info as PDFInfoObject; // Type assertion for PDF metadata
        metadata = {
          title: info.Title || undefined,
          author: info.Author || undefined,
          subject: info.Subject || undefined,
          creator: info.Creator || undefined,
          producer: info.Producer || undefined,
          creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
          modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
        };
      }
    } catch {
      metadata = undefined;
    }

    return {
      pageCount: pdf.numPages,
      hasText,
      fileSize: file.size,
      metadata,
    };
  } catch (error) {
    console.error('Error getting PDF info:', error);
    throw new Error(`Failed to get PDF information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}