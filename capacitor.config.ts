/// <reference types="@capacitor/status-bar" />

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumo.app',
  appName: 'LUMO',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',            
      backgroundColor: '#000000', 
    },
    SplashScreen: {
      launchShowDuration: 2000,    
      backgroundColor: '#000000',  
      androidScaleType: 'CENTER_CROP', 
      showSpinner: false,        
      splashFullScreen: true,     
      splashImmersive: true       
    }
  },
  android: {
  },
};

export default config;
