import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import AppText from "../jamb/JambText";
import { T } from "../jamb/JambTheme";
import { LAYOUT, enter } from "../jamb/JambMotion";
import UpdateArt from "./UpdateArt";

/**
 * Chalkboard banner used by BOTH the update prompt and the force-update
 * screen. Same chrome as the JAMB hero (board + darker lip, dashed chalk
 * frame, faint maths doodles) but stacked: illustration on top, text below.
 */
const UpdateBoard = ({
  version,
  title,
  subtitle,
  artSize = 128,
  animateIn = true,
  style,
  children,
}) => (
  <Animated.View
    entering={animateIn ? enter(0) : undefined}
    layout={LAYOUT}
    style={[styles.wrap, style]}
  >
    <View style={styles.clip}>
      <View style={styles.body}>
        <View pointerEvents="none" style={styles.frame} />
        <AppText fontWeight="black" size={40} style={[styles.doodle, { top: 8, left: 16 }]}>
          π
        </AppText>
        <AppText fontWeight="black" size={34} style={[styles.doodle, { top: 14, right: 18 }]}>
          ÷
        </AppText>
        <AppText fontWeight="black" size={30} style={[styles.doodle, { bottom: 8, left: 22 }]}>
          √
        </AppText>
        <AppText fontWeight="black" size={34} style={[styles.doodle, { bottom: 6, right: 24 }]}>
          +
        </AppText>

        <UpdateArt version={version} size={artSize} />

        <AppText fontWeight="black" size={23} style={styles.title}>
          {title}
        </AppText>
        {Boolean(subtitle) && (
          <AppText
            fontWeight="medium"
            size={13.5}
            numberOfLines={4}
            style={styles.subtitle}
          >
            {subtitle}
          </AppText>
        )}
        {children}
      </View>
    </View>
  </Animated.View>
);

export default UpdateBoard;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 26,
    backgroundColor: T.boardDark,
    paddingBottom: 5,
  },
  clip: { borderRadius: 26, overflow: "hidden", backgroundColor: T.board },
  body: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: T.board,
  },
  frame: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,248,231,0.22)",
  },
  doodle: { position: "absolute", color: "rgba(255,248,231,0.07)" },
  title: { color: T.chalk, textAlign: "center", marginTop: 10, lineHeight: 28 },
  subtitle: {
    color: T.chalkSoft,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 19,
  },
});
