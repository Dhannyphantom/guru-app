/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import Animated, { FadeIn } from "react-native-reanimated";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import AppText from "../components/jamb/JambText";
import { slideIn, slideOut } from "../components/jamb/JambMotion";
import SubStatus from "../components/SubStatus";
import JambIntroStep from "../components/jamb/JambIntroStep";
import JambSubjectStep from "../components/jamb/JambSubjectStep";
import JambOverviewStep from "../components/jamb/JambOverviewStep";
import JambQuizStep from "../components/jamb/JambQuizStep";
import JambResultStep from "../components/jamb/JambResultStep";
import { JambButton, JambPressable } from "../components/jamb/JambUI";
import { buildJambResult, J } from "../helpers/jambConfig";
import jambService from "../services/jambService";
import { selectUser } from "../context/usersSlice";
import { useFetchSubjectsQuery } from "../context/instanceSlice";

const STEPS = ["intro", "subjects", "overview", "quiz", "result"];

/**
 * Orchestrates the flow:
 *   intro (1.jpeg) -> subjects (2.jpeg) -> overview (3.jpeg) -> quiz -> result (4.jpeg)
 * Premium only.
 */
const JambPredictorScreen = () => {
  const router = useRouter();
  const user = useSelector(selectUser);
  const isPremium = Boolean(user?.subscription?.isActive);

  const { data: subjectsData, isLoading: loadingSubjects } = useFetchSubjectsQuery();
  const subjects = subjectsData?.data ?? [];

  const [nav, setNav] = useState({ step: "intro", dir: 1 });
  const [selected, setSelected] = useState([]); // the 4 JAMB subjects
  const [practice, setPractice] = useState([]); // subset picked on step 3
  const [initialIds, setInitialIds] = useState([]);
  const [result, setResult] = useState(null);
  const [lifetime, setLifetime] = useState(0);

  const stepRef = useRef("intro");
  stepRef.current = nav.step;

  useEffect(() => {
    jambService.getSavedSelection().then(setInitialIds);
  }, []);

  /**
   * Two-phase navigation: update the direction first so the OUTGOING view's
   * exiting animation matches the direction, then swap the step next tick.
   */
  const go = useCallback((next) => {
    const dir = STEPS.indexOf(next) >= STEPS.indexOf(stepRef.current) ? 1 : -1;
    setNav((n) => ({ ...n, dir }));
    setTimeout(() => setNav({ step: next, dir }), 0);
  }, []);

  const exit = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      switch (stepRef.current) {
        case "subjects":
          go("intro");
          return true;
        case "overview":
          go("subjects");
          return true;
        case "quiz":
          return true; // use the Quit button inside the quiz
        default:
          return false; // intro / result -> normal back
      }
    });
    return () => sub.remove();
  }, [go]);

  const handleSubjects = async (picked) => {
    setSelected(picked);
    await jambService.saveSelection(picked.map((s) => s._id));
    go("overview");
  };

  const handleFinish = async (session) => {
    const res = buildJambResult(session, practice);
    setResult(res);
    try {
      const { lifetimeCorrect } = await jambService.submitResult(res);
      setLifetime(lifetimeCorrect);
    } catch {}
    go("result");
  };

  const { step, dir } = nav;
  const entering = slideIn(dir);
  const exiting = slideOut(dir);

  const showHeader = step !== "quiz";
  const showBack = step === "intro" || step === "overview";

  const renderStep = () => {
    switch (step) {
      case "intro":
        return <JambIntroStep onContinue={() => go("subjects")} />;
      case "subjects":
        return (
          <JambSubjectStep
            subjects={subjects}
            loading={loadingSubjects}
            initialIds={initialIds}
            onBack={() => go("intro")}
            onContinue={handleSubjects}
          />
        );
      case "overview":
        return (
          <JambOverviewStep
            selected={selected}
            user={user}
            onContinue={(subset) => {
              setPractice(subset);
              go("quiz");
            }}
          />
        );
      case "quiz":
        return (
          <JambQuizStep
            selected={practice}
            onFinish={handleFinish}
            onQuit={() => go("overview")}
          />
        );
      case "result":
        return result ? (
          <JambResultStep
            result={result}
            lifetimeCorrect={lifetime}
            onRetake={() => go("subjects")}
            onDone={exit}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#CDE8B6", "#E3F3D4", "#F3F9EC"]}
        style={StyleSheet.absoluteFill}
      />

      <Screen style={{ backgroundColor: "transparent" }}>
        {showHeader && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <View style={styles.headerLeft}>
              {showBack && (
                <JambPressable
                  onPress={() => (step === "overview" ? go("subjects") : exit())}
                  contentStyle={styles.backBtn}
                >
                  <Ionicons name="arrow-back" size={20} color={J.deep} />
                </JambPressable>
              )}
              <AppLogo />
            </View>
            <SubStatus isSubscribed={isPremium} />
          </Animated.View>
        )}

        <View style={styles.body}>
          {!isPremium ? (
            <Animated.View entering={FadeIn} style={styles.locked}>
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={34} color={J.amber} />
              </View>
              <AppText fontWeight="black" size={22} style={{ color: J.ink, marginTop: 18 }}>
                Premium feature
              </AppText>
              <AppText
                fontWeight="medium"
                size={14}
                style={{ color: J.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}
              >
                The Guru JAMB Score Predictor is available to premium users only.
                Subscribe to unlock it.
              </AppText>
              <JambButton title="Go Back" icon="arrow-back" onPress={exit} style={{ marginTop: 24 }} />
            </Animated.View>
          ) : (
            <Animated.View
              key={step}
              entering={entering}
              exiting={exiting}
              style={{ flex: 1 }}
            >
              {renderStep()}
            </Animated.View>
          )}
        </View>
      </Screen>

      <StatusBar style="dark" />
    </View>
  );
};

export default JambPredictorScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#DDEFCB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 15,
    marginRight: 20,
    paddingVertical: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  body: { flex: 1, overflow: "hidden" },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: J.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
