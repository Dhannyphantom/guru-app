/* eslint-disable react-hooks/exhaustive-deps */
import { FlatList, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { PAD_BOTTOM } from "../helpers/dataStore";
import TopicItem from "../components/TopicItem";
// import SearchBar from "../components/SearchBar";
import { useFetchSubjTopicsQuery } from "../context/instanceSlice";
import LottieAnimator from "../components/LottieAnimator";
import ListEmpty from "../components/ListEmpty";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import getRefresher from "../components/Refresher";

const TopicsScreen = ({ route }) => {
  const { data, isLoading, refetch } = useFetchSubjTopicsQuery(route?._id);
  const user = useSelector(selectUser);

  const [cache, setCache] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const isStudent = user?.accountType === "student";

  const fetchCache = async () => {
    let topics = await AsyncStorage.getItem(`topics_${route?._id}`);
    if (topics) {
      topics = JSON.parse(topics);
      setCache(topics);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await refetch().unwrap();
    } catch (_errr) {
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCache();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title={route?.name} />
      {/* <SearchBar /> */}
      <FlatList
        data={data?.data ?? cache}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        ListEmptyComponent={
          <ListEmpty vis={!isLoading} message="No Topics Yet" />
        }
        renderItem={({ item, index }) => (
          <TopicItem
            data={item}
            index={index}
            disabled={!isStudent}
            subject={route}
          />
        )}
      />
      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default TopicsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
