import { useEffect, useState, useCallback } from "react";
import { Platform, Linking, AppState } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import InAppUpdates from "react-native-in-app-updates";

const inAppUpdates = new InAppUpdates(false);

const compareVersions = (v1, v2) => {
  const a = v1.split(".").map(Number);
  const b = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const useAppUpdate = ({
  endpoint,
  androidPackageName,
  iosAppId,
  checkOnResume = true,
}) => {
  const [state, setState] = useState({
    status: "idle", // idle | checking | soft | force | upToDate
    message: "",
    forceUpdate: false,
  });

  const currentVersion =
    Constants.expoConfig?.version || Constants.manifest?.version;

  const openStore = useCallback(() => {
    const url =
      Platform.OS === "android"
        ? `https://play.google.com/store/apps/details?id=${androidPackageName}`
        : `https://apps.apple.com/app/id${iosAppId}`;

    Linking.openURL(url);
  }, [androidPackageName, iosAppId]);

  const runOTAUpdate = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (_) {}
  };

  const checkForUpdates = useCallback(async () => {
    try {
      setState((s) => ({ ...s, status: "checking" }));

      const res = await fetch(endpoint);
      const data = await res.json();

      const {
        latestVersion,
        minimumSupportedVersion,
        otaEnabled,
        updateMessage,
        forceMessage,
      } = data;

      // HARD STORE UPDATE
      if (compareVersions(currentVersion, minimumSupportedVersion) < 0) {
        setState({
          status: "force",
          message: forceMessage,
          forceUpdate: true,
        });

        if (Platform.OS === "android") {
          const result = await inAppUpdates.checkNeedsUpdate();
          if (result.shouldUpdate) {
            await inAppUpdates.startUpdate({
              updateType: InAppUpdates.UPDATE_TYPE.IMMEDIATE,
            });
          }
        }

        return;
      }

      // SOFT STORE UPDATE
      if (compareVersions(currentVersion, latestVersion) < 0) {
        setState({
          status: "soft",
          message: updateMessage,
          forceUpdate: false,
        });

        if (Platform.OS === "android") {
          const result = await inAppUpdates.checkNeedsUpdate();
          if (result.shouldUpdate) {
            await inAppUpdates.startUpdate({
              updateType: InAppUpdates.UPDATE_TYPE.FLEXIBLE,
            });
          }
        }
      } else {
        setState({
          status: "upToDate",
          message: "",
          forceUpdate: false,
        });
      }

      // OTA (only if app version is supported)
      if (otaEnabled) {
        await runOTAUpdate();
      }
    } catch (_) {
      setState((s) => ({ ...s, status: "upToDate" }));
    }
  }, [endpoint, currentVersion]);

  useEffect(() => {
    checkForUpdates();
  }, []);

  useEffect(() => {
    if (!checkOnResume) return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkForUpdates();
      }
    });

    return () => sub.remove();
  }, []);

  return {
    ...state,
    openStore,
    recheck: checkForUpdates,
  };
};
