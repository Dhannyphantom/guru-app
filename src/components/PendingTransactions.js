import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import AppText from "./AppText";
import colors from "../helpers/colors";
import { dateFormatter } from "../helpers/helperFunctions";
import {
  useFetchPendingQuery,
  useRetryPendingMutation,
} from "../context/usersSlice";

const ICONS = {
  subscription: "crown",
  withdrawal: "bank-transfer-out",
  airtime: "cellphone",
  data: "wifi",
};

// tone -> chip colours
const TONES = {
  ok: { bg: colors.green + "22", fg: colors.greenDark },
  warn: { bg: colors.warning + "33", fg: colors.warningDark },
  bad: { bg: "#D32F2F22", fg: "#D32F2F" },
  neutral: { bg: colors.medium + "22", fg: colors.medium },
};

const RECENT_PREVIEW = 4;

const safeDate = (v) => {
  try {
    return v ? dateFormatter(v, "fullDate") : "";
  } catch {
    return "";
  }
};

/**
 * The in-app trace of every payment / withdrawal / airtime / data attempt.
 *
 *  • "Pending transactions": anything not finished. "Check status" asks the
 *    server to re-check Flutterwave and finish it (it NEVER charges or debits
 *    again). Unpaid subscription attempts can be dismissed ("I didn't pay").
 *  • "Recent attempts": the last 7 days of finished ones (successful, failed,
 *    cancelled) with the reason, so nothing just vanishes.
 *
 *   kinds       optional filter, e.g. ["subscription"]
 *   compact     hide the explanatory sentence
 *   onResolved  called with [{ id, kind, outcome: "completed"|"failed", message }]
 */
