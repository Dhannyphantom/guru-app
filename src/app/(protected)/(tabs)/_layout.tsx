import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/src/helpers/colors";
import { T } from "@/src/components/jamb/JambTheme";

/* ────────────────────────────────────────────────────────────────────────────
 * Curved tab bar
 *
 * Layout model (everything is measured, nothing is hard-wired to one screen):
 *
 *   y = 0 ┌──────────────────────────────┐  ← room for the floating button,
 *         │   (transparent, touch-through)│    its pulse ring and the soft shadow
 *   y = TOP ─── bar edge ───╮  ╭─── bar edge ───
 *         │  tab · tab ·    ╰──╯   · tab · tab │  ← BAR_H of icons + labels
 *         ├──────────────────────────────┤
 *         │  safe-area / gesture-nav pad  │  ← bar colour reaches the very bottom
 *   y = H └──────────────────────────────┘
 *
 * Why the old bar lost its icons on some phones
 *  1. The curve layer had `elevation: 12`. On Android, elevation re-orders
 *     siblings, so that white layer could be drawn ON TOP of the icon row.
 *     Now the curve has no elevation, and the icon row / button have explicit
 *     zIndex + elevation so they always sit above it.
 *  2. Width was read once at import time (`Dimensions.get`) and the 5 slots
 *     were width / 5. On narrow screens the side icons landed inside the notch.
 *     Now width is reactive, the centre slot has its own width and the notch is
 *     derived from it, so the side icons always clear the curve.
 *  3. Bottom padding relied only on the reported inset, which some Android
 *     devices report as 0 under edge-to-edge. There is now a minimum pad.
 * ──────────────────────────────────────────────────────────────────────────── */

const CENTER_ROUTE = "dashboard";

const BAR_H = 64; // icon + label area
const TOP = 46; // y of the flat top edge of the bar inside the container
const MAX_ROW_W = 560; // keep tabs tidy on tablets / landscape

// Centre button
const BTN = 58;
const LIP = 5; // chunky "lip" under the button
const BTN_TOP = TOP - 35; // face top → face centre sits 6px above the bar edge

// Notch (cradle) shape — tuned numerically so the button always keeps
// a 3–8px gap to the curve for every centre-slot width we produce.
const NOTCH_DEPTH = 36;
const CP_A = 0.65;
const CP_B = 0.6;

const INACTIVE = "#7C869B";
const BAR_FILL = "#FFFFFF";

// Soft upward shadow made from a few translucent copies of the bar shape.
const SHADOW_LAYERS: [number, number][] = [
  [-2, 0.035],
  [-4, 0.03],
  [-6, 0.02],
  [-8, 0.012],
];

const TAB_META: Record<string, any> = {
  "(home)": {
    label: "Home",
    icon: "book",
    outline: "book-outline",
    tint: {
      bg: colors.primaryLighter,
      line: colors.primaryLight,
      lip: "#AED581",
      ink: colors.primaryDeeper,
    },
  },
  leaderboard: {
    label: "Ranks",
    icon: "trophy",
    outline: "trophy-outline",
    tint: { bg: T.yellowSoft, line: T.yellowLine, lip: "#EBC85A", ink: "#8A6200" },
  },
  school: {
    label: "School",
    icon: "school",
    outline: "school-outline",
    tint: { bg: T.blueSoft, line: T.blueLine, lip: "#9DBFF5", ink: T.blueDark },
  },
  profile: {
    label: "Profile",
    icon: "person",
    outline: "person-outline",
    tint: { bg: T.purpleSoft, line: T.purpleLine, lip: "#BBA6F7", ink: T.purpleDark },
  },
};

const FALLBACK_META = {
  label: "",
  icon: "ellipse",
  outline: "ellipse-outline",
  tint: TAB_META["(home)"].tint,
};

const r2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <CurvedTabBar {...props} />}
    >
      <Tabs.Screen name="(home)" options={{ tabBarLabel: "Home" }} />
      <Tabs.Screen
        name="leaderboard"
        options={{ tabBarLabel: "Leaderboard" }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", href: null }}
      />
      <Tabs.Screen name="school" options={{ tabBarLabel: "School" }} />
      <Tabs.Screen
        name="profile"
        options={{ tabBarLabel: "Profile", lazy: false }}
      />
    </Tabs>
  );
}

