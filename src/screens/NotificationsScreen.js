import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import { notificationsArr } from "../helpers/dataStore";
import { NavBack } from "../components/AppIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  selectUser,
  useReadAnnouncementsMutation,
} from "../context/usersSlice";
import AnimatedPressable from "../components/AnimatedPressable";
import AppModal from "../components/AppModal";
import { useEffect, useState } from "react";
import NewAnnouncement from "../components/NewAnnouncement";
import {
  selectSchool,
  useFetchAnnouncementsQuery,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import getRefresher from "../components/Refresher";
import ListEmpty from "../components/ListEmpty";
import { dateFormatter } from "../helpers/helperFunctions";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

export const Header = ({
  title = "Notifications",
  icon = "notifications",
  Component,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.header}>
      <NavBack style={{ ...styles.nav, top: insets.top + 15 }} />
      <View style={{ ...styles.new, top: insets.top + 15 }}>
        {Component && <Component />}
      </View>
      <View style={styles.headerMain}>
        <Ionicons name={icon} size={30} color={"#fff"} />
        <AppText style={styles.headerTxt} size={"xxlarge"} fontWeight="black">
          {title}
        </AppText>
      </View>
    </View>
  );
};

const NotiItems = ({ item, index }) => {
  const router = useRouter();
  const isLast = index == notificationsArr.length - 1;
  let bgColor, borderColor, title;
  switch (item.type) {
    case "system":
      bgColor = colors.accent;
      borderColor = colors.accentDeeper;
      title = "Guru";
      break;
    case "alert":
      bgColor = colors.warning;
      borderColor = colors.warningDark;
      title = "Guru";
      break;
    case "important":
      bgColor = colors.heart;
      borderColor = colors.heartDeep;
      title = "Guru";
      break;

    default:
      bgColor = colors.primary;
      borderColor = colors.primaryDeep;
      title = "My School";
      break;
  }

  const handleItemPress = () => {
    if (Boolean(item?.type === "school")) {
      router.push({
        pathname: "/school",
        params: { refresh: true },
      });
    }
  };

  return (
    <>
      <Pressable onPress={handleItemPress} style={styles.item}>
        <View
          style={[
            styles.itemIcon,
            {
              backgroundColor: bgColor,
              borderColor,
              opacity: item?.read ? 0.5 : 0.9,
            },
          ]}
        >
          <Ionicons
            name={item.read ? "notifications-outline" : "notifications"}
            size={25}
            color={"#fff"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText fontWeight="bold">{title}</AppText>
          <AppText style={styles.itemMsg}>{item.message}</AppText>
        </View>
      </Pressable>
      <AppText size={"small"} fontWeight="bold" style={styles.itemDate}>
        {dateFormatter(item.date, "feed")}
      </AppText>
      {!isLast && <View style={styles.separator} />}
    </>
  );
};

const NotificationsScreen = () => {
  const route = useLocalSearchParams();
  const routeData = Boolean(route?.data) ? JSON.parse(route?.data) : {};
  const screen = routeData?.screen;
  const fromSchool = screen === "School";
  const school = useSelector(selectSchool);
  const [modal, setModal] = useState({ vis: false, data: null });
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useFetchAnnouncementsQuery(school?._id);
  const [readAnnouncements] = useReadAnnouncementsMutation();

  const announcements = data?.data;

  const user = useSelector(selectUser);
  const isTeacher = user?.accountType === "teacher";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch().unwrap();
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const newAssignmentHandler = () => {
    setModal({ vis: true, data: null });
  };

  useEffect(() => {
    if (announcements?.length > 0) {
      readAnnouncements({ schoolId: school?._id });
    }
  }, [data]);

  return (
    <View style={styles.container}>
      <Header
        title={fromSchool ? "School Announcements" : "Notifications"}
        Component={() =>
          isTeacher && (
            <AnimatedPressable
              onPress={newAssignmentHandler}
              style={styles.new}
            >
              <Ionicons name="add" size={30} color={colors.white} />
            </AnimatedPressable>
          )
        }
      />
      <View style={styles.main}>
        <FlatList
          data={announcements}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: height * 0.1 }}
          ListEmptyComponent={() => (
            <ListEmpty message="No new notifications" style={styles.empty} />
          )}
          renderItem={({ item, index }) => (
            <NotiItems item={item} index={index} />
          )}
        />
        <LottieAnimator visible={isLoading} absolute wTransparent />
      </View>
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ ...modal, vis: bool })}
        Component={() => (
          <NewAnnouncement
            closeModal={() => setModal({ vis: false, type: null })}
          />
        )}
      />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    height: height * 0.6,
  },
  header: {
    height: height * 0.21,
    backgroundColor: colors.primary,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: height * 0.06,
  },
  headerMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTxt: {
    color: colors.white,
    marginLeft: 8,
    maxWidth: "70%",
    textTransform: "capitalize",
    // marginHorizontal: width * 0.3,
    // backgroundColor: "red",
  },
  item: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    marginRight: 10,
  },
  itemIcon: {
    width: 50,
    height: 50,
    backgroundColor: "red",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 3,
    elevation: 1,
  },
  itemMsg: {
    flex: 1,
    marginTop: 5,
  },
  itemDate: {
    textAlign: "right",
    marginRight: 25,
    color: colors.medium,
  },
  main: {
    width: width * 0.9,
    height: Platform.OS == "web" ? "80%" : height * 0.69,
    backgroundColor: colors.white,
    alignSelf: "center",
    top: -30,
    borderRadius: 8,
  },
  nav: {
    position: "absolute",
    top: 0,
    left: 20,
  },
  new: {
    position: "absolute",
    // top: 0,
    right: 12,
  },
  separator: {
    height: 2,
    backgroundColor: colors.extraLight,
    width: "80%",
    alignSelf: "flex-end",
    marginRight: 20,
    borderRadius: 10,
    marginVertical: 10,
  },
});
