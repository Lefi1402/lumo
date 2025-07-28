<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <!-- Galerie -->
        <ion-tab-button tab="gallery" href="/tabs/gallery">
          <ion-icon :icon="imagesOutline" aria-hidden="true" />
          <ion-label>Galerie</ion-label>
        </ion-tab-button>
        <!-- Kamera -->
        <ion-tab-button tab="camera" href="/tabs/camera">
          <ion-icon :icon="cameraOutline" aria-hidden="true" />
          <ion-label>Kamera</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet,
} from '@ionic/vue';
import { imagesOutline, cameraOutline } from 'ionicons/icons';
</script>
