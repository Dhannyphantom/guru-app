import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import { dummyLeaderboards } from "../helpers/dataStore";
import FriendCard from "../components/FriendCard";
import {
  selectSchool,
  selectSchoolVerified,
  useLazyFetchSchoolInstanceQuery,
} from "../context/schoolSlice";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import LottieAnimator from "../components/LottieAnimator";
import { selectUser } from "../context/usersSlice";
import { ProfileModal } from "../components/Avatar";
import getRefresher from "../components/Refresher";
import { useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("screen");

const VerifyStudentScreen = () => {
  const params = useLocalSearchParams();
  const paramsData = JSON.parse(params.data);
  const screenType = paramsData?.type;

  const school = useSelector(selectSchool);
  const isSchoolVerified = useSelector(selectSchoolVerified);
  const user = useSelector(selectUser);

  const [bools, setBools] = useState({ loading: true });
  const [modal, setModal] = useState({ vis: false, data: null });
  const [refreshing, setRefreshing] = useState(false);

  const [fetchSchoolInstance, { data, isLoading }] =
    useLazyFetchSchoolInstanceQuery();

  const getInstances = async (refresh) => {
    !refresh && setBools({ ...bools, loading: true });
    try {
      const res = await fetchSchoolInstance({
        schoolId: school._id,
        type: screenType,
      }).unwrap();
    } catch (error) {
    } finally {
      !refresh && setBools({ ...bools, loading: false });
    }
  };

  const handleVerification = (data, type) => {
    setModal({
      vis: true,
      data: {
        ...data,
        type: "verify",
        school: { name: school?.name, _id: school?._id },
        instance: screenType,
      },
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getInstances(true);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getInstances();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title={`${screenType} Verification`} />
      <FlatList
        data={data?.data}
        keyExtractor={(item) => item._id}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        contentContainerStyle={{ paddingBottom: height * 0.12, paddingTop: 20 }}
        renderItem={({ item }) => (
          <FriendCard
            hideBtn={!isSchoolVerified}
            onPress={handleVerification}
            type="student"
            userID={user?._id}
            data={item}
          />
        )}
      />
      <LottieAnimator visible={isLoading || bools.loading} absolute />
      <ProfileModal
        visible={modal.vis}
        data={modal?.data}
        closeCallback={getInstances}
        setVisible={(bool) => setModal({ ...bools, vis: bool })}
      />
    </View>
  );
};

export default VerifyStudentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
