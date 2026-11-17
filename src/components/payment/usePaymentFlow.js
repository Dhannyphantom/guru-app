import { useCallback, useRef, useState } from "react";

import { useVerifySubscriptionMutation } from "../../context/usersSlice";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Unique transaction reference. Generated ONCE per payment attempt. */
export const makeTxRef = (length = 10) => {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return `flw_tx_ref_${out}`;
};

/**
 * All the payment state-machine logic, kept out of the UI.
 *
 *   status: "choosing"  → picking a plan / ready to pay
 *           "verifying" → Flutterwave returned, we're confirming with the server
 *           "success"   → server confirmed the subscription
 *           "recovery"  → couldn't confirm (network / server) but the user may
 *                         have been debited → offer "check again"
 *
 * Fixes over the old version:
 *  • tx_ref is stable across renders (it used to change on every render)
 *  • a new tx_ref is issued after each cancelled / failed attempt
 *  • the "Recover Payment" the old message promised now actually exists
 *  • no stale `{...bools}` closures
 */
export default function usePaymentFlow({ plan, notify }) {
  const [verifySubscription] = useVerifySubscriptionMutation();

  const [status, setStatus] = useState("choosing");
  const [txRef, setTxRef] = useState(() => makeTxRef());
  const [receipt, setReceipt] = useState(null);

  // last redirect worth re-verifying, plus the plan it was for
  const pending = useRef(null);
  const planRef = useRef(plan);
  planRef.current = plan;

  const newAttempt = useCallback(() => setTxRef(makeTxRef()), []);

  const runVerify = useCallback(
    async (payload, chosenPlan, silent) => {
      if (!silent) setStatus("verifying");

      try {
        const result = await verifySubscription(payload).unwrap();

        if (result?.success) {
          setReceipt({
            days: result?.data?.days ?? chosenPlan?.days ?? 0,
            amount: chosenPlan?.amount ?? 0,
            label: chosenPlan?.label ?? "",
            txRef: payload.tx_ref,
          });
          pending.current = null;
          setStatus("success");
          return;
        }

        // Server answered, but the payment isn't confirmed.
        const claimedPaid =
          payload.status === "successful" || payload.status === "completed";

        if (claimedPaid) {
          // Flutterwave says paid, our server disagrees → never leave them hanging
          setStatus("recovery");
          return;
        }

        notify(
          "info",
          payload.status === "cancelled"
            ? "Payment cancelled."
            : "We couldn't confirm that payment. Please try again.",
        );
        newAttempt();
        setStatus("choosing");
      } catch (error) {
        if (silent) {
          // user simply backed out and we couldn't look it up — that's fine
          notify("info", "Payment cancelled.");
          newAttempt();
          setStatus("choosing");
          return;
        }
        // Payment may have succeeded server-side even if verification failed
        notify(
          "info",
          "We couldn't confirm your payment yet. If you were debited, tap “Check payment status”.",
        );
        setStatus("recovery");
      }
    },
    [verifySubscription, notify, newAttempt],
  );

  /** Pass this to <PayWithFlutterwave onRedirect=... /> */
  const handleRedirect = useCallback(
    async (response) => {
      const payload = {
        transaction_id: response?.transaction_id ?? null,
        tx_ref: response?.tx_ref ?? txRef,
        status: response?.status,
      };
      const chosenPlan = planRef.current;
      pending.current = { payload, plan: chosenPlan };

      // Backed out before paying: check quietly (bank-transfer / USSD can
      // complete late), but don't flash the "confirming" overlay.
      const silent =
        response?.status === "cancelled" && !response?.transaction_id;

      await runVerify(payload, chosenPlan, silent);
    },
    [runVerify, txRef],
  );

  /** "Check payment status" button in recovery mode. */
  const retryVerify = useCallback(() => {
    if (!pending.current) return;
    runVerify(pending.current.payload, pending.current.plan, false);
  }, [runVerify]);

  /** "I didn't pay — start over" in recovery mode. */
  const startOver = useCallback(() => {
    pending.current = null;
    newAttempt();
    setStatus("choosing");
  }, [newAttempt]);

  return {
    status,
    txRef,
    receipt,
    handleRedirect,
    retryVerify,
    startOver,
  };
}
