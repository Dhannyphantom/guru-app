import { FlatList, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { dummySubjects } from "../helpers/dataStore";
import TopicItem from "../components/TopicItem";
import SearchBar from "../components/SearchBar";

const TopicsScreen = ({ route }) => {
  const data = route?.params?.item;
  const topics = dummySubjects.find((item) => item._id == data._id)?.topics;

  return (
    <View style={styles.container}>
      <AppHeader title={data?.name} />
      <SearchBar />
      <FlatList
        data={topics}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <TopicItem data={item} index={index} subject={data?.name} />
        )}
      />
    </View>
  );
};

export default TopicsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
