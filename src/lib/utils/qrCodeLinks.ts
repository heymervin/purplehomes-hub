/**
 * QR Code Links Management
 * Stores frequently used QR code URLs in localStorage
 */

export interface QRCodeLink {
  id: string;
  label: string;
  url: string;
  createdAt: string;
}

const STORAGE_KEY = 'purplehomes_qr_code_links';

export function getQRCodeLinks(): QRCodeLink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load QR code links:', error);
    return [];
  }
}

export function saveQRCodeLink(link: Omit<QRCodeLink, 'id' | 'createdAt'>): QRCodeLink {
  const links = getQRCodeLinks();
  const newLink: QRCodeLink = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...link,
  };
  links.push(newLink);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  return newLink;
}

export function deleteQRCodeLink(id: string): void {
  const links = getQRCodeLinks();
  const filtered = links.filter(link => link.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function updateQRCodeLink(id: string, updates: Partial<Omit<QRCodeLink, 'id' | 'createdAt'>>): void {
  const links = getQRCodeLinks();
  const index = links.findIndex(link => link.id === id);
  if (index !== -1) {
    links[index] = { ...links[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }
}
