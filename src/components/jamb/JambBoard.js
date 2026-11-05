import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import JambHero from "./JambHero";

/**
 * The ONLY piece of the predictor that lives on HomeScreen:
 * the "Guru JAMB Score Predictor" banner.
 *
 *  - premium user  -> onStart()   (navigate to the predictor screen)
 *  - free user     -> onLocked()  (show your "subscribe" popup)
 */
const JambBoard = ({ isPremium = false, onStart, onLocked }) => {
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        styles.container,
        { width: Platform.OS === "web" ? "45%" : width * 0.95 },
      ]}
    >
      <JambHero
        variant="intro"
        buttonLabel="Start Assessment"
        locked={!isPremium}
        onPress={isPremium ? onStart : onLocked}
      />
    </View>
  );
};

export default JambBoard;

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    maxWidth: Platform.OS === "web" ? 700 : undefined,
  },
});
