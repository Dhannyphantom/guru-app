import { Dimensions, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { Subjects } from "../components/AppDetails";
import SearchBar from "../components/SearchBar";
import { useFetchSubjectCategoriesQuery } from "../context/instanceSlice";

const { width, height } = Dimensions.get("screen");

const SubjectListScreen = ({ route }) => {
  const { data, isLoading } = useFetchSubjectCategoriesQuery(route?._id);

  return (
    <View style={styles.container}>
      <AppHeader title={route?.name ?? "Category"} />
      <SearchBar />
      <View style={{ flex: 1 }}>
        <Subjects
          noHeader
          loading={isLoading}
          data={data?.data}
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
