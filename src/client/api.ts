import type { Project, ProjectWithStats, Photo, GalleryData, SelectionStats } from './types';

const BASE_URL = '/api';

export async function fetchSettings(): Promise<{ public_domain: string }> {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data: { public_domain: string }): Promise<{ public_domain: string; watermark_url?: string }> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update settings');
  }
  return res.json();
}

export async function uploadWatermark(file: File): Promise<{ success: boolean; watermark_url: string }> {
  const formData = new FormData();
  formData.append('watermark', file);
  const res = await fetch(`${BASE_URL}/settings/watermark`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload watermark');
  }
  return res.json();
}

export async function deleteWatermark(): Promise<{ success: boolean; watermark_url: string }> {
  const res = await fetch(`${BASE_URL}/settings/watermark`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete watermark');
  return res.json();
}

export async function fetchProjects(): Promise<ProjectWithStats[]> {
  const res = await fetch(`${BASE_URL}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(data: {
  name: string;
  slug?: string;
  pin?: string;
  included_photos: number;
  extra_photo_price: number;
  currency: string;
  watermark_enabled?: number;
  notes?: string;
}): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create project');
  }
  return res.json();
}

export async function fetchProjectDetail(id: string): Promise<{
  project: Project;
  photos: Photo[];
  stats: SelectionStats;
}> {
  const res = await fetch(`${BASE_URL}/projects/${id}`);
  if (!res.ok) throw new Error('Failed to load project details');
  return res.json();
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update project');
  }
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function uploadPhotos(
  projectId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<{ uploaded_count: number; photos: Photo[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    files.forEach(file => {
      formData.append('photos', file);
    });

    xhr.open('POST', `${BASE_URL}/projects/${projectId}/photos`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function deletePhoto(projectId: string, photoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/photos/${photoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete photo');
}

export async function resetProjectSelection(projectId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/reset-selection`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset project selection');
}

// Client Gallery API
export async function fetchGalleryPublicInfo(slug: string): Promise<Partial<Project>> {
  const res = await fetch(`${BASE_URL}/gallery/${slug}/info`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gallery not found');
  }
  return res.json();
}

export async function verifyGalleryPin(slug: string, pin: string): Promise<GalleryData> {
  const res = await fetch(`${BASE_URL}/gallery/${slug}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid PIN');
  }
  return res.json();
}

export async function toggleGallerySelection(
  slug: string,
  pin: string,
  photoId: string
): Promise<{ photoId: string; selected: boolean; stats: SelectionStats }> {
  const res = await fetch(`${BASE_URL}/gallery/${slug}/toggle-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, photoId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle selection');
  }
  return res.json();
}

export async function confirmGallerySelection(
  slug: string,
  pin: string,
  clientConfirmed: boolean
): Promise<{
  success: boolean;
  message: string;
  confirmed_at: string;
  summary: {
    total_selected: number;
    included_photos: number;
    extra_photos_count: number;
    extra_fee: number;
    currency: string;
    selected_filenames: string[];
  };
}> {
  const res = await fetch(`${BASE_URL}/gallery/${slug}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, clientConfirmed }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to confirm selection');
  }
  return res.json();
}

