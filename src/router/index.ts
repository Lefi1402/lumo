import { createRouter, createWebHistory } from '@ionic/vue-router';
import Tabs from '@/views/Tabs.vue';

const routes = [
  {
    path: '/',
    redirect: '/tabs/gallery'
  },
  {
    path: '/tabs/',
    component: Tabs,
    children: [
      {
        path: 'gallery',
        component: () => import('@/views/GalleryPage.vue')
      },
      {
        path: 'camera',
        component: () => import('@/views/CameraPage.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
