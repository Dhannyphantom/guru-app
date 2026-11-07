import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import AppText from "./JambText";
import { J } from "../../helpers/jambConfig";
import { useFloat } from "./JambUI";

/**
 * Vector illustration (swap in real artwork with `source`).
 *
 * Layout is a fixed grid so nothing collides:
 *   - document card  : left / top
 *   - target         : top-right (clear of the card)
 *   - books + cap    : bottom-right, overlapping the card by ~6px only
 * Floating amplitudes are tiny (3–4px) so pieces never cross each other.
 *
 * variant: "score" | "result" | "books"
 */
const JambIllustration = ({
  variant = "score",
  value = "280+",
  outOf,
  caption = "Score",
  source,
  size = 132,
  style,
}) => {
  const W = size * 1.15;
  const H = size;
  const floatCard = useFloat(0, 3000, 3);
  const floatBooks = useFloat(600, 3400, 3);
  const floatTarget = useFloat(1100, 2600, 4);

  if (source) {
    return (
      <Image source={source} resizeMode="contain" style={[{ width: W, height: H }, style]} />
    );
  }

  const isBooks = variant === "books";
  const isResult = variant === "result";
  const bookH = Math.max(H * 0.1, 11);

  return (
    <View style={[{ width: W, height: H }, style]}>
      <View
        style={[
          styles.blob,
          { width: H * 0.9, height: H * 0.9, borderRadius: H, left: W * 0.06 },
        ]}
      />

      {/* Document card */}
      <Animated.View
        style={[
          styles.card,
          { width: W * 0.66, left: 0, top: H * 0.1 },
          floatCard,
        ]}
      >
        <View style={styles.cardHead}>
          <View style={styles.cardDot} />
          <AppText fontWeight="black" size={10} style={{ color: J.deep }}>
            JAMB
          </AppText>
        </View>

        {isBooks ? (
          <View style={{ marginTop: 7 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.checkRow}>
                <Ionicons name="checkmark-circle" size={12} color={J.green} />
                <View style={styles.checkLine} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.scoreBox}>
            <AppText fontWeight="bold" size={9} style={{ color: J.muted, letterSpacing: 0.4 }}>
              {caption}
            </AppText>
            {/* number + "/400" sit on one baseline and shrink instead of overflowing */}
            <View style={styles.valueRow}>
              <AppText
                fontWeight="black"
                size={22}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{ color: J.deep, flexShrink: 1 }}
              >
                {value}
              </AppText>
              {Boolean(outOf) && (
                <AppText fontWeight="bold" size={10.5} numberOfLines={1} style={{ color: J.muted, marginLeft: 1 }}>
                  /{outOf}
                </AppText>
              )}
            </View>
          </View>
        )}

        {isResult && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={15} color="#fff" />
          </View>
        )}
      </Animated.View>

      {/* Target — top right, clear of the card */}
      {!isBooks && !isResult && (
        <Animated.View style={[styles.target, floatTarget]}>
          <Ionicons name="locate" size={22} color={J.green} />
        </Animated.View>
      )}

      {/* Books + cap — bottom right, slight overlap with card corner */}
      <Animated.View style={[styles.books, floatBooks]}>
        <Ionicons
          name="school"
          size={H * 0.24}
          color={J.deepest}
          style={{ marginBottom: -3, marginRight: W * 0.03, alignSelf: "center" }}
        />
        <View style={[styles.book, { backgroundColor: "#2EB872", width: W * 0.38, height: bookH }]} />
        <View style={[styles.book, { backgroundColor: "#F2B33D", width: W * 0.42, height: bookH, marginLeft: 5 }]} />
        <View style={[styles.book, { backgroundColor: "#2F7DE1", width: W * 0.38, height: bookH }]} />
      </Animated.View>
    </View>
  );
};

export default JambIllustration;

const styles = StyleSheet.create({
  blob: { position: "absolute", bottom: 0, backgroundColor: "#D3EDC0", opacity: 0.75, zIndex: 0 },
  card: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#1C5B33",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 4,
  },
  cardHead: { flexDirection: "row", alignItems: "center" },
  cardDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: J.green, marginRight: 5 },
  scoreBox: {
    marginTop: 6,
    backgroundColor: J.mint,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  valueRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", alignSelf: "stretch" },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  checkLine: { flex: 1, height: 4, borderRadius: 2, backgroundColor: J.mintStrong, marginLeft: 5 },
  checkBadge: {
    position: "absolute",
    left: -7,
    bottom: -9,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: J.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  target: {
    position: "absolute",
    zIndex: 4,
    top: 0,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: J.deep,
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  books: { position: "absolute", zIndex: 3, right: 0, bottom: 0 },
  book: { borderRadius: 4, marginTop: 3 },
});
