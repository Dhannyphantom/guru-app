const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const APP_NAME = IS_DEV ? "Guru Dev" : IS_PREVIEW ? "Guru Preview" : "Guru";

const APP_ID = IS_DEV
  ? "com.phantom.guruedutech.dev"
  : IS_PREVIEW
    ? "com.phantom.guruedutech.preview"
    : "com.phantom.guruedutech";

export default {
  name: APP_NAME,
  slug: "guru",
  version: "1.2.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: IS_DEV ? "guru-dev" : IS_PREVIEW ? "guru-preview" : "guru",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: true,
    bundleIdentifier: APP_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        "Guru needs access to your photo library so you can choose a profile picture. For example, you can select a photo from your library to display on your account and on school leaderboards.",
      NSPhotoLibraryAddUsageDescription:
        "Guru may save your updated profile photo to your photo library when you choose to keep a copy on your device.",
      NSCameraUsageDescription:
        "Guru uses your camera so you can take a new profile photo to display on your account and school leaderboards.",
    },
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#373737",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.READ_CONTACTS",
      "android.permission.WRITE_CONTACTS",
    ],
    googleServicesFile: IS_DEV
      ? "./google-services.dev.json"
      : IS_PREVIEW
        ? "./google-services.preview.json"
        : "./google-services.json",
    package: APP_ID,
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-3603875446667492~8760578808",
        iosAppId: "ca-app-pub-3603875446667492~5124586123",
        delayAppMeasurementInit: true,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notifications.png",
        color: "#689F38",
        defaultChannel: "default",
        sounds: ["./assets/sounds/alert_notification.wav"],
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#373737",
        dark: {
          backgroundColor: "#373737",
        },
      },
    ],
    [
      "expo-contacts",
      {
        contactsPermission: "Allow Guru App to access your contacts.",
      },
    ],
    "expo-font",
    "@sentry/react-native",
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "react-native",
        organization: "guru-edutech",
      },
    ],
    "expo-image",
    "expo-status-bar",
  ],

  extra: {
    eas: {
      projectId: "22260cf2-a686-42bd-9c40-8aa6580ca694",
    },
    router: {},
  },

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  runtimeVersion: {
    policy: "appVersion",
  },

  updates: {
    url: "https://u.expo.dev/22260cf2-a686-42bd-9c40-8aa6580ca694",
  },

  owner: "dhannnyphantom",
};
