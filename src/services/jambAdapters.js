import { JAMB_COOLDOWN_MS } from "../helpers/jambConfig";

export const RATING_STYLE = {
  Excellent: { color: "#136C43", bg: "#D6F0DF" },
  "Very Good": { color: "#1E8E55", bg: "#DDF3E4" },
  Good: { color: "#2E9B57", bg: "#E4F4D9" },
  Fair: { color: "#B7791F", bg: "#FFF1CC" },
  "Needs Work": { color: "#C0392B", bg: "#FDECEA" },
};

const capWords = (s = "") => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Server insight strings contain subject names as stored (lowercase).
const prettifyText = (text, subjects = []) =>
  subjects.reduce(
    (t, s) => (s?.name ? t.split(s.name).join(capWords(s.name)) : t),
    text ?? "",
  );

export const adaptRound = (r) => {
  if (!r) return r;
  const label = r.rating?.label ?? "Fair";
  const insights = r.insights
    ? {
        ...r.insights,
        nextStep: prettifyText(r.insights.nextStep, r.subjects),
      }
    : r.insights;
  return {
    ...r,
    insights,
    rating: { label, ...(RATING_STYLE[label] ?? RATING_STYLE.Fair) },
  };
};

export const adaptSummary = (s) => ({
  ...s,
  selection: s?.selection ?? [],
  history: (s?.history ?? []).map(adaptRound),
});

// ── server time ──────────────────────────────────────────────────────────────
let serverOffset = 0; // serverNow - deviceNow (ms)

export const setServerOffset = (serverNowIso) => {
  if (!serverNowIso) return;
  const t = Date.parse(serverNowIso);
  if (Number.isFinite(t)) serverOffset = t - Date.now();
};
export const serverNow = () => Date.now() + serverOffset;

// ── cooldown length (from /config, used for progress bars) ──────────────────
let cooldownMs = JAMB_COOLDOWN_MS;
export const setCooldownMs = (hours) => {
  if (Number.isFinite(hours) && hours > 0) cooldownMs = hours * 60 * 60 * 1000;
};
export const getCooldownMs = () => cooldownMs;
