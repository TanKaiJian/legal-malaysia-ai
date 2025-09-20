import { generateClient } from "aws-amplify/api";
import type { Schema } from "../../amplify/data/resource";
import { isDevelopmentMode } from "./amplify-config";

// Create the client - will work even in development mode
export const client = generateClient<Schema>();

// Helper function to handle API calls in development
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallbackData?: any
): Promise<{ data: any; error?: string }> => {
  if (isDevelopmentMode()) {
    console.warn("API call made in development mode - returning fallback data");
    return { data: fallbackData };
  }
  
  try {
    const result = await apiCall();
    return { data: result };
  } catch (error) {
    console.error("API call failed:", error);
    return { 
      data: fallbackData, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
};