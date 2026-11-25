/* eslint-disable react/display-name */
import { memo, useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import AppText from "../AppText";
import { capFirstLetter } from "../../helpers/helperFunctions";
import { Q } from "./QuizTheme";
import { decode, looksLikeHtml, parseRich } from "./richParse";
import { mathToText } from "./mathToText";
import { needsMath } from "./mathHtml";
import MathBlock from "./MathBlock";

/**
 * Rich content for the student app.
 *
 *   <RichView rt={stemRt(question)} size={19} weight="bold" align="center" />
 *
 * - html fields are rendered by a small built-in native renderer
 *   (strong/b, em/i, u, s/strike/del, br, p, <tex>/<texd>) as nested <Text>
 * - plain text renders as one native <Text> (no WebView)
 * - any field that contains maths is drawn by <MathBlock> with real KaTeX: ONE WebView
 *   for the whole field (text + formulas together), which measures its own height.
 *   Until that is measured — or if the WebView ever fails — readable plain-text maths
 *   (mathToText) is shown, so a field is never blank.
 * - legacy questions (no `content`) go through the same component via the
 *   *Rt() helpers below
 */

// Flip to false once everything renders correctly.
const DEBUG_RICH = false;
// const DEBUG_RICH = __DEV__;

const FONT = {
  medium: "sf-medium",
  semibold: "sf-semibold",
  bold: "sf-bold",
  black: "sf-black",
  heavy: "sf-heavy",
};
const BUMP = {
  medium: "bold",
  semibold: "black",
  bold: "black",
  black: "heavy",
  heavy: "heavy",
};

// ─── Question-shape helpers ──────────────────────────────────────────────────

/** content may arrive as an object or as a JSON string. */
const readContent = (q) => {
  let c = q?.content;
  if (typeof c === "string") {
    try {
      c = JSON.parse(c);
    } catch {
      return null;
    }
  }
  return c && typeof c === "object" ? c : null;
};

/** Accept { format, value, hasMath } or a bare string. */
const toField = (f) => {
  if (f == null) return null;
  if (typeof f === "string") {
    return f
      ? {
          format: looksLikeHtml(f) ? "html" : "text",
          value: f,
          hasMath: f.includes("$"),
        }
      : null;
  }
  return f.value != null && f.value !== "" ? f : null;
};

export const isRichQuestion = (q) => {
  const c = readContent(q);
  return Boolean(c && toField(c.stem)); // version no longer gates this
};

/** Pair every answer with its rich body. Do this BEFORE any shuffling. */
export const attachRich = (q) => {
  const c = readContent(q);
  if (!c || !isRichQuestion(q)) {
    if (__DEV__ && q?.content) {
      console.warn("[rich] content present but unusable:", q.content);
    }
    return q;
  }
  const options = Array.isArray(c.options) ? c.options : [];
  if (__DEV__ && options.length !== (q.answers?.length ?? 0)) {
    console.warn(
      `[rich] options (${options.length}) / answers (${q.answers?.length}) mismatch`,
    );
  }
  return {
    ...q,
    content: c,
    answers: (q.answers ?? []).map((a, i) => {
      const body = toField(options[i]?.body ?? options[i]);
      return body ? { ...a, rich: body } : a;
    }),
  };
};

export const stemRt = (q) => {
  const c = readContent(q);
  const stem = c && toField(c.stem);
  if (stem) return stem;
  if (q?.isLatex && q?.questionLatex)
    return { format: "latex", value: q.questionLatex };
  return {
    format: "text",
    value: capFirstLetter(q?.question ?? ""),
    hasMath: false,
  };
};

export const optionRt = (answer, question) => {
  let rich = toField(answer?.rich);
  if (!rich && question) {
    const c = readContent(question);
    if (c) {
      const idx =
        question.answers?.findIndex((a) => a?._id === answer?._id) ?? -1;
      rich = toField(c.options?.[idx]?.body ?? c.options?.[idx]);
    }
  }
  if (rich) return rich;
  if (answer?.isLatex && answer?.latex)
    return { format: "latex", value: answer.latex };
  return {
    format: "text",
    value: capFirstLetter(answer?.name ?? "") || "______",
    hasMath: false,
  };
};

export const explanationRt = (q) => {
  const c = readContent(q);
  const ex = c && toField(c.explanation);
  if (ex) return ex;
  if (q?.isLatex && q?.explanationLatex)
    return { format: "latex", value: q.explanationLatex };
  return { format: "text", value: q?.explanation ?? "", hasMath: false };
};

export const hasExplanation = (q) =>
  Boolean(q?.explanation) || Boolean(toField(readContent(q)?.explanation));

// Rich bodies are display data — keep them out of anything sent to the server.
const stripAnswer = (a) => {
  if (!a || !("rich" in a)) return a;
  const { rich, ...rest } = a;
  return rest;
};

export const stripRichQuestion = (q) =>
  q
    ? {
        ...q,
        answers: q.answers?.map(stripAnswer),
        ...(q.answered ? { answered: stripAnswer(q.answered) } : {}),
      }
    : q;

export const stripRichGroups = (groups) =>
  groups?.map((g) => ({
    ...g,
    questions: g?.questions?.map(stripRichQuestion),
  }));

// ─── Math ────────────────────────────────────────────────────────────────────

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/** Readable plain-text version of any parsed field that contains maths. */
const fallbackText = (parsed) => {
  if (parsed.type === "latex") return mathToText(parsed.value);
  if (parsed.type === "html") {
    return decode(
      parsed.html
        .replace(/<texd?\s+data-v="([^"]*)"><\/texd?>/g, (m, v) =>
          mathToText(safeDecode(v)),
        )
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, ""),
    );
  }
  return (parsed.runs ?? [])
    .map((r) => {
      if (r.k !== "m") return r.s;
      const t = mathToText(r.v);
      return r.d ? `\n${t}\n` : t;
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/** One formula (LaTeX, no delimiters) — kept for callers that used MathView directly. */
export const MathView = memo(
  ({
    value,
    display = false,
    size = 16,
    weight = "bold",
    color = Q.ink,
    align = "left",
    style,
  }) => {
    const parsed = useMemo(() => ({ type: "latex", value: String(value ?? "") }), [value]);
    const al = display ? "center" : align;
    return (
      <MathBlock
        parsed={parsed}
        size={size}
        weight={weight}
        color={color}
        align={al}
        style={style}
        fallback={
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: FONT[weight] ?? FONT.bold,
              fontSize: size,
              lineHeight: Math.round(size * 1.5),
              color,
              textAlign: al,
            }}
          >
            {mathToText(value)}
          </Text>
        }
      />
    );
  },
);

