import { Dimensions, PixelRatio } from "react-native";

const { width, height } = Dimensions.get("window");
const SCALE = Math.min(width, height);
const BASE_WIDTH = 375;

const fontConfig = {
  phone: {
    small: { min: 0.85, max: 1 },
    medium: { min: 0.95, max: 1.1 },
    large: { min: 1, max: 1.2 },
  },
  tablet: {
    small: { min: 1.2, max: 1.3 },
    medium: { min: 1.3, max: 1.5 },
    large: { min: 1.5, max: 1.7 },
  },
};

// 🚀 Detect if device is a tablet
const getDeviceType = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = width * pixelDensity;
  const adjustedHeight = height * pixelDensity;

  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000))
    return "tablet";
  if (pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920))
    return "tablet";
  return "phone";
};

// 📏 Screen size classification
const getScreenSizeCategory = () => {
  if (SCALE < 350) return "small";
  if (SCALE > 500) return "large";
  return "medium";
};

// 🎯 Main scaling function
export const scaleFont = (size) => {
  const deviceType = getDeviceType();
  const screenSize = getScreenSizeCategory();
  const { min, max } = fontConfig[deviceType][screenSize];

  const scaleFactor = SCALE / BASE_WIDTH;
  const clamped = Math.min(Math.max(scaleFactor, min), max);

  let newSize = size * clamped;

  if (deviceType === "tablet") newSize *= 1.1;

  return (
    Math.round(PixelRatio.roundToNearestPixel(newSize)) /
    PixelRatio.getFontScale()
  );
};

export const FONT_SIZES = {
  xxxsmall: scaleFont(6),
  xxsmall: scaleFont(8),
  xsmall: scaleFont(9),
  small: scaleFont(10),
  regular: scaleFont(11),
  medium: scaleFont(12),
  large: scaleFont(14),
  xlarge: scaleFont(16),
  xxlarge: scaleFont(18),
  xxxlarge: scaleFont(22),
  ularge: scaleFont(25),
};
// 🛠 Optionally adjust config at runtime
export const adjustFontConfig = (deviceType, screenSize, min, max) => {
  if (fontConfig[deviceType]) {
    fontConfig[deviceType][screenSize] = { min, max };
  }
};
