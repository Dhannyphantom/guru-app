import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Feather,
  Ionicons,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { CurvedBottomBarExpo } from "react-native-curved-bottom-bar";

import HomeStack from "./HomeStack";
import ProfileStack from "./ProfileStack";
import LeaderboardStack from "./LeaderboardStack";
// import QuizStack from "./QuizStack";
import SchoolStack from "./SchoolStack";
import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Quiz from "../components/Quiz";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { hasCompletedProfile } from "../helpers/helperFunctions";
import PopMessage from "../components/PopMessage";
import { selectSchool } from "../context/schoolSlice";

const { width, height } = Dimensions.get("screen");
const PLUS_SIZE = width * 0.2;

const Tab = createBottomTabNavigator();

const TabArr = [
  {
    id: "1",
    name: "HomeStack",
    component: HomeStack,
    label: "Home",
    icon: "home-variant-outline",
    iconFocused: "home-variant",
    position: "LEFT",
    iconPack: "MCI",
    iconFPack: "MCI",
    color: colors.primary,
  },
  {
    id: "3",
    name: "LeaderboardStack",
    component: LeaderboardStack,
    icon: "trophy-outline",
    iconFocused: "trophy",
    position: "LEFT",
    label: "Leaderboard",
    color: colors.accent,
  },
  // {
  //   id: "4",
  //   name: "QuizStack",
  //   component: QuizStack,
  //   icon: "add",
  //   iconFocused: "add",
  //   label: null,
  // },
  {
    id: "4",
    name: "SchoolStack",
    component: SchoolStack,
    position: "RIGHT",
    icon: "book-outline",
    iconFocused: "book",
    label: "School",
    color: colors.warningLight,
  },

  {
    id: "2",
    name: "ProfileStack",
    component: ProfileStack,
    position: "RIGHT",
    icon: "person-outline",
    iconFocused: "person",
    label: "Profile",
    color: colors.google,
  },
];

const TabIcon = ({ focused, color, size = 20, style, item }) => {
  const { icon, iconFocused } = item;

  let Icon = Ionicons,
    IconFocused = Ionicons;

  switch (item.iconPack) {
    case "AD":
      Icon = AntDesign;
      break;
    case "MCI":
      Icon = MaterialCommunityIcons;
      break;

    default:
      Icon = Ionicons;
      break;
  }

  switch (item.iconFPack) {
    case "AD":
      IconFocused = AntDesign;
      break;
    case "MCI":
      IconFocused = MaterialCommunityIcons;
      break;

    default:
      IconFocused = Ionicons;
      break;
  }

  return (
    <View style={style}>
      {focused ? (
        <IconFocused name={iconFocused} color={color} size={size} />
      ) : (
        <Icon name={icon} color={color} size={size} />
      )}
    </View>
  );
};

const TabButton = ({ routeName, selectedTab, navigate }) => {
  // const { item, onPress, accessibilityState } = props;
  const focused = routeName === selectedTab;
  const item = TabArr.find((obj) => obj.name === routeName);

  return (
    <Pressable onPress={() => navigate(routeName)} style={styles.btnContainer}>
      <View>
        <TabIcon
          item={item}
          color={focused ? item.color : colors.medium}
          focused={focused}
          style={{}}
          size={20}
        />
      </View>
      <AppText fontWeight={focused ? "bold" : "regular"} size={10}>
        {item.label}
      </AppText>
    </Pressable>
  );
};

