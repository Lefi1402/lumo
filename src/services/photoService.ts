import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface StoredPhoto {
  fileName: string;
  webPath: string;    // Pfad im nativen FS ODER Data‑URL im Browser
  date: string;
}

const PHOTOS_KEY = 'photos';
const isWeb = Capacitor.getPlatform() === 'web';

/* Fotos laden – liefert sortierte Liste */
export async function loadPhotos(): Promise<StoredPhoto[]> {
  const { value } = await Preferences.get({ key: PHOTOS_KEY });
  return value ? (JSON.parse(value) as StoredPhoto[]) : [];
}

/* Base64‑Foto speichern + Metadaten ablegen */
export async function savePhoto(base64: string): Promise<StoredPhoto> {
  const fileName = `${Date.now()}.jpeg`;

  let webPath: string;

  if (isWeb) {
    /* Browser: keine Datei schreiben → direkt Data‑URL nutzen */
    webPath = `data:image/jpeg;base64,${base64}`;
  } else {
    /* Native: Datei ins App‑Verzeichnis schreiben */
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
    date: new Date().toISOString(),
  };

  /* Liste updaten */
  const list = await loadPhotos();
  list.unshift(photo);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(list) });

  return photo;
}

/* Foto löschen (optional für später) */
export async function deletePhoto(fileName: string) {
  if (!isWeb) {
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
  }
  const list = (await loadPhotos()).filter(p => p.fileName !== fileName);
  await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(list)});
}
