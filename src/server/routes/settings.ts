import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { db, UPLOADS_DIR } from '../db';

const router = Router();

// Multer storage for watermark PNG
const watermarkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `watermark-${Date.now()}-${nanoid(6)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadWatermark = multer({
  storage: watermarkStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for watermark logo
  },
  fileFilter: (_req, file, cb) => {
    const isPng = file.mimetype.toLowerCase() === 'image/png';
    const isExtPng = path.extname(file.originalname).toLowerCase() === '.png';

    if (isPng && isExtPng) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG images (.png) are supported for watermarks.'));
    }
  },
});

// 1. Get all studio settings
router.get('/', (_req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settingsMap: Record<string, string> = {};
    rows.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    if (!settingsMap.public_domain) {
      settingsMap.public_domain = 'https://fotosklep.kurpios.art';
    }
    if (!settingsMap.watermark_url) {
      settingsMap.watermark_url = '';
    }

    res.json(settingsMap);
  } catch (error) {
    console.error('[Error] Fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 2. Update studio settings
router.patch('/', (req, res) => {
  try {
    const { public_domain, watermark_url } = req.body;

    if (public_domain !== undefined) {
      if (typeof public_domain !== 'string' || !public_domain.trim()) {
        return res.status(400).json({ error: 'Domain cannot be empty' });
      }

      let cleanDomain = public_domain.trim();
      if (!/^https?:\/\//i.test(cleanDomain)) {
        cleanDomain = `https://${cleanDomain}`;
      }
      cleanDomain = cleanDomain.replace(/\/+$/, '');

      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('public_domain', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(cleanDomain);
    }

    if (watermark_url !== undefined) {
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('watermark_url', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(watermark_url);
    }

    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settingsMap: Record<string, string> = {};
    rows.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    res.json(settingsMap);
  } catch (error) {
    console.error('[Error] Updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 3. Upload watermark PNG image
router.post('/watermark', uploadWatermark.single('watermark'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No watermark file provided' });
    }

    // Remove old watermark file from disk if one was set
    const oldRow = db.prepare("SELECT value FROM settings WHERE key = 'watermark_url'").get() as { value: string } | undefined;
    if (oldRow && oldRow.value) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(oldRow.value));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('[Watermark] Could not delete old watermark:', e);
        }
      }
    }

    const newUrl = `/uploads/${req.file.filename}`;
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ('watermark_url', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(newUrl);

    res.json({
      success: true,
      watermark_url: newUrl,
    });
  } catch (error) {
    console.error('[Error] Uploading watermark:', error);
    res.status(500).json({ error: 'Failed to upload watermark' });
  }
});

// 4. Delete watermark
router.delete('/watermark', (_req, res) => {
  try {
    const oldRow = db.prepare("SELECT value FROM settings WHERE key = 'watermark_url'").get() as { value: string } | undefined;
    if (oldRow && oldRow.value) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(oldRow.value));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('[Watermark] Could not delete watermark file:', e);
        }
      }
    }

    db.prepare("UPDATE settings SET value = '', updated_at = datetime('now') WHERE key = 'watermark_url'").run();

    res.json({ success: true, watermark_url: '' });
  } catch (error) {
    console.error('[Error] Deleting watermark:', error);
    res.status(500).json({ error: 'Failed to delete watermark' });
  }
});

export default router;
