import React, { createContext, useContext, useState } from "react";

export interface saveUploadedFiles {
  file: File;
  extractedText?: string;
}

export interface ImportantClause {
  clause_title: string;
  clause_text: string;
  summary: string;
  relevant_law?: string;
}

export interface LegalRisk {
  risk_area: string;
  description: string;
  potential_consequence: string;
  related_clause: string;
  relevant_law?: string;
}

export interface DocumentAnalysisResult {
  important_clauses: ImportantClause[];
  legal_risks: LegalRisk[];
  notes: string;
  document_title?: string;
  analyzed_files?: string[]; // List of file names that were analyzed
}

interface UploadedFilesContextType {
  saveUploadedFiles: saveUploadedFiles[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<saveUploadedFiles[]>>;
  analysisResult: DocumentAnalysisResult | null;
  setAnalysisResult: React.Dispatch<React.SetStateAction<DocumentAnalysisResult | null>>;
}

const UploadedFilesContext = createContext<UploadedFilesContextType | undefined>(undefined);

export const UploadedFilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saveUploadedFiles, setUploadedFiles] = useState<saveUploadedFiles[]>([]);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  
  return (
    <UploadedFilesContext.Provider value={{ 
      saveUploadedFiles, 
      setUploadedFiles, 
      analysisResult, 
      setAnalysisResult 
    }}>
      {children}
    </UploadedFilesContext.Provider>
  );
};

export const useUploadedFiles = () => {
  const context = useContext(UploadedFilesContext);
  if (!context) throw new Error("useUploadedFiles must be used inside UploadedFilesProvider");
  return context;
};
