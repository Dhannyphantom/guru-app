import { Dimensions, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import LottieAnimator from "../components/LottieAnimator";
import { useEffect, useState } from "react";
import { capFirstLetter, getImageObj } from "../helpers/helperFunctions";
import colors from "../helpers/colors";
import AnimatedPressable from "../components/AnimatedPressable";
import {
  useFetchSubjectsQuery,
  useLazyFetchInstanceQuery,
  useLazyFetchSubjTopicsQuery,
} from "../context/instanceSlice";
import { SubjectItem } from "../components/AppDetails";
import getRefresher from "../components/Refresher";
import TopicItem from "../components/TopicItem";
import { Formik } from "formik";
import { FormikInput } from "../components/FormInput";
import {
  editQuestInitials,
  editQuestSchema,
  editTopicInitials,
  editTopicSchema,
} from "../helpers/yupSchemas";
import { FormikButton } from "../components/AppButton";
import SearchBar from "../components/SearchBar";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import ListEmpty from "../components/ListEmpty";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RenderQuestion } from "../components/QuizCorrections";

const { width, height } = Dimensions.get("screen");

const grids = ["category", "subjects"];

const RenderCategories = ({ data }) => {
  const router = useRouter();
  const img = getImageObj(data?.image);

  const onPress = () => {
    router.push({
      pathname: "/pros/create",
      params: { name: "category", type: "edit", data: JSON.stringify(data) },
    });
  };

  return (
    <AnimatedPressable onPress={onPress} style={styles.instance}>
      <View style={styles.instanceImgView}>
        <Image source={img} style={styles.instanceImg} />
      </View>
      <AppText style={styles.instanceTxt} size={"large"} fontWeight="black">
        {data?.name}
      </AppText>
    </AnimatedPressable>
  );
};

const RenderSubjects = ({ data, index }) => {
  return <SubjectItem data={data} isEdit={true} />;
};

const RenderTopics = ({ data, index, extra }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/pros/create",
      params: {
        name: "topics",
        type: "edit",
        data: JSON.stringify({ ...data, subject: extra }),
      },
    });
  };

  return (
    <TopicItem
      data={data}
      disabled={false}
      index={index}
      onPress={handlePress}
    />
  );
};

const QuestionRender = ({ data, index, extra = {} }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/pros/create",
      params: {
        name: "questions",
        type: "edit",
        data: JSON.stringify({ ...data, subject: extra }),
      },
    });
  };

  return (
    <RenderQuestion
      question={data}
      onPress={handlePress}
      showAnswers
      itemNum={index + 1}
      isSingle
    />
  );
};

