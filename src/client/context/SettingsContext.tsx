import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings, updateSettings, uploadWatermark, deleteWatermark } from '../api';

interface SettingsContextType {
  publicDomain: string;
  watermarkUrl: string;
  updatePublicDomain: (domain: string) => Promise<void>;
  uploadWatermarkImage: (file: File) => Promise<void>;
  removeWatermarkImage: () => Promise<void>;
  formatGalleryUrl: (slug: string) => string;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicDomain, setPublicDomain] = useState<string>('https://fotosklep.kurpios.art');
  const [watermarkUrl, setWatermarkUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then((data: any) => {
        if (data.public_domain) {
          setPublicDomain(data.public_domain);
        }
        if (data.watermark_url) {
          setWatermarkUrl(data.watermark_url);
        }
      })
      .catch((err) => {
        console.warn('Could not load studio settings, using defaults:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const updatePublicDomain = async (domain: string) => {
    let clean = domain.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    clean = clean.replace(/\/+$/, '');

    const res = await updateSettings({ public_domain: clean });
    setPublicDomain(res.public_domain);
  };

  const uploadWatermarkImage = async (file: File) => {
    const res = await uploadWatermark(file);
    setWatermarkUrl(res.watermark_url);
  };

  const removeWatermarkImage = async () => {
    await deleteWatermark();
    setWatermarkUrl('');
  };

  const formatGalleryUrl = (slug: string) => {
    const base = publicDomain.replace(/\/+$/, '');
    return `${base}/gallery/${slug}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        publicDomain,
        watermarkUrl,
        updatePublicDomain,
        uploadWatermarkImage,
        removeWatermarkImage,
        formatGalleryUrl,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