const PendingTransactions = ({ kinds, compact = false, onResolved }) => {
  const [poll, setPoll] = useState(60000);
  const { data, refetch } = useFetchPendingQuery(undefined, {
    pollingInterval: poll,
    refetchOnMountOrArgChange: true,
  });
  const [retryPending] = useRetryPendingMutation();

  // re-check every time the screen is shown again
  useFocusEffect(
    useCallback(() => {
      try {
        refetch();
      } catch (_) {}
    }, [refetch]),
  );

  const [busy, setBusy] = useState(null); // `${id}:${action}`
  const [notes, setNotes] = useState({});
  const [open, setOpen] = useState({});
  const [showAll, setShowAll] = useState(false);
  const reported = useRef(new Set());

  const allow = (x) => !kinds || kinds.includes(x.kind);
  const items = (data?.data?.items ?? []).filter(allow);
  const recent = (data?.data?.recent ?? []).filter(allow);
  const recentShown = showAll ? recent : recent.slice(0, RECENT_PREVIEW);

  // check often while something is open, rarely otherwise
  useEffect(() => {
    setPoll((data?.data?.items?.length ?? 0) > 0 ? 20000 : 60000);
  }, [data]);

  // Items the server healed by itself while we were away / polling.
  useEffect(() => {
    const fresh = (data?.data?.resolved ?? [])
      .filter(allow)
      .filter((r) => !reported.current.has(r.id));
    if (fresh.length) {
      fresh.forEach((r) => reported.current.add(r.id));
      onResolved?.(fresh);
    }
  }, [data]);

  const act = async (item, action) => {
    setBusy(`${item.id}:${action}`);
    try {
      const res = await retryPending({
        entity: item.entity,
        id: item.id,
        action,
      }).unwrap();

      if (action === "dismiss") {
        setNotes((n) => ({ ...n, [item.id]: "" }));
      } else {
        const r = res?.data;
        setNotes((n) => ({ ...n, [item.id]: r?.message ?? "" }));
        if (r?.resolved) {
          reported.current.add(item.id);
          onResolved?.([
            { id: item.id, kind: item.kind, outcome: r.outcome, message: r.message },
          ]);
        }
      }
      await refetch();
    } catch (e) {
      setNotes((n) => ({
        ...n,
        [item.id]:
          e?.data?.message ??
          "Couldn't reach the server. Check your connection and try again.",
      }));
    } finally {
      setBusy(null);
    }
  };

  if (!items.length && !recent.length) return null;

  const Row = ({ item, unresolved }) => {
    const tone = TONES[item.tone] ?? TONES.neutral;
    const expanded = unresolved || open[item.id];
    return (
      <Pressable
        disabled={unresolved}
        onPress={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
        style={styles.row}
      >
        <View style={styles.rowTop}>
          <View style={[styles.icon, { backgroundColor: tone.fg }]}>
            <MaterialCommunityIcons
              name={ICONS[item.kind] ?? "swap-horizontal"}
              size={18}
              color={colors.white}
            />
          </View>
          <View style={styles.body}>
            <AppText fontWeight="black" size={13} style={styles.title}>
              {item.title}
            </AppText>
            <View style={styles.meta}>
              <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                <AppText fontWeight="bold" size={10} style={{ color: tone.fg }}>
                  {item.statusLabel}
                </AppText>
              </View>
              <AppText size={10} style={styles.date}>
                {safeDate(item.createdAt)}
              </AppText>
            </View>
          </View>
          {!unresolved && (
            <MaterialCommunityIcons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.medium}
            />
          )}
        </View>

        {expanded && (
          <View style={styles.details}>
            <AppText fontWeight="medium" size={11} style={styles.desc}>
              {item.description}
            </AppText>
            {Boolean(notes[item.id]) && (
              <AppText fontWeight="bold" size={11} style={styles.note}>
                {notes[item.id]}
              </AppText>
            )}
            <AppText size={10} style={styles.ref} selectable>
              Ref: {item.reference}
            </AppText>

            {(item.canRetry || item.canDismiss) && (
              <View style={styles.actions}>
                {item.canRetry && (
                  <Pressable
                    disabled={Boolean(busy)}
                    onPress={() => act(item, "retry")}
                    style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
                  >
                    {busy === `${item.id}:retry` ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <AppText fontWeight="black" size={11} style={styles.btnText}>
                        Check status
                      </AppText>
                    )}
                  </Pressable>
                )}
                {item.canDismiss && (
                  <Pressable
                    disabled={Boolean(busy)}
                    onPress={() => act(item, "dismiss")}
                    style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}
                  >
                    {busy === `${item.id}:dismiss` ? (
                      <ActivityIndicator size="small" color={colors.medium} />
                    ) : (
                      <AppText fontWeight="bold" size={11} style={styles.ghostText}>
                        I didn't pay
                      </AppText>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      {items.length > 0 && (
        <View style={[styles.card, styles.cardWarn]}>
          <View style={styles.head}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={18}
              color={colors.warningDark}
            />
            <AppText fontWeight="black" size={14} style={styles.headWarn}>
              Pending transactions ({items.length})
            </AppText>
          </View>
          {!compact && (
            <AppText fontWeight="medium" size={12} style={styles.sub}>
              These aren't finished yet. Tap “Check status” and we'll complete
              them or refund you. You won't be charged twice.
            </AppText>
          )}
          {items.map((item) => (
            <React.Fragment key={`${item.entity}-${item.id}`}>
              {Row({ item, unresolved: true })}
            </React.Fragment>
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={[styles.card, styles.cardPlain]}>
          <View style={styles.head}>
            <MaterialCommunityIcons
              name="history"
              size={18}
              color={colors.primaryDeep}
            />
            <AppText fontWeight="black" size={14} style={styles.headPlain}>
              Recent attempts
            </AppText>
          </View>
          {recentShown.map((item) => (
            <React.Fragment key={`${item.entity}-${item.id}`}>
              {Row({ item, unresolved: false })}
            </React.Fragment>
          ))}
          {recent.length > RECENT_PREVIEW && (
            <Pressable onPress={() => setShowAll((v) => !v)} style={styles.more}>
              <AppText fontWeight="bold" size={12} style={styles.moreText}>
                {showAll ? "Show fewer" : `Show all (${recent.length})`}
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default PendingTransactions;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  cardWarn: {
    borderColor: colors.warning + "88",
    backgroundColor: colors.warning + "14",
  },
  cardPlain: {
    borderColor: colors.primary + "44",
    backgroundColor: colors.primary + "0D",
  },
  head: { flexDirection: "row", alignItems: "center", columnGap: 8 },
  headWarn: { color: colors.warningDark },
  headPlain: { color: colors.primaryDeep },
  sub: { color: colors.medium, marginTop: 4, marginBottom: 2, lineHeight: 17 },
  row: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  rowTop: { flexDirection: "row", alignItems: "center", columnGap: 10 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: { color: colors.primaryDeep },
  meta: { flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 4 },
  chip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  date: { color: colors.medium },
  details: { marginTop: 8 },
  desc: { color: colors.medium, lineHeight: 16 },
  note: { color: colors.primaryDeep, marginTop: 6 },
  ref: { color: colors.medium, marginTop: 6 },
  actions: { flexDirection: "row", columnGap: 8, marginTop: 10 },
  btn: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  btnText: { color: colors.white },
  ghost: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.medium + "55",
  },
  ghostText: { color: colors.medium },
  more: { alignSelf: "center", paddingVertical: 10 },
  moreText: { color: colors.primaryDeep },
});