const InstanceListScreen = () => {
  const routeParams = useLocalSearchParams();
  const screenData = routeParams?.item ? JSON.parse(routeParams?.item) : {};

  // const fetchParams = { route: screenData?.route };

  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ data: null, search: false, show: true });

  const [fetchInstance, { data, isLoading, isError, error }] =
    useLazyFetchInstanceQuery();
  const { data: subjects, isLoading: subLoading } =
    useFetchSubjectsQuery("pro_filter");
  const [fetchTopics, { data: topics, isLoading: topLoading }] =
    useLazyFetchSubjTopicsQuery();

  const instance = data?.data;
  const isTopic = screenData?.route === "topic";
  const isQuest = screenData?.route === "questions";

  // console.log({ instance });

  const getInstances = async (refresh, data) => {
    refresh && setRefreshing(true);
    switch (screenData?.route) {
      case "category":
        try {
          await fetchInstance({ route: screenData?.route });
        } catch (error) {
          console.log(error);
        } finally {
          refresh && setRefreshing(false);
        }
        break;
      case "topic":
        try {
          await fetchInstance({
            route: screenData?.route,
            subjectId: data?.subjectId,
          });
        } catch (error) {
          console.log(error);
        } finally {
          refresh && setRefreshing(false);
        }
        break;
      case "subjects":
        try {
          await fetchInstance({ route: screenData?.route });
        } catch (error) {
          console.log(error);
        } finally {
          refresh && setRefreshing(false);
        }
        break;
      case "questions":
        if (Boolean(data?.subjectId)) {
          try {
            await fetchInstance({
              route: screenData?.route,
              subjectId: data?.subjectId,
              topicId: data?.topicId,
            });
          } catch (error) {
            console.log(error);
          } finally {
            refresh && setRefreshing(false);
          }
        }

        break;

      default:
        break;
    }
  };

  const handleInstanceForm = async (fv) => {
    const formData = {},
      sendData = {};
    if (fv?.subject?.hasOwnProperty("_id")) {
      formData.subject = { _id: fv?.subject?._id, name: fv?.subject?.name };
      sendData.subjectId = fv?.subject?._id;
    }

    if (fv?.topic?.hasOwnProperty("_id")) {
      formData.topic = { _id: fv?.topic?._id, name: fv?.topic?.name };
      sendData.topicId = fv?.topic?._id;
    } else {
      sendData.topicId = null;
    }
    setForm({
      ...form,
      ...formData,
    });
    await getInstances(false, sendData);
  };

  const onSearch = (text) => {
    console.log({ text });
  };

  let RenderComponent, formInitials, formSchema;
  switch (screenData?.route) {
    case "category":
      RenderComponent = RenderCategories;
      break;
    case "subjects":
      RenderComponent = RenderSubjects;
      break;
    case "topic":
      RenderComponent = RenderTopics;
      formInitials = {
        ...editQuestInitials,
        subject: { _id: subjects?.data[0]?._id, name: subjects?.data[0]?.name },
      };
      formSchema = editTopicSchema;
      break;
    case "questions":
      RenderComponent = QuestionRender;
      formInitials = {
        ...editQuestInitials,
        subject: { _id: subjects?.data[0]?._id, name: subjects?.data[0]?.name },
      };
      formSchema = editQuestSchema;
      break;

    default:
      break;
  }

  useEffect(() => {
    getInstances();
  }, []);
  return (
    <View style={styles.container}>
      <AppHeader
        title={`Quiz ${screenData?.name}`}
        Component={() => (
          <View style={styles.header}>
            {isTopic ||
              (isQuest && (
                <AnimatedPressable
                  onPress={() => setForm({ ...form, show: !form.show })}
                  style={styles.headBtn}
                >
                  <Ionicons
                    name={form.show ? "eye-off" : "eye"}
                    size={20}
                    color={form.show ? colors.primary : colors.medium}
                  />
                </AnimatedPressable>
              ))}
            {isTopic && Boolean(instance) && (
              <AnimatedPressable style={styles.headBtn}>
                <Ionicons name="search" size={20} color={colors.primaryDeep} />
              </AnimatedPressable>
            )}
          </View>
        )}
      />
      {form.search && (
        <SearchBar placeholder="Search topics" onClickSearch={onSearch} />
      )}
      {(isTopic || isQuest) && form.show && (
        <Animated.View
          exiting={FadeOutUp.springify()}
          entering={FadeInDown.springify()}
        >
          <Formik
            validationSchema={formSchema}
            initialValues={formInitials}
            onSubmit={handleInstanceForm}
          >
            {({ values, initialValues }) => {
              return (
                <View>
                  <FormikInput
                    name={"subject"}
                    placeholder={
                      Boolean(initialValues["subject"])
                        ? capFirstLetter(initialValues["subject"]?.name)
                        : "Select subject"
                    }
                    type="dropdown"
                    data={subjects?.data}
                    getId
                    isLoading={subLoading}
                    // value={values["subject"]}
                    headerText={"Select subject:"}
                    // onLayout={() => setFieldTouched("subject", true)}
                    // showErr={bools.showErr}
                  />
                  {isQuest && (
                    <FormikInput
                      name={"topic"}
                      placeholder={"Select Topic"}
                      type="dropdown"
                      getId
                      isLoading={topLoading}
                      data={topics?.data}
                      fetcher={{
                        func: () => fetchTopics(values["subject"]._id),
                        // shouldCall: !topics,
                        state: values["subject"],
                      }}
                      // multiple
                      headerText={"Select topics:"}
                      // onLayout={() => setFieldTouched("topic", true)}
                      // showErr={bools.showErr}
                    />
                  )}
                  <FormikButton
                    title={`Fetch ${capFirstLetter(screenData?.route)}`}
                    contStyle={{ marginHorizontal: width * 0.15, elevation: 0 }}
                  />
                </View>
              );
            }}
          </Formik>
        </Animated.View>
      )}
      <Animated.FlatList
        layout={LinearTransition.springify().damping(20)}
        data={instance}
        keyExtractor={(item) => item._id}
        refreshControl={getRefresher({
          refreshing,
          onRefresh: async () =>
            await getInstances(true, {
              topicId: form?.topic?._id,
              subjectId: form?.subject?._id,
            }),
        })}
        numColumns={grids.includes(screenData?.route) ? 2 : 1}
        contentContainerStyle={{ paddingBottom: height * 0.125 }}
        ListEmptyComponent={() => <ListEmpty message="No results found..." />}
        renderItem={({ item, index }) =>
          RenderComponent && (
            <RenderComponent data={item} extra={form?.subject} index={index} />
          )
        }
      />
      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default InstanceListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headBtn: {
    paddingHorizontal: 10,
  },
  instance: {
    marginBottom: 20,
    width: width * 0.45,
    marginLeft: width * 0.025,
  },
  instanceImg: {
    width: width * 0.3,
    height: width * 0.3,
  },
  instanceImgView: {
    backgroundColor: colors.primaryLighter,
    padding: 20,
    alignSelf: "center",
    borderRadius: 8,
  },
  instanceTxt: {
    textAlign: "center",
    marginTop: 8,
  },
});
