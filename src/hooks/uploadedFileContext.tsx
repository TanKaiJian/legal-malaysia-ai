import React, { createContext, useContext, useState } from "react";

export interface saveUploadedFiles {
  file: File;
  extractedText?: string;
}

interface UploadedFilesContextType {
  saveUploadedFiles: saveUploadedFiles[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<saveUploadedFiles[]>>;
}

const UploadedFilesContext = createContext<UploadedFilesContextType | undefined>(undefined);

export const UploadedFilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saveUploadedFiles, setUploadedFiles] = useState<saveUploadedFiles[]>([]);
  return (
    <UploadedFilesContext.Provider value={{ saveUploadedFiles, setUploadedFiles }}>
      {children}
    </UploadedFilesContext.Provider>
  );
};

export const useUploadedFiles = () => {
  const context = useContext(UploadedFilesContext);
  if (!context) throw new Error("useUploadedFiles must be used inside UploadedFilesProvider");
  return context;
};
