import { Dimensions, FlatList, Keyboard, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import SearchBar from "./SearchBar";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import Animated, {
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import colors from "../helpers/colors";
import { useEffect, useState } from "react";
import SchoolHeader from "./SchoolHeader";
import LottieAnimator from "./LottieAnimator";
import Avatar from "./Avatar";
import AnimatedPressable from "./AnimatedPressable";
import {
  useJoinSchoolMutation,
  useLazySearchSchoolsQuery,
} from "../context/schoolSlice";
import ListEmpty from "./ListEmpty";
import PopMessage from "./PopMessage";
import { hasCompletedProfile } from "../helpers/helperFunctions";
import getRefresher from "./Refresher";
import { PAD_BOTTOM } from "../helpers/dataStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";

const WalkthroughableView = walkthroughable(View);

const { width, height } = Dimensions.get("screen");

const TOUR_KEY = "guru_school_join_tour_seen";

// ─────────────────────────────────────────────────────────────────────────────
// SchoolList
// ─────────────────────────────────────────────────────────────────────────────
export const SchoolList = ({ item, onPress, status = "" }) => {
  const pending = status === "pending";
  const verification = status === "verification";
  const statusText = pending ? "pending" : `Awaiting ${status}`;

  const scaler = useSharedValue(1);

  const aniStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaler.value }],
  }));

  useEffect(() => {
    if (status) {
      scaler.value = withRepeat(
        withTiming(0.85, { duration: 700 }),
        Infinity,
        true,
      );
    }
  }, []);

  return (
    <AnimatedPressable
      disabled={pending || verification}
      onPress={() => onPress?.(item)}
      style={styles.list}
    >
      <View>
        <Avatar
          name={`${item?.rep?.preffix} ${item?.rep?.firstName} ${item?.rep?.lastName}`}
          size={width * 0.16}
          textFontsize="small"
          source={item?.rep?.avatar?.image}
          maxWidth={width * 0.26}
        />
        <AppText style={styles.listRep} fontWeight="heavy" size={"xxsmall"}>
          School Rep
        </AppText>
      </View>
      <View style={styles.listMain}>
        <AppText style={styles.listName} fontWeight="bold">
          {item?.name}
        </AppText>
        <View style={styles.listRow}>
          <Ionicons name="locate-outline" color={colors.primary} size={16} />
          <AppText style={styles.listDetail} fontWeight="bold" size={"small"}>
            {item?.lga}
          </AppText>
        </View>
        <View style={styles.listRow}>
          <Ionicons name="location-outline" color={colors.primary} size={16} />
          <AppText style={styles.listDetail} fontWeight="bold" size={"small"}>
            {item?.state} State
          </AppText>
        </View>
        {status && (
          <Animated.View style={[styles.listRow, aniStyle]}>
            <Ionicons
              name="hourglass-outline"
              color={pending ? colors.primary : colors.warningDark}
              size={16}
            />
            <AppText
              style={{
                ...styles.listDetail,
                color: pending ? colors.medium : colors.warningDark,
              }}
              fontWeight="bold"
              size={"small"}
            >
              {statusText}
            </AppText>
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchSchool
// ─────────────────────────────────────────────────────────────────────────────
export const SearchSchool = ({
  onSearch,
  onSchoolPicked,
  searchStyle,
  loading,
  showSearch,
  data = [],
}) => {
  return (
    <Animated.View
      layout={LinearTransition.springify()}
      style={[styles.searchView, searchStyle]}
    >
      <SearchBar
        style={styles.search}
        loading={loading?.search}
        placeholder="Enter your school name..."
        onInputFocus={() => onSearch("focus")}
        showClose={true}
        onClose={showSearch ? () => onSearch("blur") : null}
        onClickSearch={(val) => onSearch("callback", val)}
      />
      {showSearch && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <SchoolList item={item} onPress={onSchoolPicked} />
            )}
            ListEmptyComponent={() => (
              <ListEmpty
                style={{ flex: null }}
                vis={loading?.searched}
                message="School Profile not found, If this is the official name of your school then you should create a school profile now"
              />
            )}
            contentContainerStyle={{ paddingBottom: 215 }}
          />
        </View>
      )}
      <LottieAnimator visible={Boolean(loading?.page)} absolute wTransparent />
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// JoinSchool
// ─────────────────────────────────────────────────────────────────────────────
const JoinSchool = ({ schoolData, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const { start, copilotEvents } = useCopilot();

  const translationY = useSharedValue(0);
  const [searchSchool, { data, isLoading }] = useLazySearchSchoolsQuery();
  const [joinSchool, { isLoading: joinLoading }] = useJoinSchoolMutation();

  const [bools, setBools] = useState({ search: false, searched: false });
  const [school, setSchool] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });

  const searchStyle = bools.search ? styles.searchOn : {};

  // ── Tour lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkTour = async () => {
      await AsyncStorage.removeItem(TOUR_KEY); // remove in production
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) {
        setTimeout(() => start(), 800);
      }
    };
    checkTour();
  }, []);

  useEffect(() => {
    const handleStop = async () => await AsyncStorage.setItem(TOUR_KEY, "true");
    copilotEvents.on("stop", handleStop);
    return () => copilotEvents.off("stop", handleStop);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler((event) => {
    translationY.value = event.contentOffset.y;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSchoolData();
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const onSearch = async (type, data) => {
    switch (type) {
      case "focus":
        setBools({ ...bools, search: true });
        break;
      case "blur":
        setBools({ ...bools, search: false });
        break;
      case "callback":
        try {
          await searchSchool(data).unwrap();
        } catch (error) {
          console.log(error);
        }
        break;
    }
  };

  const onSchoolPicked = async (item) => {
    const profile = hasCompletedProfile(user);
    if (!profile.bool) return setPopper(profile.pop);

    try {
      const res = await joinSchool(item?._id).unwrap();
      if (res.status == "success") {
        setPopper({
          vis: true,
          msg: "A request to join sent successfully",
          type: "success",
          timer: 2500,
          cb: () => {
            setSchool({ ...item, status: "verification" });
            setBools({ ...bools, search: false, searched: true });
          },
        });
        Keyboard.dismiss();
      }
    } catch (err) {
      setPopper({
        vis: true,
        msg: err?.data?.message,
        type: "failed",
        timer: 3500,
      });
    }
  };

  useEffect(() => {
    if (Boolean(schoolData) && Object.values(schoolData).length > 0) {
      setSchool({
        ...schoolData,
        status: schoolData?.subscription?.isActive
          ? "verification"
          : "subscription",
      });
    }
  }, [schoolData]);

  return (
    <>
      <Animated.FlatList
        data={["JOIN"]}
        onScroll={scrollHandler}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        renderItem={() => (
          <View style={styles.container}>
            {/* Step 1 – Welcome banner */}
            <CopilotStep
              text={`Hey ${user?.username}! 👋\n\nTo unlock everything Guru has to offer, you need to join your school.\n\nThis connects you to your teachers, classmates, school quizzes, assignments and the school leaderboard!`}
              order={1}
              name="join_school_header"
            >
              <WalkthroughableView>
                <SchoolHeader name={"JOIN SCHOOL"} scrollY={translationY} />
              </WalkthroughableView>
            </CopilotStep>

            <AppText
              fontWeight="heavy"
              size={"xxlarge"}
              style={styles.salutation}
            >
              Hi, {user?.username}
            </AppText>

            {/* Step 2 – Search bar */}
            <CopilotStep
              text={
                "Search for your school here! 🔍\n\nType the name of your school and it will appear in the list below.\nSelect it to send a join request to your school rep.\n\nMake sure your profile is complete before joining!"
              }
              order={2}
              name="join_school_search"
            >
              <WalkthroughableView>
                <SearchSchool
                  searchStyle={searchStyle}
                  onSchoolPicked={onSchoolPicked}
                  searchLoading={isLoading}
                  data={data?.data}
                  onSearch={onSearch}
                  loading={{
                    search: isLoading,
                    searched: bools.searched,
                    page: joinLoading,
                  }}
                  showSearch={bools.search}
                />
              </WalkthroughableView>
            </CopilotStep>

            <View style={styles.row}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <AppText style={styles.text} fontWeight="medium">
                Search and affiliate yourself with your school now to gain full
                access to Guru
              </AppText>
            </View>
            <View style={[styles.row, { marginTop: 30 }]}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <AppText style={styles.text} fontWeight="medium">
                If your school is not registered yet, Please meet with your
                homeroom teacher to create a School Profile for all students
              </AppText>
            </View>

            {/* Step 3 – Pending request card */}
            {school && (
              <CopilotStep
                text={
                  school?.status === "subscription"
                    ? "Your school is awaiting a subscription renewal. ⏳\n\nNotify your school rep or homeroom teacher to renew the school subscription so you can gain full access."
                    : "Your join request has been sent! ✅\n\nYou're now awaiting verification from your school rep.\n\nPull down to refresh and check if you've been approved. Once verified, you'll have full access to school features!"
                }
                order={3}
                name="join_school_pending"
              >
                <WalkthroughableView style={styles.pending}>
                  <SchoolList item={school} status={school?.status} />
                </WalkthroughableView>
              </CopilotStep>
            )}

            <View style={[styles.row, { marginTop: 10 }]}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <AppText style={styles.text} fontWeight="medium">
                If your school subscription is expired, Notify your school rep
                or homeroom teacher to renew your school subscription
              </AppText>
            </View>
          </View>
        )}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default JoinSchool;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: height,
  },
  lottie: {
    alignSelf: "center",
    width: 150,
    height: 40,
  },
  list: {
    flexDirection: "row",
    backgroundColor: colors.white,
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  listMain: {
    flex: 1,
    marginLeft: 15,
  },
  listRep: {
    alignSelf: "center",
    color: colors.primary,
  },
  listName: {
    textTransform: "capitalize",
    marginBottom: 15,
    paddingRight: 15,
    lineHeight: 24,
  },
  listDetail: {
    textTransform: "capitalize",
    color: colors.medium,
    marginLeft: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  pending: {
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  salutation: {
    margin: 15,
  },
  search: {
    backgroundColor: colors.white,
  },
  searchView: {
    position: "relative",
    width,
  },
  searchOn: {
    position: "absolute",
    paddingTop: 60,
    backgroundColor: colors.extraLight,
    zIndex: 30,
  },
  text: {
    color: colors.black,
    textAlign: "left",
    marginLeft: 3,
    marginRight: 20,
  },
});
