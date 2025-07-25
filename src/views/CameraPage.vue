<template>
  <ion-page>
    <!-- Header -->
    <ion-header id="appHeader">
      <ion-toolbar>
        <ion-title class="lumo-title-center">
          <span class="header-text">LUM</span>
          <img :src="appLogo" class="header-logo" />
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Kamera‑Content -->
    <ion-content :fullscreen="true" class="camera-content">
      <video ref="videoRef" autoplay playsinline class="camera-preview" />
      <canvas ref="canvasRef" style="display:none" />

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
      position-anchor="appHeader"
      :icon="warning"
      :is-open="showToast"
      :message="toastMsg"
      duration="2500"
      @didDismiss="showToast = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
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
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { savePhoto, loadPhotos } from '@/services/photoService';
import appLogo from '@/assets/Logo.png';

/* Router & refs */
const router     = useRouter();
const videoRef   = ref<HTMLVideoElement | null>(null);
const canvasRef  = ref<HTMLCanvasElement  | null>(null);
const stream     = ref<MediaStream | null>(null);
const lastPhoto  = ref<string | null>(null);
const facingMode = ref<'user' | 'environment'>('environment');

/* Toast */
const showToast = ref(false);
const toastMsg  = ref('');
function presentToast(msg: string) {
  toastMsg.value  = msg;
  showToast.value = true;
}

/* Kamera‐Stream ----------------------------- */
async function startCamera() {
  stopCamera();
  stream.value = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facingMode.value },
  });
  if (videoRef.value) videoRef.value.srcObject = stream.value;
}
function stopCamera() {
  stream.value?.getTracks().forEach(t => t.stop());
}

/* Thumbnail --------------------------------- */
async function updateLastPhoto() {
  const list = await loadPhotos();
  lastPhoto.value = list.length > 0 ? list[0].webPath : null;
}

/* Foto aufnehmen ---------------------------- */
async function takePhoto() {
  const video = videoRef.value;
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
}

/* Kamera wechseln --------------------------- */
async function toggleCamera() {
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
  try {
    await startCamera();
  } catch {
    presentToast('Kamerawechsel fehlgeschlagen.');
  }
}

/* Navigation -------------------------------- */
const goToGallery = () => router.push('/tabs/gallery');

/* Lifecycle --------------------------------- */
onMounted(async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Camera.requestPermissions();
    }
    await startCamera();
  } catch {
    presentToast('Kamera konnte nicht gestartet werden.');
  }
});

onBeforeUnmount(stopCamera);
onIonViewWillEnter(updateLastPhoto);
</script>
