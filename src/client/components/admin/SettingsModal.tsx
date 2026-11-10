import React, { useState, useRef } from 'react';
import { X, Globe, Check, Sparkles, Image as ImageIcon, UploadCloud, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const {
    publicDomain,
    watermarkUrl,
    updatePublicDomain,
    uploadWatermarkImage,
    removeWatermarkImage,
  } = useSettings();
  const { t } = useTranslation();

  const [domainInput, setDomainInput] = useState(publicDomain);
  const [savingDomain, setSavingDomain] = useState(false);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);
  const [isDraggingWm, setIsDraggingWm] = useState(false);
  const wmInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      onToast('Error', 'Domain cannot be empty', 'error');
      return;
    }

    try {
      setSavingDomain(true);
      await updatePublicDomain(domainInput);
      onToast(
        t.settings.savedToast,
        `${t.settings.domainLabel}: ${domainInput}`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onToast('Error', err.message || 'Failed to update domain', 'error');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleWatermarkFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      onToast('Error', 'Only PNG files (.png) with transparency are supported', 'error');
      return;
    }

    try {
      setUploadingWatermark(true);
      await uploadWatermarkImage(file);
      onToast(t.settings.watermarkUploadedToast, file.name, 'success');
    } catch (err: any) {
      console.error(err);
      onToast('Upload Failed', err.message || 'Could not upload watermark', 'error');
    } finally {
      setUploadingWatermark(false);
    }
  };

  const handleRemoveWatermark = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć skonfigurowany znak wodny?')) return;
    try {
      await removeWatermarkImage();
      onToast(t.settings.watermarkRemovedToast, '', 'success');
    } catch (err: any) {
      console.error(err);
      onToast('Error', 'Failed to remove watermark', 'error');
    }
  };

  const cleanPreview = domainInput.trim()
    ? (domainInput.startsWith('http') ? domainInput : `https://${domainInput}`).replace(/\/+$/, '')
    : 'https://fotosklep.kurpios.art';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => !savingDomain && !uploadingWatermark && onClose()}
      />

      {/* Surface */}
      <div className="relative w-full max-w-xl apple-glass-bright rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 animate-spring-up overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-apple-accent/20 border border-apple-accent/30 flex items-center justify-center text-apple-accent">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t.settings.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={savingDomain || uploadingWatermark}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-8 pt-5 overflow-y-auto pr-1 flex-1">
          {/* SECTION 1: Public Domain */}
          <form onSubmit={handleDomainSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {t.settings.domainLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="https://fotosklep.kurpios.art"
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-apple-accent transition-all"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingDomain}
                  icon={<Check className="w-3.5 h-3.5" />}
                  className="shrink-0"
                >
                  {t.settings.saveBtn}
                </Button>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.settings.domainHint}
              </p>
            </div>

            {/* Live URL Preview */}
            <div className="apple-glass rounded-2xl p-3 border border-white/5 space-y-1 text-xs">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                Podgląd generowanego linku dla klienta:
              </span>
              <div className="font-mono text-apple-accent truncate break-all text-xs">
                {cleanPreview}/gallery/sesja-przyklad-123
              </div>
            </div>
          </form>

          {/* SECTION 2: Watermark PNG Configuration (Below Domain) */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {t.settings.watermarkTitle}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.settings.watermarkDesc}
              </p>
            </div>

            {/* Current Watermark Preview if set */}
            {watermarkUrl ? (
              <div className="apple-glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-300">
                    {t.settings.watermarkCurrent}:
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveWatermark}
                    className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.settings.watermarkRemoveBtn}</span>
                  </button>
                </div>

                <div className="relative h-24 rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-center p-3 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, #444 0, #444 10px, #222 10px, #222 20px)`,
                    }}
                  />
                  <img
                    src={watermarkUrl}
                    alt="Watermark logo"
                    className="max-h-full max-w-full object-contain relative z-10 drop-shadow-md"
                  />
                </div>
              </div>
            ) : null}

            {/* Watermark PNG Upload Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingWm(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingWm(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingWm(false);
                handleWatermarkFile(e.dataTransfer.files);
              }}
              onClick={() => wmInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${
                isDraggingWm
                  ? 'border-apple-accent bg-apple-accent/10'
                  : 'border-white/15 hover:border-apple-accent bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input
                ref={wmInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => handleWatermarkFile(e.target.files)}
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-apple-accent">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {uploadingWatermark
                      ? 'Wgrywanie znaku wodnego...'
                      : t.settings.watermarkDropzone}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {t.settings.watermarkFormats}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-white/10 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t.createModal.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
};
