import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.motivateapp.app",
  appName: "Motivate",
  webDir: "out",
  server: {
    // Use HTTPS scheme so Supabase cookies work correctly on Android
    androidScheme: "https",
    hostname: "app",
    cleartext: false,
  },
  plugins: {
    // Deep link scheme for OAuth callback
    // Supabase redirects to: com.motivateapp.app://login-callback
    App: {
      launchUrl: "com.motivateapp.app://",
    },
  },
};

export default config;
