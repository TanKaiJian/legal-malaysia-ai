import { defineFunction } from "@aws-amplify/backend";

export const analyzeDocument = defineFunction({
  name: "analyze-document",  
  entry: "./handler.ts"
});