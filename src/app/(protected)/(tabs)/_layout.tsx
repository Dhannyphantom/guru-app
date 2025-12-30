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
const CURVE_HEIGHT = 30;

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
      <Tabs.Screen name="profile" options={{ tabBarLabel: "Profile" }} />
    </Tabs>
  );
}

function CurvedTabBar({ state, descriptors, navigation }: any) {
  const tabWidth = width / 5;
  const centerIndex = 2;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { bottom: insets.bottom }]}>
      {/* SVG Curved Shape */}
      <Svg
        width={width}
        height={TAB_BAR_HEIGHT + CURVE_HEIGHT}
        style={styles.svgContainer}
      >
        <Path
          d={`
            M 0 ${CURVE_HEIGHT}
            L ${tabWidth * 1.8} ${CURVE_HEIGHT}
            Q ${tabWidth * 2} ${CURVE_HEIGHT} ${tabWidth * 2.1} ${
            CURVE_HEIGHT - 10
          }
            Q ${tabWidth * 2.2} ${CURVE_HEIGHT - 20} ${tabWidth * 2.3} ${
            CURVE_HEIGHT - 25
          }
            Q ${tabWidth * 2.5} ${CURVE_HEIGHT - 30} ${tabWidth * 2.7} ${
            CURVE_HEIGHT - 25
          }
            Q ${tabWidth * 2.8} ${CURVE_HEIGHT - 20} ${tabWidth * 2.9} ${
            CURVE_HEIGHT - 10
          }
            Q ${tabWidth * 3} ${CURVE_HEIGHT} ${tabWidth * 3.2} ${CURVE_HEIGHT}
            L ${width} ${CURVE_HEIGHT}
            L ${width} ${TAB_BAR_HEIGHT + CURVE_HEIGHT}
            L 0 ${TAB_BAR_HEIGHT + CURVE_HEIGHT}
            Z
          `}
          fill="white"
        />
      </Svg>

      {/* Tab Items */}
      <View style={styles.tabItemsContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
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
                  activeOpacity={0.7}
                  onPress={onPress}
                  style={styles.centerButton}
                >
                  <Animated.View style={[styles.centerButtonInner]}>
                    <Ionicons name={iconName as any} size={26} color="white" />
                  </Animated.View>
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
    </View>
  );
}

function TabBarItem({ isFocused, onPress, iconName, index, centerIndex }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 1);
  }, [isFocused]);

  const handlePress = () => {
    scale.value = withSpring(0.85, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  // Adjust position for items around center
  const isLeftOfCenter = index < centerIndex;
  const isRightOfCenter = index > centerIndex;

  let additionalStyle = {};
  if (isLeftOfCenter && index === centerIndex - 1) {
    additionalStyle = { marginRight: 15 };
  } else if (isRightOfCenter && index === centerIndex + 1) {
    additionalStyle = { marginLeft: 15 };
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.tabItem, additionalStyle]}
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
    height: TAB_BAR_HEIGHT + CURVE_HEIGHT,
  },
  svgContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItemsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "100%",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: TAB_BAR_HEIGHT,
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: -CURVE_HEIGHT,
  },
  centerButton: {
    width: CIRCLE_SIZE + 8,
    height: CIRCLE_SIZE + 8,
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
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    bottom: 10,
    borderColor: "white",
  },
});
