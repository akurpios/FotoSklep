import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { db, UPLOADS_DIR } from '../db';
import type { Project, Photo, ProjectWithStats, ProjectStatus } from '../types';
import { getConfiguredWatermarkPath, generateWatermarkedImage } from '../utils/watermark';

const router = Router();

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff']);
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
]);

// Helper to safely delete files without any path traversal risk
function safeUnlink(storedFilename: string): void {
  try {
    const cleanBasename = path.basename(storedFilename);
    const resolvedPath = path.resolve(UPLOADS_DIR, cleanBasename);
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR);

    // Verify target sits strictly inside UPLOADS_DIR
    if (resolvedPath.startsWith(resolvedUploadsDir + path.sep) && fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch (err) {
    console.warn(`[Security] Safe unlink failed for file ${storedFilename}:`, err);
  }
}

// Multer configuration for secure file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid image file extension'));
    }
    // Cryptographically secure random filename
    const uniqueName = `${Date.now()}-${nanoid(12)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file limit
    files: 200, // max 200 files in a single batch
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeOk = ALLOWED_MIMES.has(file.mimetype.toLowerCase());
    const isExtOk = ALLOWED_EXTENSIONS.has(ext);

    // Both MIME and extension must match our strict allowlist
    if (isMimeOk && isExtOk) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, AVIF, and TIFF images are allowed.'));
    }
  },
});

// Helper to generate a clean, safe URL slug
function createSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'session'}-${nanoid(5).toLowerCase()}`;
}

