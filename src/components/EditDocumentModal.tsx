import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface EditDocumentModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newText: string) => void;
}

export function EditDocumentModal({ file, isOpen, onClose, onSave }: EditDocumentModalProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        setText(result);
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        setText(`Unable to read ${file.name}. Please note that this editor works best with text files.`);
        setIsLoading(false);
      };

      // Try to read as text for all file types
      reader.readAsText(file);
    }
  }, [file, isOpen]);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleClose = () => {
    setText("");
    onClose();
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Document - {file.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading document content...</span>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-full min-h-[400px] resize-none font-mono text-sm"
              placeholder="Document content will appear here..."
            />
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}