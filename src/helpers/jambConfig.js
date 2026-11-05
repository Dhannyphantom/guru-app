import colors from "./colors";

// ─── Constants ───────────────────────────────────────────────────────────────
// Global type scale for the whole predictor (see JambText). Lower = smaller text.
export const FONT_SCALE = 0.84;

export const JAMB_TOTAL = 400; // 4 subjects x 100
export const JAMB_PER_SUBJECT = 100;
export const JAMB_MAX_SUBJECTS = 4;
export const ENGLISH_QUESTIONS = 100;
export const OTHER_QUESTIONS = 50;
export const SECONDS_PER_QUESTION = 20; // keep in sync with the mock question timer

// ─── Palette (built on top of helpers/colors) ────────────────────────────────
export const J = {
  deep: "#136C43",
  deepest: "#0B3D2A",
  green: colors.green,
  greenSoft: colors.greenLighter,
  mint: "#EAF7E1",
  mintStrong: "#D5EDC6",
  ink: "#12332A",
  muted: "#5E7A6B",
  card: "#FFFFFF",
  line: "#E3EEDC",
  amber: "#E08A00",
  amberBg: "#FFF6DB",
  amberLine: "#F3E2A0",
  danger: "#E5483A",
  dangerBg: "#FDECEA",
  blue: "#2F7DE1",
  blueBg: "#E8F1FD",
  violet: "#6C5CE7",
  violetBg: "#EEEBFD",
};

// One tint per subject slot (cycled)
export const SUBJECT_TINTS = [
  { bg: "#EAF7E1", border: "#CBE8B8", bar: "#2EB872" },
  { bg: "#E8F1FD", border: "#C5DDF8", bar: "#2F7DE1" },
  { bg: "#EEEBFD", border: "#D7D0F7", bar: "#7C6CE8" },
  { bg: "#FFF6DB", border: "#F7E3A1", bar: "#E0A000" },
];

// ─── Subjects ────────────────────────────────────────────────────────────────
// "English Language" is compulsory; "Literature in English" is NOT.
export const isEnglish = (subject) =>
  /^english(\s+language)?$/i.test((subject?.name ?? "").trim());

export const questionsFor = (subject) =>
  isEnglish(subject) ? ENGLISH_QUESTIONS : OTHER_QUESTIONS;

export const totalQuestionsFor = (subjects = []) =>
  subjects.reduce((sum, s) => sum + questionsFor(s), 0);

// ─── Assessment size ─────────────────────────────────────────────────────────
// questionsFor()        = how many questions the REAL JAMB paper has (100 / 50)
// assessmentQuestionsFor = how many we actually serve in the assessment.
// Flip USE_MOCK_COUNTS to false when real questions are wired up.
export const USE_MOCK_COUNTS = true;
export const MOCK_ENGLISH_QUESTIONS = 5;
export const MOCK_OTHER_QUESTIONS = 2;

export const assessmentQuestionsFor = (subject) =>
  USE_MOCK_COUNTS
    ? isEnglish(subject)
      ? MOCK_ENGLISH_QUESTIONS
      : MOCK_OTHER_QUESTIONS
    : questionsFor(subject);

export const totalAssessmentQuestions = (subjects = []) =>
  subjects.reduce((sum, s) => sum + assessmentQuestionsFor(s), 0);

export const estimatedMinutes = (totalQuestions) =>
  Math.round((totalQuestions * SECONDS_PER_QUESTION) / 60);

// ─── Achievement levels (PLACEHOLDERS until the backend defines them) ────────
export const LEVELS = [
  { key: "beginner", name: "Beginner", min: 0, max: 499, icon: "rocket", color: "#2E9B57", bg: "#E0F2E1" },
  { key: "amateur", name: "Amateur", min: 500, max: 999, icon: "medal", color: "#E0A000", bg: "#FFF3CF" },
  { key: "professional", name: "Professional", min: 1000, max: 1999, icon: "ribbon", color: "#2F7DE1", bg: "#E1EEFD" },
  { key: "expert", name: "Expert", min: 2000, max: 3999, icon: "star", color: "#E0623A", bg: "#FDE7DE" },
  { key: "ultimate", name: "Ultimate", min: 4000, max: null, icon: "diamond", color: "#7C4DDB", bg: "#EBE2FB" },
];

