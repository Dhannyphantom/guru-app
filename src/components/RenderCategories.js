import { Dimensions, Image, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";

const { width } = Dimensions.get("screen");

const RenderCategories = ({ item, quizInfo, setQuizInfo }) => {
  const isSelected =
    quizInfo.view === "category"
      ? quizInfo?.category?._id === item._id
      : quizInfo.subjects?.find((subj) => subj?._id == item._id);
  //
  //
  const handleItemPress = () => {
    switch (quizInfo.view) {
      case "category":
        setQuizInfo({
          ...quizInfo,
          category: item,
          bar: 2,
        });

        break;

      case "subjects":
        const currLength = quizInfo?.subjects?.length;
        const copier = [...quizInfo.subjects];
        const findIdx = copier.findIndex((subj) => subj?._id == item._id);
        if (findIdx >= 0) {
          // a match
          copier.splice(findIdx, 1);
        } else {
          // no match
          if (currLength > 1) return;
          copier.push(item);
        }

        setQuizInfo({
          ...quizInfo,
          subjects: copier,
          bar: 3,
        });

        break;

      default:
        break;
    }
  };

  return (
    <AnimatedPressable onPress={handleItemPress} style={styles.category}>
      <View
        style={[
          styles.categoryImgCont,
          {
            backgroundColor: isSelected ? colors.primaryLight : colors.unchange,
          },
        ]}
      >
        <Image source={item.image} style={{ width: "65%", height: "65%" }} />
      </View>
      <AppText
        fontWeight="bold"
        size={"large"}
        style={{
          textAlign: "center",
          marginTop: 10,
          textTransform: quizInfo?.view == "category" ? null : "capitalize",
          color: isSelected ? colors.primaryDeeper : colors.black,
        }}
      >
        {item.name}
      </AppText>
    </AnimatedPressable>
  );
};

export default RenderCategories;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  category: {
    marginHorizontal: width * 0.04,
    marginBottom: 20,
  },
  categoryImgCont: {
    width: width * 0.35,
    height: width * 0.35,
    backgroundColor: colors.unchange,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
});
