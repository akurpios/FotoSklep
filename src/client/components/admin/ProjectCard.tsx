import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Eye,
  Sparkles,
} from 'lucide-react';
import type { ProjectWithStats } from '../../types';
import { Badge } from '../ui/Badge';
import { copyToClipboard } from '../../utils/clipboard';
import { useTranslation } from '../../i18n/LanguageContext';
import { useSettings } from '../../context/SettingsContext';

interface ProjectCardProps {
  project: ProjectWithStats;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onDelete,
  onToast,
}) => {
  const { t, language } = useTranslation();
  const { formatGalleryUrl } = useSettings();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const galleryUrl = formatGalleryUrl(project.slug);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(galleryUrl);
    if (success) {
      setCopiedLink(true);
      onToast(t.toasts.linkCopied, t.toasts.linkCopiedDesc, 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      onToast('Error', 'Failed to copy link', 'error');
    }
  };

  const handleCopyPin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(project.pin);
    if (success) {
      setCopiedPin(true);
      onToast(t.toasts.pinCopied, `${t.card.pin}: ${project.pin}`, 'success');
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      onToast('Error', 'Failed to copy PIN', 'error');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`${t.card.deleteConfirm} ("${project.name}")`)) {
      onDelete(project.id);
    }
  };

  return (
    <div
      onClick={() => onSelect(project.id)}
      className="group relative apple-glass hover:apple-glass-bright rounded-3xl p-6 transition-all duration-300 hover:border-white/20 cursor-pointer flex flex-col justify-between apple-press"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Badge status={project.status} />
            {project.watermark_enabled === 1 && (
              <span
                title="Znak wodny włączony"
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-apple-accent/15 border border-apple-accent/30 text-apple-accent"
              >
                <Sparkles className="w-2.5 h-2.5" />
                WM
              </span>
            )}
          </div>
          <button
            onClick={handleDelete}
            title="Delete Session"
            className="text-zinc-500 hover:text-apple-danger p-1.5 rounded-xl hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-xl font-semibold text-white tracking-tight group-hover:text-apple-accent transition-colors truncate">
          {project.name}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          {t.card.created}: {new Date(project.created_at).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
        </p>
      </div>

      {/* Stats preview */}
      <div className="grid grid-cols-2 gap-3 my-5 py-3 border-y border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">{t.card.uploaded}</div>
            <div className="text-sm font-semibold text-zinc-100">
              {project.photos_count} {t.card.photos}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">{t.card.selected}</div>
            <div className="text-sm font-semibold text-zinc-100">
              {project.selected_count} {t.card.of} {project.included_photos}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Link, PIN, Open in new tab */}
      <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 bg-black/40 rounded-xl px-3 py-2 border border-white/5 text-xs">
          <div className="flex items-center gap-2 text-zinc-300 font-mono">
            <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
            <span className="tracking-widest font-semibold">{project.pin}</span>
          </div>
          <button
            onClick={handleCopyPin}
            className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
          >
            {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPin ? t.card.copied : t.card.copyPin}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-all apple-press"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="truncate">{copiedLink ? t.card.linkCopied : t.card.copyLink}</span>
          </button>

          {/* Open Gallery in New Tab Link */}
          <a
            href={galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-apple-accent/15 hover:bg-apple-accent/25 border border-apple-accent/30 text-apple-accent hover:text-blue-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all apple-press"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate">{t.card.openGallery}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
