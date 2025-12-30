import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import { dummyLeaderboards } from "../helpers/dataStore";
import FriendCard from "../components/FriendCard";
import colors from "../helpers/colors";
import { Ionicons } from "@expo/vector-icons";
import SearchModal from "../components/SearchModal";
import { useState } from "react";
import { useLazySearchStudentsQuery } from "../context/usersSlice";

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
  const [searcher, setSearcher] = useState({ vis: false });

  const [searchStudents, { isLoading, data: res }] =
    useLazySearchStudentsQuery();

  const onSearch = async (q) => {
    if (q?.length < 3) return;
    try {
      await searchStudents(q).unwrap();
    } catch (errr) {
      console.log(errr);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Friends"
        Component={() => (
          <Pressable
            onPress={() => setSearcher({ ...searcher, vis: true })}
            style={{ padding: 10, paddingHorizontal: 20 }}
          >
            <Ionicons name="search" size={22} color={colors.primary} />
          </Pressable>
        )}
      />
      <View style={styles.stats}>
        <FollowStat head={5} sub={"Following"} />
        <FollowStat head={5} sub={"Mutuals"} />
        <FollowStat head={4} sub={"Followers"} />
      </View>
      <View style={styles.list}>
        <FlatList
          data={lists}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: height * 0.12 }}
          renderItem={({ item }) => <FriendCard data={item} />}
        />
      </View>
      <SearchModal
        vis={searcher.vis}
        setState={(obj) => setSearcher({ ...searcher, ...obj })}
        onSearch={onSearch}
        data={res?.data ?? []}
        ItemComponent={({ item }) => <FriendCard data={item} />}
        placeholder="Search fellow classmates..."
      />
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
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  stat: {
    alignItems: "center",
  },
});
