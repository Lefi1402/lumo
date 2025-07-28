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

    <!-- Bearbeiten: Ersetzen oder als neues Foto? -->
    <ion-alert
      :is-open="showEditChoice"
      header="Bearbeitetes Foto speichern"
      message="Möchtest du das Original ersetzen oder als neues Foto speichern?"
      css-class="custom-alert"
      :buttons="editChoiceButtons"
      @didDismiss="showEditChoice = false"
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
const showEditChoice = ref(false);
let editedResult: { path: string } | null = null;

// Cache-Buster
const cacheBust = ref(0);
const cacheBustedWebPath = computed(() =>
  props.photo ? `${props.photo.webPath}?v=${cacheBust.value}` : ''
);

watch(() => props.modelValue, v => isOpen.value = v);
watch(isOpen, v => emit('update:modelValue', v));

// Helper
function close() { isOpen.value = false; }
function presentToast(msg: string) { toastMsg.value = msg; showToast.value = true; }

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

// Bearbeiten mit Auswahl
async function editPhoto() {
  if (!isAndroid || !props.photo) return;
  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path: getNativePhotoPath(props.photo.fileName),
    });

    const result = await PhotoEditor.editPhoto({ path: uri }) as { path: string } | undefined;
    if (!result || typeof result.path !== 'string' || !result.path) return;

    editedResult = result;
    showEditChoice.value = true;
  } catch (e: any) {
    if (e && e.message && e.message.toLowerCase().includes('cancel')) return;
    console.error('editPhoto failed', e);
    presentToast(`Bearbeiten fehlgeschlagen:\n${e.message || e}`);
  }
}

// Buttons für Alert nach Bearbeitung
const editChoiceButtons = [
  {
    text: 'Ersetzen',
    role: 'destructive',
    handler: async () => {
      if (!props.photo || !editedResult) return;
      props.photo.webPath  = Capacitor.convertFileSrc(editedResult.path);
      props.photo.fileName = basename(editedResult.path);
      cacheBust.value++; // Triggert Bild-Neuladen
      emit('edited');
      editedResult = null;
    }
  },
  {
    text: 'Als neues Foto',
    role: 'cancel',
    handler: async () => {
      if (!editedResult) return;
      try {
        const file = await Filesystem.readFile({
          path: editedResult.path,
          directory: Directory.Data
        });
        let base64: string;
        if (typeof file.data === 'string') {
          base64 = file.data;
        } else {
          base64 = await blobToBase64(file.data);
        }
        await savePhoto(base64);
        emit('edited');
      } catch (e: any) {
        presentToast('Speichern als neues Foto fehlgeschlagen.');
      }
      editedResult = null;
    }
  },
  {
    text: 'Abbrechen',
    role: 'cancel',
    cssClass: 'alert-btn-cancel',
    handler: () => { editedResult = null; }
  }
];

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

// BLUR beim Öffnen des Modals
watch(isOpen, (opened) => {
  if (opened) {
    document.body.classList.add('modal-blur');
  } else {
    document.body.classList.remove('modal-blur');
  }
});
</script>
