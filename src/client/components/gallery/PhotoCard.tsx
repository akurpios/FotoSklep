import React from 'react';
import { Heart } from 'lucide-react';
import type { Photo } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isLocked: boolean;
  onToggleSelect: (photoId: string, e: React.MouseEvent) => void;
  onClick: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  index,
  isLocked,
  onToggleSelect,
  onClick,
}) => {
  const { t } = useTranslation();
  const isSelected = photo.selected === 1;

  return (
    <div
      onClick={() => onClick(photo)}
      className={`group relative aspect-[3/2] rounded-2xl overflow-hidden bg-zinc-950 border cursor-pointer select-none apple-press shadow-md transition-all duration-300 ${
        isSelected
          ? 'border-apple-accent ring-2 ring-apple-accent/40 shadow-blue-500/10'
          : 'border-white/10 hover:border-white/25 hover:shadow-xl'
      }`}
    >
      {/* Photo Image */}
      <img
        src={photo.url}
        alt={photo.filename}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-105 image-zoom-transition"
      />

      {/* Index Pill */}
      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-zinc-300 border border-white/10 shadow-sm pointer-events-none">
        #{index + 1}
      </div>

      {/* Selection Toggle Button (Heart) */}
      <button
        type="button"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation();
          if (!isLocked) onToggleSelect(photo.id, e);
        }}
        title={isLocked ? t.gallery.confirmedTitle : isSelected ? t.lightbox.selected : t.lightbox.selectPhoto}
        className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 apple-press shadow-lg ${
          isSelected
            ? 'bg-apple-accent text-white scale-100 ring-2 ring-white/30'
            : 'bg-black/50 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-md border border-white/15 opacity-80 group-hover:opacity-100'
        } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
      >
        <Heart
          className={`w-5 h-5 transition-transform duration-200 ${
            isSelected ? 'fill-current scale-110' : ''
          }`}
        />
      </button>

      {/* Filename Bar on bottom */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 text-[11px] font-mono text-zinc-300 truncate pointer-events-none flex items-center justify-between">
        <span className="truncate">{photo.filename}</span>
        {isSelected && (
          <span className="text-[10px] text-apple-accent font-sans font-semibold tracking-wide ml-2 shrink-0">
            {t.gallery.selectedTag}
          </span>
        )}
      </div>
    </div>
  );
};
