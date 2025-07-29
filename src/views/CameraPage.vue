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
      <!-- Android-Preview (NUR DIESER DIV für Native) -->
      <div v-if="isAndroid" id="preview-wrapper" class="preview-wrapper"></div>
      <!-- Web-Preview -->
      <video v-else ref="videoRef" autoplay playsinline class="camera-preview" />
      <canvas v-if="isWeb" ref="canvasRef" style="display:none" />

      <!-- RASTER-GRID (immer über Preview, nie über Controls, nicht full fixed!) -->
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
import { syncOutline, warning } from 'ionicons/icons';
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
// @ts-ignore
import loadImage from 'blueimp-load-image';
import { Capacitor } from '@capacitor/core';
import { CameraPreview, CameraPreviewPictureOptions, CameraPreviewOptions } from '@capacitor-community/camera-preview';
import { savePhoto, loadPhotos } from '@/services/photoService';
import appLogo from '@/assets/Logo.png';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// ---------- Plattform-Flags ----------
const isWeb     = Capacitor.getPlatform() === 'web';
const isAndroid = Capacitor.getPlatform() === 'android';

// ---------- State ----------
const router         = useRouter();
const videoRef       = ref<HTMLVideoElement | null>(null);
const canvasRef      = ref<HTMLCanvasElement | null>(null);
const stream         = ref<MediaStream | null>(null);
const lastPhoto      = ref<string | null>(null);
const facingMode     = ref<'user' | 'environment'>('environment'); // Web
const previewPosition= ref<'rear' | 'front'>('rear');              // Android
const showToast      = ref(false);
const toastMsg       = ref('');
const toggleRotation = ref(0);

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
  await (CameraPreview as any).setTransparent({ isTransparent: true });
}
async function stopNativePreview() {
  try {
    await CameraPreview.stop();
    await (CameraPreview as any).setTransparent({ isTransparent: false });
  } catch { /* Ignore if not running */ }
}

// ========== Preview: Web ==========
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

// ========== Galerie-Thumbnail ==========
async function updateLastPhoto() {
  const list = await loadPhotos();
  lastPhoto.value = list.length > 0 ? list[0].webPath : null;
}

// ========== Foto aufnehmen ==========
async function takePhoto() {
  await Haptics.impact({ style: ImpactStyle.Light });
  if (isWeb) {
    // (Web-Code)
    return;
  }
  try {
    const picOpts: CameraPreviewPictureOptions = { quality: 80 };
    const { value: base64 } = await CameraPreview.capture(picOpts);
    let base64Fixed = base64;
    if (previewPosition.value === 'front') {
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
          const orig = canvas as HTMLCanvasElement;
          const w = orig.width;
          const h = orig.height;
          const ctx = orig.getContext('2d');
          if (ctx) {
            const flipCanvas = document.createElement('canvas');
            flipCanvas.width = w;
            flipCanvas.height = h;
            const flipCtx = flipCanvas.getContext('2d');
            if (flipCtx) {
              flipCtx.translate(w, 0); 
              flipCtx.scale(-1, 1);   
              flipCtx.drawImage(orig, 0, 0, w, h, 0, 0, w, h);
              resolve(flipCanvas.toDataURL('image/jpeg').split(',')[1]);
              return;
            }
          }
          resolve(orig.toDataURL('image/jpeg').split(',')[1]);
        }
      },
      { orientation: 8, canvas: true }
    );
  });
}

// ========== Kamera wechseln ==========

async function toggleCamera() {
  toggleRotation.value += 180;
  if (isWeb) {
    facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
    try {
      await startWebCamera();
    } catch {
      presentToast('Kamerawechsel fehlgeschlagen.');
    }
  } else {
    try {
      await CameraPreview.flip();
      previewPosition.value = previewPosition.value === 'rear' ? 'front' : 'rear';
    } catch {
      presentToast('Kamerawechsel fehlgeschlagen.');
    }
  }
}

// ========== Navigation ==========
const goToGallery = () => router.push('/tabs/gallery');

// ========== Lifecycle ==========
onIonViewDidEnter(async () => {
  try {
    if (isWeb)      await startWebCamera();
    else            await startNativePreview();
  } catch (err: any) {
    const msg = err?.message ?? '';
    const benign = msg.includes('already running') || msg.includes('setTransparent') || msg.includes('not supported');
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
