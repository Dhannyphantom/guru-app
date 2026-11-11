/**
 * Real JAMB service — talks to /jamb. Same exported surface the screens used
 * with the mock, except quiz submission now sends RAW answers (server grades).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jamb, JambError } from "./jambApi";
import {
  adaptRound,
  adaptSummary,
  setCooldownMs,
  setServerOffset,
} from "./jambAdapters";

const PENDING_KEY = "jamb_pending_submit_v3";
const LEGACY_KEYS = [
  "jamb_selection_v1",
  "jamb_history_v2",
  "jamb_round_v2",
  "jamb_lifetime_correct_v1",
];

let _config = null;

export async function getConfig() {
  if (_config) return _config;
  const data = await jamb("get", "/config");
  setServerOffset(data.serverNow);
  setCooldownMs(data.cooldownHours);
  _config = data;
  return data;
}

export async function getSummary() {
  const [data] = await Promise.all([
    jamb("get", "/summary"),
    getConfig().catch(() => null),
  ]);
  setServerOffset(data.serverNow);
  return adaptSummary(data);
}

export async function getSavedSelection() {
  return (await getSummary()).selection;
}

export async function saveSelection(subjectIds) {
  const data = await jamb("put", "/selection", { data: { subjectIds } });
  setServerOffset(data.serverNow);
  return adaptSummary(data);
}

export async function getSubjectPerformance(subjects = []) {
  const res = await jamb("post", "/subjects/performance", {
    data: { subjectIds: subjects.map((s) => s._id) },
  });
  return res?.items ?? [];
}

export async function getLifetimeCorrect() {
  return (await getSummary()).lifetimeCorrect;
}

/** Issues (or resumes) a paper. Returns { attemptId, expiresAt, bank }. */
export async function getQuestions(subjects = []) {
  const data = await jamb("post", "/attempts", {
    data: { subjectIds: subjects.map((s) => s._id) },
  });
  return {
    attemptId: data.attemptId,
    expiresAt: data.expiresAt,
    bank: data.questionBank ?? [],
  };
}

export async function getActiveAttempt() {
  const data = await jamb("get", "/attempts/active");
  return data
    ? {
        attemptId: data.attemptId,
        expiresAt: data.expiresAt,
        bank: data.questionBank ?? [],
      }
    : null;
}

export async function quitAttempt(attemptId) {
  if (!attemptId) return;
  try {
    await jamb("delete", `/attempts/${attemptId}`);
  } catch {
    /* best effort */
  }
}

/** Raw (questionId, answerId) pairs from QuestionDisplay's session. */
export function buildAnswers(session) {
  return (session?.questions ?? []).flatMap((s) =>
    (s?.questions ?? []).map((q) => ({
      questionId: q._id,
      answerId: q.answered?._id ?? null,
    })),
  );
}

/**
 * payload = { attemptId, answers, durationMs, idempotencyKey }
 * Throws JambError (retry with the SAME payload if isRetryable).
 */
export async function submitQuizResult({
  attemptId,
  answers,
  durationMs,
  idempotencyKey,
}) {
  try {
    const data = await jamb("post", `/attempts/${attemptId}/submit`, {
      data: { answers, durationMs },
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return {
      complete: Boolean(data.complete),
      remaining: data.remaining ?? 0,
      subjectResults: data.subjectResults ?? [],
      roundResult: data.roundResult ? adaptRound(data.roundResult) : null,
      lifetimeCorrect: data.lifetimeCorrect,
      availableAt: data.availableAt ?? 0,
      cooldownUntil: data.cooldownUntil ?? 0,
    };
  } catch (e) {
    if (e instanceof JambError && e.code === "COOLDOWN_ACTIVE") {
      return { blocked: true, availableAt: e.details?.cooldownUntil ?? 0 };
    }
    throw e;
  }
}

// ── unsent-result persistence (survives app kill / offline at finish) ───────
export async function savePendingSubmit(payload) {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {}
}
export async function loadPendingSubmit() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export async function clearPendingSubmit() {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {}
}

/** One-time cleanup of the old mock AsyncStorage keys. */
export async function clearLegacyStorage() {
  try {
    await AsyncStorage.multiRemove(LEGACY_KEYS);
  } catch {}
}

/** DEV ONLY. */
export async function devSkipCooldown() {
  if (!__DEV__) return null;
  const data = await jamb("post", "/dev/skip-cooldown");
  setServerOffset(data?.serverNow);
  return data ? adaptSummary(data) : null;
}

export const jambService = {
  getConfig,
  getSummary,
  getSavedSelection,
  saveSelection,
  getSubjectPerformance,
  getLifetimeCorrect,
  getQuestions,
  getActiveAttempt,
  quitAttempt,
  buildAnswers,
  submitQuizResult,
  savePendingSubmit,
  loadPendingSubmit,
  clearPendingSubmit,
  clearLegacyStorage,
  devSkipCooldown,
};

export default jambService;
