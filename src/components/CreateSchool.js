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
import {
  useJoinSchoolMutation,
  useLazySearchSchoolsQuery,
} from "../context/schoolSlice";
import PopMessage from "./PopMessage";
import getRefresher from "./Refresher";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppTutorial from "./AppTutorial"; //

const { width, height } = Dimensions.get("screen");

const TOUR_KEY = "guru_school_create_tour_seen";

const CreateSchool = ({ schoolData, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const profile = hasCompletedProfile(user);
  const router = useRouter();

  const [searchSchool, { data, isLoading }] = useLazySearchSchoolsQuery();
  const [joinSchool, { isLoading: joinLoading }] = useJoinSchoolMutation();

  const [bools, setBools] = useState({ search: false, searched: false });
  const [school, setSchool] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const searchStyle = bools.search ? styles.searchOn : {};
  const translationY = useSharedValue(0);

  // ── Tutorial steps ────────────────────────────────────────────────────────
  const schoolTutorialSteps = [
    {
      title: `Welcome, ${user?.username}! 👩‍🏫`,
      text: `As a teacher, you have two options to get started:\n\n1. Create a brand new School Profile and enjoy free 3-months subscription.\n2. Join an existing school if a colleague already created one.\n\nYou'll need an active school subscription before students can join!`,
    },
    {
      title: "Create or Join a School",
      text: `➕ Create School Profile\nFill in your school's details, pay the subscription fee and become your school's rep on Guru.\n\n🙋 Join School\nIf a colleague has already set up your school, search for it and send a join request.`,
    },
    {
      title: "Pending School Status",
      text:
        school?.status === "subscription"
          ? "Your school profile exists but needs a subscription! 💳\n\nTap the school card to proceed to payment and activate your school so students can join."
          : "Your join request is pending verification. ⏳\n\nThe school rep must approve your request before you gain teacher access. Pull down to refresh.",
    },
    {
      title: "School Subscription Info 💰",
      text: `School subscriptions are billed per term (3 months).\n\nOnce active, all verified students and teachers get full Guru access for that term.\n\nRemember to renew at the start of each new term!`,
    },
  ];

  // ── Tour lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkTour = async () => {
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) {
        setTimeout(() => setShowTutorial(true), 800);
      }
    };
    checkTour();
  }, []);

  const handleTutorialDone = async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem(TOUR_KEY, "true");
  };

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
            <SchoolHeader data={{ name: "MY SCHOOL" }} scrollY={translationY} />

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

            <View style={styles.main}>
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
            </View>

            {school && Boolean(school?._id) && (
              <View style={styles.pending}>
                <SchoolList
                  item={school}
                  onPress={handleSchoolSub}
                  status={school?.status}
                />
              </View>
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
              <View style={[styles.row, { marginTop: 30 }]}>
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
              </View>
            </View>
          </View>
        )}
      />

      <PopMessage popData={popper} setPopData={setPopper} />

      <AppTutorial
        visible={showTutorial}
        steps={schoolTutorialSteps}
        onDone={handleTutorialDone}
      />
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
