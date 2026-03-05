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

// Compact header with tighter layout
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
          <Ionicons name="chevron-back" size={22} color={colors.medium} />
        </Pressable>
        <View style={styles.headerMain}>
          <AppText
            style={styles.headerSubText}
            fontWeight="bold"
            size={"small"}
          >
            Hi,{" "}
            <AppText
              style={{ color: colors.primaryDeep }}
              fontWeight="bold"
              size={"small"}
            >
              @{user.username}
            </AppText>
          </AppText>
          <AppText style={styles.headerText} fontWeight="heavy" size={"large"}>
            Guru Library
          </AppText>
        </View>
        <View style={styles.avatarContainer}>
          <Avatar
            size={Platform.OS === "web" ? 48 : width * 0.12}
            source={user?.avatar?.image}
            border={{ width: 2, color: colors.primaryLight }}
          />
          <AppText fontWeight="black" size={"tiny"} style={styles.accountType}>
            {user?.accountType}
          </AppText>
        </View>
      </View>
    </Screen>
  );
};

// Compact horizontal card layout
const ProItem = ({ item, index }) => {
  const router = useRouter();

  const isAnalytics = item.key === "panel";

  const handleActionItem = (item) => {
    if (isAnalytics) {
      router.navigate("/pros/panel");
    } else if (item?.key === "library") {
      router.navigate("/pros/edit");
    } else {
      router.push({
        pathname: "/pros/create",
        params: { name: item.key },
      });
    }
  };

  return (
    <View style={[styles.actionOverlay, { backgroundColor: bgMain[index] }]}>
      <Pressable
        onPress={() => handleActionItem(item)}
        style={[styles.action, { backgroundColor: colorArr[index] }]}
      >
        {/* Top row: number badge + title side by side */}
        <View style={styles.cardTop}>
          <View style={[styles.number, { backgroundColor: bgMain[index] }]}>
            <AppText
              fontWeight="black"
              size={"large"}
              style={styles.numberText}
            >
              {index + 1}
            </AppText>
          </View>
          <AppText style={styles.actionTitle} fontWeight="black">
            {item.name}
          </AppText>
        </View>

        {/* Description panel */}
        <View style={[styles.actionMain, { backgroundColor: bgMain[index] }]}>
          <AppText style={styles.actionText} size="xsmall" fontWeight="bold">
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
        data={isManager ? proActions : filtered}
        keyExtractor={(item) => item._id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => <ProItem index={index} item={item} />}
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default ProScreen;

const CARD_WIDTH = Platform.OS === "web" ? 220 : (width - 48) / 2;
const CARD_HEIGHT = Platform.OS === "web" ? 260 : height * 0.3;
const BADGE_SIZE = Platform.OS === "web" ? 36 : width * 0.1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flex: null,
    backgroundColor: colors.light,
    paddingRight: 16,
    elevation: 1,
    paddingBottom: 10,
  },
  headerRow: {
    flex: Platform.OS === "web" ? 1 : null,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
  },
  headerMain: {
    flex: 1,
  },
  headerSubText: {
    color: colors.medium,
    marginRight: 8,
    opacity: 0.75,
  },
  headerText: {
    color: colors.medium,
    marginRight: 8,
  },
  headerBack: {
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 16,
    opacity: 0.7,
    alignItems: "center",
    alignSelf: "center",
  },
  avatarContainer: {
    alignItems: "center",
  },
  accountType: {
    textAlign: "center",
    marginTop: 2,
    color: colors.primaryDeep,
    textTransform: "capitalize",
  },

  // ── Grid layout ─────────────────────────────────────────
  grid: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: height * 0.08,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },

  // ── Card ────────────────────────────────────────────────
  actionOverlay: {
    elevation: 8,
    paddingLeft: 4,
    paddingBottom: 4,
    borderRadius: 22,
    flex: 1,
    marginHorizontal: 4,
  },
  action: {
    borderRadius: 20,
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  number: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: colors.black,
    opacity: 0.5,
  },
  actionTitle: {
    fontSize: 22,
    color: colors.white,
    flexShrink: 1,
  },
  actionMain: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 14,
    borderRadius: 22,
  },
  actionText: {
    textAlign: "center",
    width: "80%",
    color: colors.black,
    opacity: 0.58,
  },
});
