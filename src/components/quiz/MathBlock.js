/* eslint-disable react/display-name */
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { buildDoc } from "./mathHtml";

/**
 * One rich field that contains maths, rendered with real KaTeX.
 *
 * Why this is different from the old per-formula WebView:
 *  - the page has a proper viewport + embedded KaTeX fonts, so it renders at the right scale
 *  - the page MEASURES itself and posts its height; the box is never guessed
 *  - until the measurement arrives (or if the WebView ever fails) `fallback` — readable
 *    plain-text maths — is shown instead, so the field can never be blank
 *  - heights are cached, so a question you have already seen appears instantly
 *  - pointerEvents="none": taps pass through to the option card underneath
 */

const heightCache = new Map(); // `${width}|${size}|...|${field}` -> px
const MAX_CACHE = 500;

const MathBlock = ({
  parsed,
  size = 16,
  weight = "semibold",
  color = "#1B1B3A",
  align = "left",
  fallback = null,
  style,
}) => {
  const [width, setWidth] = useState(0);
  const [, force] = useState(0);

  const sig = useMemo(() => JSON.stringify(parsed), [parsed]);
  const key = `${Math.round(width)}|${size}|${weight}|${align}|${sig}`;
  const keyRef = useRef(key);
  keyRef.current = key;

  const doc = useMemo(
    () => buildDoc(parsed, { size, weight, color, align }),
    [sig, size, weight, color, align],
  );

  const onLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  }, []);

  const widthRef = useRef(0);
  widthRef.current = width;

  // The page sends "height|width". Only trust a height that was measured at the width
  // this block currently has — a height taken at some other width would be cached under
  // the wrong key and clip the content.
  const onMessage = useCallback((e) => {
    const [hs, ws] = String(e.nativeEvent.data).split("|");
    const h = Number(hs);
    const w = Number(ws);
    if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(w)) return;
    if (!widthRef.current || Math.abs(w - widthRef.current) > 2) return;
    if (heightCache.size > MAX_CACHE) heightCache.clear();
    if (heightCache.get(keyRef.current) !== h) {
      heightCache.set(keyRef.current, h);
      force((n) => n + 1);
    }
  }, []);

  const height = heightCache.get(key);
  const ready = height !== undefined;

  return (
    <View onLayout={onLayout} style={[styles.root, style]}>
      {/* readable stand-in until the real render has been measured */}
      {!ready ? fallback : null}

      <View
        pointerEvents="none"
        style={ready ? { height } : styles.hidden}
      >
        <WebView
          originWhitelist={["*"]}
          source={{ html: doc }}
          onMessage={onMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          textZoom={100} // Android: ignore the phone's font-size setting inside the page
          androidLayerType="hardware"
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          allowsLinkPreview={false}
          style={styles.web}
        />
      </View>
    </View>
  );
};

export default memo(MathBlock);

const styles = StyleSheet.create({
  root: { width: "100%" },
  // mounted and rendering, but invisible and out of the layout flow until measured
  hidden: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0,
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
