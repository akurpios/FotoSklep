import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import type { Photo } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface LightboxModalProps {
  photo: Photo | null;
  photos: Photo[];
  isLocked: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleSelect: (photoId: string) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  photo,
  photos,
  isLocked,
  onClose,
  onNext,
  onPrev,
  onToggleSelect,
}) => {
  const { t } = useTranslation();

  if (!photo) return null;

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const isSelected = photo.selected === 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isLocked) onToggleSelect(photo.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo.id, isLocked, onClose, onNext, onPrev, onToggleSelect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none bg-black/95 backdrop-blur-2xl animate-spring-up">
      {/* Top Bar Controls */}
      <div className="absolute top-0 inset-x-0 h-16 px-4 sm:px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
          <span className="bg-white/10 px-2.5 py-1 rounded-full text-zinc-200">
            {t.lightbox.photo} {currentIndex + 1} {t.lightbox.of} {photos.length}
          </span>
          <span className="hidden sm:inline text-zinc-300 font-medium truncate max-w-xs">
            {photo.filename}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Select Toggle Button */}
          <button
            type="button"
            disabled={isLocked}
            onClick={() => !isLocked && onToggleSelect(photo.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all apple-press shadow-lg ${
              isSelected
                ? 'bg-apple-accent text-white ring-2 ring-blue-400/30'
                : 'bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/10'
            } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Heart className={`w-4 h-4 ${isSelected ? 'fill-current' : ''}`} />
            <span>{isSelected ? t.lightbox.selected : t.lightbox.selectPhoto}</span>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors apple-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12"
        onClick={onClose}
      >
        <img
          src={photo.url}
          alt={photo.filename}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-200"
        />
      </div>

      {/* Previous Button */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all apple-press z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next Button */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all apple-press z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none text-[11px] text-zinc-500 font-mono hidden sm:block">
        {t.lightbox.keyboardHint}
      </div>
    </div>
  );
};
