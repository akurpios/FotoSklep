import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Trash2,
  Upload,
  CheckCircle2,
  ImageIcon,
  Sparkles,
  Globe,
} from 'lucide-react';
import type { Project, Photo, SelectionStats, ProjectStatus } from '../../types';
import { fetchProjectDetail, updateProject, deletePhoto } from '../../api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { PhotoUploader } from './PhotoUploader';
import { ConfirmedInspector } from './ConfirmedInspector';
import { copyToClipboard } from '../../utils/clipboard';
import { useTranslation } from '../../i18n/LanguageContext';
import { useSettings } from '../../context/SettingsContext';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
  onOpenPhotoLightbox: (photo: Photo) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
  onToast,
  onOpenPhotoLightbox,
}) => {
  const { t, language } = useTranslation();
  const { formatGalleryUrl } = useSettings();
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<SelectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'upload'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchProjectDetail(projectId);
      setProject(data.project);
      setPhotos(data.photos);
      setStats(data.stats);

      // Auto-switch to confirmed tab if client has confirmed
      if (data.project.status === 'Confirmed by Client' || data.project.status === 'Completed') {
        setActiveTab('confirmed');
      }
    } catch (err: any) {
      console.error(err);
      onToast('Load Error', err.message || 'Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading || !project || !stats) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const galleryUrl = formatGalleryUrl(project.slug);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(galleryUrl);
    if (ok) {
      setCopiedLink(true);
      onToast(t.toasts.linkCopied, t.toasts.linkCopiedDesc, 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      onToast('Error', 'Failed to copy link', 'error');
    }
  };

  const handleCopyPin = async () => {
    const ok = await copyToClipboard(project.pin);
    if (ok) {
      setCopiedPin(true);
      onToast(t.toasts.pinCopied, `${t.detail.pinCode}: ${project.pin}`, 'success');
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      onToast('Error', 'Failed to copy PIN', 'error');
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      setIsUpdatingStatus(true);
      const updated = await updateProject(project.id, { status: newStatus });
      setProject(updated);
      onToast('Status Updated', `Status: ${t.status[newStatus]}`, 'success');
    } catch (err: any) {
      console.error(err);
      onToast('Update Failed', err.message || 'Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleWatermark = async () => {
    try {
      const newWm = project.watermark_enabled ? 0 : 1;
      const updated = await updateProject(project.id, { watermark_enabled: newWm });
      setProject(updated);
      onToast(
        t.detail.watermark,
        newWm ? t.detail.watermarkActive : t.detail.watermarkInactive,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onToast('Update Failed', err.message || 'Failed to update watermark setting', 'error');
    }
  };

  const handleDeletePhoto = async (photoId: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`${t.detail.deletePhotoConfirm} ("${filename}")`)) return;

    try {
      await deletePhoto(project.id, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      onToast('Removed', filename, 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      onToast('Delete Failed', err.message || 'Could not delete photo', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="text-zinc-400 hover:text-white -ml-2"
        >
          {t.detail.back}
        </Button>
      </div>

      {/* Project Header Card */}
      <div className="apple-glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge status={project.status} size="md" />
              <span className="text-xs font-mono text-zinc-500">
                {t.detail.created}: {new Date(project.created_at).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-zinc-400">
              {t.detail.packageIncludes} <strong className="text-zinc-200">{project.included_photos} {t.detail.photosCount}</strong> • {t.detail.extraAt}{' '}
              <strong className="text-zinc-200">{project.extra_photo_price} {project.currency}</strong> / {t.detail.each}
            </p>
          </div>

          {/* Quick Actions: Open Gallery, Copy Link, Copy PIN, Status Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Open Gallery Link in New Tab */}
            <a
              href={galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-apple-accent hover:bg-apple-accentHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 border border-blue-400/30 transition-all apple-press"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t.detail.openGallery}</span>
            </a>

            {/* Copy Link Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopyLink}
              icon={copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            >
              {copiedLink ? t.card.linkCopied : t.detail.shareGalleryLink}
            </Button>

            {/* PIN Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopyPin}
              icon={copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <KeyRound className="w-4 h-4" />}
            >
              <span className="font-mono tracking-widest">{project.pin}</span>
              <span className="text-xs text-zinc-400">({copiedPin ? t.card.copied : t.detail.pinCode})</span>
            </Button>

            {/* Watermark Toggle */}
            <button
              type="button"
              onClick={handleToggleWatermark}
              disabled={isUpdatingStatus}
              title={t.createModal.watermarkHint}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all apple-press ${
                project.watermark_enabled
                  ? 'bg-apple-accent/15 text-apple-accent border-apple-accent/30 hover:bg-apple-accent/25'
                  : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.detail.watermark}: {project.watermark_enabled ? t.detail.watermarkActive : t.detail.watermarkInactive}</span>
            </button>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                disabled={isUpdatingStatus}
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-apple-accent cursor-pointer"
              >
                <option value="Draft">{t.status.Draft}</option>
                <option value="Pending Client Selection">{t.status['Pending Client Selection']}</option>
                <option value="Confirmed by Client">{t.status['Confirmed by Client']}</option>
                <option value="Completed">{t.status.Completed}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shareable Link Box with 1-Click Copy */}
        <div className="bg-black/50 rounded-2xl p-3 sm:p-4 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <Globe className="w-4 h-4 text-apple-accent shrink-0" />
            <span className="text-zinc-400 shrink-0 font-medium">{t.detail.shareGalleryLink}:</span>
            <input
              type="text"
              readOnly
              value={galleryUrl}
              onClick={handleCopyLink}
              className="bg-zinc-900 border border-white/10 text-zinc-300 font-mono text-xs px-3 py-1.5 rounded-xl w-full sm:w-96 select-all cursor-pointer focus:outline-none"
            />
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto text-xs font-semibold text-apple-accent hover:text-blue-300 transition-colors shrink-0"
          >
            {copiedLink ? t.card.linkCopied : t.detail.shareGalleryLink}
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white/10 text-white shadow-sm border border-white/15'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.detail.allPhotos} ({photos.length})
          </button>

          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'confirmed'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.detail.confirmedSelections} ({stats.selected_count})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-apple-accent/20 text-apple-accent border border-apple-accent/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.detail.uploadMore}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'confirmed' && (
        <ConfirmedInspector
          project={project}
          photos={photos}
          stats={stats}
          onRefresh={loadData}
          onToast={onToast}
          onOpenPhotoLightbox={onOpenPhotoLightbox}
        />
      )}

      {activeTab === 'upload' && (
        <div className="apple-glass rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-semibold text-white">{t.detail.uploadMore}</h3>
          <PhotoUploader
            projectId={project.id}
            onUploadSuccess={() => {
              loadData();
              setActiveTab('all');
            }}
            onToast={onToast}
          />
        </div>
      )}

      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white tracking-tight">
              {t.detail.allPhotos} ({photos.length})
            </h3>
            <span className="text-xs text-zinc-500">
              {t.detail.clickToPreview}
            </span>
          </div>

          {photos.length === 0 ? (
            <div className="apple-glass rounded-3xl p-16 text-center space-y-4">
              <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto" />
              <div>
                <h4 className="text-base font-semibold text-white">{t.detail.noPhotosTitle}</h4>
                <p className="text-xs text-zinc-400 mt-1">{t.detail.noPhotosDesc}</p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveTab('upload')}
                icon={<Upload className="w-4 h-4" />}
              >
                {t.detail.uploadFirstBtn}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => onOpenPhotoLightbox(photo)}
                  className={`group relative aspect-[3/2] rounded-2xl overflow-hidden bg-zinc-900 border cursor-pointer shadow-md apple-press transition-all ${
                    photo.selected === 1
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Index badge */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-zinc-300 border border-white/10">
                    #{index + 1}
                  </div>

                  {/* Selected indicator badge */}
                  {photo.selected === 1 && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Delete button (hover) */}
                  <button
                    onClick={(e) => handleDeletePhoto(photo.id, photo.filename, e)}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-xl bg-black/70 hover:bg-apple-danger text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Filename footer */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-[10px] font-mono text-zinc-300 truncate pr-10">
                    {photo.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
