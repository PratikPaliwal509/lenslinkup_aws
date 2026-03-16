import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'in.lenslinkup.app',
  appName: 'LensLinkUp',

  // ── Web source ──────────────────────────────────────────────────────────────
  // During development: comment out `url` and set `webDir` to the Next.js
  // static export folder (`out/`).
  // In production: point `url` at the live Vercel deployment — the native
  // shell is a thin webview wrapper around the hosted web app.
  webDir: 'out',
  server: {
    // Uncomment and set your production URL when deploying:
    // url: 'https://lenslinkup.vercel.app',
    // cleartext: false,

    // Local dev — point at the Next.js dev server on your machine's LAN IP:
    // url: 'http://192.168.1.x:3000',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme:     'https',
  },

  // ── Plugins ─────────────────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration:      2000,
      backgroundColor:        '#0D9488', // teal brand colour
      androidSplashResourceName: 'splash',
      androidScaleType:        'CENTER_CROP',
      showSpinner:             false,
      splashFullScreen:        true,
      splashImmersive:         true,
    },
    StatusBar: {
      style:           'Light',           // white icons on teal
      backgroundColor: '#0D9488',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  // ── Android ─────────────────────────────────────────────────────────────────
  android: {
    buildOptions: {
      keystorePath:    undefined,         // set path to your keystore for prod
      keystoreAlias:   undefined,
    },
    // minSdkVersion is set in android/variables.gradle (default 22)
  },

  // ── iOS ─────────────────────────────────────────────────────────────────────
  ios: {
    contentInset: 'automatic',
  },
}

export default config
