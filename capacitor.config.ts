import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.canlitvplus.app',
  appName: 'Canlı Tv Plus',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
