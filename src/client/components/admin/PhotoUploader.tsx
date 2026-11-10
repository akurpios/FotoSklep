import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadPhotos } from '../../api';
import { useTranslation } from '../../i18n/LanguageContext';

interface PhotoUploaderProps {
  projectId: string;
  onUploadSuccess: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

interface StagedFile {
  file: File;
  previewUrl: string;
  id: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  projectId,
  onUploadSuccess,
  onToast,
}) => {
  const { t } = useTranslation();
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newStaged.push({
          file,
          previewUrl: URL.createObjectURL(file),
          id: `${file.name}-${file.size}-${Math.random()}`,
        });
      }
    });

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const removeStaged = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUploadSubmit = async () => {
    if (stagedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setProgress(0);

      const files = stagedFiles.map((s) => s.file);
      await uploadPhotos(projectId, files, (percent) => {
        setProgress(percent);
      });

      // Cleanup preview URLs
      stagedFiles.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      setStagedFiles([]);

      onToast(t.toasts.uploadSuccess, `${files.length} ${t.card.photos}`, 'success');
      onUploadSuccess();
    } catch (err: any) {
      console.error(err);
      onToast('Upload Failed', err.message || 'Error uploading photos', 'error');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? 'border-apple-accent bg-apple-accent/10 scale-[1.01]'
            : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-apple-accent shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">
              {t.uploader.dragTitle}
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              {t.uploader.dragSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Staged files previews */}
      {stagedFiles.length > 0 && (
        <div className="apple-glass rounded-3xl p-5 space-y-4 animate-spring-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-apple-accent" />
              <span className="text-sm font-semibold text-white">
                {t.uploader.readyToUpload} ({stagedFiles.length})
              </span>
            </div>
            <button
              onClick={() => {
                stagedFiles.forEach((s) => URL.revokeObjectURL(s.previewUrl));
                setStagedFiles([]);
              }}
              className="text-xs text-zinc-400 hover:text-apple-danger transition-colors"
            >
              {t.uploader.clearAll}
            </button>
          </div>

          {/* Thumbnails grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {stagedFiles.map((staged) => (
              <div
                key={staged.id}
                className="relative aspect-square rounded-xl overflow-hidden group bg-zinc-900 border border-white/10"
              >
                <img
                  src={staged.previewUrl}
                  alt={staged.file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStaged(staged.id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-apple-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-zinc-300 truncate">
                  {staged.file.name}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>{t.uploader.uploading}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-apple-accent transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="md"
              loading={isUploading}
              onClick={handleUploadSubmit}
              icon={!isUploading && <CheckCircle className="w-4 h-4" />}
            >
              {isUploading ? `${t.uploader.uploading} (${progress}%)` : `${t.uploader.uploadBtn} ${stagedFiles.length} ${t.card.photos}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
