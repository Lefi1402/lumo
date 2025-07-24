import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.lefi.lumo',
  appName: 'LUMO',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,          // Millisekunden
      launchAutoHide: true,              // danach automatisch weg
      backgroundColor: '#111111',        // dunkler Hintergrund
      androidScaleType: 'CENTER_CROP',   // Logo mittig, ggf. zuschneiden
      showSpinner: false
    }
  }
};

export default config;
