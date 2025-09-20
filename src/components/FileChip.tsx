import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, Image, Loader2, Check, AlertCircle, Edit } from "lucide-react";
import { formatFileSize } from "@/lib/file";

interface FileChipProps {
  file: File;
  status: 'idle' | 'uploading' | 'done' | 'error';
  onRemove: () => void;
  onEdit?: () => void;
}

export function FileChip({ file, status, onRemove, onEdit }: FileChipProps) {
  const isImage = file.type.startsWith('image/');
  const truncatedName = file.name.length > 20 
    ? `${file.name.slice(0, 10)}...${file.name.slice(-7)}` 
    : file.name;

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
      case 'done':
        return <Check className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20';
      case 'done':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      default:
        return 'border-border bg-muted';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm text-foreground ${getStatusColor()}`}>
      <div className="flex items-center gap-2">
        {isImage ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[120px]" title={file.name}>
            {truncatedName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {getStatusIcon()}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-5 w-5 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950/20"
          aria-label={`Edit ${file.name}`}
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/20"
          aria-label={`Remove ${file.name}`}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}