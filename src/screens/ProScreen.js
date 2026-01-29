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
import Screen from "../components/Screen";
import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { proActions } from "../helpers/dataStore";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const colorArr = [
  colors.facebook,
  colors.primary,
  colors.accent,
  colors.warning,
  colors.heart,
  colors.google,
];
const bgMain = [
  colors.light,
  colors.primaryLight,
  colors.accentLight,
  colors.warningLight,
  colors.heartLight,
  colors.heartLighter,
];

const Header = ({ user }) => {
  const router = useRouter();

  const handleNav = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/(tabs)/(home)");
    }
  };

  return (
    <Screen style={styles.header}>
      <View style={styles.headerRow}>
        <Pressable onPress={handleNav} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={colors.medium} />
        </Pressable>
        <View style={styles.headerMain}>
          <AppText style={styles.headerText} fontWeight="heavy" size={"large"}>
            Hi,{" "}
            <AppText
              style={{ ...styles.headerText, color: colors.primaryDeep }}
              fontWeight="heavy"
              size={"large"}
            >
              @{user.username}
            </AppText>
          </AppText>
          <AppText
            style={styles.headerText}
            fontWeight="bold"
            size={"xxxlarge"}
          >
            Welcome to Guru Library
          </AppText>
        </View>
        <View>
          <Avatar
            size={Platform.OS === "web" ? 70 : width * 0.2}
            source={user?.avatar?.image}
            border={{ width: 3, color: colors.primaryLight }}
          />
          <AppText fontWeight="black" size={"small"} style={styles.accountType}>
            {user?.accountType}
          </AppText>
        </View>
      </View>
    </Screen>
  );
};

const ProItem = ({ item, index }) => {
  const router = useRouter();

  const isAnalytics = item.key === "panel";

  const handleActionItem = (item) => {
    if (isAnalytics) {
      router.navigate("/pros/panel");
    } else if (item?.key === "library") {
      router.navigate("/pros/edit");
      // router.navigate("InstanceEdit");
    } else {
      router.push({
        pathname: "/pros/create",
        params: { name: item.key },
      });
      // router.navigate("Create", { name: item.key });
    }
  };

  return (
    <View style={[styles.actionOverlay, { backgroundColor: bgMain[index] }]}>
      <Pressable
        onPress={() => handleActionItem(item)}
        style={[styles.action, { backgroundColor: colorArr[index] }]}
      >
        <View style={[styles.number, { backgroundColor: bgMain[index] }]}>
          <AppText
            fontWeight="black"
            size={"xxxlarge"}
            style={styles.numberText}
          >
            {index + 1}
          </AppText>
        </View>
        <AppText style={styles.actionTitle} fontWeight="black">
          {item.name}
        </AppText>
        <View style={[styles.actionMain, { backgroundColor: bgMain[index] }]}>
          <AppText style={styles.actionText} fontWeight="bold">
            {item.text}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
};

const ProScreen = () => {
  const user = useSelector(selectUser);
  const isManager = user?.accountType === "manager";

  const filtered = proActions?.filter((item) => {
    return !["panel", "category", "subjects"].includes(item.key);
  });

  return (
    <View style={styles.container}>
      <Header user={user} />

      <FlatList
        data={["PRO"]}
        contentContainerStyle={{ paddingBottom: height * 0.125 }}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <>
            <FlatList
              data={isManager ? proActions : filtered}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={Platform.OS == "web"}
              // pagingEnabled
              contentContainerStyle={{ paddingLeft: 20, paddingVertical: 20 }}
              renderItem={({ item, index }) => (
                <ProItem index={index} item={item} />
              )}
            />
          </>
        )}
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default ProScreen;

const styles = StyleSheet.create({
  action: {
    borderRadius: 25,
    maxWidth: 300,
    width: width * 0.7,
    height: height * 0.6,
  },
  actionTitle: {
    fontSize: 50,
    color: colors.white,
    padding: 20,
  },
  actionOverlay: {
    marginRight: 30,
    elevation: 10,
    paddingLeft: 5,
    paddingBottom: 5,
    borderRadius: 30,
  },
  actionText: {
    textAlign: "center",
    width: "80%",
    color: colors.black,
    opacity: 0.58,
  },
  actionMain: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 20,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
  },
  accountType: {
    textAlign: "center",
    marginTop: 3,
    color: colors.primaryDeep,
    textTransform: "capitalize",
  },
  container: {
    flex: 1,

    backgroundColor: colors.unchange,
  },
  header: {
    flex: null,
    // width,
    // height: height * 0.22,
    backgroundColor: colors.light,
    paddingRight: 20,
    elevation: 1,
    paddingBottom: 15,
  },
  headerMain: {
    flex: 1,
  },
  headerRow: {
    flex: Platform.OS === "web" ? 1 : null,
    flexDirection: "row",
    // justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
  },

  headerText: {
    color: colors.medium,
    marginRight: 30,
  },
  headerBack: {
    paddingLeft: 15,
    paddingRight: 20,
    paddingVertical: 30,
    opacity: 0.7,
    alignItems: "center",
    alignSelf: "center",
    // justifyContent: "center",
  },
  number: {
    backgroundColor: colors.primaryDeeper,
    width: Platform.OS == "web" ? 65 : width * 0.2,
    height: Platform.OS == "web" ? 65 : width * 0.2,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    marginTop: 20,
  },

  numberText: {
    color: colors.black,
    opacity: 0.5,
  },
});
