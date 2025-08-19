
# 📸 LUMO – Die smarte Fotos-App

Verwalte, bearbeite und gruppiere deine Fotos mit **Vue 3**, **Ionic** und **Capacitor**.  
Die App unterstützt native Android-Builds.

## ✨ Features

- 📁 **Galerie-Grid**: Mindestens 3 Bilder pro Zeile, automatisch gruppiert nach Monat/Jahr
- 📷 **Kamera-Seite**: Fotos aufnehmen (nativ via `@capacitor/camera`)
- 🖼️ **Detailansicht**: Vollbild-Modal mit Bearbeiten (Android-only via `PhotoEditor`), Löschen
- ✅ **Mehrfachauswahl und Batch-Delete**
- ☁️ **Datei-Upload** (JPG/PNG) 
- 🔔 Einheitliche Toasts, Dialoge, **Bahnschrift-Font**
- 🌙 **Dark Mode** (basierend auf Ionic Dark Palette)

## 🧰 Voraussetzungen

| Tool            | Empfohlene Version                          |
|-----------------|---------------------------------------------|
| Node.js         | ≥ 18                                        |
| npm             | ≥ 9                                         |
| Ionic CLI       | ~7.x (`npm i -g @ionic/cli`)                |
| Android Studio  | 2023.x (SDK 34)                             |
| Java JDK        | 17                                          |

## 🚀 Schnellstart

### 1. Repository klonen

```bash
git clone https://github.com/Lefi1402/lumo.git
cd lumo
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Lokale Web-Entwicklung starten

```bash
npm run dev
# oder
ionic serve
```

## 🤖 Android: Build & Test

```bash
npm run build
npx cap sync android
npx cap open android
```

## 🏗 Build & Release

### Web (Production)

```bash
npm run build
```

### Android AAB / APK

```bash
cd android
./gradlew bundleRelease    # für Google Play
./gradlew assembleRelease  # lokale APK
```

## 📁 Projektstruktur (Kurzüberblick)

```
src/
 ├─ components/  
 ├─	 └─ PhotoDetailModal.vue    # u.a. PhotoDetailModal
 ├─ services/
 │   └─ photoService.ts             # z.B. savePhoto / loadPhotos
 ├─ views/
 │   ├─ GalleryPage.vue             # Gallerie - Seite
 │   ├─ CameraPage.vue              # Kamera - Seite
 │   └─ Tabs.vue                    # Seiten
 ├─ router/
 └─ theme/variables.css             # Custom CSS

capacitor.config.ts
android/
```

