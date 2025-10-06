import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import {
  updateToken,
  useFetchAppInfoQuery,
  useLazyFetchUserQuery,
} from "../context/usersSlice";
import LottieAnimator from "../components/LottieAnimator";
import AppText from "../components/AppText";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import WebLayout from "../components/WebLayout";

// THIS IS THE FIRST SCREEN THAT RENDERS
const { width, height } = Dimensions.get("screen");

const WaitingScreen = ({ navigation }) => {
  const [bools, setBools] = useState({ error: null });
  const [fetchUser, { isLoading, isError, error }] = useLazyFetchUserQuery();
  const { data } = useFetchAppInfoQuery();

  const dispatch = useDispatch();

  const errMsg = error?.message?.includes("Aborted")
    ? "Network timeout. please try again"
    : error?.message ?? error?.error;

  const run = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      // token && feeds
      await fetchUser(token)
        .unwrap()
        .then(() => {
          dispatch(updateToken(token));
        })
        .catch((err) => {
          setBools({ ...bools, error: err });
          if (
            err?.data?.includes("sign in again") ||
            err?.data?.includes("Invalid token provided")
          ) {
            navigation.navigate("Welcome");
          }
        });
      // navigation.navigate("Welcome");
      //   await AsyncStorage.removeItem("token");
    } else {
      navigation.navigate("Welcome");
    }
  };

  const handleRetry = async () => {
    // navigation.navigate("Welcome");
    await run();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      run();
    });

    return () => {
      unsubscribe;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <WebLayout scroll>
        {isError && !isLoading ? (
          <View style={{ alignItems: "center" }}>
            <LottieAnimator
              visible={true}
              name="person_float"
              size={width * 0.6}
            />
            <AppText style={{ marginVertical: 20, color: colors.heartDark }}>
              {" "}
              {errMsg}{" "}
            </AppText>
            <AppButton
              contStyle={{ alignSelf: "center" }}
              title={"Retry"}
              onPress={handleRetry}
            />
          </View>
        ) : (
          <LottieAnimator visible={true} />
        )}
      </WebLayout>
      <StatusBar style="dark" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default WaitingScreen;
