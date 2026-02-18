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

const { width, height } = Dimensions.get("screen");

export const SchoolList = ({ item, onPress, status = "" }) => {
  const pending = status === "pending";
  const verification = status === "verification";
  const subscription = status === "subscription";
  const statusText = pending ? "pending" : `Awaiting ${status}`;

  const scaler = useSharedValue(1);

  const aniStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleX: scaler.value }],
    };
  });

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
        // onInputBlur={() => onSearch("blur")}
        loading={loading?.search}
        placeholder="Enter your school name..."
        onInputFocus={() => onSearch("focus")}
        showClose={true}
        onClose={showSearch ? () => onSearch("blur") : null}
        onClickSearch={(val) => onSearch("callback", val)}
      />
      {showSearch && (
        <View style={{ flex: 1 }}>
          {/* <LottieAnimator visible style={styles.lottie} /> */}

          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="hanlded"
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
            // style={{ flex: 1 }}
          />
        </View>
      )}
      <LottieAnimator visible={Boolean(loading?.page)} absolute wTransparent />
    </Animated.View>
  );
};

const JoinSchool = ({ schoolData, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const translationY = useSharedValue(0);
  const [searchSchool, { data, isLoading }] = useLazySearchSchoolsQuery();
  const [joinSchool, { isLoading: joinLoading }] = useJoinSchoolMutation();

  const [bools, setBools] = useState({ search: false, searched: false });
  const [school, setSchool] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });

  const searchStyle = bools.search ? styles.searchOn : {};

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
        try {
          const res = await searchSchool(data).unwrap();
        } catch (error) {
          console.log(error);
        }
        // !bools.search && setBools({ ...bools, search: true });

        break;
    }
  };

  const onSchoolPicked = async (item) => {
    const profile = hasCompletedProfile(user);
    if (!profile.bool) {
      return setPopper(profile.pop);
    }

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

    // Keyboard.dismiss();
    // setSchool(item);
    // setBools({ ...bools, search: false });
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
            <SchoolHeader name={"JOIN SCHOOL"} scrollY={translationY} />
            <AppText
              fontWeight="heavy"
              size={"xxlarge"}
              style={styles.salutation}
            >
              Hi, {user?.username}
            </AppText>
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
            {school && (
              <View style={styles.pending}>
                <SchoolList
                  item={school}
                  // onPress={handleSchoolSub}
                  status={school?.status}
                />
              </View>
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
    // height: height,
  },
  text: {
    color: colors.black,
    textAlign: "left",
    marginLeft: 3,
    marginRight: 20,
  },
});
