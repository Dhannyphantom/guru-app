import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import AppText from "./JambText";
import { JAMB_TOTAL } from "../../helpers/jambConfig";
import { T } from "./JambTheme";
import { Chip, JambButton } from "./JambUI";
import { LAYOUT, enter } from "./JambMotion";
import JambIllustration from "./JambIllustration";
import { useCooldown } from "./useCooldown";

const ART = 124; // illustration height
const ART_W = ART * 1.15;

/**
 * Shared banner chrome: a chalkboard with a dashed chalk frame and faint maths
 * doodles. The illustration sits ABOVE it and straddles the right edge; the
 * text column reserves exactly the illustration's width.
 */
export const BannerShell = ({ children, art, style }) => (
  <Animated.View
    entering={enter(0)}
    layout={LAYOUT}
    style={[styles.wrap, style]}
  >
    <View style={styles.clip}>
      <View style={[styles.body, { paddingRight: ART_W - 2 }]}>
        <View pointerEvents="none" style={styles.frame} />
        <AppText fontWeight="black" size={40} style={[styles.doodle, { top: 6, right: ART_W + 6 }]}>
          π
        </AppText>
        <AppText fontWeight="black" size={34} style={[styles.doodle, { bottom: 4, right: ART_W * 0.55 }]}>
          ÷
        </AppText>
        <AppText fontWeight="black" size={30} style={[styles.doodle, { bottom: 2, left: "46%" }]}>
          √
        </AppText>
        {children}
      </View>
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
          <View style={styles.tag}>
            <AppText fontWeight="black" size={9.5} style={styles.tagText}>
              GURU · EXAM PREP
            </AppText>
          </View>
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
              color={T.ink}
              bg={T.chalk}
              style={{ marginTop: 9 }}
            />
          )}
          {!isResult && cooldown.active && (
            <Chip
              icon="hourglass"
              label={`Next round in ${cooldown.short}`}
              color={T.yellowInk}
              bg={T.yellowSoft}
              style={{ marginTop: 6 }}
            />
          )}
          {showButton && (
            <JambButton
              title={buttonLabel}
              variant="yellow"
              icon={locked ? "lock-closed" : "arrow-forward"}
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
    backgroundColor: T.boardDark,
    paddingBottom: 5,
  },
  clip: { borderRadius: 26, overflow: "hidden", backgroundColor: T.board },
  body: {
    paddingVertical: 18,
    paddingLeft: 18,
    minHeight: ART + 30,
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
  art: {
    position: "absolute",
    right: -2,
    top: 0,
    bottom: 5,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,199,54,0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 8,
  },
  tagText: { color: T.yellow, letterSpacing: 1 },
  title: { color: T.chalk, lineHeight: 28 },
  desc: { color: T.chalkSoft, marginTop: 7, width: "88%", lineHeight: 18 },
  small: { color: T.chalkSoft, marginTop: 7, lineHeight: 17 },
});
