// photoService.ts

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath:  string;   // für <ion-img>, aus native Path via convertFileSrc
  date:     string;   // ISO Datum
}

const PHOTOS_KEY = 'photos';

// Liefert den Pfad für native Dateien (immer unter public/)
export function getNativePhotoPath(fileName: string) {
  return fileName.startsWith('public/') ? fileName : `public/${fileName}`;
}

// Lädt gespeicherte Fotos aus Preferences
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  try {
    return value ? (JSON.parse(value) as StoredPhoto[]) : [];
  } catch {
    await Preferences.remove({ key: PHOTOS_KEY });
    return [];
  }
}

// Speichert ein neues Foto im Filesystem + Metadaten in Preferences
export async function savePhoto(
  base64: string,
  dateOverride?: string,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<StoredPhoto> {
  const ext      = mime === 'image/png' ? 'png' : 'jpeg';
  const fileName = `${Date.now()}.${ext}`;

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

  const savePath = getNativePhotoPath(fileName);
  const saved = await Filesystem.writeFile({
    path: savePath,
    data: base64,                   // Base64-String
    directory: Directory.Data,
    recursive: true,
  });

  const webPath = Capacitor.convertFileSrc(saved.uri);

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

// Löscht ein Foto im Filesystem + entfernt es aus Preferences
export async function deletePhoto(fileName: string) {
  const path = getNativePhotoPath(fileName);
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch (e: any) {
    if (!String(e.message).includes('No such file')) {
      console.warn('deleteFile error', e);
    }
  }
  const remaining = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(remaining) });
}