const WebHeader = () => {
  const renderTabBar = ({ state, descriptors, navigation }) => {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          const isFocused = state.index === index;
          let icon, iconPack, iconFocused, iconFPack, label;
          switch (route?.name) {
            case "HomeStack":
              icon = "home-variant-outline";
              iconFocused = "home-variant";
              iconPack = "MCI";
              iconFPack = "MCI";
              label = "Home";
              break;
            case "LeaderboardStack":
              icon = "trophy-outline";
              iconFocused = "trophy";
              // iconPack = "MCI";
              // iconFPack = "MCI";
              label = "Leaderboard";
              break;
            case "SchoolStack":
              icon = "book-outline";
              iconFocused = "book";
              label = "School";
              break;
            case "ProfileStack":
              icon = "person-outline";
              iconFocused = "person";
              label = "Profile";
              break;
            case "QuizStack":
              icon = "home-variant-outline";
              iconFocused = "home-variant";
              iconPack = "MCI";
              iconFPack = "MCI";
              label = "Quiz";
              break;

            default:
              break;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              // href={buildHref(route.name, route.params)}
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              key={route?.name}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                padding: 15,
              }}
            >
              <TabIcon
                item={{ icon, iconFocused, iconPack, iconFPack }}
                color={isFocused ? colors.primary : colors.medium}
                focused={isFocused}
                size={20}
              />
              <AppText
                fontWeight={isFocused ? "bold" : "regular"}
                style={{
                  color: isFocused ? colors.primaryDeep : colors.medium,
                  marginLeft: 8,
                }}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.container,
        tabBarItemStyle: styles.tab,
        tabBarHideOnKeyboard: false,
        tabBarActiveTintColor: colors.primary,
        tabBarShowLabel: true,
      }}
      tabBar={renderTabBar}
    >
      {TabArr.map((obj) => {
        return (
          <Tab.Screen
            key={obj.id}
            name={obj.name}
            component={obj.component}
            // position={obj.position}
          />
        );
      })}
    </Tab.Navigator>
  );
};

const TabRouter = () => {
  const [startQuiz, setStartQuiz] = useState(false);
  const [popper, setPopper] = useState({ vis: false });
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isPro = ["manager", "professional"].includes(user?.accountType);

  const startQuizSession = (navigate) => {
    const profileCompleted = hasCompletedProfile(user);
    if (!profileCompleted.bool) {
      setPopper(profileCompleted.pop);
    } else {
      if (user?.accountType == "student") {
        setStartQuiz(true);
      } else if (user?.accountType == "teacher" && Boolean(school)) {
        // return console.log(navigate);
        navigate("Dashboard");
      } else if (user?.accountType == "teacher" && !Boolean(school)) {
        setPopper({
          vis: true,
          type: "failed",
          msg: "Please join or create your school profile",
          timer: 2000,
        });
      } else if (isPro && user?.verified) {
        navigate("Pro");
      } else if (isPro && !user?.verified) {
        setPopper({
          vis: true,
          type: "failed",
          msg: "Awaiting professional verification",
          timer: 2000,
        });
      }
    }
  };

  const renderTabBar = ({ routeName, selectedTab, navigate }) => {
    return (
      <TabButton
        routeName={routeName}
        selectedTab={selectedTab}
        navigate={navigate}
      />
    );
  };

  return (
    <>
      {Platform.OS === "web" ? (
        <WebHeader />
      ) : (
        <CurvedBottomBarExpo.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.container,
            tabBarItemStyle: styles.tab,
            tabBarHideOnKeyboard: true,
            tabBarActiveTintColor: colors.primary,
            tabBarShowLabel: false,
          }}
          backBehavior="none"
          type="DOWN"
          style={styles.bottomBar}
          shadowStyle={styles.shawdow}
          height={65}
          circleWidth={60}
          bgColor="white"
          initialRouteName="HomeStack"
          borderTopLeftRight
          renderCircle={({ selectedTab, navigate }) => (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.btnCircleUp}
                onPress={() => startQuizSession(navigate)}
              >
                <Animated.View style={styles.button}>
                  <Ionicons name={"rocket"} color="#fff" size={25} />
                </Animated.View>
              </TouchableOpacity>
              <Quiz
                startQuiz={startQuiz}
                setStartQuiz={(val) => setStartQuiz(val)}
              />
            </>
          )}
          tabBar={renderTabBar}
        >
          {TabArr.map((obj) => {
            return (
              <CurvedBottomBarExpo.Screen
                key={obj.id}
                name={obj.name}
                component={obj.component}
                position={obj.position}
              />
            );
          })}
        </CurvedBottomBarExpo.Navigator>
      )}
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopEndRadius: 20,
    borderTopStartRadius: 20,
    minHeight: 60,
    elevation: 0,
    // paddingHorizontal: 10,
  },
  button: {
    flex: 1,
    justifyContent: "center",
  },
  bottomBar: {},
  btnContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  btnCircleUp: {
    width: 65,
    height: 65,
    borderRadius: 65 / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    bottom: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  btnDummy: {
    width: 20,
    height: 20,
  },
  btnPlus: {
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.extraLight,
    borderRadius: 200,
    position: "absolute",
    bottom: 25,
  },
  btnPlusIcon: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    width: "80%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  shawdow: {
    shadowColor: "#DDDDDD",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  tabbarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    // backgroundColor: "red",
  },
});

export default TabRouter;
