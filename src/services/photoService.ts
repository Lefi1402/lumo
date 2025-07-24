// src/services/photo.service.ts
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath: string;   // convertFileSrc‑URL – perfekt für <img>
  date: string;
}

const PHOTOS_KEY = 'photos';

/** Liste aus Preferences holen */
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  return value ? JSON.parse(value) as StoredPhoto[] : [];
}

/** Neues Base64‑Foto speichern & Liste updaten */
export async function savePhoto(base64: string): Promise<StoredPhoto> {
  const fileName = `${Date.now()}.jpeg`;

  await Filesystem.writeFile({
    path: `photos/${fileName}`,
    data: base64,
    directory: Directory.Data,
  });

  const webPath = Capacitor.convertFileSrc(`photos/${fileName}`);
  const photo: StoredPhoto = { fileName, webPath, date: new Date().toISOString() };

  const list = await loadPhotos();
  list.unshift(photo);                      // neuestes Foto nach vorn
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(list) });

  return photo;
}
