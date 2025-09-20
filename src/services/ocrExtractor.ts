import { createWorker } from 'tesseract.js';

export interface OCRExtractionOptions {
  language?: string; // Language for OCR (default: 'eng')
  whiteList?: string; // Characters to recognize
  blackList?: string; // Characters to ignore
  logger?: (info: { status: string; progress: number }) => void; // Progress callback
}

export interface OCRExtractionResult {
  text: string;
  confidence: number;
  processingTime: number; // Time taken in milliseconds
}

/**
 * Extract text from an image file using Tesseract.js OCR
 * @param file - Image file to extract text from
 * @param options - OCR extraction options
 * @returns Promise containing extracted text and metadata
 */
export async function extractTextFromImage(
  file: File,
  options: OCRExtractionOptions = {}
): Promise<OCRExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Create Tesseract worker
    const worker = await createWorker(options.language || 'eng', undefined, {
      logger: options.logger || (() => {}), // Default no-op logger
    });

    // Configure worker parameters
    if (options.whiteList) {
      await worker.setParameters({
        tessedit_char_whitelist: options.whiteList,
      });
    }

    if (options.blackList) {
      await worker.setParameters({
        tessedit_char_blacklist: options.blackList,
      });
    }

    // Perform OCR
    const { data } = await worker.recognize(file);

    // Clean up worker
    await worker.terminate();

    const processingTime = Date.now() - startTime;

    // Process results
    const result: OCRExtractionResult = {
      text: data.text.trim(),
      confidence: data.confidence,
      processingTime,
    };

    return result;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract plain text only from an image file
 * @param file - Image file to extract text from
 * @param language - Language for OCR (default: 'eng')
 * @returns Promise containing extracted text
 */
export async function extractPlainTextFromImage(
  file: File,
  language: string = 'eng'
): Promise<string> {
  const result = await extractTextFromImage(file, { language });
  return result.text;
}

/**
 * Extract text from an image with high accuracy settings
 * @param file - Image file to extract text from
 * @param language - Language for OCR (default: 'eng')
 * @returns Promise containing extracted text and confidence
 */
export async function extractTextFromImageHighAccuracy(
  file: File,
  language: string = 'eng'
): Promise<{ text: string; confidence: number }> {
  const result = await extractTextFromImage(file, {
    language,
  });

  return {
    text: result.text,
    confidence: result.confidence,
  };
}

/**
 * Extract text from multiple image files
 * @param files - Array of image files to process
 * @param options - OCR extraction options
 * @returns Promise containing array of extraction results
 */
export async function extractTextFromMultipleImages(
  files: File[],
  options: OCRExtractionOptions = {}
): Promise<OCRExtractionResult[]> {
  const results: OCRExtractionResult[] = [];
  
  for (const file of files) {
    try {
      const result = await extractTextFromImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      // Continue with other files even if one fails
      results.push({
        text: '',
        confidence: 0,
        processingTime: 0,
      });
    }
  }
  
  return results;
}

/**
 * Get supported languages for OCR
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): string[] {
  return [
    'afr', 'amh', 'ara', 'asm', 'aze', 'aze_cyrl', 'bel', 'ben', 'bod', 'bos',
    'bul', 'cat', 'ceb', 'ces', 'chi_sim', 'chi_tra', 'chr', 'cym', 'dan',
    'deu', 'div', 'dzo', 'ell', 'eng', 'enm', 'epo', 'est', 'eus', 'fas',
    'fin', 'fra', 'frk', 'frm', 'gle', 'glg', 'grc', 'guj', 'hat', 'heb',
    'hin', 'hrv', 'hun', 'iku', 'ind', 'isl', 'ita', 'ita_old', 'jav', 'jpn',
    'kan', 'kat', 'kat_old', 'kaz', 'khm', 'kir', 'kor', 'kur', 'lao', 'lat',
    'lav', 'lit', 'mal', 'mar', 'mkd', 'mlt', 'mon', 'mri', 'msa', 'mya',
    'nep', 'nld', 'nor', 'oci', 'ori', 'pan', 'pol', 'por', 'pus', 'ron',
    'rus', 'san', 'sin', 'slk', 'slv', 'spa', 'spa_old', 'sqi', 'srp',
    'srp_latn', 'swa', 'swe', 'syr', 'tam', 'tel', 'tgk', 'tgl', 'tha',
    'tir', 'tur', 'uig', 'ukr', 'urd', 'uzb', 'uzb_cyrl', 'vie', 'yid'
  ];
}

/**
 * Validate if a file is a supported image format for OCR
 * @param file - File to validate
 * @returns boolean indicating if the file is a supported image format
 */
export function isSupportedImageFormat(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp'
  ];
  
  const supportedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'
  ];
  
  const hasValidType = supportedTypes.includes(file.type);
  const hasValidExtension = supportedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasValidType || hasValidExtension;
}

/**
 * Preprocess image for better OCR accuracy
 * This function would ideally use canvas for image preprocessing
 * @param file - Image file to preprocess
 * @returns Promise containing preprocessed image data URL
 */
export async function preprocessImageForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Get image data for preprocessing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple grayscale conversion and contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Increase contrast
        const contrast = 1.5;
        const enhancedGray = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));
        
        data[i] = enhancedGray;     // Red
        data[i + 1] = enhancedGray; // Green
        data[i + 2] = enhancedGray; // Blue
        // Alpha channel remains unchanged
      }
      
      // Put processed image data back to canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image as data URL
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing'));
    };
    
    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}