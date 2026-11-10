import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { createProject, uploadPhotos } from '../../api';
import { useTranslation } from '../../i18n/LanguageContext';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

function generateRandomPin(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [includedPhotos, setIncludedPhotos] = useState<number>(10);
  const [extraPrice, setExtraPrice] = useState<number>(40);
  const [currency, setCurrency] = useState('PLN');
  const [pin, setPin] = useState(generateRandomPin());
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [stagedFiles, setStagedFiles] = useState<{ file: File; previewUrl: string; id: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  if (!isOpen) return null;

  const handleRefreshPin = () => {
    setPin(generateRandomPin());
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newItems = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${file.name}-${file.size}-${Math.random()}`,
      }));
    setStagedFiles((prev) => [...prev, ...newItems]);
  };

  const removeStaged = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast('Error', t.createModal.validationName, 'error');
      return;
    }
    if (!/^\d{8}$/.test(pin)) {
      onToast('Error', t.createModal.validationPin, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadPercent(0);

      // 1. Create project
      const project = await createProject({
        name: name.trim(),
        pin,
        included_photos: Number(includedPhotos),
        extra_photo_price: Number(extraPrice),
        currency,
        watermark_enabled: watermarkEnabled ? 1 : 0,
        notes: notes.trim(),
      });

      // 2. Upload photos if any selected
      if (stagedFiles.length > 0) {
        const files = stagedFiles.map((s) => s.file);
        await uploadPhotos(project.id, files, (pct) => {
          setUploadPercent(pct);
        });
      }

      // Cleanup
      stagedFiles.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      onToast(t.toasts.projectCreated, `"${project.name}"`, 'success');
      onSuccess(project.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      onToast('Creation Failed', err.message || 'Failed to create project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dimming Scrim */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl apple-glass-bright rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 animate-spring-up overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-apple-accent" />
              <h2 className="text-xl font-bold text-white tracking-tight">{t.createModal.title}</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {t.createModal.description}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-6 overflow-y-auto pr-1 flex-1">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {t.createModal.sessionName}
            </label>
            <input
              type="text"
              required
              placeholder={t.createModal.sessionNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition-all"
            />
          </div>

          {/* Package Limits & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.createModal.includedPhotos}
              </label>
              <input
                type="number"
                min="1"
                required
                value={includedPhotos}
                onChange={(e) => setIncludedPhotos(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-apple-accent transition-all font-mono"
              />
              <span className="text-[11px] text-zinc-500">{t.createModal.includedPhotosHint}</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.createModal.extraPrice}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={extraPrice}
                onChange={(e) => setExtraPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-apple-accent transition-all font-mono"
              />
              <span className="text-[11px] text-zinc-500">{t.createModal.extraPriceHint}</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.createModal.currency}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-apple-accent transition-all"
              >
                <option value="PLN">PLN (zł)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <span className="text-[11px] text-zinc-500">{t.createModal.currencyHint}</span>
            </div>
          </div>

          {/* 8-Digit PIN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.createModal.pin}
              </label>
              <button
                type="button"
                onClick={handleRefreshPin}
                className="text-xs text-apple-accent hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t.createModal.randomize}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                maxLength={8}
                pattern="\d{8}"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-3 text-lg font-mono tracking-widest text-center text-white focus:outline-none focus:border-apple-accent transition-all"
              />
            </div>
            <span className="text-[11px] text-zinc-500 block">
              {t.createModal.pinHint}
            </span>
          </div>

          {/* Watermark Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/15 transition-colors">
            <div className="space-y-0.5 cursor-pointer select-none" onClick={() => setWatermarkEnabled(!watermarkEnabled)}>
              <label className="text-sm font-semibold text-white flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4 text-apple-accent" />
                {t.createModal.watermarkToggle}
              </label>
              <p className="text-xs text-zinc-400">
                {t.createModal.watermarkHint}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={watermarkEnabled}
              onClick={() => setWatermarkEnabled(!watermarkEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                watermarkEnabled ? 'bg-apple-accent' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  watermarkEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Staged photos upload */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {t.createModal.uploadPhotos}
            </label>
            <div
              onClick={() => {
                const el = document.getElementById('initial-file-input');
                el?.click();
              }}
              className="border border-dashed border-white/15 hover:border-apple-accent rounded-2xl p-6 text-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <input
                id="initial-file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <UploadCloud className="w-6 h-6 text-apple-accent mx-auto mb-2" />
              <p className="text-xs text-zinc-300 font-medium">{t.createModal.dropzonePrompt}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{t.createModal.dropzoneFormats}</p>
            </div>

            {/* Thumbnail previews */}
            {stagedFiles.length > 0 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-2 max-h-36 overflow-y-auto">
                {stagedFiles.map((s) => (
                  <div key={s.id} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 bg-zinc-900">
                    <img src={s.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeStaged(s.id)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Progress Bar if submitting */}
          {isSubmitting && stagedFiles.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>{t.createModal.uploadingImages}</span>
                <span>{uploadPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-apple-accent transition-all duration-150"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t.createModal.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              {isSubmitting ? t.createModal.creating : t.createModal.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
