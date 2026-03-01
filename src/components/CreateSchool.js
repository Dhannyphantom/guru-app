import { Dimensions, Keyboard, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { ProfileLink } from "../screens/ProfileScreen";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import SchoolHeader from "./SchoolHeader";
import colors from "../helpers/colors";
import {
  getCurrencyAmount,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import { useEffect, useState } from "react";
import { SchoolList, SearchSchool } from "./JoinSchool";
import AppModal from "./AppModal";
import {
  useJoinSchoolMutation,
  useLazySearchSchoolsQuery,
} from "../context/schoolSlice";
import PopMessage from "./PopMessage";
import getRefresher from "./Refresher";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";

const WalkthroughableView = walkthroughable(View);

const { width, height } = Dimensions.get("screen");

const TOUR_KEY = "guru_school_create_tour_seen";

const CreateSchool = ({ schoolData, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const profile = hasCompletedProfile(user);
  const router = useRouter();
  const { start, copilotEvents } = useCopilot();

  const [searchSchool, { data, isLoading }] = useLazySearchSchoolsQuery();
  const [joinSchool, { isLoading: joinLoading }] = useJoinSchoolMutation();

  const [bools, setBools] = useState({ search: false, searched: false });
  const [school, setSchool] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const searchStyle = bools.search ? styles.searchOn : {};
  const translationY = useSharedValue(0);

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
          !bools.searched && setBools({ ...bools, searched: true });
        } catch (err) {}
        break;
    }
  };

  const onSchoolPicked = async (item) => {
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
            setBools({ ...bools, search: false });
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

  const handleSchoolSub = () => {
    router.push({
      pathname: "/school/subscribe",
      params: { type: "school", data: JSON.stringify(school) },
    });
  };

  const createActions = (type) => {
    if (!profile.bool) return setPopper(profile.pop);
    switch (type) {
      case "create":
        router.push("/school/create");
        break;
      case "join":
        setBools({ ...bools, search: true });
        break;
    }
  };

  useEffect(() => {
    if (schoolData) {
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
        contentContainerStyle={{ paddingBottom: height * 0.15 }}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        keyboardShouldPersistTaps="handled"
        renderItem={() => (
          <View style={styles.container}>
            {/* Step 1 – Welcome banner */}
            <CopilotStep
              text={`Welcome, ${user?.username}! 👩‍🏫\n\nAs a teacher, you have two options to get started with your school on Guru:\n\n1. Create a brand new School Profile for your school.\n2. Join an existing school profile if one has already been created by a colleague.\n\nEither way, you'll need an active school subscription before students can join!`}
              order={1}
              name="create_school_header"
            >
              <WalkthroughableView>
                <SchoolHeader
                  data={{ name: "MY SCHOOL" }}
                  scrollY={translationY}
                />
              </WalkthroughableView>
            </CopilotStep>

            {bools?.search && (
              <SearchSchool
                searchStyle={searchStyle}
                onSearch={onSearch}
                showSearch={bools.search}
                loading={{
                  search: isLoading,
                  searched: bools.searched,
                  page: joinLoading,
                }}
                onSchoolPicked={onSchoolPicked}
                data={data?.data}
              />
            )}

            <AppText
              fontWeight="heavy"
              size={"xxlarge"}
              style={styles.salutation}
            >
              Hi, {user?.username}
            </AppText>

            {/* Step 2 – Create / Join action buttons */}
            <CopilotStep
              text={
                "These are your two setup options:\n\n➕ Create School Profile\nStart fresh! Fill in your school's details, pay the subscription fee and become your school's rep on Guru. Your students and fellow teachers can then find and join your school.\n\n🙋 Join School\nIf a colleague has already set up your school profile, search for it here and send a request to join as a teacher."
              }
              order={2}
              name="create_school_actions"
            >
              <WalkthroughableView style={styles.main}>
                <ProfileLink
                  title={"Create School Profile"}
                  onPress={() => createActions("create")}
                  icon="add-circle"
                />
                <ProfileLink
                  title={"Join School"}
                  onPress={() => createActions("join")}
                  icon="person-add"
                />
              </WalkthroughableView>
            </CopilotStep>

            {/* Step 3 – Pending school card (subscription or verification) */}
            {school && Boolean(school?._id) && (
              <CopilotStep
                text={
                  school?.status === "subscription"
                    ? "Your school profile exists but needs a subscription! 💳\n\nTap this card to proceed to payment and activate your school.\n\nOnce subscribed, your students and teachers can join and access all of Guru's school features."
                    : "Your join request is pending verification. ⏳\n\nThe school rep needs to approve your request before you gain teacher access.\n\nPull down to refresh and check if you've been verified."
                }
                order={3}
                name="create_school_pending"
              >
                <WalkthroughableView style={styles.pending}>
                  <SchoolList
                    item={school}
                    onPress={handleSchoolSub}
                    status={school?.status}
                  />
                </WalkthroughableView>
              </CopilotStep>
            )}

            <View>
              <View style={[styles.row, { marginTop: 30 }]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.primary}
                />
                <AppText style={styles.text} fontWeight="medium">
                  Equip your students with the necessary tools and materials
                  that help them become better!
                </AppText>
              </View>
              <View style={[styles.row, { marginTop: 30 }]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.primary}
                />
                <AppText style={styles.text} fontWeight="medium">
                  If your school is not yet registered, You can easily create
                  one, then your Students can have full access to Guru, enabling
                  them to learn and practice questions
                </AppText>
              </View>
            </View>

            {/* Step 4 – Subscription cost callout */}
            <CopilotStep
              text={
                "School subscriptions are billed per term (3 months). 💰\n\nOnce active, all verified students and teachers in your school get full access to Guru for that term.\n\nRemember to renew at the start of each new term to keep things running smoothly!"
              }
              order={4}
              name="create_school_sub_info"
            >
              <WalkthroughableView style={[styles.row, { marginTop: 30 }]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.primary}
                />
                <AppText style={styles.text} fontWeight="medium">
                  Creating a school profile involves paying a subscription
                  amount of{" "}
                  <AppText fontWeight="heavy">
                    {getCurrencyAmount(10000)} per term
                  </AppText>
                  . i.e a three(3) months subscription
                </AppText>
              </WalkthroughableView>
            </CopilotStep>
          </View>
        )}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default CreateSchool;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  salutation: {
    margin: 15,
  },
  main: {
    width: width * 0.9,
    backgroundColor: colors.white,
    alignSelf: "center",
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  pending: {
    marginTop: 20,
  },
  searchOn: {
    position: "absolute",
    paddingTop: 60,
    backgroundColor: colors.extraLight,
    zIndex: 3,
    height: height * 0.86,
  },
  text: {
    color: colors.black,
    textAlign: "left",
    marginLeft: 3,
    paddingRight: 30,
    lineHeight: 24,
  },
});
