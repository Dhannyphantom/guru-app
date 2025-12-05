import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import { useFetchProsQuery, useProVerifyMutation } from "../context/usersSlice";
import LottieAnimator from "../components/LottieAnimator";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import AppHeader from "../components/AppHeader";
import AppButton, { FormikButton } from "../components/AppButton";
import AppModal from "../components/AppModal";
import { useState } from "react";
import { Formik } from "formik";
import { proSubjectInitials, proSubjectSchema } from "../helpers/yupSchemas";
import { FormikInput } from "../components/FormInput";
import { useFetchSubjectsQuery } from "../context/instanceSlice";
import ListEmpty from "../components/ListEmpty";
import PromptModal from "../components/PromptModal";
import Animated from "react-native-reanimated";

const { width, height } = Dimensions.get("screen");

const ITEM_WIDTH = width - 30; // Item width (80% of screen width)

const ChooseSubjectModal = ({ closeModal, data }) => {
  const { data: subjects, isLoading: subjLoading } = useFetchSubjectsQuery();
  const [verifyPro, { isLoading }] = useProVerifyMutation();

  const handleForm = async (fv) => {
    try {
      await verifyPro({
        proId: data?._id,
        subjects: fv?.subjects,
        action: "verify",
      }).unwrap();
      closeModal();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.modal}>
      <Formik
        validationSchema={proSubjectSchema}
        initialValues={proSubjectInitials}
        onSubmit={handleForm}
      >
        {() => (
          <>
            <FormikInput
              name={"subjects"}
              headerText={"Professional's subjects"}
              placeholder={"Select Subjects:"}
              multiple
              getId
              isLoading={subjLoading}
              type="dropdown"
              data={subjects?.data}
            />
            <FormikButton title={"Assign"} />
          </>
        )}
      </Formik>

      <AppButton title={"Cancel"} type="warn" onPress={closeModal} />
      <LottieAnimator visible={isLoading} absolute wTransparent />
    </View>
  );
};

