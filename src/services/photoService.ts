import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath:  string;   // Data‑URL (Web) oder convertFileSrc‑Pfad (Native)
  date:     string;   // ISO‑Datum
}

const PHOTOS_KEY = 'photos';
const isWeb = Capacitor.getPlatform() === 'web';

/* ------------------------------------------------------------------ */
/* Liste laden                                                        */
/* ------------------------------------------------------------------ */
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  try {
    return value ? (JSON.parse(value) as StoredPhoto[]) : [];
  } catch {
    await Preferences.remove({ key: PHOTOS_KEY }); // defekte JSON leeren
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Bild speichern                                                     */
/* ------------------------------------------------------------------ */
/**
 * @param base64 Reiner Base64‑String (ohne data:… Präfix)
 * @param dateOverride ISO‑Datum aus EXIF (optional)
 * @param mime 'image/jpeg' | 'image/png'  (Default JPEG)
 */
export async function savePhoto(
  base64: string,
  dateOverride?: string,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<void> {
  const ext      = mime === 'image/png' ? 'png' : 'jpeg';
  const fileName = `${Date.now()}.${ext}`;
  let   webPath: string;

  if (isWeb) {
    webPath = `data:${mime};base64,${base64}`;
  } else {
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data,
    });
    webPath = Capacitor.convertFileSrc(saved.uri);
  }

  const photo: StoredPhoto = {
    fileName,
    webPath,
    date: dateOverride ?? new Date().toISOString(),
  };

  const photos = await loadPhotos();
  photos.unshift(photo);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(photos) });
}

/* ------------------------------------------------------------------ */
/* Foto löschen                                                       */
/* ------------------------------------------------------------------ */
export async function deletePhoto(fileName: string) {
  if (!isWeb) {
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
  }
  const remaining = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(remaining) });
}
