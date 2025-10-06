import { Platform, ScrollView, StyleSheet, View } from "react-native";

const WebLayout = ({ children, scroll, style }) => {
  if (Platform.OS === "web") {
    if (scroll) {
      return (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      );
    } else {
      return <View style={[styles.container, style]}>{children}</View>;
    }
  } else {
    // return null;
    return <>{children}</>;
  }
};

export default WebLayout;

const styles = StyleSheet.create({
  container: {
    // maxWidth: 800,
    alignSelf: "center",
  },
});
