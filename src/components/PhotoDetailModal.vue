<template>
  <ion-modal css-class="photo-modal" :is-open="isOpen" @didDismiss="close">
    <ion-page>
      <!-- Header -->
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button class="close-btn" @click="close">
              <ion-icon class="modal-close-icon" :icon="closeCircleOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title class="lumo-title-center"></ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Bild -->
      <ion-content v-if="photo" class="detail-content" scroll="vertical">
        <img :src="photo.webPath" class="detail-img" />
      </ion-content>

      <!-- Footer: Buttons zentriert -->
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

    <!-- Toast -->
    <ion-toast
      css-class="lum-toast"   
      :is-open="showToast"
      :message="toastMsg"
      :color="toastColor"
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
} from 'ionicons/icons';

/* Capacitor & Plugins */
import { Capacitor } from '@capacitor/core';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';

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

/* Local State */
const isOpen     = ref(props.modelValue);
const showAlert  = ref(false);
const isAndroid  = Capacitor.getPlatform() === 'android';

/* Toast‑State */
type ToastColor = 'danger' | 'warning' | 'success' | 'light';

const showToast  = ref(false);
const toastMsg   = ref('');
const toastColor = ref<ToastColor>('danger');

function presentToast(
  msg: string,
  color: ToastColor = 'danger'
) {
  toastMsg.value   = msg;
  toastColor.value = color;
  showToast.value  = true;
}

/* Reactivity */
watch(() => props.modelValue, v => (isOpen.value = v));
watch(isOpen, v => emit('update:modelValue', v));

/* Helpers */
function close() {
  isOpen.value = false;
}

/* Foto bearbeiten (nur Android) */
async function editPhoto() {
  if (!isAndroid || !props.photo) return;

  try {
    await (PhotoEditor as any).requestPermissions();
    const { path } = await (PhotoEditor as any).edit({
      path: props.photo.webPath,
    });

    if (path) {
      props.photo.webPath = path;
      emit('edited');
    }
  } catch (e) {
    presentToast('Bearbeiten abgebrochen oder fehlgeschlagen.', 'warning');
  }
}

/* Löschen‑Alert */
function confirmDelete() {
  showAlert.value = true;
}

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
