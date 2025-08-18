<template>
  <ion-page class="camera-page-transparent">
    <ion-header id="CameraHeader">
      <ion-toolbar>
        <ion-title class="lumo-title-center">
          <span class="header-text">LUM</span>
          <img :src="appLogo" class="header-logo" />
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="camera-content"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Android-Preview (immer) -->
      <div id="preview-wrapper" class="preview-wrapper"></div>

      <!-- Raster-Grid -->
      <div class="camera-grid">
        <div class="vline left"></div>
        <div class="vline right"></div>
      </div>

      <!-- Controls & abgedunkelter Hintergrund -->
      <div class="camera-controls">
        <div class="controls-bg"></div>

        <div class="camera-slot">
          <img v-if="lastPhoto" :src="lastPhoto" class="camera-thumbnail" @click="goToGallery" />
        </div>

        <div class="camera-slot">
          <div class="shutter-outer">
            <button class="shutter-inner" @click="takePhoto"></button>
          </div>
        </div>

        <div class="camera-slot">
          <div class="toggle-bg">
            <ion-icon
              :icon="syncOutline"
              class="camera-toggle"
              :style="{ transform: `rotate(${toggleRotation}deg)`, transition: 'transform 0.33s cubic-bezier(.4,.2,.2,1)' }"
              @click="toggleCamera"
            />
          </div>
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
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonToast,
  onIonViewDidEnter, onIonViewWillLeave, onIonViewWillEnter,
} from '@ionic/vue';
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { syncOutline, warning } from 'ionicons/icons';

// @ts-ignore – lib liefert keine TS-Types
import loadImage from 'blueimp-load-image';

import { CameraPreview, CameraPreviewPictureOptions, CameraPreviewOptions } from '@capacitor-community/camera-preview';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { savePhoto, loadPhotos } from '@/services/photoService';
import appLogo from '@/assets/Logo.png';

// ---------- State ----------
const router          = useRouter();
const lastPhoto       = ref<string | null>(null);
const previewPosition = ref<'rear' | 'front'>('rear'); // Android
const showToast       = ref(false);
const toastMsg        = ref('');
const toggleRotation  = ref(0);

// ---------- Swipe-Gesten ----------
const touchStartX = ref(0);
const touchStartY = ref(0);

function onTouchStart(ev: TouchEvent) {
  touchStartX.value = ev.changedTouches[0].clientX;
  touchStartY.value = ev.changedTouches[0].clientY;
}

async function onTouchEnd(ev: TouchEvent) {
  const deltaX = ev.changedTouches[0].clientX - touchStartX.value;
  const deltaY = Math.abs(ev.changedTouches[0].clientY - touchStartY.value);
  if (deltaX > 60 && deltaY < 40) {
    router.push('/tabs/gallery');
    await nextTick();
    const tabBar = document.querySelector('ion-tab-bar');
    const tabBtn = tabBar?.querySelector('ion-tab-button[tab="gallery"]');
    if (tabBtn) (tabBtn as HTMLElement).click();
  }
}

// ---------- Toast ----------
function presentToast(msg: string) {
  toastMsg.value  = msg;
  showToast.value = true;
}

// ========== Preview: Android ==========
async function startNativePreview() {
  try { await (CameraPreview as any).requestPermissions?.(); } catch {}
  await nextTick();
  const opts: CameraPreviewOptions = {
    parent: 'preview-wrapper',
    toBack: true,
    position: previewPosition.value,
    enableZoom: true,
    className: 'camera-preview-native',
  };
  await CameraPreview.start(opts);
  try { await (CameraPreview as any).setTransparent({ isTransparent: true }); } catch {}
}

async function stopNativePreview() {
  try {
    await CameraPreview.stop();
    try { await (CameraPreview as any).setTransparent({ isTransparent: false }); } catch {}
  } catch {}
}

// ========== Galerie-Thumbnail ==========
async function updateLastPhoto() {
  const list = await loadPhotos();
  lastPhoto.value = list.length ? list[0].webPath : null;
}

// ========== Foto aufnehmen ==========
async function takePhoto() {
  await Haptics.impact({ style: ImpactStyle.Light });
  try {
    const picOpts: CameraPreviewPictureOptions = { quality: 80 };
    const { value: base64 } = await CameraPreview.capture(picOpts);

    // Front-Kamera horizontal spiegeln
    const base64Fixed =
      previewPosition.value === 'front' ? await fixOrientation(base64) : base64;

    await savePhoto(base64Fixed);
    await updateLastPhoto();
  } catch (err) {
    presentToast('Foto konnte nicht gespeichert werden.');
  }
}

// Spiegeln 
async function fixOrientation(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    loadImage(
      'data:image/jpeg;base64,' + base64,
      (canvas: HTMLCanvasElement | Event) => {
        if ((canvas as any).type === 'error') {
          reject('Fehler beim Drehen');
          return;
        }
        const orig = canvas as HTMLCanvasElement;
        const w = orig.width, h = orig.height;

        const flipCanvas = document.createElement('canvas');
        flipCanvas.width = w;
        flipCanvas.height = h;
        const ctx = flipCanvas.getContext('2d');
        if (!ctx) {
          resolve(orig.toDataURL('image/jpeg').split(',')[1]);
          return;
        }
        // horizontal spiegeln
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(orig, 0, 0, w, h, 0, 0, w, h);

        resolve(flipCanvas.toDataURL('image/jpeg').split(',')[1]);
      },
      { orientation: 8, canvas: true }
    );
  });
}

// ========== Kamera wechseln ==========
async function toggleCamera() {
  toggleRotation.value += 180;
  try {
    await CameraPreview.flip();
    previewPosition.value = previewPosition.value === 'rear' ? 'front' : 'rear';
  } catch {
    presentToast('Kamerawechsel fehlgeschlagen.');
  }
}

// ========== Navigation ==========
const goToGallery = () => router.push('/tabs/gallery');

// ========== Lifecycle ==========
onIonViewDidEnter(async () => {
  try {
    await startNativePreview();
  } catch (err: any) {
    const msg = err?.message ?? '';
    const benign = msg.includes('already running') || msg.includes('setTransparent') || msg.includes('not supported');
    if (!benign) {
      console.error('[NATIVE] start error', err);
      presentToast('Camera-Preview start failed');
    }
  }
});

onIonViewWillLeave(async () => {
  await stopNativePreview();
});

onIonViewWillEnter(updateLastPhoto);
</script>
