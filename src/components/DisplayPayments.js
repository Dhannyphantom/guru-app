import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { PayWithFlutterwave } from "flutterwave-react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { selectUser } from "../context/usersSlice";
import { useRouter } from "expo-router";
import { getFullName, hasCompletedProfile } from "../helpers/helperFunctions";
import { subDropdown, subSchoolDrop } from "../helpers/dataStore";
import {
  FLW_PUBLIC_KEY,
  HERO,
  PAY_CURRENCY,
  PAY_OPTIONS,
  PERKS,
  PROFILE_ROUTE,
} from "../helpers/payConfig";
import PopMessage from "./PopMessage";

import Animated from "react-native-reanimated";
import { P } from "./payment/PayTheme";
import { LAYOUT } from "./payment/PayMotion";
import {
  PayButton,
  PayText,
  PressScale,
  SectionTitle,
  formatMoney,
} from "./payment/PayUI";
import { buildPlans, pickDefaultPlan } from "./payment/payPlans";
import usePaymentFlow from "./payment/usePaymentFlow";
import PayHero from "./payment/PayHero";
import PlanCard from "./payment/PlanCard";
import PerksList from "./payment/PerksList";
import PayTrust from "./payment/PayTrust";
import PayCheckoutBar from "./payment/PayCheckoutBar";
import PaySuccess from "./payment/PaySuccess";
import PayRecovery from "./payment/PayRecovery";
import PayVerifying from "./payment/PayVerifying";
import PayProfileGate from "./payment/PayProfileGate";
import useTabBarOffset from "./payment/useTabBarOffset";
import PendingTransactions from "./PendingTransactions";
import { useMarkSubscriptionStartedMutation } from "../context/usersSlice";

/**
 * Subscription / payment flow.
 *
 *   hero  →  pick a plan  →  perks  →  trust & help  →  [sticky Pay bar]
 *                                  ↓ Flutterwave
 *                       verifying overlay → success celebration
 *                                         ↘ recovery (couldn't confirm)
 *
 * Props are unchanged: { hideModal(isSuccess), data: { type, schoolId, data } }
 */