const ProfileCard = ({ data, onPress, loader }) => {
  return (
    <View style={styles.cardOverlay}>
      <View style={styles.card}>
        <Avatar
          source={data?.avatar?.image}
          border={{ width: 5, color: colors.primaryLighter }}
          size={width * 0.4}
          userID={data?._id}
        />
        {/* <ScrollView> */}
        <View style={styles.cardMain}>
          <AppText
            size={"large"}
            fontWeight="bold"
            style={{ color: colors.primary }}
          >
            @{data?.username}
          </AppText>
          <AppText
            size={"xlarge"}
            fontWeight="black"
            style={{ textTransform: "capitalize" }}
          >
            {data?.firstName} {data?.lastName}
          </AppText>
          <AppText fontWeight="bold">{data?.email}</AppText>
          <AppText style={{ marginBottom: 20 }} fontWeight="bold">
            {data?.contact}
          </AppText>

          <View>
            <AppText
              style={{ textTransform: "capitalize" }}
              size={"small"}
              fontWeight="light"
            >
              {data?.address}
            </AppText>
            <AppText
              fontWeight="light"
              size={"small"}
              style={{
                textTransform: "capitalize",
                maxWidth: "80%",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {data?.lga}
              {data?.state} {data?.state ? `, ${data?.state} State` : ""}
            </AppText>
          </View>
          <View style={{ marginTop: 10, alignItems: "center" }}>
            {data?.subjects?.map((subj) => (
              <AppText
                key={subj?.name}
                fontWeight="black"
                style={{ textTransform: "capitalize", marginBottom: 2 }}
              >
                {subj?.name}
              </AppText>
            ))}
            <View>
              <AppText fontWeight="medium">
                Questions:{" "}
                <AppText fontWeight="heavy" size="large">
                  {data?.questionsCount}
                </AppText>
              </AppText>
              <AppText fontWeight="medium">
                Topics:{" "}
                <AppText fontWeight="heavy" size="large">
                  {data?.topicsCount}
                </AppText>
              </AppText>
            </View>
          </View>
        </View>
        {/* </ScrollView> */}
        <View style={styles.cardBtn}>
          {data?.verified ? (
            <>
              <AppButton
                title={"Revoke Access"}
                type="accent"
                onPress={() => onPress && onPress("revoke", data)}
              />
            </>
          ) : (
            <View style={styles.cardBtns}>
              <AppButton
                title={"Verify"}
                onPress={() => onPress && onPress("verify", data)}
                icon={{ left: true, name: "check" }}
              />
              <AppButton
                title={"Reject"}
                type="warn"
                icon={{ left: true, name: "cancel" }}
                onPress={() => onPress && onPress("reject", data)}
              />
            </View>
          )}
        </View>
      </View>
      <LottieAnimator visible={loader} absolute wTransparent />
    </View>
  );
};

const ProListScreen = () => {
  const { data, isLoading, refetch } = useFetchProsQuery();
  const [modal, setModal] = useState({ vis: false, data: null });
  const [prompt, setPrompt] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const [verifyPro, { isLoading: loading }] = useProVerifyMutation();

  const pros = data?.data;

  const onAction = (type, data) => {
    switch (type) {
      case "verify":
        setModal({ vis: true, data });
        break;
      case "revoke":
        setPrompt({
          vis: true,
          data: {
            title: "Revoke Pro Access",
            msg: `Are you sure you want to revoke ${data?.username}'s access to Pro features?`,
            btn: "YES",
            type: "revoke",
          },
          modal: data,
        });
        break;
      case "reject":
        setPrompt({
          vis: true,
          data: {
            title: "Delete Pro User",
            msg: `Are you sure you want to delete ${data?.username}'s pro account?`,
            btn: "YES",
            type: "reject",
          },
          modal: data,
        });
        break;
    }
  };

  const handlePrompt = async (type) => {
    switch (type) {
      case "revoke":
        try {
          await verifyPro({
            proId: prompt?.modal?._id,
            //   subjects: fv?.subjects,
            action: "revoke",
          }).unwrap();
        } catch (error) {
          console.log(error);
        }
        break;
      case "reject":
        try {
          await verifyPro({
            proId: prompt?.modal?._id,
            //   subjects: fv?.subjects,
            action: "reject",
          }).unwrap();
        } catch (error) {
          console.log(error);
        }
        break;
    }
  };
  //
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (errr) {
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Professionals" />
      <Animated.FlatList
        data={pros}
        // horizontal
        showsHorizontalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        // snapToInterval={width}
        // snapToInterval={ITEM_WIDTH}
        // snapToAlignment={"center"}
        decelerationRate="fast"
        // contentContainerStyle={{ paddingTop: ITEM_SPACING }}
        contentContainerStyle={{
          // paddingHorizontal: ITEM_SPACING,
          paddingTop: 10,
        }}
        scrollEventThrottle={16}
        ListEmptyComponent={() => (
          <ListEmpty vis={!isLoading} message="No pro accounts found" />
        )}
        // pagingEnabled
        renderItem={({ item, index }) => (
          <ProfileCard
            data={item}
            onPress={onAction}
            loader={loading && item?._id == prompt?.modal?._id}
            index={index}
            length={pros?.length}
          />
        )}
      />
      <LottieAnimator visible={isLoading} absolute />
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ ...modal, vis: bool })}
        Component={() => (
          <ChooseSubjectModal
            closeModal={() => setModal({ vis: false, data: null })}
            data={modal.data}
          />
        )}
      />
      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompt}
      />
    </View>
  );
};

export default ProListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    // flex: 1,
    width: ITEM_WIDTH,
    backgroundColor: colors.unchange,
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primaryLighter,
    borderBottomWidth: 8,
    borderRightWidth: 3,
  },
  cardOverlay: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  cardBtn: {
    // flex: 1,
    justifyContent: "flex-end",
    marginTop: 15,
  },
  cardBtns: {
    width: ITEM_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  cardMain: {
    alignItems: "center",
    marginTop: 20,
  },
  modal: {
    backgroundColor: colors.white,
    padding: 10,
    paddingTop: 15,
    borderRadius: 20,
  },
});
