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

// Hilfsfunktion für Pfade im Filesystem
export function getNativePhotoPath(fileName: string) {
  return fileName.startsWith('public/') ? fileName : `public/${fileName}`;
}

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
): Promise<StoredPhoto> {   // <<< Rückgabewert geändert
  const ext      = mime === 'image/png' ? 'png' : 'jpeg';
  const fileName = `${Date.now()}.${ext}`;
  let   webPath: string;

  if (isWeb) {
    webPath = `data:${mime};base64,${base64}`;
    console.log('[savePhoto] Web: Bild gespeichert unter Data-URL');
  } else {
    // Ordner "public" anlegen (wenn nötig)
    try {
      console.log('[savePhoto] Versuche Ordner "public" anzulegen…');
      await Filesystem.mkdir({
        path: 'public',
        directory: Directory.Data,
        recursive: true,
      });
      console.log('[savePhoto] Ordner "public" wurde (neu) angelegt!');
    } catch (e: any) {
      if (String(e.message).includes('directory exists')) {
        console.log('[savePhoto] Ordner "public" existiert bereits.');
      } else {
        console.warn('[savePhoto] mkdir public error:', e);
      }
    }

    // Bild speichern (mit recursive: true)
    const savePath = getNativePhotoPath(fileName);
    console.log('[savePhoto] Schreibe Bild nach:', savePath);
    try {
      const saved = await Filesystem.writeFile({
        path: savePath,
        data: base64,
        directory: Directory.Data,
        recursive: true, // ← GANZ WICHTIG!
      });
      webPath = Capacitor.convertFileSrc(saved.uri);
      console.log('[savePhoto] writeFile erfolgreich:', saved);
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
  console.log('[savePhoto] Foto gespeichert und Preferences aktualisiert:', photo);

  return photo; // <<<<<< Das ist die Änderung!
}

/* ------------------------------------------------------------------ */
/* Foto löschen                                                       */
/* ------------------------------------------------------------------ */
export async function deletePhoto(fileName: string) {
  if (!isWeb) {
    const path = getNativePhotoPath(fileName); // robust gegen doppelten public/
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch (e: any) {
      // Fehler ignorieren, falls Datei bereits nicht mehr existiert
      if (!String(e.message).includes('No such file')) {
        console.warn('deleteFile error', e);
      }
    }
  }
  const remaining = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(remaining) });
}
