📸 LUMO – Die smarte Fotos-App

Verwalte, bearbeite und gruppiere deine Fotos mit Vue 3, Ionic Vue und Capacitor.
Die App unterstützt einen modernen Web‑First‑Workflow sowie native Android-Builds.

✨ Features

📁 Galerie-Grid: Mind. 3 Bilder/Zeile, automatisch gruppiert nach Monat/Jahr
📷 Kamera-Seite: Fotos aufnehmen (Web via getUserMedia, nativ via @capacitor/camera)
🖼️ Detailansicht: Vollbild-Modal mit Bearbeiten (Android-only via PhotoEditor), Löschen
✅ Mehrfachauswahl und Batch-Delete
☁️ Datei-Upload (JPG/PNG) inkl. EXIF-Auswertung → richtige zeitliche Einordnung
🔔 Einheitliches Toasting, Dialoge mit abgerundeten Ecken, Bahnschrift-Font
🌙 Dark Mode Ready (basierend auf Ionic Dark Palette)

🧰 Voraussetzungen

Tool	            Empfohlene Version
Node.js	            ≥ 18
npm	                ≥ 9
Ionic CLI	        ~7.x (npm i -g @ionic/cli)
Android Studio	    2023.x (SDK 34)
Java JDK	        17
Xcode	            15 + CocoaPods ≥ 1.13 (für iOS)

🚀 Schnellstart

1. Repository klonen

git clone https://github.com/<your-org>/lumo-photo-app.git
cd lumo-photo-app

2. Abhängigkeiten installieren

npm install

3. Lokale Web-Entwicklung starten

npm run dev     
oder
ionic serve   
  
🤖 Android: Build & Test

Einmalig
npx cap add android
npm run build
npx cap sync android

Android Studio öffnen
npx cap open android

🍏 iOS (optional)

npx cap add ios
npm run build && npx cap sync ios
npx cap open ios

🏗 Build & Release

Web (Production)
npm run build

Android AAB / APK
cd android
./gradlew bundleRelease    # für Google Play
./gradlew assembleRelease  # lokale APK

iOS IPA
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release

📁 Projektstruktur (Kurzüberblick)

src/
 ├─ components/         # u.a. PhotoDetailModal, Header-Logo
 ├─ services/
 │   └─ photoService.ts # z.B. savePhoto / loadPhotos
 ├─ views/
 │   ├─ GalleryPage.vue
 │   ├─ CameraPage.vue
 │   └─ Tabs.vue
 ├─ router/
 └─ theme/variables.css # Custom CSS, Farben, Bahnschrift
capacitor.config.ts
android/