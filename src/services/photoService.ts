import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath: string;   // Data‑URL (Web) oder convertFileSrc‑Pfad (Native)
  date: string;
}

const PHOTOS_KEY = 'photos';
const isWeb = Capacitor.getPlatform() === 'web';

/** Liste laden */
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  try {
    return value ? (JSON.parse(value) as StoredPhoto[]) : [];
  } catch {
    // JSON kaputt → Storage leeren, sonst app‑weiter Crash
    await Preferences.remove({ key: PHOTOS_KEY });
    return [];
  }
}

/** Bild speichern */
export async function savePhoto(base64: string): Promise<void> {
  const fileName = `${Date.now()}.jpeg`;
  let webPath: string;

  if (isWeb) {
    webPath = `data:image/jpeg;base64,${base64}`;
  } else {
    // Native: Datei schreiben
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data,
    });
    webPath = Capacitor.convertFileSrc(saved.uri);
  }

  // Metadaten + Liste aktualisieren
  const photo: StoredPhoto = { fileName, webPath, date: new Date().toISOString() };
  const photos = await loadPhotos();
  photos.unshift(photo);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(photos) });
}

/** Foto löschen */
export async function deletePhoto(fileName: string) {
  if (!isWeb) {
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
  }
  const remaining = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(remaining) });
}
