<template>
  <ion-page>
    <!-- Header -->
    <ion-header>
      <ion-toolbar>
        <ion-title class="lumo-title-center">LUMO</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Kamera‑Content -->
    <ion-content :fullscreen="true" class="camera-content">
      <!-- Live‑Preview -->
      <video
        ref="videoRef"
        autoplay
        playsinline
        class="camera-preview"
      ></video>

      <!-- Unsichtbares Canvas -->
      <canvas ref="canvasRef" style="display: none"></canvas>

      <!-- Controls -->
      <div class="camera-controls">
        <!-- Thumbnail (tap → Galerie) -->
        <div class="camera-slot">
          <img
            v-if="lastPhoto"
            :src="lastPhoto"
            class="camera-thumbnail"
            @click="goToGallery"
          />
        </div>

        <!-- Auslöser -->
        <div class="camera-slot">
          <button class="camera-button" @click="takePhoto"></button>
        </div>

        <!-- Kamera wechseln -->
        <div class="camera-slot">
          <ion-icon
            :icon="refreshOutline"
            class="camera-toggle"
            @click="toggleCamera"
          />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
/* Ionic + Icons */
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  onIonViewWillEnter,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';

/* Vue & Router */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

/* Services */
import { savePhoto, loadPhotos } from '@/services/photoService';

const router     = useRouter();
const videoRef   = ref<HTMLVideoElement | null>(null);
const canvasRef  = ref<HTMLCanvasElement  | null>(null);
const stream     = ref<MediaStream | null>(null);
const lastPhoto  = ref<string | null>(null);
const facingMode = ref<'user' | 'environment'>('environment');

/* Kamera streamen */
async function startCamera() {
  stopCamera();
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode.value },
    });
    if (videoRef.value) videoRef.value.srcObject = stream.value;
  } catch (err) {
    console.error('Kamera‑Start fehlgeschlagen:', err);
  }
}
function stopCamera() {
  stream.value?.getTracks().forEach(t => t.stop());
}

/* Thumbnail aus Storage laden */
async function updateLastPhoto() {
  const list = await loadPhotos();
  lastPhoto.value = list.length > 0 ? list[0].webPath : null;
}

/* Foto aufnehmen */
async function takePhoto() {
  const video  = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas) return;

  // Frame auf Canvas zeichnen
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Base64 sichern
  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  await savePhoto(base64);

  // Thumbnail neu berechnen (falls alle Fotos vorher gelöscht waren)
  await updateLastPhoto();
}

/* Kamera wechseln */
async function toggleCamera() {
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
  await startCamera();
}

/* Navigation */
const goToGallery = () => router.push('/tabs/gallery');

/* Lifecycle */
onMounted(startCamera);
onBeforeUnmount(stopCamera);
onIonViewWillEnter(updateLastPhoto);
</script>
