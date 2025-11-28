import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Formik } from "formik";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";

import AppText from "../components/AppText";
import AppHeader from "./AppHeader";
import PopMessage from "./PopMessage";
import InstanceAction, { AddInstance } from "./InstanceAction";
import AppButton from "./AppButton";
import { FormikInput } from "./FormInput";
import {
  createNewQuestInitials,
  createNewQuestSchema,
  createQuestInitials,
  createQuestSchema,
} from "../helpers/yupSchemas";
import { pointsSelect, timerSelect } from "../helpers/dataStore";
import { QuizQuestion } from "./QuestionDisplay";
import AppModal from "./AppModal";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";
import { capFirstLetter, getErrMsg } from "../helpers/helperFunctions";
import AnimatedCheckBox from "./AnimatedCheckbox";
import {
  useCreateQuestionMutation,
  useFetchCategoriesQuery,
  useFetchSubjectsQuery,
  useLazyFetchSubjTopicsQuery,
  useUpdateInstanceMutation,
} from "../context/instanceSlice";
import {
  selectSchool,
  useCreateSchoolQuizMutation,
  useUpdateSchoolQuizMutation,
} from "../context/schoolSlice";
import { selectUser } from "../context/usersSlice";
import WebLayout from "./WebLayout";
import PromptModal from "./PromptModal";
import LottieAnimator from "./LottieAnimator";

const { width, height } = Dimensions.get("screen");

// Default answer structure
const createDefaultAnswers = () =>
  Array(4)
    .fill(null)
    .map(() => ({ _id: nanoid(), name: "", correct: false }));

// Create fresh question template
const createFreshQuestion = (baseInitials, preserveFields = {}) => ({
  ...baseInitials,
  ...preserveFields,
  answers: createDefaultAnswers(),
  question: "",
  timer: baseInitials.timer,
  point: baseInitials.point,
  isTheory: false, // Add isTheory as a property of each question
});

const Picker = ({ item, value, text, disabled, onPick }) => {
  const isPicked = item === value;
  return (
    <AnimatedPressable
      onPress={() => onPick(item)}
      disabled={disabled}
      style={[
        styles.pickerOverlay,
        { backgroundColor: isPicked ? colors.primaryDeep : colors.lightly },
      ]}
    >
      <View
        style={[
          styles.pickerItem,
          { backgroundColor: isPicked ? colors.primary : colors.extraLight },
        ]}
      >
        <AppText
          style={{
            ...styles.pickerText,
            color: isPicked ? colors.white : colors.black,
            opacity: isPicked ? 1 : 0.8,
          }}
          fontWeight="black"
          size="xlarge"
        >
          {String(item)} {text}
        </AppText>
      </View>
    </AnimatedPressable>
  );
};

const PickModal = ({ closeModal, name, currentValue, onSelect }) => {
  const lists = name === "timer" ? timerSelect : pointsSelect;
  const text = name === "timer" ? "sec" : "GT";

  const handlePickItem = useCallback(
    (val) => {
      onSelect(val);
      closeModal?.();
    },
    [onSelect, closeModal]
  );

  return (
    <View style={styles.picker}>
      <AppText style={styles.pickerTitle} fontWeight="heavy" size="xlarge">
        {name}
      </AppText>
      <View style={styles.separator} />
      <View style={{ alignItems: "center" }}>
        <FlatList
          data={lists}
          keyExtractor={(item) => item._id}
          numColumns={2}
          renderItem={({ item }) => (
            <Picker
              item={item.num}
              value={currentValue}
              text={text}
              onPick={handlePickItem}
            />
          )}
        />
      </View>
    </View>
  );
};

