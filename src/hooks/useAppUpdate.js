import { useEffect, useState, useCallback, useRef } from "react";
import { Platform, Linking, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import * as ExpoInAppUpdates from "expo-in-app-updates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "1.10.0" vs "1.9.2" -> positive / negative / 0. Tolerates "1.2.0-beta". */
const compareVersions = (v1, v2) => {
  const parse = (v) =>
    String(v ?? "0")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const a = parse(v1);
  const b = parse(v2);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const isRunningInDevOrExpoGo = __DEV__ || Constants.appOwnership === "expo";

// "Maybe later" hides the friendly prompt for this long (per latest version).
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const SNOOZE_KEY = "guru_update_snooze_v1";
const FETCH_TIMEOUT_MS = 10000;

const isSnoozed = async (version) => {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const { version: v, until } = JSON.parse(raw);
    return v === version && Number(until) > Date.now();
  } catch {
    return false;
  }
};

const INITIAL = {
  status: "idle",
  message: "",
  forceUpdate: false,
  latestVersion: null,
  softSnoozed: false,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAppUpdate
 *
 *  1. FORCE  – installed version < minimumSupportedVersion
 *              -> render <ForceUpdateScreen/> (cannot be dismissed)
 *  2. SOFT   – installed version < latestVersion
 *              -> render <UpdateModal visible={promptVisible}/> ("Later" snoozes 24h)
 *  3. OTA    – JS-bundle update applied silently when otaEnabled
 *
 * Endpoint JSON:
 * { latestVersion, minimumSupportedVersion, otaEnabled, updateMessage, forceMessage }
 *
 * Returned:
 *   status, message, forceUpdate, latestVersion, currentVersion
 *   promptVisible  – true when the friendly modal should be on screen
 *   dismissPrompt  – "Maybe later": hides the modal and snoozes it
 *   startUpdate    – "Update now": in-app update on Android (force) or store
 *   openStore      – opens the store listing
 *   recheck        – re-runs the whole check
 *
 * Dev preview: the real check is skipped in dev / Expo Go. Pass
 * `previewStatus: "soft" | "force"` (only honoured when __DEV__) to see the UI.
 */
export const useAppUpdate = ({
  endpoint,
  androidPackageName,
  iosAppId,
  checkOnResume = true,
  previewStatus,
}) => {
  const [state, setState] = useState(INITIAL);

  const isChecking = useRef(false);
  const modeRef = useRef("none"); // "none" | "soft" | "force"
  const autoLaunched = useRef(false); // auto in-app update: once per session

  const currentVersion =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? "0.0.0";

  // ------------------------------------------------------------------
  // Store listing
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

  // Android Play "immediate" in-app update. Resolves true if it was started.
  const tryInAppImmediate = useCallback(async () => {
    if (Platform.OS !== "android" || isRunningInDevOrExpoGo) return false;
    try {
      const result = await ExpoInAppUpdates.checkForUpdate();
      if (result?.updateAvailable && result?.immediateAllowed) {
        await ExpoInAppUpdates.startUpdate(true);
        return true;
      }
    } catch (err) {
      console.warn("[useAppUpdate] Android immediate update error:", err);
    }
    return false;
  }, []);

  // "Update now" button (modal + force screen)
  const startUpdate = useCallback(async () => {
    if (modeRef.current === "force" && (await tryInAppImmediate())) return;
    openStore();
  }, [openStore, tryInAppImmediate]);

  // "Maybe later"
  const dismissPrompt = useCallback(() => {
    setState((s) => ({ ...s, softSnoozed: true }));
    if (state.latestVersion) {
      AsyncStorage.setItem(
        SNOOZE_KEY,
        JSON.stringify({
          version: state.latestVersion,
          until: Date.now() + SNOOZE_MS,
        }),
      ).catch(() => {});
    }
  }, [state.latestVersion]);

  // ------------------------------------------------------------------
  // Silent OTA update (release builds only)
  // ------------------------------------------------------------------
  const runOTAUpdate = useCallback(async () => {
    if (isRunningInDevOrExpoGo) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync(); // must be the last call
      }
    } catch (err) {
      console.warn("[useAppUpdate] OTA check skipped:", err?.message);
    }
  }, []);

  // ------------------------------------------------------------------
  // Main check
  // ------------------------------------------------------------------
  const checkForUpdates = useCallback(async () => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      // Dev-only UI preview
      if (__DEV__ && previewStatus) {
        modeRef.current = previewStatus;
        setState({
          status: previewStatus,
          message:
            previewStatus === "force"
              ? "Your app version is no longer supported. Please update to continue."
              : "A new version of the app is available.",
          forceUpdate: previewStatus === "force",
          latestVersion: "9.9.9",
          softSnoozed: false,
        });
        return;
      }

      // Only show "checking" the first time, so resume checks never flicker
      // an already-visible prompt / force screen.
      setState((s) => (s.status === "idle" ? { ...s, status: "checking" } : s));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let data;
      try {
        const res = await fetch(endpoint, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } finally {
        clearTimeout(timeout);
      }

      const {
        latestVersion,
        minimumSupportedVersion,
        otaEnabled,
        updateMessage,
        forceMessage,
      } = data;

      if (isRunningInDevOrExpoGo || Platform.OS === "web") {
        modeRef.current = "none";
        setState({ ...INITIAL, status: "upToDate" });
        return;
      }

      // 1. FORCE
      if (
        minimumSupportedVersion &&
        compareVersions(currentVersion, minimumSupportedVersion) < 0
      ) {
        modeRef.current = "force";
        setState({
          status: "force",
          message: forceMessage,
          forceUpdate: true,
          latestVersion: latestVersion || minimumSupportedVersion,
          softSnoozed: false,
        });

        // Kick off Play's in-app flow once; the screen's button works anyway.
        if (!autoLaunched.current) {
          autoLaunched.current = true;
          await tryInAppImmediate();
        }
        return; // never run OTA after a force update
      }

      // 2. SOFT: a newer version exists, current one still works
      if (latestVersion && compareVersions(currentVersion, latestVersion) < 0) {
        modeRef.current = "soft";
        const snoozed = await isSnoozed(latestVersion);
        setState((s) => ({
          status: "soft",
          message: updateMessage,
          forceUpdate: false,
          latestVersion,
          // keep a dismissal made this session even if storage failed
          softSnoozed: snoozed || (s.latestVersion === latestVersion && s.softSnoozed),
        }));

        // JS-only hotfixes can still land on this version.
        if (otaEnabled) await runOTAUpdate();
        return;
      }

      // 3. Up to date
      modeRef.current = "none";
      setState({ ...INITIAL, status: "upToDate" });
      if (otaEnabled) await runOTAUpdate();
    } catch (err) {
      console.warn("[useAppUpdate] Update check failed:", err?.message);
      // Never block the user on a network / parsing error. If a force screen
      // is already up, leave it up.
      setState((s) => (s.forceUpdate ? s : { ...s, status: "upToDate" }));
    } finally {
      isChecking.current = false;
    }
  }, [endpoint, currentVersion, previewStatus, runOTAUpdate, tryInAppImmediate]);

  useEffect(() => {
    checkForUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkOnResume) return;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") checkForUpdates();
    });
    return () => subscription.remove();
  }, [checkOnResume, checkForUpdates]);

  return {
    status: state.status,
    message: state.message,
    forceUpdate: state.forceUpdate,
    latestVersion: state.latestVersion,
    currentVersion,
    promptVisible: state.status === "soft" && !state.softSnoozed,
    dismissPrompt,
    startUpdate,
    openStore,
    recheck: checkForUpdates,
  };
};
