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

const TopicsScreen = ({ route }) => {
  const { data, isLoading } = useFetchSubjTopicsQuery(route?._id);
  const user = useSelector(selectUser);

  const isStudent = user?.accountType === "student";

  return (
    <View style={styles.container}>
      <AppHeader title={route?.name} />
      {/* <SearchBar /> */}
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
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
