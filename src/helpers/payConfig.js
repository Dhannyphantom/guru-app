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
    title: "Achieve more with Guru",
    sub: "Unlock premium learning and exam practice features.",
    pills: ["One-time payment", "Instant access", "No auto-renewal"],
  },
  school: {
    title: "Better learning, school-wide",
    sub: "Give your students and teachers access to Guru.",
    pills: ["One-time payment", "School-wide access", "No auto-renewal"],
  },
};

export const PERKS = {
  student: [
    {
      icon: "lock-open-outline",
      title: "Full premium access",
      desc: "Unlock all premium features on your account.",
    },
    {
      icon: "school-outline",
      title: "Exam preparation",
      desc: "Practise for WAEC, NECO, JAMB and BECE.",
    },
    {
      icon: "stats-chart-outline",
      title: "Track your progress",
      desc: "Monitor performance and improve your results.",
    },
  ],
  school: [
    {
      icon: "business-outline",
      title: "School-wide access",
      desc: "Connect your students and teachers on Guru.",
    },
    {
      icon: "people-outline",
      title: "Student monitoring",
      desc: "Track student participation and performance.",
    },
    {
      icon: "stats-chart-outline",
      title: "Academic improvement",
      desc: "Identify learning gaps and support better results.",
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
