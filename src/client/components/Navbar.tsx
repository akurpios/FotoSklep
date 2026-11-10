import React from 'react';
import { Camera, Plus, Sparkles, FolderKanban, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { LanguageSwitcher, useTranslation } from '../i18n/LanguageContext';

interface NavbarProps {
  onOpenCreateModal?: () => void;
  onOpenSettings?: () => void;
  onNavigateHome?: () => void;
  currentView?: 'admin-list' | 'admin-detail' | 'gallery';
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateModal,
  onOpenSettings,
  onNavigateHome,
  currentView = 'admin-list',
  title,
}) => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 w-full bg-black/75 backdrop-blur-2xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/15 flex items-center justify-center text-white shadow-sm group-hover:border-apple-accent/50 transition-all apple-press">
            <Camera className="w-5 h-5 text-apple-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base tracking-tight text-white">
                FotoSklep
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300">
                {t.nav.pro}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">{t.nav.portalTitle}</p>
          </div>
        </div>

        {/* Center Title or Breadcrumb (if any) */}
        {title && (
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400 font-medium truncate max-w-md">
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 truncate">{title}</span>
          </div>
        )}

        {/* Right Actions: Language Switcher, Settings & Buttons */}
        <div className="flex items-center gap-2">
          {/* Flag Switcher */}
          <LanguageSwitcher />

          {/* Settings Button */}
          {onOpenSettings && currentView !== 'gallery' && (
            <button
              onClick={onOpenSettings}
              title={t.nav.settings}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all apple-press"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {currentView !== 'gallery' && (
            <>
              {currentView === 'admin-detail' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateHome}
                  icon={<FolderKanban className="w-4 h-4" />}
                >
                  {t.nav.allSessions}
                </Button>
              )}
              {onOpenCreateModal && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenCreateModal}
                  icon={<Plus className="w-4 h-4" />}
                >
                  {t.nav.newSession}
                </Button>
              )}
            </>
          )}

          {currentView === 'gallery' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-apple-accent" />
              <span>{t.nav.clientReviewMode}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