// ─── HTML (built-in native renderer) ─────────────────────────────────────────

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>|([^<]+)/g;

/**
 * html -> lines of inline items.
 * item: { k: "t", s, f:{b,i,u,s} } | { k: "m", v, d }
 * Lines split on <br>, </p>, </div>, </li>, headings and display math.
 */
const htmlToLines = (html) => {
  const lines = [[]];
  const f = { b: 0, i: 0, u: 0, s: 0 };
  const newLine = () => lines.push([]);
  const cur = () => lines[lines.length - 1];

  const bump = (key, closing) => {
    f[key] = Math.max(0, f[key] + (closing ? -1 : 1));
  };

  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    if (m[5] !== undefined) {
      const s = decode(m[5]);
      if (s) cur().push({ k: "t", s, f: { ...f } });
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();

    switch (tag) {
      case "br":
        newLine();
        break;
      case "p":
      case "div":
      case "li":
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        if (closing && cur().length) newLine();
        break;
      case "strong":
      case "b":
        bump("b", closing);
        break;
      case "em":
      case "i":
        bump("i", closing);
        break;
      case "u":
        bump("u", closing);
        break;
      case "s":
      case "strike":
      case "del":
        bump("s", closing);
        break;
      case "tex":
      case "texd":
        if (!closing) {
          const v = /data-v="([^"]*)"/.exec(m[3] ?? "")?.[1];
          if (v) {
            let val = "";
            try {
              val = decodeURIComponent(v);
            } catch {
              val = v;
            }
            if (tag === "texd") {
              if (cur().length) newLine();
              cur().push({ k: "m", v: val, d: true });
              newLine();
            } else {
              cur().push({ k: "m", v: val, d: false });
            }
          }
        }
        break;
      default:
        break; // unknown tags: ignore the tag, keep its text
    }
  }

  // drop trailing empty lines
  while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
  return lines;
};

