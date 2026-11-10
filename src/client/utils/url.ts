/**
 * Generates the correct public URL for client galleries.
 * Automatically replaces local LAN IPs (e.g. 192.168.1.168:4838 or localhost)
 * with the public domain (https://fotosklep.kurpios.art) so copied links
 * are immediately ready to be sent to clients.
 */
export function getGalleryUrl(slug: string, publicBaseUrl?: string): string {
  if (publicBaseUrl && publicBaseUrl.trim()) {
    return `${publicBaseUrl.replace(/\/+$/, '')}/gallery/${slug}`;
  }

  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.');

  if (isLocal) {
    return `https://fotosklep.kurpios.art/gallery/${slug}`;
  }

  return `${window.location.origin}/gallery/${slug}`;
}

