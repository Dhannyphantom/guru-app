/**
 * MOCK SERVICE — swap each function body for a real API / RTK Query call later.
 * Every function is async so the UI never needs to change when the backend lands.
 *
 * ROUND MODEL
 *   A "round" = the user practises ALL FOUR chosen subjects (in any order / batches).
 *   - finishing a subject locks it until the round is complete
 *   - when the 4th subject is done the round is scored (sum of the 4 percentages,
 *     out of 400), pushed to history, and a fresh round starts AFTER a 24h cooldown
 *     (round.availableAt = completion time + JAMB_COOLDOWN_MS)
 *   - average prediction = mean of all completed rounds (still out of 400)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  assessmentQuestionsFor,
  isEnglish,
  JAMB_COOLDOWN_MS,
  questionsFor,
  SECONDS_PER_QUESTION,
  summarize,
} from "../helpers/jambConfig";

const KEYS = {
  selection: "jamb_selection_v1",
  history: "jamb_history_v2",
  round: "jamb_round_v2",
  lifetime: "jamb_lifetime_correct_v1",
};

// Placeholder until the backend tracks lifetime correct answers.
const DEFAULT_LIFETIME_CORRECT = 620;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const read = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const hash = (str) =>
  [...String(str)].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

const sameSet = (a = [], b = []) =>
  a.length === b.length && a.every((x) => b.includes(x));

// Small seeded RNG so mock questions are stable.
const seeded = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (arr, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const makeQuestion = (subject, index, rand) => {
  const a = 2 + Math.floor(rand() * 40);
  const b = 2 + Math.floor(rand() * 40);
  const right = a + b;
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const w = right + (Math.floor(rand() * 11) - 5);
    if (w !== right && w > 0) wrongs.add(w);
  }
  const qid = `${subject._id}-q${index}`;
  const answers = shuffle([right, ...wrongs], rand).map((val, i) => ({
    _id: `${qid}-a${i}`,
    name: String(val),
    correct: val === right,
  }));

  return {
    _id: qid,
    question: `[Mock ${subject.name}] Q${index + 1}: What is ${a} + ${b}?`,
    isLatex: false,
    answers,
    point: 1,
    timer: SECONDS_PER_QUESTION,
  };
};

const newRound = async (subjectIds, availableAt = 0) => {
  const history = await read(KEYS.history, []);
  const round = {
    id: Date.now(),
    number: history.length + 1,
    subjectIds,
    completed: {},
    availableAt, // epoch ms — the round can't be started before this
  };
  await write(KEYS.round, round);
  return round;
};

export const jambService = {
  // ── Selection ──────────────────────────────────────────────────────────────
  async getSavedSelection() {
    return read(KEYS.selection, []);
  },

  /**
   * Saving a DIFFERENT combination restarts the current round — but the
   * cooldown is carried over so it can't be used to skip the wait.
   */
  async saveSelection(ids) {
    await write(KEYS.selection, ids);
    const round = await read(KEYS.round, null);
    if (!round || !sameSet(round.subjectIds, ids)) {
      await newRound(ids, round?.availableAt ?? 0);
    }
  },

  // ── Round + history summary ───────────────────────────────────────────────
  // TODO(backend): GET /jamb/summary
  async getSummary() {
    const history = await read(KEYS.history, []);
    const round = await read(KEYS.round, null);
    const lifetimeCorrect = await read(KEYS.lifetime, DEFAULT_LIFETIME_CORRECT);
    const rounds = history.length;
    return {
      rounds,
      average: rounds
        ? Math.round(history.reduce((s, r) => s + r.predicted, 0) / rounds)
        : 0,
      best: rounds ? Math.max(...history.map((r) => r.predicted)) : 0,
      history,
      round,
      lifetimeCorrect,
      // > 0 while the 24h rest period is running
      cooldownUntil: round?.availableAt > Date.now() ? round.availableAt : 0,
    };
  },

  /** DEV ONLY: skip the cooldown while testing. */
  async devSkipCooldown() {
    const round = await read(KEYS.round, null);
    if (round) await write(KEYS.round, { ...round, availableAt: 0 });
  },

  // ── Per-subject performance (screen 3) ────────────────────────────────────
  // dbTotal = questions in the DB for the subject (e.g. English 1200)
  // examMax = questions the real JAMB paper has (English 100, others 50)
  // percent = correct / dbTotal  (NOT against the exam max)
  // TODO(backend): return real per-subject stats.
  async getSubjectPerformance(subjects = []) {
    await wait(450);
    return subjects.map((s) => {
      const h = hash(`${s.name}${s._id}`);
      const dbTotal =
        Number.isFinite(s.numberOfQuestions) && s.numberOfQuestions > 0
          ? s.numberOfQuestions
          : isEnglish(s)
            ? 1200
            : 400 + (h % 500);
      const answered = Number.isFinite(s.questionsAnswered)
        ? s.questionsAnswered
        : Math.round(dbTotal * (0.2 + (h % 45) / 100));
      const correct = Math.min(answered, dbTotal);
      return {
        _id: s._id,
        name: s.name,
        image: s.image ?? null,
        dbTotal,
        examMax: questionsFor(s),
        correct,
        percent: Math.round((correct / dbTotal) * 100),
      };
    });
  },

  async getLifetimeCorrect() {
    return read(KEYS.lifetime, DEFAULT_LIFETIME_CORRECT);
  },

  // ── Assessment questions ──────────────────────────────────────────────────
  // Shape <QuestionDisplay questionBank> expects:
  // [{ subject: { _id, name }, questions: [{ _id, question, answers, point, timer }] }]
  // TODO(backend): fetch real JAMB-style questions per subject.
  async getQuestions(subjects = []) {
    await wait(1400);
    return subjects.map((subject) => {
      const rand = seeded(hash(`${subject._id}${Date.now() % 997}`));
      const count = assessmentQuestionsFor(subject);
      return {
        subject: { _id: subject._id, name: subject.name },
        questions: Array.from({ length: count }, (_, i) =>
          makeQuestion(subject, i, rand),
        ),
      };
    });
  },

  // ── Submit one quiz (1–4 subjects) ────────────────────────────────────────
  // Marks those subjects as done for the round. When all four are done the
  // round is scored and pushed to history.
  // TODO(backend): POST /jamb/rounds/current/results
  async submitQuizResult(subjectResults = []) {
    let round = await read(KEYS.round, null);
    if (!round) {
      // Safety net: rebuild the round from the saved 4-subject combination
      const saved = await read(KEYS.selection, []);
      round = await newRound(saved.length ? saved : subjectResults.map((s) => s._id));
    }

    // Server-side style guard: nothing counts while the cooldown is running
    if (round.availableAt > Date.now()) {
      return { blocked: true, availableAt: round.availableAt };
    }

    const now = new Date().toISOString();
    subjectResults.forEach((s) => {
      if (round.subjectIds.includes(s._id) && !round.completed[s._id]) {
        round.completed[s._id] = { ...s, date: now };
      }
    });

    const gained = subjectResults.reduce((n, s) => n + s.correct, 0);
    const prevLifetime = await read(KEYS.lifetime, DEFAULT_LIFETIME_CORRECT);
    const lifetimeCorrect = prevLifetime + gained;
    await write(KEYS.lifetime, lifetimeCorrect);

    const remaining = round.subjectIds.filter((id) => !round.completed[id]).length;

    if (remaining === 0) {
      const roundResult = {
        ...summarize(round.subjectIds.map((id) => round.completed[id])),
        id: round.id,
        number: round.number,
      };
      const history = await read(KEYS.history, []);
      await write(KEYS.history, [roundResult, ...history].slice(0, 50));
      // Fresh round, but locked for the cooldown period
      const availableAt = Date.now() + JAMB_COOLDOWN_MS;
      await newRound(round.subjectIds, availableAt);
      return { complete: true, roundResult, lifetimeCorrect, remaining: 0, availableAt };
    }

    await write(KEYS.round, round);
    return { complete: false, remaining, lifetimeCorrect };
  },
};

export default jambService;