export const getLevelInfo = (correct = 0) => {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (correct >= l.min) index = i;
  });
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  return {
    index,
    level,
    next,
    progress: next ? Math.min(correct / next.min, 1) : 1,
    remaining: next ? Math.max(next.min - correct, 0) : 0,
  };
};

export const levelRangeLabel = (l) =>
  l.max ? `${l.min.toLocaleString()} – ${l.max.toLocaleString()}` : `${l.min.toLocaleString()}+`;

// ─── Rating ──────────────────────────────────────────────────────────────────
export const getRating = (percent) => {
  if (percent >= 80) return { label: "Excellent", color: "#136C43", bg: "#D6F0DF" };
  if (percent >= 65) return { label: "Very Good", color: "#1E8E55", bg: "#DDF3E4" };
  if (percent >= 50) return { label: "Good", color: "#2E9B57", bg: "#E4F4D9" };
  if (percent >= 40) return { label: "Fair", color: "#B7791F", bg: "#FFF1CC" };
  return { label: "Needs Work", color: "#C0392B", bg: "#FDECEA" };
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
const isCorrect = (q) => {
  if (!q?.answered) return false;
  if (typeof q.answered.correct === "boolean") return q.answered.correct;
  return q.answers?.find((a) => a.correct)?._id === q.answered._id;
};

export const buildInsights = (subjects = []) => {
  if (!subjects.length) return null;
  const sorted = [...subjects].sort((a, b) => b.percent - a.percent);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let focus = sorted.filter((s) => s.percent < 65).reverse().slice(0, 2);
  if (!focus.length) focus = [weakest];

  const nextStep =
    weakest.percent < 50
      ? `Revise ${weakest.name} basics, then retake the assessment.`
      : weakest.percent < 70
        ? `Attempt more ${weakest.name} practice questions.`
        : "Keep practising timed questions to stay sharp.";

  return {
    strongest: { name: strongest.name, percent: strongest.percent },
    weakest: { name: weakest.name, percent: weakest.percent },
    focus: focus.map((s) => ({ name: s.name, percent: s.percent })),
    nextStep,
  };
};

/**
 * session  = what QuestionDisplay hands back: { questions: [{ subject, questions: [...] }] }
 * selected = the 4 subject objects the user picked
 * Prediction = sum of each subject's percentage (each subject is worth 100) -> /400
 */
export const buildJambResult = (session, selected = []) => {
  const entries = session?.questions ?? [];

  const subjects = selected.map((subj, i) => {
    const entry =
      entries.find((e) => String(e?.subject?._id) === String(subj._id)) ??
      entries[i];
    const qs = entry?.questions ?? [];
    const total = qs.length || assessmentQuestionsFor(subj);
    const correct = qs.filter(isCorrect).length;
    const skipped = qs.filter((q) => !q?.answered).length;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    return {
      _id: subj._id,
      name: subj.name,
      image: subj.image ?? null,
      total,
      correct,
      skipped,
      wrong: Math.max(total - correct - skipped, 0),
      percent,
      score: percent, // out of 100
    };
  });

  // Projected from the subjects practised: average % x 4 subjects (= sum when all 4).
  const avg = subjects.length
    ? subjects.reduce((s, x) => s + x.percent, 0) / subjects.length
    : 0;
  const predicted = Math.round((avg / 100) * JAMB_TOTAL);
  const percent = Math.round(avg);
  const margin = 12;

  return {
    date: new Date().toISOString(),
    subjects,
    predicted,
    percent,
    range: {
      low: Math.max(predicted - margin, 0),
      high: Math.min(predicted + margin, JAMB_TOTAL),
    },
    rating: getRating(percent),
    totalCorrect: subjects.reduce((s, x) => s + x.correct, 0),
    totalQuestions: subjects.reduce((s, x) => s + x.total, 0),
    insights: buildInsights(subjects),
  };
};
