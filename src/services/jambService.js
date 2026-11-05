/**
 * MOCK SERVICE — swap each function body for a real API / RTK Query call later.
 * Every function is async so the UI never needs to change when the backend lands.
 * Persistence uses AsyncStorage so the flow is repeatable and remembers the last
 * subject combination.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  assessmentQuestionsFor,
  isEnglish,
  questionsFor,
  SECONDS_PER_QUESTION,
} from "../helpers/jambConfig";

const KEYS = {
  selection: "jamb_selection_v1",
  history: "jamb_history_v1",
  lifetime: "jamb_lifetime_correct_v1",
};

// Placeholder until the backend tracks lifetime correct answers (matches mockup 3).
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

// Small seeded RNG so a subject's mock questions are stable between runs.
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

export const jambService = {
  // ── Selection ──────────────────────────────────────────────────────────────
  async getSavedSelection() {
    return read(KEYS.selection, []);
  },

  async saveSelection(ids) {
    await write(KEYS.selection, ids);
  },

  // ── Per-subject performance (screen 3) ────────────────────────────────────
  // dbTotal  = questions we have in the database for the subject (e.g. English 1200)
  // examMax  = questions the real JAMB paper has for it (English 100, others 50)
  // correct  = questions the user has answered correctly in the app
  // percent  = correct / dbTotal  (NOT against the exam max)
  // TODO(backend): return real per-subject stats. Until then we read
  // subject.numberOfQuestions / subject.questionsAnswered when present
  // (the same fields SubjectItem shows) and mock the rest.
  async getSubjectPerformance(subjects = []) {
    await wait(450);
    return subjects.map((s) => {
      const h = hash(`${s.name}${s._id}`);
      const dbTotal = Number.isFinite(s.numberOfQuestions) && s.numberOfQuestions > 0
        ? s.numberOfQuestions
        : isEnglish(s) ? 1200 : 400 + (h % 500);
      const answered = Number.isFinite(s.questionsAnswered)
        ? s.questionsAnswered
        : Math.round(dbTotal * (0.2 + (h % 45) / 100)); // 20–64%
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
  // Returns the exact shape <QuestionDisplay questionBank> expects:
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

  // ── Results ────────────────────────────────────────────────────────────────
  // TODO(backend): POST the result and return the updated lifetime count.
  async submitResult(result) {
    const previous = await read(KEYS.lifetime, DEFAULT_LIFETIME_CORRECT);
    const lifetimeCorrect = previous + (result?.totalCorrect ?? 0);
    const history = await read(KEYS.history, []);
    await write(KEYS.history, [result, ...history].slice(0, 20));
    await write(KEYS.lifetime, lifetimeCorrect);
    return { lifetimeCorrect, previousLifetime: previous };
  },

  async getHistory() {
    return read(KEYS.history, []);
  },
};

export default jambService;
