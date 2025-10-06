import { SplashScreen, Stack } from "expo-router";
import * as Font from "expo-font";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "../context/store";
import { selectToken, updateToken } from "../context/usersSlice";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

const Main = () => {
  const token = useSelector(selectToken);
  const isLoggedIn = Boolean(token);
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  const dispatch = useDispatch();

  useEffect(() => {
    async function prepare() {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        dispatch(updateToken(token));
      }
      try {
        await Font.loadAsync({
          "sf-regular": require("../../assets/fonts/SF-Pro-Display-Regular.otf"),
          "sf-bold": require("../../assets/fonts/SF-Pro-Display-Bold.otf"),
          "sf-light": require("../../assets/fonts/SF-Pro-Display-Light.otf"),
          "sf-medium": require("../../assets/fonts/SF-Pro-Display-Medium.otf"),
          "sf-heavy": require("../../assets/fonts/SF-Pro-Display-Heavy.otf"),
          "sf-black": require("../../assets/fonts/SF-Pro-Display-Black.otf"),
          "sf-semibold": require("../../assets/fonts/SF-Pro-Display-Semibold.otf"),
          "sf-thin": require("../../assets/fonts/SF-Pro-Display-Thin.otf"),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }
    prepare();
  }, [dispatch]);

  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen once the app is ready
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <StatusBar style="dark" />
      <Main />
    </Provider>
  );
}
