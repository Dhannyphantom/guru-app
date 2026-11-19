/**
 * Pure parsing for rich question fields — no React / React Native imports.
 *
 * A field is { format: "text" | "html" | "latex", value, hasMath }.
 *
 * parseRich(field) returns one of
 *   { type: "latex", value }        one raw expression
 *   { type: "html",  html }         $math$ already swapped for <tex>/<texd>
 *   { type: "rich",  runs, hasMath } plain text (+ math) -> native <Text>
 */

const SUP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
  " ": " ",
};

const SUB = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
  "+": "₊",
  "-": "₋",
  "−": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
  " ": " ",
};

/** Map every char to its unicode script form, or null if any char has none. */
export const toScript = (s, kind) => {
  const map = kind === "sup" ? SUP : SUB;
  let out = "";
  for (const ch of s) {
    const m = map[ch] ?? map[ch.toLowerCase()];
    if (m === undefined) return null;
    out += m;
  }
  return out;
};

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};
export const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);

const ESC = "\uE000"; // stands in for an escaped \$ while splitting math
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

const TAGS =
  "strong|b|em|i|u|s|strike|del|sup|sub|br|p|span|div|ul|ol|li|h[1-6]";
const HTML_RE = new RegExp(`<\\/?(${TAGS})(\\s[^>]*)?\\/?>`, "i");
const ESCAPED_HTML_RE = new RegExp(`&lt;\\/?(${TAGS})`, "i");

/** True when a string carries real markup (so it should go through the HTML renderer). */
export const looksLikeHtml = (s) => typeof s === "string" && HTML_RE.test(s);

/**
 * Prepare an html field for the native html renderer:
 *  - <sup>/<sub> with simple content become unicode (RN can't raise text)
 *  - $math$ / $$math$$ become <tex>/<texd> placeholders (formula is URI-encoded)
 *  - newlines become <br/>
 */
export const toHtmlWithMath = (value, hasMath) => {
  let html = String(value);

  html = html.replace(/<(sup|sub)>([^<]*)<\/\1>/gi, (m, tag, inner) => {
    const mapped = toScript(decode(inner), tag.toLowerCase());
    return mapped === null ? m : mapped;
  });

  if (hasMath && html.indexOf("$") !== -1) {
    const safe = html.split("\\$").join(ESC);
    html = safe
      .replace(MATH_RE, (m, d, i) => {
        const display = d !== undefined;
        const v = encodeURIComponent(
          decode((display ? d : i).trim())
            .split(ESC)
            .join("\\$"),
        );
        return display
          ? `<texd data-v="${v}"></texd>`
          : `<tex data-v="${v}"></tex>`;
      })
      .split(ESC)
      .join("$");
  }

  return html.replace(/\r?\n/g, "<br/>");
};

const pushText = (out, text, hasMath) => {
  if (!text) return;
  if (!hasMath || text.indexOf("$") === -1) {
    out.push({ k: "t", s: text.split("\\$").join("$") });
    return;
  }

  const safe = text.split("\\$").join(ESC);
  let last = 0;
  let m;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(safe))) {
    if (m.index > last)
      out.push({ k: "t", s: safe.slice(last, m.index).split(ESC).join("$") });
    const display = m[1] !== undefined;
    out.push({
      k: "m",
      v: (display ? m[1] : m[2]).split(ESC).join("\\$").trim(),
      d: display,
    });
    last = MATH_RE.lastIndex;
  }
  if (last < safe.length)
    out.push({ k: "t", s: safe.slice(last).split(ESC).join("$") });
};

const cache = new Map();

export const parseRich = (rt) => {
  if (!rt || rt.value == null)
    return { type: "rich", runs: [], hasMath: false };
  let value = String(rt.value);

  // escaped markup ("&lt;strong&gt;") -> real markup
  if (!looksLikeHtml(value) && ESCAPED_HTML_RE.test(value))
    value = decode(value);

  // don't rely on the server setting hasMath
  const hasMath = rt.hasMath ?? value.includes("$");
  const key = `${rt.format}|${hasMath ? 1 : 0}|${value}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let res;
  if (rt.format === "latex") {
    res = { type: "latex", value: value.replace(/\$/g, "").trim() };
  } else if (rt.format === "html" || looksLikeHtml(value)) {
    res = { type: "html", html: toHtmlWithMath(value, Boolean(hasMath)) };
  } else {
    const runs = [];
    pushText(runs, value, Boolean(hasMath));
    res = { type: "rich", runs, hasMath: runs.some((r) => r.k === "m") };
  }

  if (cache.size > 600) cache.clear();
  cache.set(key, res);
  return res;
};

/** Rough size hints for a math chunk (the WebView needs a fixed box). */
export const estimateMath = (value = "", size = 16, display = false) => {
  const compact = value.replace(/\\[a-zA-Z]+/g, "x").replace(/[{}^_\s]/g, "");
  const width = Math.max(size * 1.4, compact.length * size * 0.66 + size * 0.8);
  const tall =
    /\\(frac|dfrac|tfrac|sqrt|sum|int|prod|lim|binom|begin|overline|vec)/.test(
      value,
    );
  const rows = (value.match(/\\\\/g) || []).length;
  const base = display ? 3 : 2.3;
  const height = size * (tall ? base + 1.1 : base) + rows * size * 2.4;
  return { width, height };
};
