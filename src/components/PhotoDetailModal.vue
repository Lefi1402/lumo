<template>
  <ion-modal css-class="photo-modal" :is-open="isOpen" @didDismiss="close">
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
        <img :src="photo.webPath" class="detail-img" />
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

    <!-- Löschen‑Bestätigung -->
    <ion-alert
      :is-open="showAlert"
      header="Foto löschen?"
      message="Diese Aktion kann nicht rückgängig gemacht werden."
      css-class="custom-alert"
      :buttons="alertButtons"
      @didDismiss="showAlert = false"
    />

    <!-- Toast (einheitlicher LUMO‑Stil) -->
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
/* Ionic */
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
  IonToast,
} from '@ionic/vue';

/* Icons */
import {
  createOutline,
  trashOutline,
  closeCircleOutline,
  warning,
} from 'ionicons/icons';

/* Capacitor & Plugins */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';

/* Hilfs‑Lib */
// @ts-ignore
import { basename } from 'path-browserify';

/* Vue */
import { ref, watch, defineProps, defineEmits } from 'vue';

/* Services */
import { StoredPhoto, deletePhoto } from '@/services/photoService';

/* Props & Events */
const props = defineProps<{
  modelValue: boolean;
  photo: StoredPhoto | null;
}>();
const emit = defineEmits(['update:modelValue', 'deleted', 'edited']);

/* State */
const isOpen    = ref(props.modelValue);
const showAlert = ref(false);
const isAndroid = Capacitor.getPlatform() === 'android';

/* Toast */
const showToast = ref(false);
const toastMsg  = ref('');
function presentToast(msg: string) {
  toastMsg.value  = msg;
  showToast.value = true;
}

/* Reaktivität */
watch(() => props.modelValue, v => (isOpen.value = v));
watch(isOpen, v => emit('update:modelValue', v));

/* Helpers */
function close() {
  isOpen.value = false;
}

/* ---------- EDIT PHOTO (neu) ----------------------------------------- */
async function editPhoto() {
  if (!isAndroid || !props.photo) return;
  try {
    await (PhotoEditor as any).requestPermissions();

    /* 1. Echten Datei‑Pfad innerhalb von Directory.Data holen */
    const { uri } = await Filesystem.getUri({
      path: props.photo.fileName,
      directory: Directory.Data,
    });

    /* 2. Editor starten */
    const { path } = await (PhotoEditor as any).edit({ path: uri });

    /* 3. Ergebnis sichern + UI aktualisieren */
    if (path) {
      props.photo.webPath  = Capacitor.convertFileSrc(path);
      props.photo.fileName = basename(path);
      emit('edited');
    }
  } catch {
    presentToast('Bearbeiten fehlgeschlagen.');
  }
}

/* Delete -------------------------------------------------------------- */
function confirmDelete() {
  showAlert.value = true;
}

/* Alert‑Buttons */
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
</script>
