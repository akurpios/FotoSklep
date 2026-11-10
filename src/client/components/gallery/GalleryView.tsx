import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Heart,
} from 'lucide-react';
import type { Project, Photo, SelectionStats } from '../../types';
import {
  fetchGalleryPublicInfo,
  verifyGalleryPin,
  toggleGallerySelection,
} from '../../api';
import { PinGate } from './PinGate';
import { PhotoCard } from './PhotoCard';
import { LightboxModal } from './LightboxModal';
import { StickySelectionBar } from './StickySelectionBar';
import { ConfirmationModal } from './ConfirmationModal';
import { Skeleton } from '../ui/Skeleton';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n/LanguageContext';

interface GalleryViewProps {
  slug: string;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ slug, onToast }) => {
  const { t } = useTranslation();
  const [publicInfo, setPublicInfo] = useState<Partial<Project> | null>(null);
  const [pin, setPin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<SelectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);

  // Filter state (all vs selected only)
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');

  // Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Confirmation modal state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Session persistence key
  const storageKey = `fotosklep_pin_${slug}`;

  // 1. Initial load of public session metadata
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const info = await fetchGalleryPublicInfo(slug);
        setPublicInfo(info);

        // Check if user already entered PIN this session
        const savedPin = sessionStorage.getItem(storageKey);
        if (savedPin) {
          try {
            const data = await verifyGalleryPin(slug, savedPin);
            setPin(savedPin);
            setProject(data.project);
            setPhotos(data.photos);
            setStats(data.stats);
            setIsAuthenticated(true);
          } catch {
            sessionStorage.removeItem(storageKey);
          }
        }
      } catch (err: any) {
        console.error(err);
        onToast('Session Not Found', 'This proofing link is invalid or expired', 'error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [slug]);

  // Handle PIN verification
  const handleVerifyPin = async (inputPin: string) => {
    try {
      setPinError(null);
      setLoading(true);
      const data = await verifyGalleryPin(slug, inputPin);
      setPin(inputPin);
      sessionStorage.setItem(storageKey, inputPin);
      setProject(data.project);
      setPhotos(data.photos);
      setStats(data.stats);
      setIsAuthenticated(true);
      onToast('Welcome', data.project.name, 'success');
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Select toggle
  const handleToggleSelect = async (photoId: string) => {
    if (!project || !pin) return;

    if (project.status === 'Confirmed by Client' || project.status === 'Completed') {
      onToast('Gallery Locked', 'Your selection is already confirmed and locked', 'error');
      return;
    }

    try {
      const res = await toggleGallerySelection(slug, pin, photoId);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, selected: res.selected ? 1 : 0 } : p))
      );
      setStats(res.stats);

      // Also update lightboxPhoto if open
      if (lightboxPhoto && lightboxPhoto.id === photoId) {
        setLightboxPhoto((prev) => (prev ? { ...prev, selected: res.selected ? 1 : 0 } : null));
      }
    } catch (err: any) {
      console.error(err);
      onToast('Selection Failed', err.message || 'Could not update selection', 'error');
    }
  };

  // Lightbox navigation
  const activePhotos = filterMode === 'selected' ? photos.filter((p) => p.selected === 1) : photos;

  const handleNextPhoto = () => {
    if (!lightboxPhoto) return;
    const currentIndex = activePhotos.findIndex((p) => p.id === lightboxPhoto.id);
    const nextIndex = (currentIndex + 1) % activePhotos.length;
    setLightboxPhoto(activePhotos[nextIndex]);
  };

  const handlePrevPhoto = () => {
    if (!lightboxPhoto) return;
    const currentIndex = activePhotos.findIndex((p) => p.id === lightboxPhoto.id);
    const prevIndex = (currentIndex - 1 + activePhotos.length) % activePhotos.length;
    setLightboxPhoto(activePhotos[prevIndex]);
  };

  if (loading && !publicInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <Skeleton className="h-14 w-1/3 mx-auto" />
        <Skeleton className="h-64 max-w-md mx-auto" />
      </div>
    );
  }

  // If not authenticated, render iOS PIN Gatekeeper
  if (!isAuthenticated) {
    return (
      <PinGate
        projectName={publicInfo?.name || 'Private Session'}
        onVerify={handleVerifyPin}
        isLoading={loading}
        error={pinError}
      />
    );
  }

  if (!project || !stats) return null;

  const isLocked = project.status === 'Confirmed by Client' || project.status === 'Completed';
  const displayedPhotos = filterMode === 'selected' ? photos.filter((p) => p.selected === 1) : photos;

  return (
    <div className="min-h-screen pb-32">
      {/* Editorial Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <Badge status={project.status} />
                <span className="text-xs font-mono text-zinc-500">
                  {photos.length} {t.gallery.totalProofs}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              {project.notes && (
                <div className="pt-1 text-xs text-zinc-300 italic max-w-2xl bg-white/5 border border-white/10 rounded-xl px-3.5 py-2">
                  "{project.notes}"
                </div>
              )}
              <p className="text-xs sm:text-sm text-zinc-400">
                {t.detail.packageIncludes} <strong className="text-zinc-200">{project.included_photos} {t.detail.photosCount}</strong> • {t.detail.extraAt}{' '}
                <strong className="text-zinc-200">{project.extra_photo_price} {project.currency}</strong> / {t.detail.each}
              </p>
            </div>

            {/* Filter Toggle Pill */}
            <div className="flex items-center justify-center gap-1 bg-zinc-900/90 border border-white/10 p-1 rounded-2xl shadow-inner self-center sm:self-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all apple-press ${
                  filterMode === 'all'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t.gallery.filterAll} ({photos.length})
              </button>
              <button
                onClick={() => setFilterMode('selected')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 apple-press ${
                  filterMode === 'selected'
                    ? 'bg-apple-accent text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{t.gallery.filterSelected} ({stats.selected_count})</span>
              </button>
            </div>
          </div>

          {/* Warm Confirmed Banner (If Locked) */}
          {isLocked && (
            <div className="mt-6 apple-glass-bright rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-start gap-3.5 shadow-xl animate-spring-up">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <h4 className="font-bold text-sm text-white">{t.gallery.confirmedTitle}</h4>
                <p className="text-zinc-300">
                  {t.gallery.confirmedDesc}
                </p>
                {stats.extra_photos_count > 0 && (
                  <p className="text-amber-300/90 font-medium pt-1">
                    {t.gallery.extraNotice} (+{stats.extra_photos_count} / +{stats.extra_fee} {project.currency})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Responsive Proofing Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {displayedPhotos.length === 0 ? (
          <div className="apple-glass rounded-3xl p-16 text-center space-y-3">
            <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">{t.gallery.noFilterMatch}</h3>
            <p className="text-xs text-zinc-400">
              {filterMode === 'selected'
                ? t.gallery.emptySelectedHint
                : 'No photos in this session.'}
            </p>
            {filterMode === 'selected' && (
              <button
                onClick={() => setFilterMode('all')}
                className="text-xs text-apple-accent font-semibold hover:underline"
              >
                {t.gallery.viewAll}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {displayedPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                isLocked={isLocked}
                onToggleSelect={handleToggleSelect}
                onClick={(p) => setLightboxPhoto(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Real-time Sticky Counter (Floating Bottom Bar) */}
      <StickySelectionBar
        project={project}
        stats={stats}
        isLocked={isLocked}
        onOpenConfirmation={() => setIsConfirmationOpen(true)}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        photo={lightboxPhoto}
        photos={activePhotos}
        isLocked={isLocked}
        onClose={() => setLightboxPhoto(null)}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
        onToggleSelect={handleToggleSelect}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        project={project}
        photos={photos}
        stats={stats}
        pin={pin}
        isLocked={isLocked}
        onClose={() => setIsConfirmationOpen(false)}
        onSuccess={(confirmedAt) => {
          setProject((prev) => (prev ? { ...prev, status: 'Confirmed by Client', confirmed_at: confirmedAt } : null));
        }}
        onToast={onToast}
      />
    </div>
  );
};
