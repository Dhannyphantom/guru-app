/**
 * ExitConfirmProvider
 *
 * Drop this into your root layout (app/_layout.tsx) to add a polished
 * "press back again to exit" banner on Android — no native Toast required.
 *
 * Usage in app/_layout.tsx:
 *
 *   import { ExitConfirmProvider } from "@/components/ExitConfirmProvider";
 *
 *   export default function RootLayout() {
 *     return (
 *       <ExitConfirmProvider>
 *         <Stack />
 *       </ExitConfirmProvider>
 *     );
 *   }
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname } from "expo-router";
import colors from "../helpers/colors";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ExitConfirmContextValue {
  /** Call this to temporarily disable the double-back guard (e.g. inside modals). */
  disable: () => void;
  /** Re-enable after disabling. */
  enable: () => void;
}

const ExitConfirmContext = createContext<ExitConfirmContextValue>({
  disable: () => {},
  enable: () => {},
});

export const useExitConfirm = () => useContext(ExitConfirmContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ExitConfirmProviderProps {
  children: React.ReactNode;
  /** Time window (ms) to press back twice. Default: 2000 */
  timeout?: number;
  /** Text shown in the banner. */
  message?: string;
  /** Background colour of the toast banner. */
  bannerColor?: string;
  /** Text colour. */
  textColor?: string;
  /**
   * Pathnames treated as "root" screens where the exit guard activates.
   * Add any path where back should exit the app rather than navigate back.
   * Default: ["/", "/index"]
   *
   * Tip: add a temporary console.log(pathname) to find your screen's path.
   * @example rootPaths={["/", "/index", "/(tabs)", "/(tabs)/home"]}
   */
  rootPaths?: string[];
}

export function ExitConfirmProvider({
  children,
  timeout = 2000,
  message = "Press back again to exit",
  bannerColor = "#1a1a2e",
  textColor = "#e2e8f0",
  rootPaths = ["/", "/index"],
}: ExitConfirmProviderProps) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const lastBack = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = useRef(true);

  // usePathname updates instantly on every navigation — no stale closure issues.
  // Guard activates on any path listed in rootPaths.
  const pathname = usePathname();
  const isAtRoot = rootPaths.includes(pathname);

  // Store in a ref so the BackHandler closure always reads the live value
  // without needing to re-register on every navigation change.
  const isAtRootRef = useRef(isAtRoot);
  useEffect(() => {
    isAtRootRef.current = isAtRoot;
  }, [isAtRoot]);

  const showBanner = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
    ]).start();
  }, [opacity, translateY]);

  const hideBanner = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [opacity, translateY]);

  const handleBackPress = useCallback(() => {
    if (!enabled.current) return false;

    // Only intercept when the user is at the root screen with nowhere to go back.
    if (!isAtRootRef.current) return false;

    const now = Date.now();

    if (lastBack.current !== null && now - lastBack.current < timeout) {
      // ✅ Second press — exit
      BackHandler.exitApp();
      return true;
    }

    // ⚡ First press
    lastBack.current = now;
    showBanner();

    // Auto-hide after timeout
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      lastBack.current = null;
      hideBanner();
    }, timeout);

    return true;
  }, [timeout, showBanner, hideBanner]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );
    return () => {
      sub.remove();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [handleBackPress]);

  const contextValue: ExitConfirmContextValue = {
    disable: () => {
      enabled.current = false;
    },
    enable: () => {
      enabled.current = true;
    },
  };

  return (
    <ExitConfirmContext.Provider value={contextValue}>
      {children}

      {/* Toast banner — rendered above everything */}
      {visible && (
        <Animated.View
          style={[
            styles.banner,
            {
              backgroundColor: bannerColor,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="none"
        >
          {/* Accent bar */}
          <View style={styles.accent} />
          <Text style={[styles.text, { color: textColor }]}>{message}</Text>
        </Animated.View>
      )}
    </ExitConfirmContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    maxWidth: "85%",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  accent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.primary, // violet accent
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
