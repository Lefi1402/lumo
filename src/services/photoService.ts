// photoService.ts
// Handles persistent storage and file operations for LUMO gallery photos on web and Android

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath:  string;   
  date:     string;   
}

const PHOTOS_KEY = 'photos';
const isWeb = Capacitor.getPlatform() === 'web';

// Liefert den Pfad für native Dateien
export function getNativePhotoPath(fileName: string) {
  return fileName.startsWith('public/') ? fileName : `public/${fileName}`;
}

// Lädt die gespeicherten Fotos aus Preferences
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  try {
    return value ? (JSON.parse(value) as StoredPhoto[]) : [];
  } catch {
    await Preferences.remove({ key: PHOTOS_KEY });
    return [];
  }
}

// Speichert ein neues Foto und legt es im Filesystem oder als Data-URL an
export async function savePhoto(
  base64: string,
  dateOverride?: string,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<StoredPhoto> {
  const ext      = mime === 'image/png' ? 'png' : 'jpeg';
  const fileName = `${Date.now()}.${ext}`;
  let   webPath: string;

  if (isWeb) {
    webPath = `data:${mime};base64,${base64}`;
  } else {
    try {
      await Filesystem.mkdir({
        path: 'public',
        directory: Directory.Data,
        recursive: true,
      });
    } catch (e: any) {
      if (!String(e.message).includes('directory exists')) {
        console.warn('[savePhoto] mkdir public error:', e);
      }
    }
    // Bild speichern
    const savePath = getNativePhotoPath(fileName);
    try {
      const saved = await Filesystem.writeFile({
        path: savePath,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
      webPath = Capacitor.convertFileSrc(saved.uri);
    } catch (err) {
      console.error('[savePhoto] Fehler beim Speichern:', err);
      throw err;
    }
  }

  const photo: StoredPhoto = {
    fileName,
    webPath,
    date: dateOverride ?? new Date().toISOString(),
  };

  const photos = await loadPhotos();
  photos.unshift(photo);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(photos) });

  return photo;
}

// Löscht ein Foto sowohl aus dem Filesystem als auch aus Preferences
export async function deletePhoto(fileName: string) {
  if (!isWeb) {
    const path = getNativePhotoPath(fileName);
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch (e: any) {
      if (!String(e.message).includes('No such file')) {
        console.warn('deleteFile error', e);
      }
    }
  }
  const remaining = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(remaining) });
}
