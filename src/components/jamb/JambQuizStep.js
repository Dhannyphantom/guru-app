/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import AppText from "./JambText";
import AppButton from "../AppButton";
import LottieAnimator from "../LottieAnimator";
import PromptModal from "../PromptModal";
import QuestionDisplay from "../QuestionDisplay";
import { estimatedMinutes, totalAssessmentQuestions } from "../../helpers/jambConfig";
import { T } from "./JambTheme";
import { Chip } from "./JambUI";
import uuid from "react-native-uuid";
import jambService from "../../services/jambService";
import { isRetryable } from "../../services/jambApi";

const QUIT_PROMPT = {
  title: "Exit Assessment",
  msg: "Are you sure you want to quit? Your progress in this assessment will be lost.",
  btn: "Quit",
  type: "quit",
};

const CHIP_TONES = [
  { color: T.blueDark, bg: T.blueSoft },
  { color: T.yellowInk, bg: T.yellowSoft },
  { color: T.coralDark, bg: T.coralSoft },
  { color: T.purpleDark, bg: T.purpleSoft },
];

const PreparingLoader = ({ selected, onCancel }) => {
  const total = totalAssessmentQuestions(selected);

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.loader}>
      <LottieAnimator size={110} />

      <AppText fontWeight="black" size={22} style={{ color: T.ink, marginTop: 20 }}>
        Sharpening your pencils…
      </AppText>
      <AppText fontWeight="medium" size={14} style={styles.loaderSub}>
        {total} questions • about {Math.max(estimatedMinutes(total), 1)} min
      </AppText>
      <View style={styles.loaderSubjects}>
        {selected.map((s, i) => (
          <Chip
            key={s._id ?? s.name}
            label={s.name}
            color={CHIP_TONES[i % CHIP_TONES.length].color}
            bg={CHIP_TONES[i % CHIP_TONES.length].bg}
            style={{ margin: 3 }}
          />
        ))}
      </View>

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
        <View style={styles.errIcon}>
          <Ionicons name="cloud-offline" size={40} color={T.coralDark} />
        </View>
        <AppText fontWeight="black" size={19} style={{ marginTop: 18, color: T.ink }}>
          Couldn't load the assessment
        </AppText>
        <AppText fontWeight="medium" size={13} style={{ color: T.sub, marginTop: 6, textAlign: "center" }}>
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: T.paper,
  },
  errIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: T.coralSoft,
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderSub: { color: T.sub, marginTop: 8 },
  loaderSubjects: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
  },
});
