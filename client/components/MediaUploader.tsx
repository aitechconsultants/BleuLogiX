import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface MediaUploaderProps {
  onFilesSelected: (files: UploadedFile[]) => void;
}

export default function MediaUploader({ onFilesSelected }: MediaUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = [
    "video/mp4",
    "video/quicktime",
    "image/png",
    "image/jpeg",
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = [];
    Array.from(files).forEach((file) => {
      if (acceptedFormats.includes(file.type)) {
        newFiles.push({
          id: Math.random().toString(36),
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }
    });

    const allFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(allFiles);
    onFilesSelected(allFiles);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    const newFiles = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer ${
          isDragging
            ? "border-accent-blue bg-accent-blue/10"
            : "border-border hover:border-accent-blue/50 bg-card/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.png,.jpg,.jpeg"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <Upload className="w-10 h-10 text-accent-blue/60" />
          <div className="text-center">
            <p className="font-semibold text-foreground">
              Drag and drop your files here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (MP4, MOV, PNG, JPG)
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded Files ({uploadedFiles.length})
          </p>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
