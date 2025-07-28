<template>
  <ion-modal
    css-class="photo-modal lumo-photo-modal"
    :is-open="isOpen"
    @didDismiss="close"
    backdrop-dismiss="true"
  >
    <ion-page>
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

      <ion-content v-if="photo" class="detail-content" scroll="vertical">
        <img :src="cacheBustedWebPath" class="detail-img" />
      </ion-content>

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

    <ion-alert
      :is-open="showAlert"
      header="Foto löschen?"
      message="Diese Aktion kann nicht rückgängig gemacht werden."
      css-class="custom-alert"
      :buttons="alertButtons"
      @didDismiss="showAlert = false"
    />

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
import {
  IonModal, IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonContent, IonFooter, IonIcon, IonAlert, IonToast
} from '@ionic/vue';
import {
  createOutline, trashOutline, closeCircleOutline, warning
} from 'ionicons/icons';
import { ref, computed, watch, defineProps, defineEmits } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';
import { StoredPhoto, deletePhoto } from '@/services/photoService';

// Props & Emits
const props = defineProps<{
  modelValue: boolean;
  photo: StoredPhoto | null;
}>();
const emit = defineEmits(['update:modelValue', 'deleted', 'edited']);

// State & Computed
const isOpen      = ref(props.modelValue);
const showAlert   = ref(false);
const showToast   = ref(false);
const toastMsg    = ref('');
const isAndroid   = Capacitor.getPlatform() === 'android';
const editTimestamp = ref(Date.now());
const cacheBustedWebPath = computed(() =>
  props.photo ? `${props.photo.webPath}?v=${editTimestamp.value}` : ''
);

// Zwei-Wege-Binding für Modal-Öffnung
watch(() => props.modelValue, (v) => (isOpen.value = v));
watch(isOpen, (v) => emit('update:modelValue', v));

// Modal schließen, Toast anzeigen
function close()        { isOpen.value = false; }
function presentToast(msg: string) { toastMsg.value = msg; showToast.value = true; }

// Löschen-Logik
function confirmDelete() { showAlert.value = true; }
const alertButtons = [
  { text: 'Abbrechen', role: 'cancel', cssClass: 'alert-btn-cancel' },
  {
    text: 'Löschen', role: 'destructive', cssClass: 'alert-btn-delete',
    handler: async () => {
      if (!props.photo) return;
      try {
        await deletePhoto(props.photo.fileName);
        emit('deleted');
        close();
      } catch {
        presentToast('Löschen fehlgeschlagen.');
      }
    }
  }
];

// Android-Bearbeitung
async function editPhoto() {
  if (!isAndroid || !props.photo) return;
  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path: getNativePhotoPath(props.photo.fileName),
    });
    await PhotoEditor.editPhoto({ path: uri });
    editTimestamp.value = Date.now();
    emit('edited', props.photo);
  } catch (e: any) {
    if (e?.message?.toLowerCase().includes('cancel')) return;
    console.error('editPhoto failed', e);
    presentToast(`Bearbeiten fehlgeschlagen:\n${e.message || e}`);
  }
}

// Native-Path Helper
function getNativePhotoPath(fileName: string) {
  return fileName.startsWith('public/') ? fileName : `public/${fileName}`;
}
</script>
