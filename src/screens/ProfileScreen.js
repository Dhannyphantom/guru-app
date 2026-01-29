import {
  Dimensions,
  Platform,
  // Pressable,
  // RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import AppText from "../components/AppText";
import PromptModal from "../components/PromptModal";
import { useDispatch, useSelector } from "react-redux";
import {
  selectToken,
  selectUser,
  updateToken,
  useLazyFetchUserQuery,
} from "../context/usersSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Points from "../components/Points";
import {
  // capFirstLetter,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import { StatusBar } from "expo-status-bar";
import getRefresher from "../components/Refresher";
import PopMessage from "../components/PopMessage";
import { selectSchool } from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const SIGN_OUT_MODAL = {
  title: "Sign Out",
  msg: "Are you sure you want to log out this account?",
  btn: "Leave",
  type: "sign_out",
};

export const ProfileLink = ({
  title,
  icon = "person",
  iconColor = colors.primary,
  onPress,
}) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.link}>
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <AppText style={styles.linkText} fontWeight="semibold">
        {title}
      </AppText>
      <View style={styles.linkNavContainer}>
        <Ionicons name="chevron-forward" size={18} color={colors.medium} />
      </View>
    </TouchableOpacity>
  );
};

const ProfileScreen = () => {
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const route = useLocalSearchParams();
  const user = useSelector(selectUser) ?? {};
  const school = useSelector(selectSchool);
  const [fetchUser] = useLazyFetchUserQuery();
  // const token = useSelector(selectToken);
  const profile = hasCompletedProfile(user);
  const isProVerified =
    ["professional", "manager"].includes(user.accountType) && user?.verified;
  const isPro = ["professional", "manager"].includes(user.accountType);

  const isWaiting =
    ["professional", "manager"].includes(user.accountType) &&
    !user?.verified &&
    profile.bool;

  const handlePrompt = async (type) => {
    switch (type) {
      case "sign_out":
        await AsyncStorage.removeItem("token");
        dispatch(updateToken(null));
        break;

      default:
        break;
    }
  };

  const goPRO = () => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    } else {
      router.push("/pros/pro");
    }
  };

  const handleNav = (screen) => {
    if (isPro) {
      return setPopper({
        vis: true,
        msg: "You're not authorized",
        type: "failed",
      });
    } else {
      router.push(screen);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUser();
    } catch (_error) {
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    // Callback should be wrapped in `React.useCallback` to avoid running the effect too often.
    useCallback(() => {
      // Invoked whenever the route is focused.
      if (route?.check === "profile" && !profile.bool) {
        setPopper(profile.pop);
      }

      // Return function is invoked whenever the route gets out of focus.
      return () => {
        // log("This route is now unfocused.");
      };
    }, [profile, route]),
  );

  return (
    <Screen style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: height * 0.05 }}
        refreshControl={getRefresher({ refreshing, onRefresh })}
      >
        <View style={styles.profile}>
          <Avatar
            size={Platform.OS === "web" ? 120 : width * 0.6}
            name={`${user?.firstName ?? "Your"} ${user?.lastName ?? "Name"}`}
            imageStyle={{ backgroundColor: "#fff" }}
            data={{ user }}
            source={user?.avatar?.image}
            border={{ width: 7, color: colors.lightly }}
            textFontsize={30}
            textStyle={{ maxWidth: width * 0.9 }}
          />
          <AppText
            style={{
              width: "90%",
              marginTop: 5,
              textAlign: "center",
              color: colors.primaryDeep,
            }}
            numberOfLines={2}
            ellipsizeMode="middle"
            fontWeight="bold"
            size={"large"}
          >
            @{user?.username}
          </AppText>
          {Boolean(school?.name) && (
            <AppText
              style={{
                width: "90%",
                marginTop: 10,
                textAlign: "center",
                textTransform: "capitalize",
              }}
              numberOfLines={2}
              ellipsizeMode="middle"
              fontWeight="medium"
              size={"medium"}
            >
              {school?.name}
            </AppText>
          )}
          {user?.state && user?.lga && (
            <AppText
              style={{
                width: "90%",
                textAlign: "center",
                textTransform: "capitalize",
              }}
              numberOfLines={2}
              ellipsizeMode="middle"
              fontWeight="medium"
              size={"medium"}
            >
              {user?.lga}
              {user?.state ? `, ${user.state} State` : ""}
            </AppText>
          )}
          {user?.gender && (
            <AppText style={styles.accountType} fontWeight="bold">
              {user?.gender} {user?.accountType}
            </AppText>
          )}
          {!isPro && (
            <View style={styles.stats}>
              <Points
                value={user?.rank}
                type="award"
                style={{ marginRight: 30 }}
              />
              <Points value={user?.points} />
            </View>
          )}
          {isWaiting && (
            <View style={styles.row}>
              <LottieAnimator visible name="waiting" size={35} />
              <AppText fontWeight="black" style={{ color: colors.medium }}>
                Awaiting Verification
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.main}>
          {isProVerified && (
            <ProfileLink title={`Pro Mode+`} onPress={goPRO} icon="cog" />
          )}
          <ProfileLink
            title={`${profile.bool ? "Edit" : "Complete"} Profile`}
            onPress={() => router.push("/profile/edit")}
            icon="options"
          />
          <ProfileLink
            title={"Subscription"}
            icon="wallet"
            onPress={() => handleNav("/profile/subscription")}
          />
          {!isPro && (
            <ProfileLink
              title={"My Friends"}
              icon="people"
              onPress={() => handleNav("/profile/friends")}
              // iconColor={colors.medium}
            />
          )}
          <View style={styles.separator} />

          <ProfileLink
            title={"Rewards & Invites"}
            icon="person-add"
            onPress={() => handleNav("/profile/invite")}
            iconColor={colors.medium}
          />
          <ProfileLink
            title={"Settings & More"}
            icon="chatbubble-ellipses"
            onPress={() => router.push("/profile/settings")}
            iconColor={colors.medium}
          />
          <View style={styles.separator} />
          <ProfileLink
            title={"Sign out"}
            icon="log-out"
            iconColor={colors.heartDark}
            onPress={() => setPrompt({ vis: true, data: SIGN_OUT_MODAL })}
          />
        </View>
      </ScrollView>
      <PromptModal
        prompt={prompt}
        setPrompt={(data) => setPrompt(data)}
        onPress={handlePrompt}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </Screen>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  accountType: {
    color: colors.primaryDeeper,
    backgroundColor: colors.extraLight,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 80,
    marginTop: 10,
    textTransform: "capitalize",
  },
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.extraLight,
    borderRadius: 12,
  },
  main: {
    flex: 1,
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
    elevation: 30,
    backgroundColor: "#fff",
    marginTop: 20,
    paddingVertical: 10,
    height: height * 0.78,
  },
  profile: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  linkIcon: {
    backgroundColor: colors.extraLight,
    padding: 12,
    borderRadius: 10,
    marginRight: 15,
  },
  linkNavContainer: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    height: 2,
    backgroundColor: colors.extraLight,
    width: "85%",
    alignSelf: "center",
    marginVertical: 20,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});