// 1. List all projects with aggregated stats
router.get('/', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(ph.id) AS photos_count,
        COALESCE(SUM(CASE WHEN ph.selected = 1 THEN 1 ELSE 0 END), 0) AS selected_count
      FROM projects p
      LEFT JOIN photos ph ON p.id = ph.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    const projects = stmt.all() as ProjectWithStats[];
    res.json(projects);
  } catch (error) {
    console.error('[Error] Fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 2. Create new project with strict input validation
router.post('/', (req, res) => {
  try {
    const {
      name,
      slug: customSlug,
      pin,
      included_photos = 10,
      extra_photo_price = 40.0,
      currency = 'PLN',
      watermark_enabled = 1,
      notes = '',
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required and must be a valid string' });
    }

    const cleanName = name.trim().slice(0, 150);
    const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';

    const allowedCurrencies = ['PLN', 'EUR', 'USD', 'GBP'];
    const cleanCurrency = allowedCurrencies.includes(currency) ? currency : 'PLN';

    const cleanIncluded = Math.max(1, Math.min(50000, parseInt(included_photos, 10) || 10));
    const cleanExtraPrice = Math.max(0, Math.min(1000000, parseFloat(extra_photo_price) || 0));
    const cleanWatermark = watermark_enabled === 0 || watermark_enabled === false ? 0 : 1;

    const id = nanoid(12);
    const slug = (customSlug && typeof customSlug === 'string' && customSlug.trim())
      ? createSlug(customSlug)
      : createSlug(cleanName);

    // Pin must be exactly 8 digits
    const cleanPin = (pin && /^\d{8}$/.test(pin.toString()))
      ? pin.toString()
      : Math.floor(10000000 + Math.random() * 90000000).toString();

    const insertStmt = db.prepare(`
      INSERT INTO projects (id, name, slug, pin, included_photos, extra_photo_price, currency, watermark_enabled, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)
    `);

    insertStmt.run(id, cleanName, slug, cleanPin, cleanIncluded, cleanExtraPrice, cleanCurrency, cleanWatermark, cleanNotes);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
    res.status(201).json(project);
  } catch (error) {
    console.error('[Error] Creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// 3. Get single project with photos
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length > 50) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const photos = db.prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY created_at ASC').all(id) as Photo[];
    
    const selectedCount = photos.filter(p => p.selected === 1).length;
    const stats = {
      total_photos: photos.length,
      selected_count: selectedCount,
      included_photos: project.included_photos,
      extra_photos_count: Math.max(0, selectedCount - project.included_photos),
      extra_fee: Math.max(0, selectedCount - project.included_photos) * project.extra_photo_price,
    };

    res.json({
      project,
      photos,
      stats,
    });
  } catch (error) {
    console.error('[Error] Fetching project detail:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// 4. Update project details or status with strict authorization & validation
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const {
      name,
      pin,
      included_photos,
      extra_photo_price,
      currency,
      watermark_enabled,
      status,
      notes,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name must not be empty' });
      }
      updates.push('name = ?');
      values.push(name.trim().slice(0, 150));
    }

    if (pin !== undefined) {
      if (!/^\d{8}$/.test(pin.toString())) {
        return res.status(400).json({ error: 'PIN must be exactly 8 digits' });
      }
      updates.push('pin = ?');
      values.push(pin.toString());
    }

    if (included_photos !== undefined) {
      const parsed = parseInt(included_photos, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 50000) {
        return res.status(400).json({ error: 'Included photos must be between 1 and 50000' });
      }
      updates.push('included_photos = ?');
      values.push(parsed);
    }

    if (extra_photo_price !== undefined) {
      const parsed = parseFloat(extra_photo_price);
      if (isNaN(parsed) || parsed < 0 || parsed > 1000000) {
        return res.status(400).json({ error: 'Extra price must be between 0 and 1000000' });
      }
      updates.push('extra_photo_price = ?');
      values.push(parsed);
    }

    if (currency !== undefined) {
      const allowed = ['PLN', 'EUR', 'USD', 'GBP'];
      if (!allowed.includes(currency)) {
        return res.status(400).json({ error: 'Invalid currency' });
      }
      updates.push('currency = ?');
      values.push(currency);
    }

    if (watermark_enabled !== undefined) {
      const cleanWm = watermark_enabled === 1 || watermark_enabled === true ? 1 : 0;
      updates.push('watermark_enabled = ?');
      values.push(cleanWm);
    }

    if (status !== undefined) {
      const validStatuses: ProjectStatus[] = ['Draft', 'Pending Client Selection', 'Confirmed by Client', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid project status' });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(typeof notes === 'string' ? notes.trim().slice(0, 2000) : '');
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
    res.json(updated);
  } catch (error) {
    console.error('[Error] Updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// 5. Delete project & all associated files safely
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const photos = db.prepare('SELECT stored_filename FROM photos WHERE project_id = ?').all(id) as { stored_filename: string }[];

    // Remove files from disk with path validation
    photos.forEach(photo => {
      safeUnlink(photo.stored_filename);
      safeUnlink(`wm_${photo.stored_filename}`);
    });

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true, message: 'Project and all files removed' });
  } catch (error) {
    console.error('[Error] Deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// 6. Upload photos to project
router.post('/:id/photos', upload.array('photos', 200), async (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check if watermark is enabled for this project and configured in studio settings
    const watermarkPath = (project.watermark_enabled === 1) ? getConfiguredWatermarkPath() : null;

    const insertStmt = db.prepare(`
      INSERT INTO photos (id, project_id, filename, stored_filename, url, file_size, mime_type, selected)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const insertedPhotos: Photo[] = [];

    for (const file of files) {
      const photoId = nanoid(10);
      let servedUrl = `/uploads/${file.filename}`;

      // If watermark should be applied, generate a watermarked version with sharp
      if (watermarkPath) {
        const watermarkedName = `wm_${file.filename}`;
        const sourcePath = path.join(UPLOADS_DIR, file.filename);
        const targetPath = path.join(UPLOADS_DIR, watermarkedName);
        try {
          await generateWatermarkedImage(sourcePath, targetPath, watermarkPath);
          servedUrl = `/uploads/${watermarkedName}`;
        } catch (wmErr) {
          console.warn('[Watermark] Failed to watermark image, using original:', wmErr);
        }
      }

      // Sanitize original filename for display and Lightroom export
      const sanitizedOriginalName = path.basename(file.originalname).replace(/[\r\n\t]/g, '').slice(0, 150);

      insertStmt.run(photoId, id, sanitizedOriginalName, file.filename, servedUrl, file.size, file.mimetype);
      insertedPhotos.push({
        id: photoId,
        project_id: id,
        filename: sanitizedOriginalName,
        stored_filename: file.filename,
        url: servedUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        selected: 0,
        created_at: new Date().toISOString(),
      });
    }

    res.status(201).json({
      uploaded_count: files.length,
      photos: insertedPhotos,
    });
  } catch (error) {
    console.error('[Error] Uploading photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// 7. Delete individual photo safely
router.delete('/:id/photos/:photoId', (req, res) => {
  try {
    const { id, photoId } = req.params;
    const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND project_id = ?').get(photoId, id) as Photo | undefined;

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    safeUnlink(photo.stored_filename);
    safeUnlink(`wm_${photo.stored_filename}`);
    if (photo.url && photo.url.includes('/uploads/')) {
      const urlFile = path.basename(photo.url);
      if (urlFile !== photo.stored_filename) {
        safeUnlink(urlFile);
      }
    }
    db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);

    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    console.error('[Error] Deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// 8. Reset client selection (photographer can reopen session if needed)
router.post('/:id/reset-selection', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare('UPDATE photos SET selected = 0 WHERE project_id = ?').run(id);
    db.prepare("UPDATE projects SET status = 'Pending Client Selection', confirmed_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id);

    res.json({ success: true, message: 'Selection reset and project unlocked for client' });
  } catch (error) {
    console.error('[Error] Resetting selection:', error);
    res.status(500).json({ error: 'Failed to reset selection' });
  }
});

export default router;
