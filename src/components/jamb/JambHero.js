import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

import AppText from "./JambText";
import { J, JAMB_TOTAL } from "../../helpers/jambConfig";
import { Chip, JambButton } from "./JambUI";
import { LAYOUT, enter } from "./JambMotion";
import JambIllustration from "./JambIllustration";
import { useCooldown } from "./useCooldown";

const ART = 124; // illustration height
const ART_W = ART * 1.15;

/**
 * Shared banner chrome: gradient card (clipped) + illustration that sits ABOVE it
 * and straddles the right edge a few px. The text column reserves exactly the
 * illustration's width, so text and art are cleanly separated while the art
 * still overlaps the card edge.
 */
export const BannerShell = ({ children, art, style }) => (
  <Animated.View
    entering={enter(0)}
    layout={LAYOUT}
    style={[styles.wrap, style]}
  >
    <View style={styles.clip}>
      <LinearGradient
        colors={["#EAF7DD", "#D2EBBF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.body, { paddingRight: ART_W - 6 }]}
      >
        {children}
      </LinearGradient>
    </View>
    <View pointerEvents="none" style={styles.art}>
      {art}
    </View>
  </Animated.View>
);

export const BANNER_ART = ART;

/**
 * Banner used:
 *  - HomeScreen via JambBoard (button "Start Assessment")
 *  - intro step (button "Continue")
 *  - result step (variant "result", no button)
 */
const JambHero = ({
  variant = "intro",
  buttonLabel = "Start Assessment",
  showButton = true,
  onPress,
  locked = false,
  predicted = 0,
  summary,
  style,
}) => {
  const isResult = variant === "result";
  const hasAvg = !isResult && (summary?.rounds ?? 0) > 0;
  const cooldown = useCooldown(summary?.cooldownUntil, undefined, 30000); // minute-level display

  return (
    <BannerShell
      style={style}
      art={
        <JambIllustration
          variant={isResult ? "result" : "score"}
          value={
            isResult
              ? String(predicted)
              : hasAvg
                ? String(summary.average)
                : "280+"
          }
          outOf={isResult || hasAvg ? JAMB_TOTAL : undefined}
          caption={isResult ? "PREDICTED" : hasAvg ? "AVERAGE" : "Score"}
          size={ART}
        />
      }
    >
      {isResult ? (
        <>
          <AppText
            fontWeight="black"
            size={23}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={styles.title}
          >
            Congratulations!
          </AppText>
          <AppText fontWeight="semibold" size={14} style={styles.desc}>
            You have completed your JAMB subject combination exam!
          </AppText>
          <AppText fontWeight="medium" size={12} style={styles.small}>
            Here is your predicted score and a breakdown of your performance.
          </AppText>
        </>
      ) : (
        <>
          <AppText fontWeight="black" size={21} style={styles.title}>
            {"Guru JAMB\nScore Predictor"}
          </AppText>
          <AppText fontWeight="medium" style={styles.desc}>
            Know your score, discover your weaknesses and get a personalised
            study plan to improve.
          </AppText>
          {hasAvg && (
            <Chip
              icon="trending-up"
              label={`Avg ${summary.average}/${JAMB_TOTAL} · ${summary.rounds} round${summary.rounds === 1 ? "" : "s"}`}
              color={J.deep}
              bg="#fff"
              style={{ marginTop: 9 }}
            />
          )}
          {!isResult && cooldown.active && (
            <Chip
              icon="hourglass"
              label={`Next round in ${cooldown.short}`}
              color={J.amber}
              bg={J.amberBg}
              style={{ marginTop: 6 }}
            />
          )}
          {showButton && (
            <JambButton
              title={buttonLabel}
              onPress={onPress}
              small
              style={{ alignSelf: "flex-start", marginTop: 12 }}
            />
          )}
        </>
      )}
    </BannerShell>
  );
};

export default JambHero;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 26,
    backgroundColor: "#DDF0CB",
    shadowColor: "#1C5B33",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  clip: { borderRadius: 26, overflow: "hidden" },
  body: { paddingVertical: 16, paddingLeft: 16, minHeight: ART + 28 },
  art: {
    position: "absolute",
    right: -2,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  chipRow: { flexDirection: "row", marginBottom: 9 },
  title: { color: J.deepest, lineHeight: 31 },
  desc: { color: J.ink, marginTop: 7, width: "80%", lineHeight: 19 },
  small: { color: J.muted, marginTop: 7, lineHeight: 17 },
});
