import { useEffect, useRef } from "react";
import { BackHandler, ToastAndroid } from "react-native";

export default function useDoubleBackExit(enabled = true) {
  const backPressCount = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onBackPress = () => {
      if (backPressCount.current === 0) {
        backPressCount.current += 1;

        ToastAndroid.show("Again to close Guru", ToastAndroid.SHORT);

        setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);

        return true;
      }

      BackHandler.exitApp();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [enabled]);
}
