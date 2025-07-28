<template>
  <ion-modal
    css-class="photo-modal lumo-photo-modal"
    :is-open="isOpen"
    @didDismiss="close"
    backdrop-dismiss="true"
  >
    <ion-page>
      <!-- Header -->
      <ion-header id="ModalHeader">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button class="close-btn" @click="close">
              <ion-icon :icon="closeCircleOutline" class="modal-close-icon" />
            </ion-button>
          </ion-buttons>
          <ion-title class="lumo-title-center" />
        </ion-toolbar>
      </ion-header>

      <!-- Bild -->
      <ion-content v-if="photo" class="detail-content" scroll="vertical">
        <img :src="cacheBustedWebPath" class="detail-img" />
      </ion-content>

      <!-- Footer -->
      <ion-footer v-if="photo">
        <ion-toolbar class="modal-footer" mode="md">
          <ion-buttons class="modal-btn-group">
            <ion-button v-if="isAndroid" fill="clear" @click="editPhoto">
              <ion-icon slot="start" :icon="createOutline" />
              Bearbeiten
            </ion-button>
            <ion-button color="danger" fill="clear" @click="confirmDelete">
              <ion-icon slot="start" :icon="trashOutline" />
              Löschen
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-page>

    <!-- Lösch‑Bestätigung -->
    <ion-alert
      :is-open="showAlert"
      header="Foto löschen?"
      message="Diese Aktion kann nicht rückgängig gemacht werden."
      css-class="custom-alert"
      :buttons="alertButtons"
      @didDismiss="showAlert = false"
    />

    <!-- Toast -->
    <ion-toast
      css-class="lum-toast"
      :icon="warning"
      position="top"
      position-anchor="ModalHeader"
      :is-open="showToast"
      :message="toastMsg"
      duration="2500"
      @didDismiss="showToast = false"
    />
  </ion-modal>
</template>

<script setup lang="ts">
// Ionic & Icons
import {
  IonModal,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonAlert,
  IonToast,
} from '@ionic/vue';
import {
  createOutline,
  trashOutline,
  closeCircleOutline,
  warning,
} from 'ionicons/icons';

import { ref, computed, watch, defineProps, defineEmits } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';
// @ts-ignore
import { basename } from 'path-browserify';
import { StoredPhoto, deletePhoto, savePhoto } from '@/services/photoService';

// Props & Emits
const props = defineProps<{
  modelValue: boolean;
  photo: StoredPhoto | null;
}>();
const emit = defineEmits(['update:modelValue', 'deleted', 'edited']);

// State
const isOpen        = ref(props.modelValue);
const showAlert     = ref(false);
const showToast     = ref(false);
const toastMsg      = ref('');
const isAndroid     = Capacitor.getPlatform() === 'android';

// Cache-Buster für korrektes Nachladen nach Editieren
const cacheBust = ref(0);
const cacheBustedWebPath = computed(() =>
  props.photo ? `${props.photo.webPath}?v=${cacheBust.value}` : ''
);

// Zwei‑Wege Binding für Modal (open <-> modelValue)
watch(() => props.modelValue, v => isOpen.value = v);
watch(isOpen, v => emit('update:modelValue', v));

// Helper-Funktionen
function close() { isOpen.value = false; }
function presentToast(msg: string) { toastMsg.value = msg; showToast.value = true; }

// Delete
function confirmDelete() { showAlert.value = true; }
const alertButtons = [
  { text: 'Abbrechen', role: 'cancel', cssClass: 'alert-btn-cancel' },
  {
    text: 'Löschen',
    role: 'destructive',
    cssClass: 'alert-btn-delete',
    handler: async () => {
      if (!props.photo) return;
      try {
        await deletePhoto(props.photo.fileName);
        emit('deleted');
        close();
      } catch {
        presentToast('Löschen fehlgeschlagen.');
      }
    },
  },
];

// Bild bearbeiten (nur Android, ersetzt automatisch das aktuelle Bild)
async function editPhoto() {
  if (!isAndroid || !props.photo) return;
  try {
    const oldFileName = props.photo.fileName;
    // Hole Pfad für Editor
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path: getNativePhotoPath(oldFileName),
    });

    // Editor öffnen
    const result = await PhotoEditor.editPhoto({ path: uri }) as { path: string } | undefined;
    if (!result?.path) return;

    // Einlesen des neuen Bildes
    const file = await Filesystem.readFile({
      path: result.path,
      directory: Directory.Data
    });
    const base64 = typeof file.data === 'string'
      ? file.data
      : await blobToBase64(file.data);

    // Altes Foto löschen
    await Filesystem.deleteFile({
      path: getNativePhotoPath(oldFileName),
      directory: Directory.Data
    });

    // Neues Foto speichern (liefert neues Objekt)
    const newPhoto = await savePhoto(base64);

    // Übergib das neue Objekt per Emit, damit der Parent aktualisiert
    emit('edited', newPhoto);

  } catch (e: any) {
    if (e?.message?.toLowerCase().includes('cancel')) return;
    console.error('editPhoto failed', e);
    presentToast(`Bearbeiten fehlgeschlagen:\n${e.message || e}`);
  }
}

// Hilfsfunktionen
function getNativePhotoPath(fileName: string) {
  return fileName.startsWith('public/') ? fileName : `public/${fileName}`;
}
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

</script>
