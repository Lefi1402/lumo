<template>
  <ion-page>
    <!-- Header -->
    <ion-header id="GalleryHeader">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="showMenu = true">
            <ion-icon :icon="menuOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title class="lumo-title-center">
          <span class="header-text">LUM</span>
          <img :src="appLogo" class="header-logo" />
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Menü-Popover -->
    <ion-popover
      css-class="custom-popover"
      :is-open="showMenu"
      @didDismiss="showMenu = false"
    >
      <ion-list>
        <ion-item button @click="activateSelect">
          <ion-icon slot="start" :icon="checkboxOutline" class="icon-select" />
          <ion-label>Auswählen</ion-label>
        </ion-item>
        <!-- NEU: nativer Import -->
        <ion-item button @click="importFromDevice">
          <ion-icon slot="start" :icon="cloudUploadOutline" class="icon-upload" />
          <ion-label>Importieren</ion-label>
        </ion-item>
      </ion-list>
    </ion-popover>

    <ion-content
      :fullscreen="true"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Pull-to-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content
          class="lum-refresher"
          pulling-icon="crescent"
          refreshing-spinner="crescent"
        />
      </ion-refresher>

      <!-- Lade-Spinner -->
      <div v-if="loading" class="lumo-empty-gallery">
        <ion-spinner name="crescent" />
      </div>

      <!-- Empty-State -->
      <div v-else-if="photos.length === 0" class="lumo-empty-gallery">
        <ion-fab vertical="center" horizontal="center" slot="fixed">
          <ion-fab-button class="fab-white" @click="goToCamera">
            <ion-icon :icon="addOutline" />
          </ion-fab-button>
        </ion-fab>
        <p class="lumo-empty-text">Noch keine Bilder<br />hinzugefügt</p>
      </div>

      <!-- Galerie -->
      <div v-else>
        <div v-for="([month, list]) in groupedPhotos" :key="month" class="month-block">
          <h4 class="month-header">{{ month }}</h4>
          <ion-grid>
            <ion-row>
              <ion-col
                v-for="p in list"
                :key="p.fileName"
                size="4"
                class="p-0 thumb-box"
                @click="showSelect ? toggleSel(p) : openPhoto(p)"
              >
                <template v-if="loadingImages.has(p.fileName)">
                  <div class="skeleton-img"></div>
                </template>
                <template v-else>
                  <ion-img :src="p.webPath + '?v=' + (imageUpdateMap.get(p.fileName) || '0')" />
                </template>
                <ion-checkbox
                  v-if="showSelect"
                  :checked="selected.has(p.fileName)"
                  class="select-box"
                />
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>
      </div>

      <!-- Aktions-Buttons im Auswahlmodus -->
      <div v-if="showSelect" class="select-action-bar">
        <ion-button
          class="action-btn cancel-btn"
          color="medium"
          @click="cancelSelect"
          title="Abbrechen"
          shape="round"
        >
          <ion-icon :icon="close" slot="start" />
          Abbrechen
        </ion-button>
        <ion-button
          class="action-btn delete-btn"
          color="danger"
          :disabled="!selected.size"
          @click="deleteSelected"
          title="Löschen"
          shape="round"
        >
          <ion-icon :icon="trash" slot="start" />
          Löschen
        </ion-button>
      </div>

      <!-- Detail-Modal -->
      <PhotoDetailModal
        v-model="showModal"
        :photo="activePhoto"
        @deleted="refresh"
        @edited="onEdited"
      />
    </ion-content>

    <!-- Toast -->
    <ion-toast
      css-class="lum-toast"
      position="top"
      position-anchor="GalleryHeader"
      :is-open="showToast"
      :message="toastMsg"
      :icon="warning"
      duration="2500"
      @didDismiss="showToast = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonImg, IonFab, IonFabButton, IonIcon,
  IonSpinner, IonRefresher, IonRefresherContent, IonPopover, IonList,
  IonItem, IonLabel, IonCheckbox, IonButtons, IonButton, IonToast,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline, menuOutline, close, trash, checkboxOutline,
  cloudUploadOutline, warning
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { ref, computed, nextTick } from 'vue';
import { loadPhotos, StoredPhoto, deletePhoto, savePhoto } from '@/services/photoService';
import PhotoDetailModal from '@/components/PhotoDetailModal.vue';
import appLogo from '@/assets/Logo.png';
import { Camera, CameraResultType, CameraSource, GalleryPhoto } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';


