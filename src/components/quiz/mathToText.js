/**
 * LaTeX -> readable plain text, for native <Text> rendering (no WebView / KaTeX).
 *   \frac{15b}{a}  -> 15b/a        x^{2}     -> x²
 *   \sqrt{x+1}     -> √(x+1)       a^{-3}    -> a⁻³
 *   2\times 3      -> 2 × 3        \log_{a}b -> log b (base a)
 * Pure JS, no React imports.
 */

const SUP = {
  0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
  "-": "⁻", "+": "⁺",
};

const SIMPLE = {
  times: "×", div: "÷", cdot: "×", pm: "±", pi: "π", approx: "≈", surd: "√",
  circ: "°", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠",
  infty: "∞", left: "", right: "", displaystyle: "", quad: " ", qquad: " ",
  ldots: "...", dots: "...", theta: "θ", alpha: "α", beta: "β", therefore: "∴",
};
const PREFIX = ["cdot", "times", "div", "pm", "pi", "approx"]; // typos: \divt \pir \cdotn

const readGroup = (s, i) => {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
};

const readArg = (s, i) => {
  while (i < s.length && s[i] === " ") i++;
  if (i >= s.length) return ["", i];
  if (s[i] === "{") return readGroup(s, i);
  if (s[i] === "\\") {
    const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i));
    return [m[0], i + m[0].length];
  }
  return [s[i], i + 1];
};

const isSimple = (t) => {
  t = t.trim();
  return !!t && !/[\s+×÷=<>±]|(?<!^)-/.test(t);
};
const wrap = (t) => {
  t = t.trim();
  if (isSimple(t)) return t;
  if (t.startsWith("(") && t.endsWith(")") && (t.match(/\(/g) || []).length === 1)
    return t;
  return `(${t})`;
};

const balanced = (e) => {
  let d = 0;
  for (const c of e) {
    if (c === "(") d++;
    else if (c === ")" && --d < 0) return false;
  }
  return d === 0;
};

const sup = (e) => {
  e = e.trim();
  if (e && [...e].every((c) => c in SUP)) return [...e].map((c) => SUP[c]).join("");
  if (e === "°") return "°";
  if (e.startsWith("(") && e.endsWith(")") && balanced(e.slice(1, -1))) return "^" + e;
  return !isSimple(e) || e.length > 1 ? `^(${e})` : `^${e}`;
};

const conv = (s) => {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (!m) {
        const n = s[i + 1];
        if (n === "\\") out.push("\n");
        else if (n && "%$&#_{}".includes(n)) out.push(n);
        else if (n && " ,;:".includes(n)) out.push(" ");
        i += 2;
        continue;
      }
      const name = m[1];
      i += m[0].length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        let a, b;
        [a, i] = readArg(s, i);
        [b, i] = readArg(s, i);
        a = conv(a);
        b = conv(b);
        if (out.length && /\d$/.test(out[out.length - 1])) out.push(" ");
        out.push(isSimple(a) && isSimple(b) ? `${a}/${b}` : `${wrap(a)}/${wrap(b)}`);
      } else if (name === "sqrt") {
        let n = null;
        if (s[i] === "[") {
          const j = s.indexOf("]", i);
          n = s.slice(i + 1, j);
          i = j + 1;
        }
        let a;
        [a, i] = readArg(s, i);
        a = conv(a);
        const root = n === null || n.trim() === "2" ? "√" : n.trim() === "3" ? "∛" : `${n}th-root of `;
        out.push(root + (isSimple(a) ? a : `(${a})`));
      } else if (name === "text" || name === "mathrm" || name === "mathbf") {
        let a;
        [a, i] = readArg(s, i);
        out.push(a);
      } else if (name === "log") {
        out.push("log");
        if (s[i] === "_") {
          let b;
          [b, i] = readArg(s, i + 1);
          out.push(`_${conv(b)}`);
        }
        if (i < s.length && !" (\\".includes(s[i])) out.push(" ");
      } else if (name in SIMPLE) {
        out.push(SIMPLE[name]);
      } else {
        const p = PREFIX.find((x) => name.startsWith(x) && name.length > x.length);
        if (p) out.push(SIMPLE[p], name.slice(p.length));
        else out.push(name);
      }
    } else if (ch === "^") {
      let e;
      [e, i] = readArg(s, i + 1);
      out.push(sup(conv(e)));
    } else if (ch === "_") {
      let e;
      [e, i] = readArg(s, i + 1);
      out.push("_" + conv(e));
    } else if (ch === "{" || ch === "}") {
      i++;
    } else {
      out.push(ch);
      i++;
    }
  }
  return out.join("");
};

const tidy = (t) =>
  t
    .replace(/\$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*×\s*/g, " × ")
    .replace(/\s*÷\s*/g, " ÷ ")
    .replace(/ *\n */g, "\n")
    .replace(/(\d)log_([\p{L}\p{N}_]+) ([\p{L}\p{N}_]+)/gu, "$1 log $3 (base $2)")
    .replace(/log_([\p{L}\p{N}_]+) ([\p{L}\p{N}_]+)/gu, "log $2 (base $1)")
    .trim();

/** One raw LaTeX expression -> plain text. */
export const mathToText = (latex) => tidy(conv(String(latex ?? "")));
