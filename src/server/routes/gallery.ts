import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import type { Project, Photo } from '../types';

const router = Router();

// Constant-time PIN verification to eliminate timing side-channel attacks
function verifyPinAccess(project: Project, providedPin: string | undefined): boolean {
  if (!providedPin || typeof providedPin !== 'string') return false;

  const expectedBuf = Buffer.from(project.pin.trim());
  const actualBuf = Buffer.from(providedPin.trim());

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

// 1. Public project info (safe metadata prior to PIN authentication)
router.get('/:slug/info', (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string' || slug.length > 100) {
      return res.status(400).json({ error: 'Invalid gallery identifier' });
    }

    const project = db.prepare(`
      SELECT id, name, slug, status, included_photos, extra_photo_price, currency, created_at 
      FROM projects WHERE slug = ?
    `).get(slug) as Partial<Project> | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    // Do NOT return the PIN or internal database fields
    res.json({
      name: project.name,
      slug: project.slug,
      status: project.status,
      included_photos: project.included_photos,
      extra_photo_price: project.extra_photo_price,
      currency: project.currency,
      created_at: project.created_at,
    });
  } catch (error) {
    console.error('[Error] Fetching gallery info:', error);
    res.status(500).json({ error: 'Failed to fetch gallery info' });
  }
});

// 2. Verify 8-digit PIN and return full gallery data
router.post('/:slug/verify', (req, res) => {
  try {
    const { slug } = req.params;
    const { pin } = req.body;

    if (!slug || typeof slug !== 'string' || slug.length > 100) {
      return res.status(400).json({ error: 'Invalid gallery identifier' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    if (!verifyPinAccess(project, pin)) {
      return res.status(401).json({ error: 'Incorrect 8-digit PIN. Please try again.' });
    }

    // Fetch photos
    const photos = db.prepare(`
      SELECT id, filename, url, file_size, selected, created_at 
      FROM photos WHERE project_id = ? ORDER BY created_at ASC
    `).all(project.id) as Photo[];

    const selectedCount = photos.filter(p => p.selected === 1).length;
    const stats = {
      total_photos: photos.length,
      selected_count: selectedCount,
      included_photos: project.included_photos,
      extra_photos_count: Math.max(0, selectedCount - project.included_photos),
      extra_fee: Math.max(0, selectedCount - project.included_photos) * project.extra_photo_price,
    };

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        included_photos: project.included_photos,
        extra_photo_price: project.extra_photo_price,
        currency: project.currency,
        notes: project.notes,
        confirmed_at: project.confirmed_at,
      },
      photos,
      stats,
    });
  } catch (error) {
    console.error('[Error] Verifying PIN:', error);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// 3. Toggle photo selection (Protected by PIN & Gallery Lock state)
router.post('/:slug/toggle-selection', (req, res) => {
  try {
    const { slug } = req.params;
    const { pin, photoId } = req.body;

    if (!slug || typeof slug !== 'string' || slug.length > 100) {
      return res.status(400).json({ error: 'Invalid gallery identifier' });
    }
    if (!photoId || typeof photoId !== 'string' || photoId.length > 50) {
      return res.status(400).json({ error: 'Invalid photo identifier' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    if (!verifyPinAccess(project, pin)) {
      return res.status(401).json({ error: 'Unauthorized. Invalid PIN.' });
    }

    // If project is already confirmed or completed, selection is strictly locked!
    if (project.status === 'Confirmed by Client' || project.status === 'Completed') {
      return res.status(403).json({
        error: 'This gallery has already been confirmed and locked. Please contact your photographer for any changes.',
        locked: true,
      });
    }

    const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND project_id = ?').get(photoId, project.id) as Photo | undefined;

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found in this project' });
    }

    const newSelectedState = photo.selected === 1 ? 0 : 1;
    db.prepare('UPDATE photos SET selected = ? WHERE id = ?').run(newSelectedState, photoId);

    // If status was 'Draft', transition automatically to 'Pending Client Selection'
    if (project.status === 'Draft') {
      db.prepare("UPDATE projects SET status = 'Pending Client Selection', updated_at = datetime('now') WHERE id = ?").run(project.id);
    }

    // Get updated counts
    const photos = db.prepare('SELECT id, selected FROM photos WHERE project_id = ?').all(project.id) as { id: string; selected: number }[];
    const selectedCount = photos.filter(p => p.selected === 1).length;
    const extraCount = Math.max(0, selectedCount - project.included_photos);

    res.json({
      success: true,
      photoId,
      selected: newSelectedState === 1,
      stats: {
        total_photos: photos.length,
        selected_count: selectedCount,
        included_photos: project.included_photos,
        extra_photos_count: extraCount,
        extra_fee: extraCount * project.extra_photo_price,
      },
    });
  } catch (error) {
    console.error('[Error] Toggling selection:', error);
    res.status(500).json({ error: 'Failed to update selection' });
  }
});

// 4. Final confirmation of selection
router.post('/:slug/confirm', (req, res) => {
  try {
    const { slug } = req.params;
    const { pin, clientConfirmed } = req.body;

    if (!slug || typeof slug !== 'string' || slug.length > 100) {
      return res.status(400).json({ error: 'Invalid gallery identifier' });
    }

    const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as Project | undefined;

    if (!project) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    if (!verifyPinAccess(project, pin)) {
      return res.status(401).json({ error: 'Unauthorized. Invalid PIN.' });
    }

    if (!clientConfirmed) {
      return res.status(400).json({ error: 'You must check the confirmation agreement to proceed.' });
    }

    if (project.status === 'Confirmed by Client' || project.status === 'Completed') {
      return res.status(400).json({ error: 'Gallery is already confirmed and locked.' });
    }

    // Fetch chosen photos
    const chosenPhotos = db.prepare('SELECT id, filename, url FROM photos WHERE project_id = ? AND selected = 1').all(project.id) as Photo[];

    if (chosenPhotos.length === 0) {
      return res.status(400).json({ error: 'Please select at least one photo before confirming your selection.' });
    }

    const selectedCount = chosenPhotos.length;
    const extraPhotos = Math.max(0, selectedCount - project.included_photos);
    const extraFee = extraPhotos * project.extra_photo_price;

    // Transition project status to 'Confirmed by Client' and lock
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE projects 
      SET status = 'Confirmed by Client', confirmed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nowIso, project.id);

    res.json({
      success: true,
      message: 'Selection confirmed and locked successfully.',
      confirmed_at: nowIso,
      summary: {
        total_selected: selectedCount,
        included_photos: project.included_photos,
        extra_photos_count: extraPhotos,
        extra_fee: extraFee,
        currency: project.currency,
        selected_filenames: chosenPhotos.map(p => p.filename),
      },
    });
  } catch (error) {
    console.error('[Error] Confirming selection:', error);
    res.status(500).json({ error: 'Failed to confirm selection' });
  }
});

export default router;
