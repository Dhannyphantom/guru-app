import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import { dummyLeaderboards } from "../helpers/dataStore";
import FriendCard from "../components/FriendCard";
import colors from "../helpers/colors";

const { width, height } = Dimensions.get("screen");

const lists = dummyLeaderboards.map((item, idx) => {
  if (idx < 5) {
    return {
      ...item,
      status: "pending",
    };
  } else if (idx < 10) {
    return {
      ...item,
      status: "accepted",
    };
  } else {
    return item;
  }
});

const FollowStat = ({ head, sub }) => {
  return (
    <View style={styles.stat}>
      <AppText size={"xxlarge"} fontWeight="black">
        {head}
      </AppText>
      <AppText style={{ color: colors.medium }}>{sub}</AppText>
    </View>
  );
};

const FriendListScreen = () => {
  return (
    <View style={styles.container}>
      <AppHeader title="My Friends" />
      <View style={styles.stats}>
        <FollowStat head={5} sub={"Following"} />
        <FollowStat head={5} sub={"Co-followers"} />
        <FollowStat head={4} sub={"Followed"} />
      </View>
      <View style={styles.list}>
        <FlatList
          data={lists}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: height * 0.12 }}
          renderItem={({ item }) => <FriendCard data={item} />}
        />
      </View>
    </View>
  );
};

export default FriendListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  stats: {
    width: width * 0.8,
    backgroundColor: colors.white,
    alignSelf: "center",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 20,
    marginBottom: 20,
    elevation: 10,
  },
  stat: {
    alignItems: "center",
  },
});
