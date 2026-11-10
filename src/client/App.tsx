import React, { useState, useEffect } from 'react';
import { Plus, FolderKanban, Search, Camera } from 'lucide-react';
import type { ProjectWithStats, Photo } from './types';
import { fetchProjects, deleteProject } from './api';
import { Navbar } from './components/Navbar';
import { ProjectCard } from './components/admin/ProjectCard';
import { ProjectDetailView } from './components/admin/ProjectDetailView';
import { CreateProjectModal } from './components/admin/CreateProjectModal';
import { GalleryView } from './components/gallery/GalleryView';
import { LightboxModal } from './components/gallery/LightboxModal';
import { ToastContainer, type ToastMessage } from './components/ui/Toast';
import { Button } from './components/ui/Button';
import { Skeleton } from './components/ui/Skeleton';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import { SettingsModal } from './components/admin/SettingsModal';

function DashboardContent() {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [adminLightboxPhoto, setAdminLightboxPhoto] = useState<Photo | null>(null);

  // Toast helper
  const addToast = (title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load projects list
  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err: any) {
      console.error(err);
      addToast('Error', 'Failed to load projects list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentPath.startsWith('/gallery/')) {
      loadProjects();
    }
  }, [currentPath]);

  // Check if viewing Client Gallery URL
  const galleryMatch = currentPath.match(/^\/gallery\/([^\/]+)/);
  if (galleryMatch) {
    const slug = galleryMatch[1];
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar currentView="gallery" />
        <GalleryView slug={slug} onToast={addToast} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // Admin Single Project Detail View
  if (selectedProjectId) {
    const selectedProj = projects.find((p) => p.id === selectedProjectId);
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar
          currentView="admin-detail"
          title={selectedProj?.name}
          onNavigateHome={() => setSelectedProjectId(null)}
          onOpenCreateModal={() => setIsCreateOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <ProjectDetailView
          projectId={selectedProjectId}
          onBack={() => {
            setSelectedProjectId(null);
            loadProjects();
          }}
          onToast={addToast}
          onOpenPhotoLightbox={(photo) => setAdminLightboxPhoto(photo)}
        />

        {/* Lightbox for Admin preview */}
        {adminLightboxPhoto && (
          <LightboxModal
            photo={adminLightboxPhoto}
            photos={[adminLightboxPhoto]}
            isLocked={true}
            onClose={() => setAdminLightboxPhoto(null)}
            onNext={() => {}}
            onPrev={() => {}}
            onToggleSelect={() => {}}
          />
        )}

        <CreateProjectModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newId) => {
            loadProjects();
            setSelectedProjectId(newId);
          }}
          onToast={addToast}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onToast={addToast}
        />

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // Filtered projects for search
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      addToast(t.card.deleteConfirm, '', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Delete Failed', err.message || 'Could not delete project', 'error');
    }
  };

  // Admin Projects Dashboard List
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="admin-list"
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300">
              <Camera className="w-3.5 h-3.5 text-apple-accent" />
              <span>{t.dashboard.photographerWorkspace}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t.dashboard.title}
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              {t.dashboard.subtitle}
            </p>
          </div>

          {/* Search bar & New Project Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.dashboard.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-apple-accent transition-all"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateOpen(true)}
              icon={<Plus className="w-4 h-4" />}
              className="shrink-0"
            >
              {t.dashboard.newSessionBtn}
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="apple-glass rounded-3xl p-16 text-center space-y-4 max-w-xl mx-auto border border-white/10">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {searchQuery ? t.dashboard.noSessionsFoundTitle : t.dashboard.noSessionsTitle}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {searchQuery
                  ? t.dashboard.noSessionsFoundDesc
                  : t.dashboard.noSessionsDesc}
              </p>
            </div>
            {!searchQuery && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                {t.dashboard.createFirstBtn}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={(id) => setSelectedProjectId(id)}
                onDelete={handleDeleteProject}
                onToast={addToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newId) => {
          loadProjects();
          setSelectedProjectId(newId);
        }}
        onToast={addToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onToast={addToast}
      />

      {/* Global Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <DashboardContent />
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default App;
