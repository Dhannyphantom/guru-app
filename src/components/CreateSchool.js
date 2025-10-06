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
import { useNavigation } from "@react-navigation/native";
import AppModal from "./AppModal";
import {
  useJoinSchoolMutation,
  useLazySearchSchoolsQuery,
} from "../context/schoolSlice";
import PopMessage from "./PopMessage";
import getRefresher from "./Refresher";
import DisplayPayments from "./DisplayPayments";

const { width, height } = Dimensions.get("screen");

const CreateSchool = ({ schoolData, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const profile = hasCompletedProfile(user);
  const navigation = useNavigation();
  const [searchSchool, { data, isLoading }] = useLazySearchSchoolsQuery();
  const [joinSchool, { isLoading: joinLoading }] = useJoinSchoolMutation();

  const [bools, setBools] = useState({
    search: false,
    searched: false,
    subModal: false,
  });
  const [school, setSchool] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const searchStyle = bools.search ? styles.searchOn : {};

  const translationY = useSharedValue(0);
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
        // searcher.value = withTiming(1, { duration: 700 });
        break;
      case "blur":
        setBools({ ...bools, search: false });
        break;
      case "callback":
        // !bools.search && setBools({ ...bools, search: true });
        try {
          await searchSchool(data).unwrap();
          !bools.searched && setBools({ ...bools, searched: true });
        } catch (err) {
          console.log({ err });
        }

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

  const onModalClose = (refresh) => {
    setBools({ ...bools, subModal: false });
    navigation.replace("Learn", { refresh });
  };

  const handleSchoolSub = (item) => {
    // return console.log({ item });
    setBools({ ...bools, subModal: true, data: { type: "school", school } });
  };

  const createActions = (type) => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }
    switch (type) {
      case "create":
        navigation.navigate("CreateSchool");
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
                  that help them become better!.
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

            <View style={[styles.row, { marginTop: 30 }]}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <AppText style={styles.text} fontWeight="medium">
                Creating a school profile involves paying a subscription amount
                of{" "}
                <AppText fontWeight="heavy">
                  {getCurrencyAmount(10000)} per term
                </AppText>{" "}
                . i.e a three(3) months subscription
              </AppText>
            </View>
          </View>
        )}
      />
      <AppModal
        visible={bools.subModal}
        setVisible={(bool) => setBools({ ...bools, subModal: bool })}
        Component={() => (
          <DisplayPayments hideModal={onModalClose} data={bools?.data} />
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
