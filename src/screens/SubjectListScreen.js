import { Dimensions, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { Subjects } from "../components/AppDetails";
import SearchBar from "../components/SearchBar";
import { useFetchSubjectCategoriesQuery } from "../context/instanceSlice";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("screen");

const SubjectListScreen = ({ route }) => {
  const { data, isLoading } = useFetchSubjectCategoriesQuery(route?._id);

  const [cache, setCache] = useState([]);

  const fetchCache = async () => {
    let subjects = await AsyncStorage.getItem(`subjects_${route?._id}`);
    if (subjects) {
      subjects = JSON.parse(subjects);

      setCache(subjects);
    }
  };

  useEffect(() => {
    fetchCache();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title={route?.name ?? "Category"} />
      <SearchBar />
      <View style={{ flex: 1 }}>
        <Subjects
          noHeader
          loading={isLoading}
          data={data?.data ?? cache}
          contentContainerStyle={{ paddingBottom: height * 0.125 }}
        />
      </View>
    </View>
  );
};

export default SubjectListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
});
