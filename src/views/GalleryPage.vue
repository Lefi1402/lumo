<template>
  <ion-page>
    <!-- Header -->
    <ion-header>
      <ion-toolbar>
        <ion-title class="lumo-title-center">LUMO</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
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
        <p class="lumo-empty-text">
          Noch keine Bilder<br />hinzugefügt
        </p>
      </div>

      <!-- Galerie mit Monats‑Headern -->
      <div v-else>
        <div
          v-for="([month, list]) in groupedPhotos"
          :key="month"
          class="month-block"
        >
          <h4 class="month-header">{{ month }}</h4>

          <ion-grid>
            <ion-row>
              <ion-col
                v-for="p in list"
                :key="p.fileName"
                size="4"
                class="p-0"
                @click="openPhoto(p)"
              >
                <ion-img :src="p.webPath" />
              </ion-col>
            </ion-row>
          </ion-grid>
        </div>
      </div>

      <!-- Detail‑Modal -->
      <PhotoDetailModal
        v-model="showModal"
        :photo="activePhoto"
        @deleted="refresh"
        @edited="refresh"
      />
    </ion-content>
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
  onIonViewWillEnter,
} from '@ionic/vue';
import { addOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import { loadPhotos, StoredPhoto } from '@/services/photoService';
import PhotoDetailModal from '@/components/PhotoDetailModal.vue';

/* State */
const photos     = ref<StoredPhoto[]>([]);
const loading    = ref(true);
const showModal  = ref(false);
const activePhoto = ref<StoredPhoto | null>(null);
const router     = useRouter();

/* Fotos laden */
async function refresh() {
  loading.value = true;
  photos.value  = await loadPhotos();
  loading.value = false;
}
onIonViewWillEnter(refresh);

/* Gruppiert nach Monat + Jahr */
const groupedPhotos = computed(() => {
  const map = new Map<string, StoredPhoto[]>();

  for (const p of photos.value) {
    const key = new Date(p.date).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    }); // z. B. "Juli 2025"
    (map.get(key) || map.set(key, []).get(key)!).push(p);
  }

  // Neueste Monate oben (Einträge sind bereits sortiert)
  return Array.from(map.entries());
});

/* Navigation & Modal */
const goToCamera = () => router.push('/tabs/camera');
function openPhoto(photo: StoredPhoto) {
  activePhoto.value = photo;
  showModal.value   = true;
}
</script>


