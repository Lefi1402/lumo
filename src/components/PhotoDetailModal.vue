<template>
  <ion-modal css-class="photo-modal"  :is-open="isOpen" @didDismiss="close">
    <ion-page>
      <!-- Header -->
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="close">
              <ion-icon class="modal-close-icon" :icon="closeCircleOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title class="lumo-title-center"></ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Bild -->
      <ion-content
        v-if="photo"
        class="detail-content"
        scroll="vertical"
      >
  <img :src="photo.webPath" class="detail-img" />
</ion-content>

      <!-- Footer (Buttons zentriert) -->
      <ion-footer v-if="photo">
        <ion-toolbar class="modal-footer" mode="md">
          <ion-buttons class="modal-btn-group">
            <ion-button
              v-if="isAndroid"
              fill="clear"
              @click="editPhoto"
            >
              <ion-icon slot="start" :icon="createOutline" />
              Bearbeiten
            </ion-button>

            <ion-button
              color="danger"
              fill="clear"
              @click="confirmDelete"
            >
              <ion-icon slot="start" :icon="trashOutline" />
              Löschen
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    </ion-page>

    <!-- Confirm‑Alert -->
    <ion-alert
      :is-open="showAlert"
      header="Foto löschen?"
      message="Diese Aktion kann nicht rückgängig gemacht werden."
      css-class="custom-alert"
      :buttons="alertButtons"
      @didDismiss="showAlert = false"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonAlert,
} from '@ionic/vue';
import {
  createOutline,
  trashOutline,
  closeCircleOutline,
} from 'ionicons/icons';

import { ref, watch, defineProps, defineEmits } from 'vue';
import { Capacitor } from '@capacitor/core';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';

import { StoredPhoto, deletePhoto } from '@/services/photoService';

const props = defineProps<{
  modelValue: boolean;
  photo: StoredPhoto | null;
}>();
const emit = defineEmits(['update:modelValue', 'deleted', 'edited']);

const isOpen    = ref(props.modelValue);
const showAlert = ref(false);
const isAndroid = Capacitor.getPlatform() === 'android';

watch(() => props.modelValue, v => (isOpen.value = v));
watch(isOpen, v => emit('update:modelValue', v));

function close() {
  isOpen.value = false;
}

/* Bearbeiten (nur Android) */
async function editPhoto() {
  if (!isAndroid || !props.photo) return;
  try {
    const editor = PhotoEditor as any;
    const { path } = await editor.edit({ path: props.photo.webPath });
    if (path) {
      props.photo.webPath = path;
      emit('edited');
    }
  } catch (e) {
    console.error('Edit failed:', e);
  }
}

function confirmDelete() {
  showAlert.value = true;
}

/* Alert‑Buttons inkl. tatsächlichem Delete‑Handler 🔎 */
const alertButtons = [
  {
    text: 'Abbrechen',
    role: 'cancel',
    cssClass: 'alert-btn-cancel',
  },
  {
    text: 'Löschen',
    role: 'destructive',
    cssClass: 'alert-btn-delete',
    handler: async () => {
      if (!props.photo) return;
      await deletePhoto(props.photo.fileName);
      emit('deleted');    // Galerie neu laden
      close();
    },
  },
];
</script>
