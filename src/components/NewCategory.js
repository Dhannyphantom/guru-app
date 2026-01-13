import {
  KeyboardAvoidingView,
  Platform,
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
import { createCatInitials, createCatSchema } from "../helpers/yupSchemas";
import {
  useCreateCategoryMutation,
  useUpdateInstanceMutation,
} from "../context/instanceSlice";
import LottieAnimator from "./LottieAnimator";
import { useNavigation, useRouter } from "expo-router";

const NewCategory = ({ addInstanceActions, type, data }) => {
  const [instances, setInstances] = useState({ 0: createCatInitials });
  const [activeIndex, setActiveIndex] = useState(0);
  const [popper, setPopper] = useState({ vis: false });
  const [bools, setBools] = useState({ showErr: false, canSave: true });

  const [createCategory, { isLoading }] = useCreateCategoryMutation();
  const [updateInstance, { isLoading: updating }] = useUpdateInstanceMutation();
  const router = useRouter();

  const isEdit = type === "edit";
  let formInitials = { ...createCatInitials };

  if (isEdit) {
    formInitials.name = data?.name;
    formInitials.image = data?.image;
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
    formInitials: createCatInitials,
  });

  const uploadData = async (formValues) => {
    let formData = handleForm(formValues);
    // const getWebData = formData.map(async (item) => {
    //   const imageBlob = await fetch(item.image.uri).then((res) => res.blob());
    //   return new File([imageBlob], item.image.filename, {
    //     type: imageBlob.type,
    //   });
    // });

    // const webData = await Promise.all(getWebData);

    // formData = Platform.OS === "web" ? webData : formData;

    if (isEdit) {
      try {
        const res = await updateInstance({
          ...formValues,
          route: "category",
          media:
            data?.image?.uri != formValues?.image?.uri && !formValues?.delete,
          bucket: "categories",
        }).unwrap();
        setPopper({
          vis: true,
          msg: "Category updated successfully ",
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
        const res = await createCategory(formData).unwrap();
        setPopper({
          vis: true,
          msg: "Categories successfully created",
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
        validationSchema={createCatSchema}
        initialValues={formInitials}
        onSubmit={uploadData}
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
              title={`${isEdit ? "Edit" : "create new"} category`}
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
                <FormikCover
                  name={"image"}
                  value={values["image"]}
                  showErr={bools.showErr}
                  style={{ marginBottom: 25 }}
                  onLayout={() => setFieldTouched("image", true)}
                />
                <FormikInput
                  name={"name"}
                  placeholder={initialValues["name"] ?? "Category Name"}
                  onLayout={() => setFieldTouched("name", true)}
                  headerText={"Enter Category name:"}
                  value={values["name"]}
                  showErr={bools.showErr}
                />

                {isLast && (
                  <View style={styles.btns}>
                    <FormikButton
                      title={`${isEdit ? "Edit" : "Create"} Category`}
                      onPress={() => setBools({ ...bools, showErr: true })}
                      type={isEdit ? "accent" : "primary"}
                      contStyle={styles.formBtn}
                      icon={{
                        left: true,
                        name: isEdit ? "layers-edit" : "upload",
                      }}
                    />
                    {isEdit && (
                      <AppButton
                        title={"Delete Category"}
                        type="warn"
                        icon={{ left: true, name: "delete" }}
                        onPress={() => uploadData({ ...values, delete: true })}
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
      <LottieAnimator visible={isLoading || updating} absolute wTransparent />
    </>
  );
};

export default NewCategory;

const styles = StyleSheet.create({
  btns: {
    marginTop: 20,
  },
  container: {
    flex: 1,
  },
  formBtn: {
    alignSelf: "center",
    // marginBottom: 20,
  },
});
