import { useEffect, useState, useCallback, useRef } from "react";
import { Platform, Linking, AppState, Alert } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import * as ExpoInAppUpdates from "expo-in-app-updates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const compareVersions = (v1, v2) => {
  const a = String(v1).split(".").map(Number);
  const b = String(v2).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const isRunningInDevOrExpoGo = __DEV__ || Constants.appOwnership === "expo";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAppUpdate
 *
 * Combines two update strategies:
 *  1. Native store update (expo-in-app-updates)
 *     - Force / immediate: version is below minimumSupportedVersion
 *     - Soft / flexible:   version is below latestVersion
 *  2. OTA JS-bundle update (expo-updates)
 *     - Applied silently when otaEnabled === true and no store update needed
 *
 * @param {object} options
 * @param {string}  options.endpoint            - URL returning the version JSON (see shape below)
 * @param {string}  options.androidPackageName  - e.g. "com.yourapp"
 * @param {string}  options.iosAppId            - numeric App Store ID, e.g. "1234567890"
 * @param {boolean} [options.checkOnResume=true] - re-check every time the app is foregrounded
 *
 * Expected endpoint JSON shape:
 * {
 *   "latestVersion":           "2.1.0",
 *   "minimumSupportedVersion": "1.5.0",
 *   "otaEnabled":              true,
 *   "updateMessage":           "A new version is available!",
 *   "forceMessage":            "You must update to continue using this app."
 * }
 *
 * Returned state:
 *   status      – "idle" | "checking" | "upToDate" | "soft" | "force"
 *   message     – human-readable string from the endpoint
 *   forceUpdate – boolean, true when a hard update is required
 *   openStore   – function: manually opens the appropriate store listing
 *   recheck     – function: manually re-triggers the full check
 */
export const useAppUpdate = ({
  endpoint,
  androidPackageName,
  iosAppId,
  checkOnResume = true,
}) => {
  const [state, setState] = useState({
    status: "idle",
    message: "",
    forceUpdate: false,
  });

  // Prevent concurrent checks
  const isChecking = useRef(false);

  const currentVersion =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? "0.0.0";

  // ------------------------------------------------------------------
  // Open the appropriate store listing
  // ------------------------------------------------------------------
  const openStore = useCallback(() => {
    const url =
      Platform.OS === "android"
        ? `https://play.google.com/store/apps/details?id=${androidPackageName}`
        : `https://apps.apple.com/app/id${iosAppId}`;

    Linking.openURL(url).catch((err) =>
      console.warn("[useAppUpdate] Could not open store URL:", err),
    );
  }, [androidPackageName, iosAppId]);

  // ------------------------------------------------------------------
  // Silent OTA update via expo-updates
  // Only runs in release builds; expo-updates throws in dev / Expo Go.
  // ------------------------------------------------------------------
  const runOTAUpdate = useCallback(async () => {
    if (isRunningInDevOrExpoGo) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // reloadAsync() should be the very last call – nothing meaningful
        // should run after it (per Expo docs).
        await Updates.reloadAsync();
      }
    } catch (err) {
      // Silently swallow: common in dev builds or when updates are disabled
      console.warn("[useAppUpdate] OTA check skipped:", err?.message);
    }
  }, []);

  // ------------------------------------------------------------------
  // Main update check
  // ------------------------------------------------------------------
  const checkForUpdates = useCallback(async () => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      setState((s) => ({ ...s, status: "checking" }));

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const {
        latestVersion,
        minimumSupportedVersion,
        otaEnabled,
        updateMessage,
        forceMessage,
      } = data;

      // Skip in Expo Go / dev mode – store APIs won't work anyway
      if (isRunningInDevOrExpoGo) {
        console.info(
          "[useAppUpdate] Skipping store update check in dev/Expo Go.",
        );
        setState({ status: "upToDate", message: "", forceUpdate: false });
        return;
      }

      // Skip on web
      if (Platform.OS === "web") {
        setState({ status: "upToDate", message: "", forceUpdate: false });
        return;
      }

      // ----------------------------------------------------------------
      // 1. FORCE / IMMEDIATE update
      //    The running version is below the minimum supported version.
      // ----------------------------------------------------------------
      if (compareVersions(currentVersion, minimumSupportedVersion) < 0) {
        setState({ status: "force", message: forceMessage, forceUpdate: true });

        if (Platform.OS === "android") {
          try {
            // checkForUpdate() tells us whether the Play Store has an update
            const result = await ExpoInAppUpdates.checkForUpdate();
            if (result.updateAvailable && result.immediateAllowed) {
              await ExpoInAppUpdates.startUpdate(true); // true = IMMEDIATE
            } else {
              // Play Store not yet propagated – fall back to manual store open
              openStore();
            }
          } catch (err) {
            console.warn("[useAppUpdate] Android immediate update error:", err);
            openStore();
          }
        } else {
          // iOS: show an alert then redirect to the App Store
          Alert.alert(
            "Update Required",
            forceMessage ||
              "A required update is available. Please update to continue using the app.",
            [{ text: "Update Now", onPress: openStore }],
            { cancelable: false },
          );
        }

        return; // Do NOT run OTA after a force update
      }

      // ----------------------------------------------------------------
      // 2. SOFT / FLEXIBLE update
      //    The running version is below the latest version but still
      //    above the minimum – update is optional / recommended.
      // ----------------------------------------------------------------
      if (compareVersions(currentVersion, latestVersion) < 0) {
        setState({
          status: "soft",
          message: updateMessage,
          forceUpdate: false,
        });

        if (Platform.OS === "android") {
          try {
            const result = await ExpoInAppUpdates.checkForUpdate();
            if (result.updateAvailable && result.flexibleAllowed) {
              await ExpoInAppUpdates.startUpdate(false); // false = FLEXIBLE
            }
            // If the Play Store doesn't yet have the update, we rely on
            // the UI to surface the `soft` status for the user to act on.
          } catch (err) {
            console.warn("[useAppUpdate] Android flexible update error:", err);
          }
        } else {
          // iOS: surface an alert (startUpdate() opens the App Store sheet)
          Alert.alert(
            "Update Available",
            updateMessage ||
              "A new version is available with improvements and bug fixes.",
            [
              { text: "Update", onPress: () => ExpoInAppUpdates.startUpdate() },
              { text: "Later", style: "cancel" },
            ],
          );
        }

        // Still run OTA in case there are JS-only fixes on the current
        // version branch (e.g. a hotfix published before the store update
        // has been installed).
        if (otaEnabled) await runOTAUpdate();
        return;
      }

      // ----------------------------------------------------------------
      // 3. App is up-to-date on the store; try OTA anyway
      // ----------------------------------------------------------------
      setState({ status: "upToDate", message: "", forceUpdate: false });

      if (otaEnabled) await runOTAUpdate();
    } catch (err) {
      console.warn("[useAppUpdate] Update check failed:", err?.message);
      // Don't block the user on a network / parsing error
      setState((s) => ({ ...s, status: "upToDate" }));
    } finally {
      isChecking.current = false;
    }
  }, [endpoint, currentVersion, openStore, runOTAUpdate]);

  // ------------------------------------------------------------------
  // Run on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    checkForUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Re-check when app is foregrounded (optional)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!checkOnResume) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkForUpdates();
      }
    });

    return () => subscription.remove();
  }, [checkOnResume, checkForUpdates]);

  return {
    ...state,
    openStore,
    recheck: checkForUpdates,
  };
};
