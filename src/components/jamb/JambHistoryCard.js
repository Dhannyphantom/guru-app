import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import AppText from "./JambText";
import { J, JAMB_TOTAL } from "../../helpers/jambConfig";
import { LAYOUT, enter } from "./JambMotion";
import { Card, Chip, JambPressable, ProgressRing } from "./JambUI";

const VISIBLE = 4;

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

const Row = ({ item, older, index }) => {
  const delta = older ? item.predicted - older.predicted : null;
  const up = delta > 0;

  return (
    <Animated.View
      entering={enter(index, 80)}
      layout={LAYOUT}
      style={styles.row}
    >
      <View style={styles.badge}>
        <AppText fontWeight="black" size={12} style={{ color: J.deep }}>
          {item.number}
        </AppText>
      </View>

      <View style={{ flex: 1 }}>
        <AppText fontWeight="bold" size={13} style={{ color: J.ink }}>
          Round {item.number}
        </AppText>
        <AppText fontWeight="medium" size={10.5} style={{ color: J.muted }}>
          {fmtDate(item.date)} · {item.totalCorrect}/{item.totalQuestions} correct
        </AppText>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <AppText fontWeight="black" size={15} style={{ color: J.ink }}>
          {item.predicted}
          <AppText fontWeight="semibold" size={10.5} style={{ color: J.muted }}>
            /{JAMB_TOTAL}
          </AppText>
        </AppText>
        {delta !== null && delta !== 0 ? (
          <View style={styles.delta}>
            <Ionicons
              name={up ? "trending-up" : "trending-down"}
              size={12}
              color={up ? J.green : J.danger}
            />
            <AppText
              fontWeight="bold"
              size={10.5}
              style={{ color: up ? J.green : J.danger, marginLeft: 3 }}
            >
              {up ? "+" : ""}
              {delta}
            </AppText>
          </View>
        ) : (
          <Chip label={item.rating?.label ?? ""} color={item.rating?.color} bg={item.rating?.bg} />
        )}
      </View>
    </Animated.View>
  );
};

/** Round history + average prediction (out of 400). */
const JambHistoryCard = ({ summary, index = 2 }) => {
  const [all, setAll] = useState(false);
  const history = summary?.history ?? [];
  const rounds = summary?.rounds ?? 0;
  const rows = all ? history : history.slice(0, VISIBLE);

  return (
    <Card index={index}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Ionicons name="time" size={19} color={J.green} />
          <AppText fontWeight="black" size={18} style={{ color: J.ink, marginLeft: 8 }}>
            Round History
          </AppText>
        </View>
        <Chip label={`${rounds} round${rounds === 1 ? "" : "s"}`} bg={J.mintStrong} />
      </View>

      {rounds === 0 ? (
        <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
          <Ionicons name="flag" size={26} color={J.green} />
          <AppText
            fontWeight="medium"
            size={12.5}
            style={{ color: J.muted, textAlign: "center", marginTop: 8, lineHeight: 18 }}
          >
            Practise all four subjects to complete a round. Your score prediction
            and average will show up here.
          </AppText>
        </Animated.View>
      ) : (
        <>
          <View style={styles.avgBox}>
            <ProgressRing
              size={62}
              stroke={7}
              percent={Math.round((summary.average / JAMB_TOTAL) * 100)}
              delay={300}
            >
              <AppText fontWeight="black" size={15} style={{ color: J.ink }}>
                {summary.average}
              </AppText>
            </ProgressRing>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText fontWeight="semibold" size={12} style={{ color: J.muted }}>
                Average prediction
              </AppText>
              <AppText fontWeight="black" size={22} style={{ color: J.deep }}>
                {summary.average}
                <AppText fontWeight="semibold" size={13} style={{ color: J.muted }}>
                  /{JAMB_TOTAL}
                </AppText>
              </AppText>
            </View>
            <View style={styles.bestBox}>
              <AppText fontWeight="medium" size={10} style={{ color: J.muted }}>
                Best
              </AppText>
              <AppText fontWeight="black" size={15} style={{ color: J.ink }}>
                {summary.best}
              </AppText>
            </View>
          </View>

          {rows.map((r, i) => (
            <Row key={r.id} item={r} older={history[history.indexOf(r) + 1]} index={i} />
          ))}

          {history.length > VISIBLE && (
            <JambPressable onPress={() => setAll((a) => !a)} style={{ alignSelf: "center", marginTop: 6 }}>
              <AppText fontWeight="bold" size={12} style={{ color: J.deep }}>
                {all ? "Show less" : `Show all ${history.length}`}
              </AppText>
            </JambPressable>
          )}
        </>
      )}
    </Card>
  );
};

export default JambHistoryCard;

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { flexDirection: "row", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 },
  avgBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: J.mint,
    borderRadius: 18,
    padding: 12,
    marginBottom: 6,
  },
  bestBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: J.line,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: J.mintStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  delta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
});
