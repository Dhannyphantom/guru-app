/**
 * Everything about the subscription flow that is COPY or CONFIG lives here,
 * so you can tweak wording / perks / keys without touching any component.
 *
 * ✏️  The perks below are sensible defaults — edit them so they match exactly
 *     what a subscription unlocks in your app.
 */

// Flutterwave PUBLIC key (safe to ship in the app; never put the secret key here)
export const FLW_PUBLIC_KEY = __DEV__
  ? "FLWPUBK_TEST-49eb922bbddc8e3f869f5c23eacf3bde-X"
  : "FLWPUBK-2b39b5e1580ac31aa7301fd6a66e48e5-X";
export const PAY_CURRENCY = "NGN";
export const PAY_OPTIONS = "card,banktransfer,ussd";
export const CURRENCY_SYMBOL = "₦";

/**
 * Route of the screen where users finish their profile (e.g. "/profile" or
 * "/edit-profile"). If left null, the "complete profile" button just goes back.
 */
export const PROFILE_ROUTE = null;

/**
 * Space (px) at the bottom covered by your tab bar. Leave null to auto-detect
 * from the tab navigator; set a number (e.g. 70) if the bar still overlaps.
 */
export const TAB_BAR_OFFSET = null;

export const HERO = {
  student: {
    title: "Unlock your full potential",
    sub: "Pick a plan and get full access to everything in the app.",
    pills: ["Pay once", "Instant access", "No auto-renewal"],
  },
  school: {
    title: "Power up your whole school",
    sub: "Give your school full access with one simple plan.",
    pills: ["Pay once", "Instant access", "No auto-renewal"],
  },
};

export const PERKS = {
  student: [
    {
      icon: "lock-open",
      title: "Unlock premium content",
      desc: "Full access to everything that's locked on your account.",
    },
    {
      icon: "ribbon",
      title: "Study smarter for your exams",
      desc: "WASSCE, NECO & JAMB prep, all in one place.",
    },
    {
      icon: "rocket",
      title: "Learn at your own pace",
      desc: "Practice anytime, as often as you like during your plan.",
    },
  ],
  school: [
    {
      icon: "lock-open",
      title: "Unlock premium for your school",
      desc: "Full access for your school account.",
    },
    {
      icon: "people",
      title: "Built for every student",
      desc: "Help your students prepare with confidence.",
    },
    {
      icon: "rocket",
      title: "Start right away",
      desc: "Your plan activates the moment payment is confirmed.",
    },
  ],
};

export const METHODS = [
  { icon: "card", label: "Card" },
  { icon: "business", label: "Bank transfer" },
  { icon: "keypad", label: "USSD" },
];

export const HELP = [
  {
    icon: "card-outline",
    title: "Card not working?",
    desc: "Switch to bank transfer or USSD from the payment options screen.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Secure & encrypted",
    desc: "Your payment details are never stored on our servers.",
  },
  {
    icon: "refresh-outline",
    title: "Debited but not activated?",
    desc: "Go to Profile → Settings & More → Contact Us and open a Payment & Billing ticket. We'll get back to you within minutes.",
  },
];
