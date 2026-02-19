import { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import AppText from "../components/AppText";

const { width } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Animated ring component
// ---------------------------------------------------------------------------
const PulseRing = ({ delay = 0, size = 200 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.5,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

// ---------------------------------------------------------------------------
// Icon: Download arrow inside a circle, drawn with Views
// ---------------------------------------------------------------------------
const UpdateIcon = () => {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -6,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.iconWrapper}>
      <PulseRing delay={0} size={160} />
      <PulseRing delay={700} size={160} />

      <View style={styles.iconCircle}>
        <Animated.View
          style={[styles.iconInner, { transform: [{ translateY: bounce }] }]}
        >
          {/* Arrow shaft */}
          <View style={styles.arrowShaft} />
          {/* Arrow head */}
          <View style={styles.arrowHead} />
          {/* Baseline */}
          <View style={styles.arrowBase} />
        </Animated.View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ForceUpdateScreen
 *
 * @param {object}   props
 * @param {string}   [props.title]        - Override the headline
 * @param {string}   [props.message]      - Override the body text (use hook's `message`)
 * @param {string}   [props.version]      - Latest version string to display, e.g. "2.4.0"
 * @param {function} props.onUpdate       - Called when the user taps the button → pass `openStore`
 */
export default function ForceUpdateScreen({
  title = "Update Required",
  message = "A critical update is available. Please update to the latest version to continue using the app.",
  version,
  onUpdate,
}) {
  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Background accent blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        {/* Icon */}
        <UpdateIcon />

        {/* Badge */}
        {version && (
          <View style={styles.versionBadge}>
            <AppText style={styles.versionBadgeText}>
              v{version} available
            </AppText>
          </View>
        )}

        {/* AppText */}
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.message}>{message}</AppText>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Checklist */}
        <View style={styles.checklist}>
          {[
            "Security & stability improvements",
            "New features & bug fixes",
            "Better performance",
          ].map((item) => (
            <View key={item} style={styles.checkItem}>
              <View style={styles.checkDot} />
              <AppText style={styles.checkText}>{item}</AppText>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <Animated.View
          style={{ transform: [{ scale: buttonScale }], width: "100%" }}
        >
          <TouchableOpacity
            onPress={onUpdate}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            style={styles.button}
          >
            <AppText style={styles.buttonText}>Update Now</AppText>
          </TouchableOpacity>
        </Animated.View>

        <AppText style={styles.footnote}>
          You must update to continue using the app
        </AppText>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const ACCENT = "#6ee7b7"; // Mint green
const ACCENT_DIM = "#34d399";
const BG = "#0a0a0f";
const CARD_BG = "#13131a";
const BORDER = "#1f1f2e";
const TEXT_PRIMARY = "#f0f0f5";
const TEXT_SECONDARY = "#8888aa";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },

  // Background blobs
  blobTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#0d2e22",
    opacity: 0.8,
  },
  blobBottom: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#0d1f2e",
    opacity: 0.7,
  },

  content: {
    width: width - 48,
    backgroundColor: CARD_BG,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 36,
    // Subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
      },
      android: {
        elevation: 20,
      },
    }),
  },

  // Icon
  iconWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0d2e22",
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    alignItems: "center",
  },
  arrowShaft: {
    width: 2.5,
    height: 18,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: ACCENT,
    marginTop: 2,
  },
  arrowBase: {
    width: 22,
    height: 2.5,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginTop: 4,
  },

  // Version badge
  versionBadge: {
    backgroundColor: "#0d2e22",
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  versionBadgeText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // AppText
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  // Divider
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 20,
  },

  // Checklist
  checklist: {
    width: "100%",
    marginBottom: 28,
    gap: 10,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  checkText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },

  // Button
  button: {
    width: "100%",
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#0a0f0d",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Footnote
  footnote: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textAlign: "center",
    opacity: 0.6,
  },
});
