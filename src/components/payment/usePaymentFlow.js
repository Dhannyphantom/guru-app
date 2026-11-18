import { useCallback, useEffect, useRef, useState } from "react";

import {
  useCreateSubscriptionIntentMutation,
  useVerifySubscriptionMutation,
} from "../../context/usersSlice";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Local fallback ref (only used against an older server without /intent). */
export const makeTxRef = (length = 10) => {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return `flw_tx_ref_${out}`;
};

// While we wait for the bank / server we quietly re-check a few times.
const AUTO_RETRY_DELAYS = [4000, 8000, 15000, 30000];

/**
 * Payment state machine, kept out of the UI.
 *
 *   status: "choosing"  → picking a plan / ready to pay
 *           "verifying" → Flutterwave returned, confirming with the server
 *           "success"   → server confirmed AND activated the subscription
 *           "recovery"  → not confirmed yet (network / bank / server). The user
 *                         may have been debited, so we keep re-checking and
 *                         never ask them to pay again.
 *
 * What changed:
 *  • The server issues the tx_ref (PaymentIntent) BEFORE Flutterwave opens, so
 *    it can confirm + activate the payment even if this app never gets the
 *    redirect (crash, network loss, app killed).
 *  • The server answers with a `state`, so we no longer mistake "server hiccup"
 *    for "payment failed" (or the other way round).
 *  • Recovery re-checks automatically, and anything still open shows up under
 *    "Pending transactions" the next time the app is opened.
 */
export default function usePaymentFlow({
  plan,
  accountType,
  schoolId,
  notify,
}) {
  const [verifySubscription] = useVerifySubscriptionMutation();
  const [createIntent] = useCreateSubscriptionIntentMutation();

  const [status, setStatus] = useState("choosing");
  const [txRef, setTxRef] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [intentError, setIntentError] = useState(false);
  const [prepareTick, setPrepareTick] = useState(0);

  const pending = useRef(null); // { payload, plan } of the last redirect
  const planRef = useRef(plan);
  planRef.current = plan;
  const txRefRef = useRef(null);
  txRefRef.current = txRef;
  const autoTries = useRef(0);
  const seq = useRef(0);

  // ── 1. ask the server for a tx_ref whenever the plan / attempt changes ────
  useEffect(() => {
    setIntentError(false);
    if (!plan) {
      setTxRef(null);
      return;
    }
    const mine = ++seq.current;
    setTxRef(null);

    (async () => {
      try {
        const res = await createIntent({
          type: accountType,
          schoolId,
          amount: plan.amount,
          days: plan.days,
          label: plan.label,
          fresh: attempt > 0,
        }).unwrap();
        if (mine === seq.current) setTxRef(res?.data?.tx_ref ?? makeTxRef());
      } catch (e) {
        if (mine !== seq.current) return;
        if (e?.status === 404) {
          // older server without /subscription/intent: legacy behaviour
          setTxRef(makeTxRef());
        } else {
          setIntentError(true);
        }
      }
    })();
  }, [plan?.id, plan?.amount, plan?.days, accountType, schoolId, attempt, prepareTick]);

  const retryPrepare = useCallback(() => setPrepareTick((t) => t + 1), []);

  const startFresh = useCallback(() => {
    pending.current = null;
    autoTries.current = 0;
    setMessage("");
    setStatus("choosing");
    setAttempt((a) => a + 1); // new tx_ref for the next attempt
  }, []);

  // ── 2. confirm with the server ────────────────────────────────────────────
  const runVerify = useCallback(
    async (payload, chosenPlan, { silent = false, background = false } = {}) => {
      if (!silent && !background) setStatus("verifying");
      if (background) setChecking(true);

      try {
        const result = await verifySubscription(payload).unwrap();

        if (result?.success) {
          setReceipt({
            days: result?.data?.days ?? chosenPlan?.days ?? 0,
            amount: result?.data?.amount ?? chosenPlan?.amount ?? 0,
            label: chosenPlan?.label ?? "",
            txRef: payload.tx_ref,
          });
          pending.current = null;
          setStatus("success");
          return;
        }

        const claimedPaid =
          payload.status === "successful" || payload.status === "completed";

        switch (result?.state) {
          case "failed":
            notify(
              "info",
              result?.message ||
                "That payment didn't go through. You were not charged.",
            );
            startFresh();
            return;

          case "cancelled":
            notify("info", "Payment cancelled.");
            startFresh();
            return;

          case "pending":
          case "busy":
          case "paid_unfulfilled":
          case "unknown":
            setMessage(result?.message ?? "");
            setStatus("recovery");
            return;

          default: // not_found
            if (claimedPaid) {
              setMessage(
                "Your bank says the payment went through, but we're still waiting for confirmation.",
              );
              setStatus("recovery");
              return;
            }
            notify(
              "info",
              payload.status === "cancelled"
                ? "Payment cancelled."
                : "We couldn't confirm that payment. Please try again.",
            );
            startFresh();
        }
      } catch (error) {
        if (silent) {
          // user simply backed out and we couldn't look it up — that's fine
          notify("info", "Payment cancelled.");
          startFresh();
          return;
        }
        setMessage(
          "We couldn't reach our server to confirm your payment. If you were debited, don't pay again — we'll keep checking.",
        );
        setStatus("recovery");
      } finally {
        if (background) setChecking(false);
      }
    },
    [verifySubscription, notify, startFresh],
  );

  const runVerifyRef = useRef(runVerify);
  runVerifyRef.current = runVerify;

  /** Pass this to <PayWithFlutterwave onRedirect=... /> */
  const handleRedirect = useCallback(async (response) => {
    const payload = {
      transaction_id: response?.transaction_id ?? null,
      tx_ref: response?.tx_ref ?? txRefRef.current,
      status: response?.status,
    };
    const chosenPlan = planRef.current;
    pending.current = { payload, plan: chosenPlan };
    autoTries.current = 0;

    // Backed out before paying: check quietly (bank-transfer / USSD can
    // complete late), but don't flash the "confirming" overlay.
    const silent =
      response?.status === "cancelled" && !response?.transaction_id;

    await runVerifyRef.current(payload, chosenPlan, { silent });
  }, []);

  /** "Check payment status" button in recovery mode. */
  const retryVerify = useCallback(() => {
    const p =
      pending.current ??
      (txRefRef.current
        ? {
            payload: { transaction_id: null, tx_ref: txRefRef.current },
            plan: planRef.current,
          }
        : null);
    if (!p) return;
    autoTries.current = 0;
    runVerifyRef.current(p.payload, p.plan, { background: true });
  }, []);

  // ── 3. while in recovery, quietly re-check a few times ────────────────────
  useEffect(() => {
    if (status !== "recovery" || checking || !pending.current) return;
    if (autoTries.current >= AUTO_RETRY_DELAYS.length) return;

    const t = setTimeout(() => {
      const delayIndex = autoTries.current;
      autoTries.current = delayIndex + 1;
      runVerifyRef.current(pending.current.payload, pending.current.plan, {
        background: true,
      });
    }, AUTO_RETRY_DELAYS[autoTries.current]);

    return () => clearTimeout(t);
  }, [status, checking, message]);

  /** "I didn't pay — start over" in recovery mode. */
  const startOver = useCallback(() => startFresh(), [startFresh]);

  return {
    status,
    txRef,
    ready: Boolean(txRef),
    intentError,
    retryPrepare,
    receipt,
    message,
    checking,
    handleRedirect,
    retryVerify,
    startOver,
  };
}
