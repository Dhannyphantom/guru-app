import Constants from "expo-constants";

const PRODUCTION_API_URL = "https://guru-server-v1.onrender.com";

const devApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.13.9:3800";
// "http://192.168.79.9:3800";

console.log({
  devApiUrl,
  uri: Constants.expoConfig.hostUri?.replace(/:\d+$/, ""),
});

/** Production API used for release builds and App Store review. */
export const baseUrl = __DEV__ ? devApiUrl : PRODUCTION_API_URL;
