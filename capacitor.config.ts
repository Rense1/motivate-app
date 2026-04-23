import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.revive.app",
  appName: "REVIVE",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#ef4444",
      sound: "default",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#dc2626",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      iosSplashResourceName: "Splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
