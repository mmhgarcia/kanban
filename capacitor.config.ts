import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kanban.app',
  appName: 'Kanban Board',
  webDir: 'dist',
  cordova: {
    preferences: {
      Orientation: 'portrait',
      BackgroundColor: '#1a1a2e',
      Fullscreen: 'false',
      KeepRunning: 'true'
    }
  }
};

export default config;