/** Bar outline with a smooth cradle for the centre button. */
function buildPath(
  w: number,
  cx: number,
  notchW: number,
  h: number,
  dy = 0,
  closed = true,
) {
  const y = r2(TOP + dy);
  const yb = r2(TOP + NOTCH_DEPTH + dy);
  const edge =
    notchW > 0
      ? [
          `M 0 ${y}`,
          `L ${r2(cx - notchW)} ${y}`,
          `C ${r2(cx - CP_A * notchW)} ${y} ${r2(cx - CP_B * notchW)} ${yb} ${r2(cx)} ${yb}`,
          `C ${r2(cx + CP_B * notchW)} ${yb} ${r2(cx + CP_A * notchW)} ${y} ${r2(cx + notchW)} ${y}`,
          `L ${r2(w)} ${y}`,
        ]
      : [`M 0 ${y}`, `L ${r2(w)} ${y}`];
  return closed
    ? [...edge, `L ${r2(w)} ${r2(h)}`, `L 0 ${r2(h)}`, "Z"].join(" ")
    : edge.join(" ");
}

function CurvedTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  // Never let the bar sit flush with the system nav area, even if the
  // device reports a 0 inset (happens on some Android edge-to-edge builds).
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 6);
  const height = TOP + BAR_H + bottomPad;

  // Hidden routes (href: null) are skipped, except the centre action.
  const routes = state.routes.filter(
    (r: any) =>
      r.name === CENTER_ROUTE || descriptors[r.key]?.options?.href !== null,
  );
  const centerPos = routes.findIndex((r: any) => r.name === CENTER_ROUTE);
  const hasCenter = centerPos >= 0;

  const rowW = Math.min(width, MAX_ROW_W);
  const rowLeft = (width - rowW) / 2;
  const centerSlot = hasCenter ? clamp(rowW * 0.24, 77, 100) : 0;
  const sideCount = routes.length - (hasCenter ? 1 : 0);
  const slot = (rowW - centerSlot) / Math.max(sideCount, 1);
  const leftCount = hasCenter ? centerPos : sideCount;
  const cx = hasCenter ? rowLeft + leftCount * slot + centerSlot / 2 : width / 2;
  const notchW = hasCenter ? centerSlot / 2 + 6 : 0;

  const makeHandlers = (route: any, isFocused: boolean) => ({
    onPress: () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    onLongPress: () => {
      navigation.emit({ type: "tabLongPress", target: route.key });
    },
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { height }]}
    >
      {/* Bar shape + shadow (purely decorative, no elevation → can't cover icons) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          {SHADOW_LAYERS.map(([dy, opacity]) => (
            <Path
              key={dy}
              d={buildPath(width, cx, notchW, height, dy)}
              fill="#1E2A4A"
              fillOpacity={opacity}
            />
          ))}
          <Path d={buildPath(width, cx, notchW, height)} fill={BAR_FILL} />
          <Path
            d={buildPath(width, cx, notchW, height, 0, false)}
            fill="none"
            stroke={T.line}
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      {/* Tab row */}
      <View
        pointerEvents="box-none"
        style={[
          styles.row,
          { top: TOP, height: BAR_H, width: rowW, left: rowLeft },
        ]}
      >
        {routes.map((route: any, index: number) => {
          if (index === centerPos) {
            return <View key={route.key} style={{ width: centerSlot }} />;
          }
          const isFocused = state.routes[state.index]?.key === route.key;
          const options = descriptors[route.key]?.options ?? {};
          const meta = TAB_META[route.name] ?? {
            ...FALLBACK_META,
            label: options.tabBarLabel ?? route.name,
          };
          const { onPress, onLongPress } = makeHandlers(route, isFocused);
          return (
            <TabItem
              key={route.key}
              meta={meta}
              isFocused={isFocused}
              width={slot}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
              reduceMotion={reduceMotion}
            />
          );
        })}
      </View>

      {/* Floating action button */}
      {hasCenter && (
        <CenterButton
          left={cx - BTN / 2}
          reduceMotion={reduceMotion}
          {...makeHandlers(
            routes[centerPos],
            state.routes[state.index]?.key === routes[centerPos].key,
          )}
        />
      )}
    </View>
  );
}

