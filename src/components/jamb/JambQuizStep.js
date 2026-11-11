/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import AppText from "./JambText";
import AppButton from "../AppButton";
import PromptModal from "../PromptModal";
import QuestionDisplay from "../QuestionDisplay";
import { J, estimatedMinutes, totalAssessmentQuestions } from "../../helpers/jambConfig";
import uuid from "react-native-uuid";
import jambService from "../../services/jambService";
import { isRetryable } from "../../services/jambApi";

const QUIT_PROMPT = {
  title: "Exit Assessment",
  msg: "Are you sure you want to quit? Your progress in this assessment will be lost.",
  btn: "Quit",
  type: "quit",
};

const PreparingLoader = ({ selected, onCancel }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.55 - pulse.value * 0.45,
  }));
  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  const total = totalAssessmentQuestions(selected);

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.loader}>
      <View style={styles.pulseWrap}>
        <Animated.View style={[styles.pulseRing, ring]} />
        <Animated.View style={[styles.pulseCore, core]}>
          <Ionicons name="rocket" size={38} color="#fff" />
        </Animated.View>
      </View>

      <AppText fontWeight="black" size={22} style={{ color: J.deep, marginTop: 36 }}>
        Preparing your assessment…
      </AppText>
      <AppText fontWeight="medium" size={14} style={styles.loaderSub}>
        {total} questions • about {Math.max(estimatedMinutes(total), 1)} min
      </AppText>
      <AppText fontWeight="semibold" size={13} style={styles.loaderSubjects}>
        {selected.map((s) => s.name).join("  •  ")}
      </AppText>

      <AppButton title="Cancel" type="white" onPress={onCancel} contStyle={{ marginTop: 28 }} />
    </Animated.View>
  );
};

/**
 * Step 4 — runs the assessment with your existing <QuestionDisplay />.
 * The paper is issued (or resumed) by the server. When the last question is
 * answered we hand the session back with the attempt metadata:
 *   onFinish(session, { attemptId, idempotencyKey, durationMs })
 * Non-retryable load errors are reported through onError(e).
 */
const JambQuizStep = ({ selected = [], onFinish, onQuit, onError }) => {
  const [bank, setBank] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // bump to retry
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const sessionRef = useRef(null);
  const metaRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setBank(null);
    setFailed(false);
    jambService
      .getQuestions(selected)
      .then((r) => {
        if (!alive) return;
        metaRef.current = {
          attemptId: r.attemptId,
          expiresAt: r.expiresAt,
          idempotencyKey: String(uuid.v4()),
          startedAt: Date.now(),
        };
        setBank(r.bank);
      })
      .catch((e) => {
        if (!alive) return;
        if (isRetryable(e)) setFailed(true);
        else onError?.(e);
      });
    return () => {
      alive = false;
    };
  }, [selected, attempt]);

  const handleView = (view) => {
    // QuestionDisplay calls setQuizSession(...) then setQuizInfoView("finished")
    if (view === "finished" && !doneRef.current) {
      doneRef.current = true;
      const m = metaRef.current ?? {};
      onFinish(sessionRef.current, {
        attemptId: m.attemptId,
        idempotencyKey: m.idempotencyKey,
        durationMs: Date.now() - (m.startedAt ?? Date.now()),
      });
    }
  };

  const handleQuit = async () => {
    await jambService.quitAttempt(metaRef.current?.attemptId);
    onQuit();
  };

  if (failed) {
    return (
      <View style={styles.loader}>
        <Ionicons name="cloud-offline" size={48} color={J.danger} />
        <AppText fontWeight="bold" size={18} style={{ marginTop: 16, color: J.ink }}>
          Couldn't load the assessment
        </AppText>
        <AppText fontWeight="medium" size={13} style={{ color: J.muted, marginTop: 6, textAlign: "center" }}>
          Check your connection and try again.
        </AppText>
        <AppButton title="Try Again" onPress={() => setAttempt((n) => n + 1)} contStyle={{ marginTop: 20 }} />
        <AppButton title="Go Back" type="white" onPress={onQuit} contStyle={{ marginTop: 10 }} />
      </View>
    );
  }

  if (!bank) return <PreparingLoader selected={selected} onCancel={onQuit} />;

  return (
    <Animated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
      <QuestionDisplay
        questionBank={bank}
        sessionId={null}
        handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
        setQuizSession={(s) => {
          sessionRef.current = s;
        }}
        setQuizInfoView={handleView}
        hardReset={handleQuit}
      />
      <PromptModal
        prompt={prompt}
        setPrompt={(d) => setPrompt(d)}
        onPress={(type) => type === "quit" && handleQuit()}
      />
    </Animated.View>
  );
};

export default JambQuizStep;

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  pulseWrap: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: J.green,
  },
  pulseCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: J.deep,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderSub: { color: J.muted, marginTop: 8 },
  loaderSubjects: { textTransform: "capitalize", color: J.deep, marginTop: 14, textAlign: "center", lineHeight: 20 },
});
