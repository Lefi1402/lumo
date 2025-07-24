<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="lumo-title-center">LUMO</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="lumo-empty-gallery">
        <ion-fab vertical="center" horizontal="center" slot="fixed">
          <ion-fab-button @click="goToCamera">
            <ion-icon :icon="addOutline" />
          </ion-fab-button>
        </ion-fab>
        <p class="lumo-empty-text">Noch keine Bilder<br />hinzugefügt</p>
      </div>
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
  IonFab,
  IonFabButton,
  IonIcon
} from '@ionic/vue';
import { addOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const router = useRouter();
const goToCamera = () => router.push('/tabs/camera');
</script>
