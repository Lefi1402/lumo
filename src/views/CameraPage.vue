<template>
  <ion-page class="camera-page-transparent">
    <!-- Header -->
    <ion-header id="CameraHeader">
      <ion-toolbar>
        <ion-title class="lumo-title-center">
          <span class="header-text">LUM</span>
          <img :src="appLogo" class="header-logo" />
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Kamera‑Content -->
    <ion-content :fullscreen="true" class="camera-content">
      <!-- Android‑Preview -->
      <div
        v-if="isAndroid"
        id="preview-wrapper"
        class="preview-wrapper"
      ></div>

      <!-- Web‑Preview -->
      <video
        v-else
        ref="videoRef"
        autoplay
        playsinline
        class="camera-preview"
      />
      <canvas v-if="isWeb" ref="canvasRef" style="display:none" />

      <!-- Controls -->
      <div class="camera-controls">
        <div class="camera-slot">
          <img
            v-if="lastPhoto"
            :src="lastPhoto"
            class="camera-thumbnail"
            @click="goToGallery"
          />
        </div>

        <div class="camera-slot">
          <button class="camera-button" @click="takePhoto"></button>
        </div>

        <div class="camera-slot">
          <ion-icon
            :icon="refreshOutline"
            class="camera-toggle"
            @click="toggleCamera"
          />
        </div>
      </div>
    </ion-content>

    <!-- Toast -->
    <ion-toast
      css-class="lum-toast"
      position="top"
      position-anchor="CameraHeader"
      :icon="warning"
      :is-open="showToast"
      :message="toastMsg"
      duration="2500"
      @didDismiss="showToast = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
/* Ionic & Vue ---------------------------------------------------------- */
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonToast,
  onIonViewDidEnter,
  onIonViewWillLeave,
  onIonViewWillEnter,
} from '@ionic/vue';
import { refreshOutline, warning } from 'ionicons/icons';
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
//@ts-ignorets-ignore
import loadImage from 'blueimp-load-image';

/* Capacitor ------------------------------------------------------------ */
import { Capacitor } from '@capacitor/core';
import {
  CameraPreview,
  CameraPreviewPictureOptions,
  CameraPreviewOptions,
} from '@capacitor-community/camera-preview';

/* Services & Assets ---------------------------------------------------- */
import { savePhoto, loadPhotos } from '@/services/photoService';
import appLogo from '@/assets/Logo.png';

/* Plattform‑Flags ------------------------------------------------------ */
const isWeb     = Capacitor.getPlatform() === 'web';
const isAndroid = Capacitor.getPlatform() === 'android';

/* Router & Refs -------------------------------------------------------- */
const router    = useRouter();
const videoRef  = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement  | null>(null);
const stream    = ref<MediaStream | null>(null);
const lastPhoto = ref<string | null>(null);

/* Preview‑State -------------------------------------------------------- */
const facingMode      = ref<'user' | 'environment'>('environment'); // Web
const previewPosition = ref<'rear' | 'front'>('rear');              // Android

/* Toast --------------------------------------------------------------- */
const showToast = ref(false);
const toastMsg  = ref('');
function presentToast(msg: string) {
  toastMsg.value  = msg;
  showToast.value = true;
}

/* --------------------------------------------------------------------- */
/* Android: Preview start/stop                                           */
/* --------------------------------------------------------------------- */

async function startNativePreview() {
  await (CameraPreview as any).requestPermissions();
  await nextTick();

  const opts: CameraPreviewOptions = {
    parent: 'preview-wrapper',
    toBack: true,
    position: previewPosition.value,
    enableZoom: true,
    className: 'camera-preview-native',
  };

  await CameraPreview.start(opts);

  // <<< NEU: Web‑View wirklich transparent schalten
  await (CameraPreview as any).setTransparent({ isTransparent: true });
  console.log('[NATIVE] Preview running & WebView transparent');
}

/* --------------------------------------------------------------------- */
/* Android: Preview stoppen (wird beim Verlassen der Seite aufgerufen)   */
/* --------------------------------------------------------------------- */

async function stopNativePreview() {
  try {
    await CameraPreview.stop();
    // Web‑View wieder deckend machen, falls nötig
    await (CameraPreview as any).setTransparent({ isTransparent: false });
  } catch {
    /* Preview war nicht aktiv – einfach ignorieren */
  }
}


/* --------------------------------------------------------------------- */
/* Web‑Stream                                                            */
/* --------------------------------------------------------------------- */
async function startWebCamera() {
  stopWebCamera();
  stream.value = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facingMode.value },
  });
  if (videoRef.value) videoRef.value.srcObject = stream.value;
}
function stopWebCamera() {
  stream.value?.getTracks().forEach(t => t.stop());
}

/* --------------------------------------------------------------------- */
/* Thumbnail                                                             */
/* --------------------------------------------------------------------- */
async function updateLastPhoto() {
  const list = await loadPhotos();
  lastPhoto.value = list.length > 0 ? list[0].webPath : null;
}

/* --------------------------------------------------------------------- */
/* Foto aufnehmen                                                        */
/* --------------------------------------------------------------------- */
async function takePhoto() {
  if (isWeb) {
    // ...dein Web-Code...
    return;
  }

  try {
    const picOpts: CameraPreviewPictureOptions = { quality: 80 };
    const { value: base64 } = await CameraPreview.capture(picOpts);

    let base64Fixed = base64;
    if (previewPosition.value === 'front') {
      // Bild rotieren, wenn Frontkamera
      base64Fixed = await fixOrientation(base64);
    }

    await savePhoto(base64Fixed);
    await updateLastPhoto();
  } catch (err) {
    presentToast('Foto konnte nicht gespeichert werden.');
  }
}

async function fixOrientation(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    loadImage(
      'data:image/jpeg;base64,' + base64,
      (canvas: HTMLCanvasElement | Event) => {
        if ((canvas as any).type === 'error') {
          reject('Fehler beim Drehen');
        } else {
          resolve((canvas as HTMLCanvasElement).toDataURL('image/jpeg').split(',')[1]);
        }
      },
      { orientation: 8,
        canvas: true }
    );
  });
}


/* --------------------------------------------------------------------- */
/* Kamera wechseln                                                       */
/* --------------------------------------------------------------------- */
async function toggleCamera() {
  if (isWeb) {
    facingMode.value =
      facingMode.value === 'user' ? 'environment' : 'user';
    try {
      await startWebCamera();
    } catch {
      presentToast('Kamerawechsel fehlgeschlagen.');
    }
  } else {
    try {
      await CameraPreview.flip();
      previewPosition.value =
        previewPosition.value === 'rear' ? 'front' : 'rear';
    } catch {
      presentToast('Kamerawechsel fehlgeschlagen.');
    }
  }
}

/* Navigation ----------------------------------------------------------- */
const goToGallery = () => router.push('/tabs/gallery');

/* Lifecycle ------------------------------------------------------------ */

onIonViewDidEnter(async () => {
  try {
    if (isWeb) {
      await startWebCamera();
    } else {
      await startNativePreview();
    }
  } catch (err: any) {
    const msg = err?.message ?? '';
    const benign =
      msg.includes('already running') ||
      msg.includes('setTransparent')  ||
      msg.includes('not supported');

    if (!benign) {
      console.error('[NATIVE] start error', err);
      presentToast('Camera‑Preview start failed');
    }
  }
});

onIonViewWillLeave(async () => {
  if (isWeb) stopWebCamera();
  else       await stopNativePreview();
});

onIonViewWillEnter(updateLastPhoto);

</script>

