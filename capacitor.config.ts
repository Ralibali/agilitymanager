import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'se.agilitymanager.app',
  appName: 'AgilityManager',
  webDir: 'dist-native',
  backgroundColor: '#F4F0E6',
  server: { androidScheme: 'https', cleartext: false },
  ios: { contentInset: 'never', backgroundColor: '#F4F0E6' },
  android: { backgroundColor: '#F4F0E6', allowMixedContent: false },
  plugins: {
    SystemBars: { insetsHandling: 'css', style: 'LIGHT', hidden: false },
  },
};

export default config;
