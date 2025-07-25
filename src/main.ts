import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { IonicVue } from '@ionic/vue';

/* Core CSS */
import '@ionic/vue/css/core.css';

/* Basic CSS */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS Utils */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Dark‑Mode Palettes */
import '@ionic/vue/css/palettes/dark.always.css';
import '@ionic/vue/css/palettes/dark.class.css';
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme vars */
import './theme/variables.css';

/* Status-Bar */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

async function applyStatusBarFix() {
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch (err) {
    console.warn('StatusBar plugin not available', err);
  }
}

const app = createApp(App).use(IonicVue).use(router);

router.isReady().then(async () => {
  if (Capacitor.isNativePlatform()) {
    await applyStatusBarFix();
  }
  app.mount('#app');
})