const DisplayPayments = ({ hideModal, data }) => {
  const insets = useSafeAreaInsets();
  const [markStarted] = useMarkSubscriptionStartedMutation();
  const router = useRouter();
  const tabOffset = useTabBarOffset();
  const user = useSelector(selectUser);

  // Block payment until the profile is complete
  const profile = hasCompletedProfile(user);
  const profileOk = Boolean(profile?.bool);
  const profileMsg =
    typeof profile?.msg === "string"
      ? profile.msg
      : typeof profile?.message === "string"
        ? profile.message
        : "";
  const goCompleteProfile = useCallback(() => {
    if (PROFILE_ROUTE) router.push(PROFILE_ROUTE);
    else hideModal?.(false);
  }, [router, hideModal]);

  const isSchool = data?.type === "school";
  const copy = isSchool ? HERO.school : HERO.student;
  const perks = isSchool ? PERKS.school : PERKS.student;

  const plans = useMemo(
    () => buildPlans(isSchool ? subSchoolDrop : subDropdown),
    [isSchool],
  );
  const [selectedId, setSelectedId] = useState(
    () => pickDefaultPlan(plans)?.id ?? null,
  );
  const plan = plans.find((p) => p.id === selectedId) ?? null;

  // Show only the first few plans; the rest sit behind a "show more" toggle.
  // If the pre-selected plan is beyond the preview, start expanded so it's visible.
  const PREVIEW_COUNT = 3;
  const [showAll, setShowAll] = useState(
    () => plans.findIndex((p) => p.id === selectedId) >= PREVIEW_COUNT,
  );
  const hiddenCount = Math.max(plans.length - PREVIEW_COUNT, 0);
  const visiblePlans = showAll ? plans : plans.slice(0, PREVIEW_COUNT);

  const [popper, setPopper] = useState({ vis: false });
  const notify = useCallback(
    (type, msg) => setPopper({ vis: true, type, msg }),
    [],
  );

  const fullName = getFullName(user);
  const schoolId = isSchool ? (data?.schoolId ?? data?.data?._id) : "";

  const {
    status,
    txRef,
    ready,
    intentError,
    retryPrepare,
    receipt,
    message,
    checking,
    handleRedirect,
    retryVerify,
    startOver,
  } = usePaymentFlow({
    plan,
    accountType: isSchool ? "school" : "student",
    schoolId: schoolId || undefined,
    notify,
  });

  // Flutterwave reads these when the button is pressed. tx_ref is stable per
  // attempt (and re-issued by the hook after a cancel / failure).
  const options = useMemo(() => {
    if (!plan || !txRef) return null;
    return {
      tx_ref: txRef,
      authorization: FLW_PUBLIC_KEY,
      customer: { email: user?.email, name: fullName },
      amount: plan.amount,
      currency: PAY_CURRENCY,
      payment_options: PAY_OPTIONS,
      meta: {
        account_type: data?.type,
        name: fullName,
        days: plan.days,
        schoolId: schoolId ?? "",
        user_id: String(user?._id ?? user?.id ?? ""),
      },
    };
  }, [plan, txRef, user?.email, user?._id, user?.id, fullName, data?.type, schoolId]);

  // ─── Success ───────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <View style={styles.root}>
        <PaySuccess
          receipt={receipt}
          userName={fullName}
          isSchool={isSchool}
          onDone={() => hideModal?.(true)}
          bottomOffset={tabOffset}
        />
        <PopMessage popData={popper} setPopData={setPopper} />
      </View>
    );
  }

  // ─── Choose / pay / recover ────────────────────────────────────────────────
  const inRecovery = status === "recovery";

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 150 + (tabOffset || insets.bottom),
        }}
      >
        <PayHero title={copy.title} sub={copy.sub} pills={copy.pills} />

        {!inRecovery && (
          <PendingTransactions
            kinds={["subscription"]}
            compact
            onResolved={(items) => {
              if (items.some((i) => i.outcome === "completed")) {
                notify(
                  "info",
                  "Your earlier payment was confirmed and your subscription is now active.",
                );
                setTimeout(() => hideModal?.(true), 1500);
              }
            }}
          />
        )}

        {!profileOk && !inRecovery && (
          <PayProfileGate
            message={profileMsg}
            onPress={goCompleteProfile}
            buttonLabel={PROFILE_ROUTE ? "Complete profile" : "Go back"}
          />
        )}

        {inRecovery ? (
          <PayRecovery
            onRetry={retryVerify}
            onStartOver={startOver}
            message={message}
            loading={checking}
          />
        ) : (
          <View style={styles.section}>
            <SectionTitle
              icon="pricetags"
              title={isSchool ? "Choose a school plan" : "Choose your plan"}
              sub="Pay once. No auto-renewal."
            />

            {plans.length > 0 ? (
              <>
                {visiblePlans.map((p, i) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    index={i < PREVIEW_COUNT ? i : i - PREVIEW_COUNT}
                    selected={p.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))}

                {hiddenCount > 0 && (
                  <Animated.View layout={LAYOUT}>
                    <PressScale
                      onPress={() => setShowAll((v) => !v)}
                      scaleTo={0.98}
                      contentStyle={styles.moreBtn}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={showAll ? "chevron-up" : "sparkles"}
                        size={16}
                        color={P.brandDark}
                      />
                      <PayText
                        fontWeight="black"
                        size={13}
                        style={{ color: P.brandDark, marginLeft: 8 }}
                      >
                        {showAll
                          ? "Show fewer plans"
                          : `Explore ${hiddenCount} more ${
                              hiddenCount === 1 ? "plan" : "plans"
                            }`}
                      </PayText>
                    </PressScale>
                  </Animated.View>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="alert-circle" size={22} color={P.coralDark} />
                <PayText
                  fontWeight="semibold"
                  size={13}
                  style={{ color: P.sub, marginLeft: 10, flex: 1 }}
                >
                  No subscription plans are available right now. Please check
                  back shortly.
                </PayText>
              </View>
            )}
          </View>
        )}

        <PerksList perks={perks} />
        <PayTrust />
      </ScrollView>

      {!inRecovery && (
        <PayCheckoutBar plan={plan} bottomOffset={tabOffset}>
          {!profileOk ? (
            <PayButton
              title={PROFILE_ROUTE ? "Finish profile" : "Profile incomplete"}
              icon="person"
              variant="brand"
              onPress={goCompleteProfile}
            />
          ) : intentError ? (
            <PayButton
              title="Couldn't prepare payment — tap to retry"
              icon="refresh"
              variant="brand"
              onPress={retryPrepare}
            />
          ) : plan && options ? (
            <PayWithFlutterwave
              onRedirect={handleRedirect}
              options={options}
              customButton={(props) => (
                <PayButton
                  title={`Pay ${formatMoney(plan.amount)}`}
                  icon="lock-closed"
                  shine
                  loading={props.isInitializing}
                  disabled={props.disabled}
                  onPress={() => {
                    // leave a server-side trace BEFORE Flutterwave opens
                    markStarted({ tx_ref: txRef });
                    props.onPress();
                  }}
                />
              )}
            />
          ) : (
            <PayButton
              title={plan ? "Preparing secure payment…" : "Pick a plan"}
              icon={null}
              loading={Boolean(plan) && !ready}
              disabled
            />
          )}
        </PayCheckoutBar>
      )}

      {status === "verifying" && <PayVerifying />}

      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default DisplayPayments;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.paper },
  section: { marginHorizontal: 16 },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: P.brandMid,
    backgroundColor: P.brandSoft,
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.coralSoft,
    borderWidth: 2,
    borderColor: P.coralLine,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
});