export const NewQuestions = ({
  noHeader = false,
  isEdit = false,
  secBtn,
  hideBackBtn,
  schoolQuiz,
  scrollPaddingBottom = 15,
  questionBank,
  extra = {},
  type,
  data,
}) => {
  const navigation = useNavigation();
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);

  // Choose schema/initials based on header
  const baseInitials = useMemo(
    () => (noHeader ? createNewQuestInitials : createQuestInitials),
    [noHeader]
  );
  const baseSchema = useMemo(
    () => (noHeader ? createNewQuestSchema : createQuestSchema),
    [noHeader]
  );

  // Preserved fields across instances (like subject, categories)
  const preservedFields = useMemo(() => ["subject", "topic", "categories"], []);

  // Initialize questions array
  const [questions, setQuestions] = useState(() => {
    if (type === "edit" && data) {
      return [
        {
          ...baseInitials,
          ...data,
          answers: data.answers || createDefaultAnswers(),
          isTheory: data.isTheory ?? false, // Ensure isTheory is preserved from data
        },
      ];
    }
    if (Array.isArray(questionBank) && questionBank.length > 0) {
      return questionBank.map((q) => ({
        ...q,
        isTheory: q.isTheory ?? false, // Ensure each question has isTheory property
      }));
    }
    return [createFreshQuestion(baseInitials)];
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [modal, setModal] = useState({ vis: false, type: null });
  const [prompt, setPrompt] = useState({ vis: false });
  const [popper, setPopper] = useState({ vis: false });
  const [error, setError] = useState(null);

  // Queries
  const { data: subjects, isLoading: subjLoading } =
    useFetchSubjectsQuery("pro_filter");
  const { data: categories, isLoading: catLoading } = useFetchCategoriesQuery();
  const [fetchTopics, { data: topics, isLoading: topLoading }] =
    useLazyFetchSubjTopicsQuery();

  // Mutations
  const [createQuestion, { isLoading }] = useCreateQuestionMutation();
  const [createSchoolQuiz, { isLoading: creating }] =
    useCreateSchoolQuizMutation();
  const [updateSchoolQuiz, { isLoading: updating }] =
    useUpdateSchoolQuizMutation();
  const [updateInstance, { isLoading: instanceUpdating }] =
    useUpdateInstanceMutation();

  // Current question
  const currentQuestion = questions[activeIndex];

  // Instance management functions
  const updateCurrentQuestion = useCallback(
    (updates) => {
      setQuestions((prev) => {
        const newQuestions = [...prev];
        newQuestions[activeIndex] = {
          ...newQuestions[activeIndex],
          ...updates,
        };
        return newQuestions;
      });
    },
    [activeIndex]
  );

  const addNewInstance = useCallback(() => {
    setError(null);

    // Validate current question
    const current = questions[activeIndex];
    if (!current.question.trim()) {
      setError("Please enter a question before adding a new instance");
      return;
    }

    const hasCorrectAnswer = current.answers?.some((answer) => answer.correct);
    if (!hasCorrectAnswer) {
      setError("Please select a correct answer before adding a new instance");
      return;
    }

    // Create new question with preserved fields
    const preserveFields = {};
    preservedFields.forEach((field) => {
      if (current[field]) {
        preserveFields[field] = current[field];
      }
    });

    const newQuestion = createFreshQuestion(baseInitials, preserveFields);

    setQuestions((prev) => [...prev, newQuestion]);
    setActiveIndex((prev) => prev + 1);
  }, [questions, activeIndex, baseInitials, preservedFields]);

  const switchToInstance = useCallback(({ idx }) => {
    setActiveIndex(idx);
    setError(null);
  }, []);

  const deleteInstance = useCallback(() => {
    if (questions.length <= 1) return;

    const newQuestions = questions.filter((_, index) => index !== activeIndex);
    const newActiveIndex = Math.min(activeIndex, newQuestions.length - 1);

    setQuestions(newQuestions);
    setActiveIndex(newActiveIndex);
  }, [questions, activeIndex]);

  const onSave = useCallback(() => {
    setError(null);
  }, []);

  // Modal handlers
  const openModal = useCallback((type) => {
    setModal({ vis: true, type });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ vis: false, type: null });
  }, []);

  const handleTimerPointSelect = useCallback(
    (value) => {
      updateCurrentQuestion({ [modal.type]: value });
    },
    [modal.type, updateCurrentQuestion]
  );

  // Handler for isTheory checkbox
  const handleTheoryToggle = useCallback(
    (checked) => {
      updateCurrentQuestion({ isTheory: checked });
    },
    [updateCurrentQuestion]
  );

  // Form submission
  const uploadData = useCallback(
    async (saveForLater = false) => {
      try {
        setError(null);

        // Validate all questions
        const validationErrors = [];
        questions.forEach((q, index) => {
          if (!q.question.trim()) {
            validationErrors.push(
              `Question ${index + 1}: Question text is required`
            );
          }
          const hasCorrect = q.answers?.some((a) => a.correct);
          if (!hasCorrect) {
            validationErrors.push(
              `Question ${index + 1}: Must have a correct answer`
            );
          }
        });

        if (validationErrors.length > 0) {
          setError(validationErrors.join(", "));
          return;
        }

        if (type === "edit") {
          await updateInstance({
            ...currentQuestion,
            route: "question",
          }).unwrap();

          setPopper({
            vis: true,
            msg: "Question updated successfully",
            type: "success",
            timer: 2000,
            cb: () => navigation.navigate("InstanceEdit"),
          });
          return;
        }

        if (schoolQuiz) {
          const payload = {
            questions,
            ...schoolQuiz,
            schoolId: school?._id,
            save: saveForLater,
          };

          if (isEdit) {
            await updateSchoolQuiz({
              _id: extra?.quizId,
              ...payload,
            }).unwrap();
            setPopper({
              vis: true,
              msg: "Quiz Updated Successfully",
              type: "success",
              timer: 2000,
              cb: () => navigation.goBack(),
            });
          } else {
            await createSchoolQuiz(payload).unwrap();
            setPopper({
              vis: true,
              msg: "Quiz Created Successfully",
              type: "success",
              timer: 2000,
              cb: () => navigation.goBack(),
            });
          }
          return;
        }

        await createQuestion(questions).unwrap();

        return console.log({ questions });
        setPopper({
          vis: true,
          msg: "Questions created successfully",
          type: "success",
          timer: 2000,
          cb: () => navigation.goBack(),
        });
      } catch (err) {
        setPopper({
          vis: true,
          msg: err?.data?.message || err?.message || "Something went wrong",
          type: "failed",
          timer: 3000,
        });
      }
    },
    [
      questions,
      type,
      currentQuestion,
      schoolQuiz,
      school?._id,
      extra?.quizId,
      isEdit,
      updateInstance,
      updateSchoolQuiz,
      createSchoolQuiz,
      createQuestion,
      navigation,
    ]
  );

  const handlePrompt = useCallback(async (actionType) => {
    switch (actionType) {
      case "delete":
        // Handle delete logic here if needed
        break;
      default:
        break;
    }
  }, []);

  // Memoized values
  const instanceArr = useMemo(
    () => questions.map((_, index) => index + 1),
    [questions.length]
  );

  const canDelete = questions.length > 1;
  const isLast = activeIndex === questions.length - 1;

  return (
    <>
      <Formik
        validationSchema={baseSchema}
        initialValues={currentQuestion}
        enableReinitialize
        onSubmit={() => uploadData()}
      >
        {({ errors, touched }) => (
          <View style={styles.container}>
            <AppHeader
              title={`${type === "edit" ? "Edit" : "Create New"} question${
                type === "edit" ? "" : "s"
              }`}
              Component={() => (
                <InstanceAction
                  canDelete={canDelete}
                  showSave
                  onSave={onSave}
                  onDelete={deleteInstance}
                />
              )}
            />

            <KeyboardAvoidingView
              behavior="padding"
              keyboardVerticalOffset={-50}
              style={{ flex: 1 }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
              >
                <WebLayout
                  style={{ flex: 1, flexDirection: "row", width: 1200 }}
                >
                  {/* Left: Question + Answers */}
                  <WebLayout style={{ width: "55%", margin: 20 }}>
                    <QuizQuestion
                      questionVal={currentQuestion.question}
                      answersVal={currentQuestion.answers}
                      image={currentQuestion?.image}
                      onUpdateQuestion={updateCurrentQuestion}
                      onLayout={() => {}}
                      onTouch={() => {}}
                    />
                  </WebLayout>

                  {/* Right: Timer/Point + Meta */}
                  <WebLayout style={{ flex: 1, margin: 20 }}>
                    {/* Timer / Point */}
                    <View style={styles.row}>
                      <AnimatedPressable
                        style={styles.tag}
                        onPress={() => openModal("timer")}
                      >
                        <AppText size="large" fontWeight="bold">
                          Time
                        </AppText>
                        <AppText fontWeight="heavy" style={styles.tagText}>
                          {currentQuestion.timer} sec
                        </AppText>
                      </AnimatedPressable>
                      <AnimatedPressable
                        style={styles.tag}
                        onPress={() => openModal("point")}
                      >
                        <AppText size="large" fontWeight="bold">
                          Point
                        </AppText>
                        <AppText fontWeight="heavy" style={styles.tagText}>
                          {currentQuestion.point} GT
                        </AppText>
                      </AnimatedPressable>
                    </View>

                    {/* Subject / Topic / Categories */}
                    {!noHeader && (
                      <>
                        <FormikInput
                          name="subject"
                          placeholder={
                            capFirstLetter(currentQuestion?.subject?.name) ||
                            "Select subject"
                          }
                          headerText="Select Subject:"
                          getId
                          useDefaultModalHeight
                          onValueSelected={(formData) => {
                            // Update the current question with the selected subject
                            updateCurrentQuestion({
                              subject: formData,
                              topic: null, // Clear topic when subject changes
                            });

                            // Fetch topics for the selected subject
                            if (formData?._id) {
                              fetchTopics(formData._id);
                            }
                          }}
                          isLoading={subjLoading}
                          type="dropdown"
                          data={subjects?.data}
                        />

                        <FormikInput
                          name="topic"
                          placeholder="Select Topic"
                          type="dropdown"
                          useDefaultModalHeight
                          maxModalHeight={height * 0.8}
                          getId
                          isLoading={topLoading}
                          onValueSelected={(formData) => {
                            // Update the current question with the selected topic
                            updateCurrentQuestion({ topic: formData });
                          }}
                          data={topics?.data}
                          fetcher={{
                            func: async () =>
                              Boolean(currentQuestion?.subject?._id) &&
                              (await fetchTopics(
                                currentQuestion.subject._id
                              ).unwrap()),
                            state: currentQuestion?.subject,
                          }}
                          headerText="Select topics:"
                        />

                        <FormikInput
                          name="categories"
                          placeholder="Select subject categories"
                          type="dropdown"
                          data={categories?.data}
                          isLoading={catLoading}
                          maxModalHeight={height * 0.8}
                          useDefaultModalHeight
                          onValueSelected={(formData) => {
                            // Update the current question with the selected topic
                            updateCurrentQuestion({ categories: formData });
                          }}
                          multiple
                          getId
                          headerText="Select categories:"
                        />

                        <View style={styles.theory}>
                          <AppText fontWeight="bold">Theory Question?</AppText>
                          <AnimatedCheckBox
                            isChecked={currentQuestion.isTheory}
                            setIsChecked={handleTheoryToggle}
                          />
                        </View>
                      </>
                    )}
                  </WebLayout>
                </WebLayout>

                {/* Buttons */}
                <View style={styles.formBtns}>
                  {secBtn && !hideBackBtn && (
                    <AppButton
                      title={secBtn.title}
                      onPress={secBtn.onPress}
                      contStyle={styles.formBtn}
                      type={secBtn.type}
                    />
                  )}

                  {isLast && (
                    <View style={{ marginTop: 20 }}>
                      <AppButton
                        title={`${
                          type === "edit"
                            ? `Update Question${type === "edit" ? "" : "s"}`
                            : noHeader
                            ? secBtn?.primary ||
                              `Create Question${type === "edit" ? "" : "s"}`
                            : `Create Question${type === "edit" ? "" : "s"}`
                        }`}
                        type={type === "edit" ? "accent" : "primary"}
                        onPress={() => uploadData()}
                        icon={{
                          left: true,
                          name: type === "edit" ? "help-circle" : "upload",
                        }}
                        contStyle={styles.formBtn}
                      />

                      {type === "edit" && (
                        <AppButton
                          title="Delete Question"
                          type="warn"
                          icon={{ left: true, name: "delete" }}
                          onPress={() =>
                            setPrompt({
                              vis: true,
                              data: {
                                title: "Delete Question",
                                msg: "Are you sure you want to delete this question?",
                                btn: "Delete",
                                type: "delete",
                              },
                            })
                          }
                          contStyle={styles.formBtn}
                        />
                      )}
                    </View>
                  )}
                </View>

                {secBtn?.accent && (
                  <View style={styles.footer}>
                    <View style={styles.footerHead}>
                      <View style={styles.footerSeparator} />
                      <AppText style={styles.footerTxt} fontWeight="heavy">
                        OR
                      </AppText>
                      <View style={styles.footerSeparator} />
                    </View>
                    <AppButton
                      title="Save Quiz For Later"
                      type="accent"
                      onPress={() => uploadData(true)}
                    />
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>

            {error && (
              <AppText style={styles.fromErr} fontWeight="medium">
                {error}
              </AppText>
            )}

            {type !== "edit" && (
              <AddInstance
                list={instanceArr}
                updateActiveIndex={switchToInstance}
                activeIndex={activeIndex}
                createNewInstance={addNewInstance}
              />
            )}

            <AppModal
              visible={modal.vis}
              Component={() => (
                <PickModal
                  closeModal={closeModal}
                  name={modal.type}
                  currentValue={currentQuestion[modal.type]}
                  onSelect={handleTimerPointSelect}
                />
              )}
            />
          </View>
        )}
      </Formik>

      <LottieAnimator
        visible={isLoading || instanceUpdating || creating || updating}
        wTransparent
        absolute
      />

      <PopMessage popData={popper} setPopData={setPopper} />

      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompt}
      />
    </>
  );
};

export default NewQuestions;

// Styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1 },
  formBtn: { alignSelf: "center" },
  formBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  fromErr: {
    textAlign: "center",
    color: colors.heartDark,
    marginTop: 10,
    marginBottom: 10,
    width: "80%",
    alignSelf: "center",
  },
  footer: { marginHorizontal: 25, alignItems: "center" },
  footerHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  footerTxt: {
    padding: 10,
    backgroundColor: colors.extraLight,
    color: colors.medium,
  },
  footerSeparator: {
    height: 2,
    flex: 1,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
    width: Platform.OS === "web" ? "100%" : width * 0.8,
    alignSelf: "center",
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "space-evenly",
  },
  picker: {
    width: Platform.OS === "web" ? "50%" : width * 0.8,
    backgroundColor: colors.white,
    borderRadius: 45,
    padding: 12,
    minHeight: height * 0.3,
    elevation: 3,
    paddingBottom: 25,
  },
  pickerTitle: {
    textAlign: "center",
    marginTop: 15,
    textTransform: "capitalize",
  },
  pickerOverlay: {
    backgroundColor: colors.lightly,
    paddingBottom: 5,
    marginBottom: 8,
    marginRight: 6,
    borderRadius: 10,
  },
  pickerItem: {
    width: width * 0.35,
    height: 45,
    backgroundColor: colors.extraLight,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerText: { opacity: 0.8 },
  separator: {
    height: 2,
    width: "85%",
    alignSelf: "center",
    backgroundColor: colors.extraLight,
    marginVertical: 15,
  },
  tag: {
    marginRight: 20,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tagText: {
    backgroundColor: colors.primaryDeep,
    color: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryLight,
    marginTop: 5,
  },
  theory: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    paddingRight: 20,
  },
});
