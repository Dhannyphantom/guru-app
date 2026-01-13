import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { useState } from "react";
import { Formik } from "formik";
import AppHeader from "./AppHeader";
import PopMessage from "./PopMessage";
import InstanceAction, { AddInstance } from "./InstanceAction";
import AppButton, { FormikButton } from "./AppButton";
import { FormikInput } from "./FormInput";
import { FormikCover } from "./CoverImage";
import { createSubjInitials, createSubjSchema } from "../helpers/yupSchemas";
import {
  useCreateSubjectMutation,
  useFetchCategoriesQuery,
  useLazyFetchCategoriesQuery,
  useUpdateInstanceMutation,
} from "../context/instanceSlice";
import LottieAnimator from "./LottieAnimator";
import PromptModal from "./PromptModal";
import WebLayout from "./WebLayout";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const NewSubjects = ({ addInstanceActions, type, data }) => {
  const [instances, setInstances] = useState({ 0: createSubjInitials });
  const [activeIndex, setActiveIndex] = useState(0);
  const [popper, setPopper] = useState({ vis: false });
  const [bools, setBools] = useState({ showErr: false, canSave: true });
  const [prompt, setPrompt] = useState({ vis: false });

  const { isLoading: catLoading, data: catData } = useFetchCategoriesQuery();
  const [createSubject, { isLoading }] = useCreateSubjectMutation();
  const [updateInstance, { isLoading: updating }] = useUpdateInstanceMutation();

  const isEdit = type === "edit";
  let formInitials = { ...createSubjInitials };

  if (isEdit) {
    formInitials.name = data?.name;
    formInitials.image = data?.image;
    formInitials._id = data?._id;
    formInitials.categories = data?.categories;
  }

  const handlePrompt = (type) => {
    switch (type) {
      case "delete":
        uploadData({ ...prompt?.values, delete: true });
        break;

      default:
        break;
    }
  };

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
    formInitials: createSubjInitials,
    cacheInitials: ["categories"],
  });

  const router = useRouter();

  const uploadData = async (formValues) => {
    const formData = handleForm(formValues);

    if (isEdit) {
      try {
        const res = await updateInstance({
          ...formValues,
          route: "subject",
          media:
            data?.image?.uri != formValues?.image?.uri && !formValues?.delete,
          bucket: "subjects",
        }).unwrap();
        setPopper({
          vis: true,
          msg: "Subject updated successfully ",
          type: "success",
          timer: 2000,
          cb: () => {
            router.back();
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
        const res = await createSubject(formData).unwrap();
        setPopper({
          vis: true,
          msg: "Subjects created successfully",
          type: "success",
          timer: 2000,
          cb: () => {
            router.back();
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

  return (
    <>
      <Formik
        validationSchema={createSubjSchema}
        initialValues={formInitials}
        onSubmit={(fv) => uploadData(fv)}
      >
        {({
          values,
          setValues,
          initialValues,
          errors,
          touched,
          setFieldTouched,
        }) => (
          <View style={styles.container}>
            <AppHeader
              title={`${isEdit ? "Edit" : "create new"} subject${
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
                <WebLayout
                  style={{
                    flex: 1,
                    // width: 1000,
                    minWidth: 950,
                    flexDirection: "row",
                  }}
                >
                  <WebLayout style={{ width: 400 }}>
                    <FormikCover
                      name={"image"}
                      value={values["image"]}
                      showErr={bools.showErr}
                      style={{ marginBottom: 25 }}
                      onLayout={() => setFieldTouched("image", true)}
                    />
                  </WebLayout>
                  <WebLayout style={{ flex: 1 }}>
                    {/*  */}
                    <FormikInput
                      name={"name"}
                      placeholder={initialValues["name"] ?? "Subject Name"}
                      onLayout={() => setFieldTouched("name", true)}
                      headerText={"Enter subject name:"}
                      value={values["name"]}
                      showErr={bools.showErr}
                    />
                    <FormikInput
                      name={"categories"}
                      placeholder={"Select subject categories"}
                      type="dropdown"
                      isLoading={catLoading}
                      useDefaultModalHeight
                      data={catData?.data}
                      multiple
                      headerText={"Select categories:"}
                      onLayout={() => setFieldTouched("categories", true)}
                      showErr={bools.showErr}
                    />
                  </WebLayout>
                </WebLayout>
                {isLast && (
                  <View style={{ marginTop: 20 }}>
                    <FormikButton
                      title={`${isEdit ? "Edit" : "Create"} Subject${
                        isEdit ? "" : "s"
                      }`}
                      type={isEdit ? "accent" : "primary"}
                      onPress={() => setBools({ ...bools, showErr: true })}
                      icon={{
                        left: true,
                        name: isEdit ? "book" : "upload",
                      }}
                      contStyle={styles.formBtn}
                    />
                    {isEdit && (
                      <AppButton
                        title={"Delete Subject"}
                        type="warn"
                        icon={{ left: true, name: "delete" }}
                        onPress={() =>
                          setPrompt({
                            vis: true,
                            values,
                            data: {
                              title: "Delete Subject",
                              msg: `Are you sure you want to delete ${initialValues["name"]} subject?`,
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
        onPress={handlePrompt}
        setPrompt={setPrompt}
      />
    </>
  );
};

export default NewSubjects;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formBtn: {
    alignSelf: "center",
    // marginTop: 20,
  },
});