function TabItem({
  meta,
  isFocused,
  width,
  onPress,
  onLongPress,
  accessibilityLabel,
  reduceMotion,
}: any) {
  const focus = useSharedValue(isFocused ? 1 : 0);
  const wiggle = useSharedValue(0);
  const press = useSharedValue(0);
  const mounted = useRef(false);
  const { tint } = meta;

  useEffect(() => {
    focus.value = withSpring(isFocused ? 1 : 0, {
      damping: 11,
      stiffness: 190,
      mass: 0.7,
    });
    if (mounted.current && isFocused && !reduceMotion) {
      // tiny playful wobble when a tab becomes active
      wiggle.value = withSequence(
        withTiming(-1, { duration: 80 }),
        withTiming(1, { duration: 120 }),
        withTiming(-0.5, { duration: 100 }),
        withSpring(0, { damping: 10, stiffness: 200 }),
      );
    }
    mounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.08 }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(focus.value, [0, 1], [0.6, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focus.value, [0, 1], [0, -1]) },
      { scale: interpolate(focus.value, [0, 1], [1, 1.1]) },
      { rotate: `${wiggle.value * 12}deg` },
    ],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 400 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 12, stiffness: 300 });
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.tabItem, { width }]}
    >
      <Animated.View style={[styles.tabContent, itemStyle]}>
        <View style={styles.bubbleBox}>
          <Animated.View
            style={[
              styles.bubble,
              {
                backgroundColor: tint.bg,
                borderColor: tint.line,
                borderBottomColor: tint.lip,
              },
              bubbleStyle,
            ]}
          />
          <Animated.View style={iconStyle}>
            <Ionicons
              name={(isFocused ? meta.icon : meta.outline) as any}
              size={22}
              color={isFocused ? tint.ink : INACTIVE}
            />
          </Animated.View>
        </View>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[
            styles.label,
            {
              color: isFocused ? tint.ink : INACTIVE,
              fontFamily: isFocused ? "sf-bold" : "sf-semibold",
            },
          ]}
        >
          {meta.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CenterButton({ left, onPress, onLongPress, reduceMotion }: any) {
  const press = useSharedValue(0);
  const bob = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withDelay(1100, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(bob);
      cancelAnimation(ring);
    };
  }, [reduceMotion, bob, ring]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * (1 - press.value) + press.value * (LIP - 1) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.08 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 1], [0.26, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.4]) }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.centerWrap, { left }]}>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <View pointerEvents="none" style={styles.lip} />
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 15, stiffness: 420 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 11, stiffness: 320 });
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Start a quiz"
        style={styles.centerPress}
      >
        <Animated.View style={[styles.face, faceStyle]}>
          <LinearGradient
            colors={["#86C24B", colors.primary]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.faceGradient}
          >
            <View style={styles.shine} />
            <Animated.View style={iconStyle}>
              <Ionicons name="rocket" size={26} color="white" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  row: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
    elevation: 2,
  },
  tabItem: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleBox: {
    width: 46,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  label: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 13,
    includeFontPadding: false,
    textAlign: "center",
  },
  centerWrap: {
    position: "absolute",
    top: BTN_TOP,
    width: BTN,
    height: BTN + LIP,
    zIndex: 3,
    elevation: 3,
  },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: colors.primary,
  },
  lip: {
    position: "absolute",
    top: LIP,
    left: 0,
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: colors.primaryDeeper,
    boxShadow: "0px 6px 14px rgba(51, 105, 30, 0.30)",
  },
  centerPress: {
    width: BTN,
    height: BTN + LIP,
  },
  face: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    overflow: "hidden",
  },
  faceGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BTN / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.32)",
  },
  shine: {
    position: "absolute",
    top: 6,
    left: 11,
    width: 20,
    height: 9,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "-24deg" }],
  },
});
