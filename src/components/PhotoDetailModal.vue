<template>
  <ion-modal :is-open="isOpen" @didDismiss="close">
    <ion-page>
      <!-- Header -->
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="close">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title class="lumo-title-center">Foto</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Bild (guarded, falls photo==null) -->
      <ion-content v-if="photo" scroll="vertical">
        <img :src="photo.webPath" class="detail-img" />
      </ion-content>

      <!-- Footer -->
      <ion-footer v-if="photo">
        <ion-toolbar>
          <!-- Bearbeiten nur Android -->
          <ion-buttons slot="start" v-if="isAndroid">
            <ion-button fill="clear" @click="editPhoto">
              <ion-icon :icon="createOutline" />
              Bearbeiten
            </ion-button>
          </ion-buttons>

          <!-- Löschen -->
          <ion-buttons slot="end">
            <ion-button color="danger" fill="clear" @click="confirmDelete">
              <ion-icon :icon="trashOutline" />
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
      :buttons="alertButtons"
      @didDismiss="showAlert = false"
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
} from '@ionic/vue';
/* Icons */
import {
  createOutline,
  trashOutline,
  closeOutline,
} from 'ionicons/icons';
/* Vue helpers */
import { ref, watch, defineProps, defineEmits } from 'vue';
/* Capacitor */
import { Capacitor } from '@capacitor/core';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';
/* Service */
import { StoredPhoto, deletePhoto } from '@/services/photoService';

/* Props & Events */
const props = defineProps<{
  modelValue: boolean;
  photo: StoredPhoto | null;
}>();
const emit = defineEmits(['update:modelValue', 'deleted', 'edited']);

/* Local state */
const isOpen    = ref(props.modelValue);
const showAlert = ref(false);
const isAndroid = Capacitor.getPlatform() === 'android';

watch(() => props.modelValue, v => (isOpen.value = v));
watch(isOpen, v => emit('update:modelValue', v));

/* Helpers */
function close() {
  isOpen.value = false;
}

async function editPhoto() {
  if (!isAndroid || !props.photo) return;

  try {
    // TypeScript‑Workaround: cast as any, sonst .edit nicht bekannt
    const editor = PhotoEditor as any;
    const { path } = await editor.edit({
      path: props.photo.webPath,
    });

    if (path) {
      props.photo.webPath = path;  // Modal aktualisieren
      emit('edited');              // Galerie refreshen
    }
  } catch (e) {
    console.error('Edit failed:', e);
  }
}

function confirmDelete() {
  showAlert.value = true;
}

const alertButtons = [
  { text: 'Abbrechen', role: 'cancel' },
  {
    text: 'Löschen',
    role: 'destructive',
    handler: async () => {
      if (!props.photo) return;
      await deletePhoto(props.photo.fileName);
      emit('deleted');
      close();
    },
  },
];
</script>

<style scoped>
.detail-img {
  width: 100%;
  height: auto;
}
</style>
