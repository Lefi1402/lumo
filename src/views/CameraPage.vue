<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="lumo-title-center">LUMO</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="camera-content">
      <video ref="videoRef" autoplay playsinline class="camera-preview"></video>

      <div class="camera-controls">
        <!-- Vorschau -->
        <div class="camera-slot">
          <img
            v-if="lastPhoto"
            :src="lastPhoto"
            class="camera-thumbnail"
            @click="goToGallery"
          />
        </div>

        <!-- Auslöser -->
        <div class="camera-slot center">
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
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';

const router = useRouter();
const videoRef = ref<HTMLVideoElement | null>(null);
const lastPhoto = ref<string | null>(null);
const facingMode = ref<'user' | 'environment'>('environment');

const startCamera = async () => {
  const constraints = {
    video: { facingMode: facingMode.value },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  if (videoRef.value) {
    videoRef.value.srcObject = stream;
  }
};

const takePhoto = async () => {
  const video = videoRef.value;
  if (!video) return;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  lastPhoto.value = canvas.toDataURL('image/png');
};

const toggleCamera = async () => {
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
  await startCamera();
};

const goToGallery = () => {
  router.push('/tabs/gallery');
};

onMounted(() => {
  startCamera();
});
</script>

<style scoped>
@import '@/theme/variables.css';
</style>
