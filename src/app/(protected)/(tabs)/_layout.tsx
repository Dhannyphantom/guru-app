import { Tabs } from "expo-router";
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import colors from "@/src/helpers/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 65;
const CIRCLE_SIZE = 60;
// Extra height above the bar for the floating button.
// Must be >= (CIRCLE_SIZE / 2) + border + shadow so the button clears the curve top.
const DIP_DEPTH = 40;
// Half-width of the notch opening.
// Rule of thumb: (CIRCLE_SIZE / 2) + ~26px padding so the shoulders clear the button edges.
const NOTCH_HALF_WIDTH = 60;

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

function CurvedTabBar({ state, descriptors, navigation }: any) {
  const centerIndex = 2;
  const insets = useSafeAreaInsets();

  const svgHeight = TAB_BAR_HEIGHT + DIP_DEPTH;
  const cx = width / 2; // center x

  //
  // Fully smooth 4-segment cubic-bezier notch.
  //
  // The flat bar sits at y = DIP_DEPTH.
  // The notch bottom sits at y = notchBottom.
  //
  // We break the curve into 4 segments so every transition —
  // flat→dip entry AND dip→flat exit — is tangentially smooth
  // (no kink / sharp corner at the shoulder).
  //
  //  Segment layout (left-to-right):
  //
  //   [flat] ──► A ──(entry curve)──► B ──(descent)──► C ──(ascent)──► D ──(exit curve)──► [flat]
  //
  //   A = shoulder start  (cx - shoulderW - entryW,  DIP_DEPTH)
  //   B = shoulder end    (cx - shoulderW,            DIP_DEPTH)   ← still on the flat line
  //   C = mirror of B     (cx + shoulderW,            DIP_DEPTH)
  //   D = mirror of A     (cx + shoulderW + entryW,   DIP_DEPTH)
  //
  //   The notch floor sits at notchBottom.
  //
  const notchBottom = svgHeight - 10;

  // Half-width of the rounded "shelf" either side before it dips
  const shoulderW = NOTCH_HALF_WIDTH * 0.58;
  // How far the flat line bends before it starts descending
  const entryW = NOTCH_HALF_WIDTH * 0.65;
  // Vertical control-point pull — how aggressively the curve descends
  const vPull = (notchBottom - DIP_DEPTH) * 0.85;

  // Key x positions
  const Ax = cx - shoulderW - entryW;
  const Bx = cx - shoulderW;
  const midX = cx;
  const Cx = cx + shoulderW;
  const Dx = cx + shoulderW + entryW;

  // Entry ends at (Bx, DIP_DEPTH + vPull * 0.6) with a steep downward tangent.
  // Each segment's first control point must continue that same direction
  // so there's no kink at the join.
  const entryEndY = DIP_DEPTH + vPull * 0.6;
  // How far the descent still has to travel after the entry lands
  const remainingDescent = notchBottom - entryEndY;

  const floorDepth = remainingDescent * 0.5;

  const path = [
    `M 0 ${DIP_DEPTH}`,
    `L ${Ax} ${DIP_DEPTH}`,

    // ① Entry
    `C ${Ax + entryW * 0.6} ${DIP_DEPTH} ${Bx - entryW * 0.1} ${
      DIP_DEPTH + vPull * 0.4
    } ${Bx} ${entryEndY}`,

    // ②+③ Single symmetric cubic valley
    `C ${midX - shoulderW} ${notchBottom + floorDepth} ${midX + shoulderW} ${
      notchBottom + floorDepth
    } ${Cx} ${entryEndY}`,

    // ④ Exit
    `C ${Cx + entryW * 0.1} ${DIP_DEPTH + vPull * 0.4} ${
      Dx - entryW * 0.6
    } ${DIP_DEPTH} ${Dx} ${DIP_DEPTH}`,

    `L ${width} ${DIP_DEPTH}`,
    `L ${width} ${svgHeight}`,
    `L 0 ${svgHeight}`,
    `Z`,
  ].join(" ");

  return (
    <View
      style={[styles.tabBarContainer, { height: svgHeight + insets.bottom }]}
    >
      {/* Drop-shadow wrapper (elevation for Android) */}
      <View style={styles.shadowWrapper}>
        <Svg width={width} height={svgHeight} style={styles.svgContainer}>
          <Path d={path} fill="white" />
        </Svg>
      </View>

      {/* Tab button row — aligned to the flat portion of the bar */}
      <View
        style={[
          styles.tabItemsContainer,
          {
            top: DIP_DEPTH,
            height: TAB_BAR_HEIGHT,
            paddingBottom: Platform.OS === "ios" ? 14 : 8,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const isCenter = index === centerIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName = "";
          switch (route.name) {
            case "(home)":
              iconName = isFocused ? "book" : "book-outline";
              break;
            case "leaderboard":
              iconName = isFocused ? "trophy" : "trophy-outline";
              break;
            case "dashboard":
              iconName = "rocket-sharp";
              break;
            case "profile":
              iconName = isFocused ? "person" : "person-outline";
              break;
            case "school":
              iconName = isFocused ? "school" : "school-outline";
              break;
          }

          if (isCenter) {
            return (
              <View key={index} style={styles.centerTabWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onPress}
                  style={styles.centerButton}
                >
                  <View style={styles.centerButtonInner}>
                    <Ionicons name={iconName as any} size={26} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TabBarItem
              key={index}
              isFocused={isFocused}
              onPress={onPress}
              iconName={iconName}
              index={index}
              centerIndex={centerIndex}
            />
          );
        })}
      </View>

      {/* White fill under safe-area so the bar colour extends to the physical bottom */}
      {insets.bottom > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: "white",
          }}
        />
      )}
    </View>
  );
}

function TabBarItem({ isFocused, onPress, iconName, index, centerIndex }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.tabItem}
    >
      <Animated.View style={[animatedStyle, styles.iconContainer]}>
        <Ionicons
          name={iconName as any}
          size={24}
          color={isFocused ? colors.primary : "#8E8E93"}
        />
        {isFocused && <View style={styles.activeIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  // Wraps the SVG so Android elevation shadow works
  shadowWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    elevation: 12,
  },
  svgContainer: {
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItemsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  centerTabWrapper: {
    flex: 1,
    // Pull upward so the button floats above the bar
    marginTop: -(CIRCLE_SIZE / 2 + DIP_DEPTH / 2),
    justifyContent: "flex-start",
    alignItems: "center",
  },
  centerButton: {
    width: CIRCLE_SIZE + 12,
    height: CIRCLE_SIZE + 12,
    justifyContent: "center",
    alignItems: "center",
  },
  centerButtonInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
});
