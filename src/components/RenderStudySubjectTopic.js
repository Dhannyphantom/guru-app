import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Animated from "react-native-reanimated";
import { enterAnimOther, exitingAnim } from "../helpers/dataStore";
import AppModal from "./AppModal";
import { useEffect, useState } from "react";
import { ProgressBar } from "./AppDetails";
import AppButton from "./AppButton";
import LottieAnimator from "./LottieAnimator";
import { useFetchSubjectsTopicsMutation } from "../context/instanceSlice";
import { capFirstLetter } from "../helpers/helperFunctions";
import AnimatedPressable from "./AnimatedPressable";
import ListEmpty from "./ListEmpty";

const { width, height } = Dimensions.get("screen");

const TopicList = ({ data, onPress, fetcher, closeModal }) => {
  const [refreshing, setRefreshing] = useState(false);
  const hasTopic = Boolean(data?.topics[0]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetcher?.();
    } catch (errr) {
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.topicModal}>
      <AppText fontWeight="heavy" size={"large"}>
        {capFirstLetter(data?.name)} Topics
      </AppText>
      <View style={{ flex: 1 }}>
        <FlatList
          data={data?.topics}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <ListEmpty style={{ width: null }} vis message="No Topics Found!" />
          }
          renderItem={({ item }) => {
            return (
              <Pressable
                style={styles.topicItem}
                onPress={() => onPress && onPress(item, data?.name)}
              >
                <Feather
                  name={item.visible ? "check-circle" : "circle"}
                  color={item.visible ? colors.primaryDeep : colors.medium}
                  size={16}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.topicItemMain}>
                    <AppText
                      fontWeight={item.visible ? "bold" : "medium"}
                      style={{
                        color: item.visible ? colors.primaryDeep : colors.black,
                        marginLeft: 6,
                      }}
                    >
                      {item.name}
                    </AppText>
                  </View>
                  <View style={styles.progress}>
                    <ProgressBar
                      barHeight={11}
                      value={item?.qBankQuestions}
                      // value={item?.answeredNum}
                      max={item?.totalQuestions}
                      tint={item?.visible ? colors.primary : colors.medium}
                      hideProgressText
                      // style={{ marginTop: 10 }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
      <AppButton
        title={hasTopic ? "Update Quiz Topic" : "Close"}
        contStyle={{ marginTop: 30 }}
        type={hasTopic ? "primary" : "warn"}
        onPress={closeModal}
      />
    </View>
  );
};

