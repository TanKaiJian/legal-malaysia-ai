import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface UploadPickerProps {
  mode: "document" | "photo";
  multiple: boolean;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadPicker({ mode, multiple, onFilesSelected, disabled }: UploadPickerProps) {
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  return (
    <div className="flex gap-2">
      {/* Document Upload Button */}
      <input
        ref={documentInputRef}
        type="file"
        multiple={multiple}
        accept="application/pdf,.doc,.docx,.txt,image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload documents"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => documentInputRef.current?.click()}
        disabled={disabled}
        className="flex items-center gap-2 min-h-[40px]"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Upload documents</span>
        <span className="sm:hidden">Upload</span>
      </Button>

      {/* Photo/Camera Button - Only show on mobile */}
      {isMobile && (
        <>
          <input
            ref={photoInputRef}
            type="file"
            multiple={multiple}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Take photo"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => photoInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-2 min-h-[40px]"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Take photo</span>
            <span className="sm:hidden">Photo</span>
          </Button>
        </>
      )}
    </div>
  );
}