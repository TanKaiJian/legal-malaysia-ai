import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface EditDocumentModalProps {
  file: File;
  initialText: string;
  isOpen: boolean;
  onSave: (newText: string) => void;
  onClose: () => void;
}

export function EditDocumentModal({ file, initialText, isOpen, onSave, onClose }: EditDocumentModalProps) {
  const [text, setText] = useState(initialText);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleClose = () => {
    setText(initialText); // Reset text when closing without saving
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Document - {file.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Edit document content here..."
            className="min-h-[400px] resize-none bg-background text-foreground border-border"
          />
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}