import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import AnimatedPressable from "../components/AnimatedPressable";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { useState } from "react";
import PopMessage from "../components/PopMessage";
import { useRouter } from "expo-router";

const editInstances = [
  {
    _id: "1",
    name: "Category",
    icon: "apps",
    route: "category",
  },
  {
    _id: "2",
    name: "Subject",
    route: "subjects",
    icon: "book",
  },
  {
    _id: "3",
    name: "Topic",
    route: "topic",
    icon: "list",
  },
  {
    _id: "4",
    name: "Question",
    icon: "help-circle",
    route: "questions",
  },
];
const { width, height } = Dimensions.get("screen");

export const EditItem = ({ data, onPress }) => {
  return (
    <AnimatedPressable
      onPress={() => onPress && onPress(data)}
      style={styles.itemOverlay}
    >
      <View style={styles.item}>
        <Ionicons name={data?.icon} size={50} color={colors.primaryLight} />
        <AppText fontWeight="heavy" size={"xlarge"} style={styles.itemTxt}>
          {data?.name}
        </AppText>
      </View>
    </AnimatedPressable>
  );
};

const InstanceEditScreen = () => {
  const user = useSelector(selectUser);
  const router = useRouter();

  const [popper, setPopper] = useState({ vis: false });

  const isManager = user?.accountType === "manager";

  const handleItemPress = (item) => {
    if (
      !isManager &&
      ["category", "subject"]?.includes(item?.name?.toLowerCase())
    ) {
      return setPopper({
        vis: true,
        msg: "Sorry, You're not authorized!",
        type: "failed",
      });
    }
    router.push({
      pathname: "/pros/instances",
      params: { item: JSON.stringify(item) },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Edit Instances" />
      <FlatList
        data={editInstances}
        numColumns={2}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: height * 0.125 }}
        renderItem={({ item }) => (
          <EditItem data={item} onPress={handleItemPress} />
        )}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default InstanceEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    backgroundColor: colors.primaryLighter,
    // flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: width * 0.46,
    height: height * 0.3,
    padding: 15,
    borderRadius: 8,
  },
  itemTxt: {
    color: colors.black,
    opacity: 0.8,
    marginTop: 20,
  },
  itemOverlay: {
    // alignSelf: "center",
    marginLeft: width * 0.026,
    marginBottom: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingBottom: 5,
    paddingRight: 0.5,
  },
});
