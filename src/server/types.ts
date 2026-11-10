export type ProjectStatus = 'Draft' | 'Pending Client Selection' | 'Confirmed by Client' | 'Completed';

export interface Project {
  id: string;
  name: string;
  slug: string;
  pin: string;
  included_photos: number;
  extra_photo_price: number;
  currency: string;
  status: ProjectStatus;
  watermark_enabled: number; // 0 or 1
  notes?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  project_id: string;
  filename: string;
  stored_filename: string;
  url: string;
  file_size: number;
  mime_type: string;
  selected: number; // 0 or 1
  created_at: string;
}

export interface ProjectWithStats extends Project {
  photos_count: number;
  selected_count: number;
}