// ---------- State ----------
const photos         = ref<StoredPhoto[]>([]);
const loading        = ref(true);
const showMenu       = ref(false);
const showSelect     = ref(false);
const selected       = ref<Set<string>>(new Set());
const showModal      = ref(false);
const activePhoto    = ref<StoredPhoto | null>(null);
const loadingImages  = ref<Set<string>>(new Set());
const imageUpdateMap = ref(new Map<string, number>());
const showToast      = ref(false);
const toastMsg       = ref('');
const router         = useRouter();

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
  if (deltaX < -60 && deltaY < 40) {
    router.push('/tabs/camera');
    await nextTick();
    const tabBar = document.querySelector('ion-tab-bar');
    const tabBtn = tabBar?.querySelector('ion-tab-button[tab="camera"]');
    if (tabBtn) (tabBtn as HTMLElement).click();
  }
}


// ---------- Lifecycle ----------
onIonViewWillEnter(refresh);

async function refresh() {
  loading.value = true;
  photos.value  = await loadPhotos();
  loading.value = false;
  loadingImages.value.clear();
}

async function doRefresh(ev: CustomEvent) {
  await refresh();
  (ev.target as HTMLIonRefresherElement).complete();
}

// ---------- Gruppierung nach Monat ----------
const groupedPhotos = computed(() => {
  const map = new Map<string, StoredPhoto[]>();
  for (const p of photos.value) {
    const key = new Date(p.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    (map.get(key) || map.set(key, []).get(key)!).push(p);
  }
  return Array.from(map.entries());
});

// ---------- Menü & Auswahl ----------
function activateSelect() {
  showMenu.value = false;
  if (photos.value.length === 0) {
    toastMsg.value  = 'Keine Bilder zum Auswählen vorhanden.';
    showToast.value = true;
    return;
  }
  showSelect.value = true;
  selected.value.clear();
}

function cancelSelect() {
  showSelect.value = false;
  selected.value.clear();
}


// ---------- Import  ----------
async function importFromDevice() {
  showMenu.value = false;
  try {
    const res = await Camera.pickImages({ quality: 85, limit: 20 });
    let imported = 0;

    for (const p of res.photos) {
      try {
        const base64 = await getBase64(p.path ?? p.webPath);
        const mime   = (p.format?.toLowerCase() === 'png') ? 'image/png' : 'image/jpeg';
        await savePhoto(base64, undefined, mime);
        imported++;
      } catch {/* einzelnes Bild überspringen */}
    }
    if (imported > 0) {
      await refresh();
      return;
    }
    const ph = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Base64,
      quality: 85,
      correctOrientation: true,
    });
    if (ph.base64String) {
      await savePhoto(ph.base64String, undefined, 'image/jpeg');
      await refresh();
      return;
    }
    toastMsg.value = 'Keine Bilder importiert.';
    showToast.value = true;
  } catch {
    toastMsg.value = 'Import abgebrochen oder fehlgeschlagen.';
    showToast.value = true;
  }
}

// ---------- Hilfsfunktion ----------
async function getBase64(uri?: string | null): Promise<string> {
  if (!uri) throw new Error('Kein URI verfügbar');
  try {
    const file = await Filesystem.readFile({ path: uri });
    if (typeof file.data === 'string') return file.data; 
  } catch {/* weiter zu B */ }
  const url  = Capacitor.convertFileSrc(uri);
  const resp = await fetch(url);
  const blob = await resp.blob();

  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ---------- Auswahl & Löschen ----------
function toggleSel(p: StoredPhoto) {
  selected.value.has(p.fileName)
    ? selected.value.delete(p.fileName)
    : selected.value.add(p.fileName);
}

async function deleteSelected() {
  for (const name of selected.value) {
    await deletePhoto(name);
  }
  await refresh();
  showSelect.value = false;
}

// ---------- Detail-Modal Handling ----------
const goToCamera = () => router.push('/tabs/camera');

function openPhoto(photo: StoredPhoto) {
  activePhoto.value = photo;
  showModal.value   = true;
}

async function onEdited(editedPhoto: StoredPhoto) {
  imageUpdateMap.value.set(editedPhoto.fileName, Date.now());
}
</script>
