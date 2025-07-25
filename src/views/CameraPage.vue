<template>
  <ion-page>
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
      <!-- Android‑Preview   -->
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
  onIonViewWillEnter,
} from '@ionic/vue';
import { refreshOutline, warning } from 'ionicons/icons';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

/* Capacitor ------------------------------------------------------------ */
import { Capacitor } from '@capacitor/core';
import {
  CameraPreview,
  CameraPreviewPictureOptions,
  CameraPreviewOptions,
} from '@capacitor-community/camera-preview';

import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';

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
/* Android: Preview start/stop                                            */
/* --------------------------------------------------------------------- */
async function startNativePreview() {
  const opts: CameraPreviewOptions = {
    parent: 'preview-wrapper',
    position: previewPosition.value,
    toBack: false,
    enableZoom: true,
  };
  await CameraPreview.start(opts);
}

async function stopNativePreview() {
  try {
    await CameraPreview.stop();
  } catch { /* ignore if not running */ }
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
  /* Web */
  if (isWeb) {
    const video  = videoRef.value;
    const canvas = canvasRef.value;
    if (!video || !canvas) return;

    try {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context missing');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      await savePhoto(base64);
      await updateLastPhoto();
    } catch {
      presentToast('Foto konnte nicht gespeichert werden.');
    }
    return;
  }

  /* Android – Capture aus Preview */
  try {
    const picOpts: CameraPreviewPictureOptions = {
      quality: 80,
    };
    const photo = await CameraPreview.capture(picOpts); // base64 ohne Header

    await savePhoto(photo.value);
    await updateLastPhoto();
  } catch {
    presentToast('Foto konnte nicht gespeichert werden.');
  }
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
onMounted(async () => {
  try {
    if (isWeb) {
      await startWebCamera();
    } else {
      await Camera.requestPermissions(); // fragt nur beim 1. Mal
      await startNativePreview();
    }
  } catch {
    presentToast('Kamera‑Preview konnte nicht gestartet werden.');
  }
});

onBeforeUnmount(async () => {
  if (isWeb) stopWebCamera();
  else       await stopNativePreview();
});

onIonViewWillEnter(updateLastPhoto);
</script>

<style scoped>
/* Wrapper nimmt die volle Breite/Höhe des Contents ein */
.preview-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* eventuell: Controls mit z‑index über Preview */
.camera-controls {
  position: absolute;
  bottom: 5.5rem; /* anpassen */
  width: 100%;
  display: flex;
  justify-content: space-around;
  z-index: 10;
}
</style>