const HtmlView = memo(({ html, size, weight, color, align, style }) => {
  const lineHeight = Math.round(size * 1.5);

  const lines = useMemo(() => htmlToLines(html), [html]);

  const spanStyle = (f) => {
    const deco = [f.u ? "underline" : "", f.s ? "line-through" : ""]
      .filter(Boolean)
      .join(" ");
    return {
      fontFamily: f.b
        ? FONT[BUMP[weight] ?? "black"]
        : (FONT[weight] ?? FONT.semibold),
      fontSize: size,
      lineHeight,
      color,
      ...(f.i ? { fontStyle: "italic" } : null),
      ...(deco ? { textDecorationLine: deco } : null),
    };
  };

  return (
    <View style={[{ width: "100%" }, style]}>
      {lines.map((line, li) => {
        if (!line.length) {
          return <View key={li} style={{ height: lineHeight * 0.5 }} />;
        }

        // Everything (text AND math) is now native text, so a whole line is one <Text>
        // with nested styled spans — it wraps naturally and can never be clipped.
        return (
          <Text
            key={li}
            allowFontScaling={false}
            style={{ textAlign: align, color, fontSize: size, lineHeight }}
          >
            {line.map((it, ii) =>
              it.k === "m" ? (
                <Text key={ii} style={spanStyle({ b: 1 })}>
                  {mathToText(it.v)}
                </Text>
              ) : (
                <Text key={ii} style={spanStyle(it.f)}>
                  {it.s}
                </Text>
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
});

// ─── Text ────────────────────────────────────────────────────────────────────

/**
 * Renders a rich field. `rt` is { format, value, hasMath } (see richParse),
 * a plain string, or nothing.
 */
export const RichView = memo(
  ({
    rt,
    size = 16,
    weight = "semibold",
    color = Q.ink,
    align = "left",
    style,
  }) => {
    const field =
      typeof rt === "string"
        ? { format: "text", value: rt, hasMath: false }
        : rt;
    const parsed = useMemo(
      () => parseRich(field),
      [field?.format, field?.value, field?.hasMath],
    );
    const lineHeight = Math.round(size * 1.5);

    if (DEBUG_RICH) {
      console.log("[RichView]", field?.format, "->", parsed.type);
    }

    const plain = (text) => (
      <AppText
        fontWeight={weight}
        size={size}
        maxFontSizeMultiplier={1.3}
        style={[{ color, textAlign: align, lineHeight }, style]}
      >
        {text}
      </AppText>
    );

    // Maths -> real KaTeX (measured WebView), with plain-text maths as the stand-in.
    if (needsMath(parsed)) {
      return (
        <MathBlock
          parsed={parsed}
          size={size}
          weight={weight}
          color={color}
          align={align}
          style={style}
          fallback={
            <AppText
              fontWeight={weight}
              size={size}
              maxFontSizeMultiplier={1.3}
              style={{ color, textAlign: align, lineHeight }}
            >
              {fallbackText(parsed)}
            </AppText>
          }
        />
      );
    }

    if (parsed.type === "html") {
      return (
        <HtmlView
          html={parsed.html}
          size={size}
          weight={weight}
          color={color}
          align={align}
          style={style}
        />
      );
    }

    if (!parsed.runs.length) return null;

    // Plain text, no maths: one native <Text>, zero WebViews.
    return plain(parsed.runs.map((r) => r.s).join(""));
  },
);

export default RichView;
