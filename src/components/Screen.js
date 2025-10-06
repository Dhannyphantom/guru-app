import React, { useContext } from "react";
import { StyleSheet, Animated, Dimensions, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// import ThemeContext from "../config/ThemeContext";
//
const Screen = ({ children, panHandlers = {}, style, ...otherProps }) => {
  //   const theme = useContext(ThemeContext);
  const safeInsets = useSafeAreaInsets();

  if (Platform.OS === "web") {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      style={[styles.container, { paddingTop: safeInsets.top }, style]}
      {...otherProps}
      {...panHandlers}
    >
      {children}
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
});
export default Screen;
