import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import FriendCard from "../components/FriendCard";
import colors from "../helpers/colors";
import { Ionicons } from "@expo/vector-icons";
import SearchModal from "../components/SearchModal";
import { useState } from "react";
import {
  useFetchFriendsQuery,
  useLazySearchStudentsQuery,
  useStudentActionMutation,
} from "../context/usersSlice";
import PromptModal from "../components/PromptModal";
import AnimatedPressable from "../components/AnimatedPressable";
import getRefresher from "../components/Refresher";

const { width, height } = Dimensions.get("screen");

const FollowStat = ({ head, onPress, active, sub }) => {
  const isActive = active === sub;

  return (
    <AnimatedPressable
      onPress={() => onPress?.(sub)}
      style={[
        styles.stat,
        { backgroundColor: isActive ? colors.primaryLighter + 40 : null },
      ]}
    >
      <AppText
        size={"xxlarge"}
        style={{ color: isActive ? colors.primaryDeep : colors.medium }}
        fontWeight="black"
      >
        {head}
      </AppText>
      <AppText style={{ color: isActive ? colors.primary : colors.medium }}>
        {sub}
      </AppText>
    </AnimatedPressable>
  );
};

const FriendListScreen = () => {
  const [searcher, setSearcher] = useState({ vis: false });
  const [prompt, setPrompt] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("Following");

  const { data: list, isLoading, refetch } = useFetchFriendsQuery();

  const [searchStudents, { data: res }] = useLazySearchStudentsQuery();

  const [studentActions] = useStudentActionMutation();

  let listData = [];

  switch (tab) {
    case "Following":
      listData = list?.data?.following;
      break;
    case "Followers":
      listData = list?.data?.followers;
      break;
    case "Mutuals":
      listData = list?.data?.mutuals;
      break;
  }

  const onSearch = async (q) => {
    if (q?.length < 3) return;

    try {
      await searchStudents(q).unwrap();
    } catch (_errr) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (errr) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleStudentAction = async (student, type) => {
    if (["Follow"].includes(type)) {
      try {
        await studentActions({
          type: "follow",
          user: student?._id,
        }).unwrap();
      } catch (_errr) {}
    } else if (["Following"].includes(type)) {
      setPrompt({
        vis: true,
        data: {
          title: "Unfollow Student",
          msg: `Are you sure you want to unfollow ${student?.username}?`,
          btn: "Unfollow",
          type: "unfollow",
        },
        cb: async () => {
          try {
            await studentActions({
              type: "unfollow",
              user: student?._id,
            }).unwrap();
          } catch (_errr) {}
        },
      });
      return;
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Friends"
        Component={() => (
          <Pressable
            onPress={() => setSearcher({ ...searcher, vis: true })}
            style={{
              padding: 12,
              paddingRight: 25,
              paddingHorizontal: 20,
            }}
          >
            <Ionicons name="search" size={22} color={colors.primary} />
          </Pressable>
        )}
      />
      <View style={styles.stats}>
        <FollowStat
          head={list?.data?.followingCount || 0}
          onPress={(txt) => setTab(txt)}
          active={tab}
          sub={"Following"}
        />
        <FollowStat
          head={list?.data?.mutualsCount || 0}
          onPress={(txt) => setTab(txt)}
          active={tab}
          sub={"Mutuals"}
        />
        <FollowStat
          head={list?.data?.followersCount || 0}
          onPress={(txt) => setTab(txt)}
          active={tab}
          sub={"Followers"}
        />
      </View>
      <View style={styles.list}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: height * 0.12 }}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          renderItem={({ item }) => (
            <FriendCard data={item} onPress={handleStudentAction} />
          )}
        />
      </View>
      <SearchModal
        vis={searcher.vis}
        setState={(obj) => setSearcher({ ...searcher, ...obj })}
        onSearch={onSearch}
        data={res?.data ?? []}
        ItemComponent={({ item }) => (
          <FriendCard data={item} onPress={handleStudentAction} />
        )}
        placeholder="Search fellow classmates..."
      />
      <PromptModal prompt={prompt} setPrompt={setPrompt} />
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
    marginBottom: 20,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  stat: {
    paddingVertical: 20,
    alignItems: "center",
    width: "33%",
    borderRadius: 20,
  },
});
