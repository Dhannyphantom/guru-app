import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import PopUpModal from "./PopUpModal";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";
import SearchBar from "./SearchBar";
import { dummyLeaderboards } from "../helpers/dataStore";
import FriendCard from "./FriendCard";

// FILES
import contactImg from "../../assets/images/abc.png";
import friendsImg from "../../assets/images/online-learning.png";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import WebLayout from "./WebLayout";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const ActionItem = ({ image, onPress, title, message }) => {
  return (
    <Pressable onPress={onPress} style={styles.actionItem}>
      <View style={styles.actionImgView}>
        <Image source={image} style={styles.actionImage} />
      </View>
      <WebLayout
        style={{
          flexDirection: "row",
          paddingBottom: 15,
          width: "80%",
          alignItems: "center",
        }}
      >
        <View style={styles.actionTxtView}>
          <AppText style={styles.actionTitle} fontWeight="bold" size={"large"}>
            {title}
          </AppText>
          <AppText style={styles.actionMsg}>{message}</AppText>
        </View>
        <View style={styles.actionNav}>
          <Ionicons name="chevron-forward" size={25} color={colors.medium} />
        </View>
      </WebLayout>
    </Pressable>
  );
};

const FindFriendsModal = ({ closeModal }) => {
  const user = useSelector(selectUser);
  const router = useRouter();

  // const screenWidth = useWindowDimensions();

  const isPro = user?.accountType == "professional";

  const handleNav = (screen) => {
    closeModal();
    router.push(screen);
  };

  return (
    <View style={styles.friendsModal}>
      <WebLayout
        // scroll
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-around",
          // alignItems: "center",
          width: "100%",
        }}
      >
        <WebLayout style={{ width: "35%", alignSelf: "flex-start" }}>
          <View style={styles.rowWide}>
            <AppText
              fontWeight="bold"
              size={"large"}
              style={{ marginLeft: 20, marginBottom: 10 }}
            >
              My Friends
            </AppText>
          </View>
          <SearchBar placeholder="Search name, username or email" />
          <View style={styles.action}>
            <ActionItem
              title={"Search Contact"}
              message={"Find friends by phone number"}
              onPress={() => !isPro && handleNav("/contact")}
              image={contactImg}
            />
            <View style={styles.separator} />
            <ActionItem
              title={"Invite Friends"}
              message={"Play together with your friends now"}
              onPress={() => !isPro && handleNav("/invite")}
              image={friendsImg}
            />
          </View>
        </WebLayout>
        <WebLayout style={{ width: "45%", alignSelf: null }}>
          <AppText fontWeight="bold" size={"large"} style={styles.headerTxt}>
            Students you may know
          </AppText>

          <WebLayout scroll>
            <View style={styles.list}>
              <FlatList
                data={dummyLeaderboards.map((item) => ({
                  user: { firstName: item.name },
                  school: item.school,
                  _id: item._id,
                }))}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 55 }}
                renderItem={({ item }) => <FriendCard data={item} />}
              />
            </View>
          </WebLayout>
        </WebLayout>
      </WebLayout>
    </View>
  );
};

const PopFriends = ({ visible, setter }) => {
  return (
    <PopUpModal
      visible={visible}
      setVisible={(bool) => setter(bool)}
      mainStyle={styles.main}
      Component={({ closeModal }) => (
        <FindFriendsModal closeModal={closeModal} />
      )}
    />
  );
};

export default PopFriends;

const styles = StyleSheet.create({
  action: {
    width: Platform.OS == "web" ? "100%" : width * 0.8,
    backgroundColor: colors.white,
    borderRadius: 35,
    alignSelf: "center",
    elevation: 8,
    marginBottom: 15,
    // paddingLeft: 8,
    paddingVertical: 4,
  },
  actionNav: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 15,
    opacity: 0.4,
  },
  actionItem: {
    flexDirection: Platform.OS == "web" ? "column" : "row",
    alignItems: "center",
    paddingLeft: 8,
  },
  actionImgView: {
    // width: width * 0.2,
    // height: width * 0.2,
    width: Platform.OS == "web" ? 100 : width * 0.2,
    height: Platform.OS == "web" ? 100 : width * 0.2,
    justifyContent: "center",
    alignItems: "center",
  },
  actionImage: {
    width: "60%",
    height: "60%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  friendsModal: {
    flex: 1,
    borderTopStartRadius: 25,
    borderTopEndRadius: 25,
    // backgroundColor: "red",
    // height: height * 0.4,
    // alignSelf: "flex-end",
    maxHeight: height * 0.9,
  },
  headerTxt: {
    marginBottom: 15,
    marginLeft: 15,
  },
  list: {
    flex: 1,
    width: Platform.OS === "web" ? 500 : width,
  },
  main: {
    // borderTopStartRadius: 25,
    // borderTopEndRadius: 25,
    // elevation: 15,
  },
  rowWide: {
    // width: Platform.OS == "web" ? "40%" : null,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  separator: {
    height: 2,
    width: "100%",
    backgroundColor: colors.extraLight,
  },
});
