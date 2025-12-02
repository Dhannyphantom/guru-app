import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import { Formik } from "formik";
import AppHeader from "./AppHeader";
import PopMessage from "./PopMessage";
import InstanceAction, { AddInstance } from "./InstanceAction";
import AppButton, { FormikButton } from "./AppButton";
import { FormikInput } from "./FormInput";
import { createTopicInitials, createTopicSchema } from "../helpers/yupSchemas";
import { useNavigation } from "@react-navigation/native";
import {
  useCreateTopicMutation,
  useFetchSubjectsQuery,
  useUpdateInstanceMutation,
} from "../context/instanceSlice";
import LottieAnimator from "./LottieAnimator";
import PromptModal from "./PromptModal";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { capFirstLetter } from "../helpers/helperFunctions";
import WebLayout from "./WebLayout";

const { width, height } = Dimensions.get("screen");

const NewTopics = ({ addInstanceActions, type, data }) => {
  const user = useSelector(selectUser);

  const [instances, setInstances] = useState({ 0: createTopicInitials });
  const [activeIndex, setActiveIndex] = useState(0);
  const [popper, setPopper] = useState({ vis: false });
  const [bools, setBools] = useState({ showErr: false, canSave: true });
  const [prompt, setPrompt] = useState({ vis: false });

  const [createTopic, { isLoading }] = useCreateTopicMutation();
  const [updateInstance, { isLoading: updating }] = useUpdateInstanceMutation();
  const { data: subjects, isLoading: subLoading } =
    useFetchSubjectsQuery("pro_filter");

  const isEdit = type === "edit";
  const isPro = user?.accountType === "professional";
  let formInitials = { ...createTopicInitials };

  if (isEdit) {
    formInitials.name = data?.name;
    formInitials.subject = data?.subject;
    formInitials._id = data?._id;
  }

  const {
    addNewInstance,
    handleForm,
    isLast,
    onSave,
    onDelete,
    canDelete,
    updateActiveIndex,
    instanceArr,
  } = addInstanceActions({
    setBools,
    bools,
    setInstances,
    instances,
    activeIndex,
    setActiveIndex,
    formInitials: createTopicInitials,
    cacheInitials: ["subject"],
  });

  const handlePrompt = (type) => {
    switch (type) {
      case "delete":
        uploadData({ ...prompt?.values, delete: true });
        break;

      default:
        break;
    }
  };

  const navigation = useNavigation();

  const uploadData = async (formValues) => {
    const formData = handleForm(formValues);

    if (isEdit) {
      try {
        await updateInstance({
          ...formValues,
          route: "topic",
        }).unwrap();
        setPopper({
          vis: true,
          msg: "Topic updated successfully ",
          type: "success",
          timer: 2000,
          cb: () => {
            navigation.goBack();
          },
        });
      } catch (err) {
        console.log(err);
        setPopper({
          vis: true,
          msg: "Something went wrong",
          type: "failed",
          timer: 3000,
        });
      }
    } else {
      try {
        const res = await createTopic(formData).unwrap();
        setPopper({
          vis: true,
          msg: "Topics created successfully",
          type: "success",
          timer: 2000,
          cb: () => {
            navigation.goBack();
          },
        });
      } catch (err) {
        console.log(err);
        setPopper({
          vis: true,
          msg: "Something went wrong",
          type: "failed",
          timer: 3000,
        });
      }
    }
  };

  useEffect(() => {
    if (isPro) {
      formInitials.subject = {
        _id: subjects?.data[0]?._id,
        name: subjects?.data[0]?.name,
      };
    }
  }, [subjects]);

  return (
    <>
      <Formik
        initialValues={formInitials}
        validationSchema={createTopicSchema}
        onSubmit={(fv) => uploadData(fv)}
      >
        {({
          values,
          setValues,
          errors,
          touched,
          initialValues,
          setFieldTouched,
        }) => (
          <View style={styles.container}>
            <AppHeader
              title={`${isEdit ? "Edit" : "create new"} topic${
                isEdit ? "" : "s"
              }`}
              Component={() => (
                <InstanceAction
                  canDelete={canDelete}
                  touched={touched}
                  showSave={bools.canSave}
                  onSave={() => onSave(values, setValues, errors)}
                  onDelete={() => onDelete(setValues)}
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
                contentContainerStyle={{
                  paddingBottom: 10,
                }}
              >
                <WebLayout style={{ width: 700 }}>
                  <FormikInput
                    name={"subject"}
                    placeholder={
                      Boolean(initialValues["subject"])
                        ? capFirstLetter(initialValues["subject"]?.name)
                        : "Select subject"
                    }
                    type="dropdown"
                    data={subjects?.data}
                    maxModalHeight={height * 0.9}
                    getId
                    isLoading={subLoading}
                    // value={values["subject"]}
                    headerText={"Select subject:"}
                    onLayout={() => setFieldTouched("subject", true)}
                    showErr={bools.showErr}
                  />
                  <FormikInput
                    name={"name"}
                    placeholder={
                      Boolean(initialValues["name"])
                        ? initialValues["name"]
                        : "Subject Topic or Title"
                    }
                    onLayout={() => setFieldTouched("name", true)}
                    headerText={"Enter topic:"}
                    value={values["name"]}
                    showErr={bools.showErr}
                  />
                  {isLast && (
                    <View style={{ marginTop: 20 }}>
                      <FormikButton
                        title={`${isEdit ? "Edit" : "Create"} Topic${
                          isEdit ? "" : "s"
                        }`}
                        type={isEdit ? "accent" : "primary"}
                        onPress={() => setBools({ ...bools, showErr: true })}
                        icon={{
                          left: true,
                          name: isEdit ? "menu" : "upload",
                        }}
                        contStyle={styles.formBtn}
                      />
                      {isEdit && (
                        <AppButton
                          title={"Delete Topic"}
                          type="warn"
                          icon={{ left: true, name: "delete" }}
                          onPress={() =>
                            setPrompt({
                              vis: true,
                              values,
                              data: {
                                title: "Delete Topic",
                                msg: `Are you sure you want to delete ${initialValues["name"]} topic?`,
                                btn: "Delete",
                                type: "delete",
                              },
                            })
                          }
                          contStyle={styles.formBtn}
                        />
                      )}
                    </View>
                    // <>
                    //   <FormikButton
                    //     title={`Create Topic"`}
                    //     onPress={() => setBools({ ...bools, showErr: true })}
                    //     contStyle={styles.formBtn}
                    //   />
                    // </>
                  )}
                </WebLayout>
              </ScrollView>
            </KeyboardAvoidingView>
            {!isEdit && (
              <AddInstance
                list={instanceArr}
                updateActiveIndex={(idx) => updateActiveIndex(idx, setValues)}
                activeIndex={activeIndex}
                createNewInstance={() =>
                  addNewInstance(values, setValues, errors)
                }
              />
            )}
          </View>
        )}
      </Formik>

      <PopMessage popData={popper} setPopData={setPopper} />
      <LottieAnimator visible={isLoading} absolute wTransparent />
      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompt}
      />
    </>
  );
};

export default NewTopics;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formBtn: {
    alignSelf: "center",
    // marginTop: 20,
  },
});
