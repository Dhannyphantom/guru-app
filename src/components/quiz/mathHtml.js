/**
 * Builds the HTML document shown inside a MathBlock WebView.
 * KaTeX runs here, in plain JS on the React Native side (renderToString), so the
 * WebView only needs CSS + fonts — no 270 KB script and no layout-time work in the page.
 * No React imports: easy to unit test.
 */
import katex from "katex";
import { KATEX_CSS } from "./katexCss";
import { decode, parseRich } from "./richParse";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tex = (value, display = false) => {
  try {
    return katex.renderToString(String(value), {
      displayMode: display,
      throwOnError: false,
      output: "html", // html only: no hidden MathML copy
      strict: "ignore",
      trust: false,
      errorColor: "#E5484D",
    });
  } catch {
    return `<span>${esc(value)}</span>`;
  }
};

/** Does this parsed field contain a formula (so it needs the WebView)? */
export const needsMath = (parsed) =>
  parsed.type === "latex" ||
  (parsed.type === "rich" && parsed.hasMath) ||
  (parsed.type === "html" && /<texd?\s/i.test(parsed.html));

/** parseRich() result -> inner HTML with every formula rendered by KaTeX. */
export const bodyHtml = (parsed) => {
  if (parsed.type === "latex") return tex(parsed.value);

  if (parsed.type === "html") {
    return parsed.html
      .replace(/<texd data-v="([^"]*)"><\/texd>/g, (m, v) =>
        tex(safeDecode(v), true),
      )
      .replace(/<tex data-v="([^"]*)"><\/tex>/g, (m, v) => tex(safeDecode(v)));
  }

  return parsed.runs
    .map((r) => {
      if (r.k === "m") return tex(r.v, r.d);
      return esc(decode(r.s)).replace(/\r?\n/g, "<br/>");
    })
    .join("");
};

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

const WEIGHT = { medium: 500, semibold: 600, bold: 700, black: 800, heavy: 900 };

// Posts the rendered size to React Native { h, w } (and shrinks over-wide formulas to fit).
const MEASURE_JS = `
(function(){
  var el=document.getElementById('c'), last='';
  // Keep each formula on one line; if it is too wide shrink it (down to 75%),
  // and only as a last resort let it wrap at operators.
  function fit(){
    el.className=''; el.style.zoom=1;
    var w=window.innerWidth;
    function wide(){ return Math.max(el.scrollWidth, document.documentElement.scrollWidth); }
    var sw=wide();
    if(sw>w+1){
      var z=w/sw;
      if(z>=0.75){ el.style.zoom=z.toFixed(3); }
      else{
        el.className='wrap'; sw=wide();
        if(sw>w+1) el.style.zoom=(w/sw).toFixed(3);
      }
    }
  }
  // Tall maths (stacked fractions + exponents, big radicals) can poke out above/below the
  // text line. Measure the real extent of everything and pad the box to contain it.
  function extent(){
    el.style.paddingTop='4px'; el.style.paddingBottom='4px';
    var r=el.getBoundingClientRect(), top=r.top, bottom=r.bottom;
    var n=el.querySelectorAll('.katex-html, .katex-html *');
    for(var i=0;i<n.length;i++){
      if(/(^|\\s)(pstrut|strut|mspace)(\\s|$)/.test(n[i].className||'')) continue; // invisible layout helpers
      var b=n[i].getBoundingClientRect();
      if(b.height<1 || !b.width) continue; // zero-size positioning spans
      if(b.top<top) top=b.top;
      if(b.bottom>bottom) bottom=b.bottom;
    }
    var up=Math.max(0,r.top-top), down=Math.max(0,bottom-r.bottom);
    el.style.paddingTop=(4+Math.ceil(up))+'px';
    el.style.paddingBottom=(4+Math.ceil(down))+'px';
    return Math.ceil(el.getBoundingClientRect().height)+2;
  }
  function post(){
    fit();
    var h=extent(), w=Math.round(window.innerWidth), msg=h+'|'+w;
    if(h>0 && msg!==last){ last=msg; window.ReactNativeWebView && window.ReactNativeWebView.postMessage(msg); }
  }
  post();
  window.addEventListener('load',post);
  window.addEventListener('resize',post);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(post);
  if(window.ResizeObserver) new ResizeObserver(post).observe(el);
  setTimeout(post,80); setTimeout(post,300); setTimeout(post,900);
})();
`;

export const buildDoc = (parsed, { size = 16, weight = "semibold", color = "#1B1B3A", align = "left" } = {}) => `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${KATEX_CSS}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:transparent;overflow:hidden;
  -webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-user-select:none;user-select:none}
body{font-family:-apple-system,"SF Pro Text",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:${size}px;line-height:1.5;font-weight:${WEIGHT[weight] ?? 600};
  color:${color};text-align:${align};word-wrap:break-word;overflow-wrap:break-word}
#c{display:block;width:100%;padding:4px 2px}
.katex{font-size:1.14em;text-indent:0}
.katex-display{margin:.35em 0;overflow:visible}
.katex-display>.katex{white-space:normal}
.katex-html{white-space:nowrap}
.wrap .katex-html{white-space:normal}
</style></head>
<body><div id="c">${bodyHtml(parsed)}</div>
<script>${MEASURE_JS}</script></body></html>`;

export { parseRich };