const RenderStudySubjectTopic = ({ quizInfo, setQuizInfo }) => {
  const [bools, setBools] = useState({ topicModal: false, data: null });

  const subjects = quizInfo?.subjects ?? [];

  const [fetchTopics, { isLoading }] = useFetchSubjectsTopicsMutation();

  const showTopicList = (data) => {
    setBools({ ...bools, topicModal: true, data });
  };

  const handleSelectTopic = (item, topic) => {
    const newSubjectArr = subjects?.map((obj) => {
      if (obj._id === item._id) {
        // make changes
        return {
          ...obj,
          topics: obj.topics?.map((topicObj) => {
            if (topicObj._id == topic._id) {
              // make changes
              return {
                ...topicObj,
                hasStudied: !topicObj.hasStudied,
              };
            } else {
              return topicObj;
            }
          }),
        };
      } else {
        return obj;
      }
    });
    setQuizInfo({ ...quizInfo, subjects: newSubjectArr });
  };

  const updateTopics = (item, subject) => {
    const copier = [...subjects];

    const subjectIdx = copier.findIndex((subj) => subj.name === subject);

    if (subjectIdx >= 0) {
      copier[subjectIdx].topics = copier[subjectIdx]?.topics?.map(
        (currTopic) => {
          if (currTopic?._id === item?._id) {
            return {
              ...currTopic,
              visible: true,
            };
          } else {
            return {
              ...currTopic,
              visible: false,
            };
          }
        },
      );

      setBools({ ...bools, data: copier[subjectIdx] });

      // const checkIdx = copier[subjectIdx]?.topics?.findIndex(
      //   (topic) => topic?.visible
      // );
      // if (checkIdx < 0) {
      //   return;
      // }
    }

    // setQuiz
  };

  const renderTopics = ({ item }) => {
    return (
      <View style={{ marginLeft: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Feather name="book" size={18} />
          <AppText
            style={{
              marginLeft: 6,
              color: colors.black,
              marginBottom: 6,
              textTransform: "capitalize",
            }}
            fontWeight="bold"
            size={"xlarge"}
          >
            {item.name}
          </AppText>
          <View
            style={{
              flex: 1,
              alignItems: "flex-end",
              marginRight: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => showTopicList(item)}
              style={{
                flexDirection: "row",
                padding: 12,
                alignItems: "center",
              }}
            >
              <Feather name="edit-3" color={colors.medium} size={12} />
              <AppText
                style={{ marginLeft: 6, color: colors.medium }}
                fontWeight="bold"
              >
                Change topic
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginLeft: 40 }}>
          {item.topics?.map((obj) => {
            //  { q: obj?.progress, t: obj?.totalQuestions });
            if (obj.visible) {
              return (
                <AnimatedPressable
                  onPress={() => handleSelectTopic(item, obj)}
                  // activeOpacity={0.8}
                  key={obj._id}
                  style={styles.topicItem}
                >
                  <Feather
                    name={obj.hasStudied ? "check-circle" : "circle"}
                    color={obj.hasStudied ? colors.primaryDeep : colors.medium}
                    size={16}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.topicItemMain}>
                      <AppText
                        fontWeight={obj.hasStudied ? "bold" : "medium"}
                        style={{
                          color: obj.hasStudied
                            ? colors.primaryDeep
                            : colors.black,
                          marginLeft: 6,
                        }}
                      >
                        {capFirstLetter(obj.name)}
                      </AppText>
                    </View>
                    <View style={styles.progress}>
                      <ProgressBar
                        barHeight={11}
                        value={obj?.qBankQuestions}
                        max={obj?.totalQuestions}
                        // value={obj?.answeredNum}
                        // max={obj?.questionsNum}
                        hideProgressText
                        // style={{ marginTop: 10 }}
                      />
                    </View>
                  </View>
                </AnimatedPressable>
              );
            }
          })}
        </View>
      </View>
    );
  };

  const getTopics = async () => {
    const subjectList = subjects?.map((item) => item._id);

    try {
      const res = await fetchTopics({
        subjects: subjectList,
        category: quizInfo.category?._id,
      }).unwrap();
      const newSubjects = subjects?.map((subject) => {
        const subjectData = res?.data?.find(
          (resSubject) => resSubject?._id === subject?._id,
        );
        if (subjectData) {
          return {
            ...subject,
            topics: subjectData?.topics,
          };
        }
      });
      setQuizInfo({ ...quizInfo, subjects: newSubjects });
    } catch (_error) {}
  };

  useEffect(() => {
    getTopics();
  }, []);

  return (
    <Animated.View
      entering={enterAnimOther}
      exiting={exitingAnim}
      style={styles.topic}
    >
      <AppText style={styles.title} fontWeight="medium" size={"small"}>
        Pick topics you&apos;ve revised or take few minutes to revise selected
        topics, confirm each topic and start your quiz session
      </AppText>
      <View>
        <FlatList
          data={subjects}
          extraData={quizInfo}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 60 }}
          renderItem={renderTopics}
        />
      </View>
      <AppModal
        visible={bools.topicModal}
        setVisible={(bool) => setBools({ ...bools, topicModal: bool })}
        Component={() => (
          <TopicList
            data={bools?.data}
            fetcher={getTopics}
            closeModal={() => setBools({ ...bools, topicModal: false })}
            onPress={updateTopics}
          />
        )}
      />
      <LottieAnimator visible={isLoading} absolute wTransparent />
    </Animated.View>
  );
};

export default RenderStudySubjectTopic;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  progress: {
    flex: 1,
    marginRight: 30,
    marginLeft: 5,
    marginTop: 5,
  },
  topic: {
    flex: 1,
    width: "100%",
    minHeight: height * 0.7,
  },
  topicModal: {
    width: width * 0.95,
    backgroundColor: colors.extraLight,
    padding: 15,
    borderRadius: 6,
    height: height * 0.75,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    paddingBottom: 15,
  },
  topicItemMain: {
    // paddingVertical: 15,
    // flexDirection: "row",
    // alignItems: "center",
  },
  topicItem: {
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    // alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginTop: 15,
    marginBottom: 20,
    width: "75%",
    alignSelf: "center",
  },
});
