<template>
  <ion-page>
    <!-- Header -->
    <ion-header id="GalleryHeader">
      <ion-toolbar>
        <!-- Menü -->
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

    <!-- Menü‑Popover -->
    <ion-popover
      css-class="custom-popover"
      :is-open="showMenu"
      @didDismiss="showMenu = false"
    >
      <ion-list>
        <ion-item button @click="activateSelect" >
          <ion-icon slot="start" :icon="checkboxOutline" class="icon-select" />
          <ion-label>Auswählen</ion-label>
        </ion-item>

        <ion-item button @click="triggerUpload" >
          <ion-icon slot="start" :icon="cloudUploadOutline" class="icon-upload" />
          <ion-label>Upload</ion-label>
        </ion-item>
      </ion-list>
    </ion-popover>

    <!-- Verstecktes File‑Input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png"
      hidden
      @change="handleUpload"
    />

    <ion-content :fullscreen="true">
      <!-- Pull‑to‑Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="doRefresh">
        <ion-refresher-content
          class="lum-refresher"
          pulling-icon="crescent"
          refreshing-spinner="crescent"
        />
      </ion-refresher>

      <!-- Lade‑Spinner -->
      <div v-if="loading" class="lumo-empty-gallery">
        <ion-spinner name="crescent" />
      </div>

      <!-- Empty‑State -->
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
                <ion-img :src="p.webPath" />
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

      <!-- Aktions‑Buttons im Auswahlmodus -->
      <div v-if="showSelect" class="select-action-bar">
    
        <ion-button
          class="action-btn cancel-btn"
          color="medium"
          @click="cancelSelect"
        >
          <ion-icon slot="start" :icon="close" />
          Abbrechen
        </ion-button>

        <ion-button
          class="action-btn delete-btn"
          color="danger"
          :disabled="!selected.size"
          @click="deleteSelected"
        >
          <ion-icon slot="start" :icon="trash" />
          Löschen
        </ion-button>
      </div>

      <!-- Detail‑Modal -->
      <PhotoDetailModal
        v-model="showModal"
        :photo="activePhoto"
        @deleted="refresh"
        @edited="refresh"
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
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonButtons,
  IonButton,
  onIonViewWillEnter,
  IonToast,
} from '@ionic/vue';

import {
  addOutline,
  menuOutline,
  close,
  trash,
  checkboxOutline,
  cloudUploadOutline,
  warning
} from 'ionicons/icons';

import { useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import { loadPhotos, StoredPhoto, deletePhoto, savePhoto } from '@/services/photoService';
import PhotoDetailModal from '@/components/PhotoDetailModal.vue';
import appLogo from '@/assets/Logo.png';

// @ts-ignore
import * as ExifReader from 'exifreader';

/* -------------------- State -------------------- */
const photos      = ref<StoredPhoto[]>([]);
const loading     = ref(true);
const showModal   = ref(false);
const activePhoto = ref<StoredPhoto | null>(null);

/* Menü & Auswahl */
const showMenu   = ref(false);
const showSelect = ref(false);
const selected   = ref<Set<string>>(new Set());

/* Upload */
const fileInput = ref<HTMLInputElement | null>(null);

const router = useRouter();

/* -------------------- Daten laden -------------------- */
async function refresh() {
  loading.value = true;
  photos.value  = await loadPhotos();
  loading.value = false;
}
onIonViewWillEnter(refresh);

async function doRefresh(ev: CustomEvent) {
  await refresh();
  (ev.target as HTMLIonRefresherElement).complete();
}

/* -------------------- Gruppierung -------------------- */
const groupedPhotos = computed(() => {
  const map = new Map<string, StoredPhoto[]>();
  for (const p of photos.value) {
    const key = new Date(p.date).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
    (map.get(key) || map.set(key, []).get(key)!).push(p);
  }
  return Array.from(map.entries());
});

/* -------------------- Menü‑Aktionen -------------------- */

const showToast = ref(false);
const toastMsg  = ref('');

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

function triggerUpload() {
  showMenu.value = false;
  fileInput.value?.click();
}

function cancelSelect() {
  showSelect.value = false;
  selected.value.clear();
}

/* Upload‑Handler */
async function handleUpload(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const mimeType = file.type as 'image/jpeg' | 'image/png';

  const arrayBuf = await file.arrayBuffer();
  const tags = ExifReader.load(arrayBuf);
  const dateTag = tags['DateTimeOriginal'] ?? tags['DateTime'];
  const iso = dateTag
    ? new Date(dateTag.description.replace(/:/g, '-')).toISOString()
    : undefined;

  const b64 = await fileToBase64(file);
  await savePhoto(b64, iso, mimeType);
  await refresh();
  (ev.target as HTMLInputElement).value = '';
}

/* Auswahl‑Toggle */
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

/* -------------------- Hilfsfunktionen -------------------- */

const goToCamera = () => router.push('/tabs/camera');
function openPhoto(photo: StoredPhoto) {
  activePhoto.value = photo;
  showModal.value   = true;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
</script>
