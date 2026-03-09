/**
 * src/app/(protected)/main/freemium.tsx
 *
 * Screen shown to freemium (non-subscribed) students when they tap the
 * rocket button in the tab bar.
 *
 * The dashboard.tsx redirect logic should route here instead of pushing
 * to /profile when a student is not subscribed but has joined a school,
 * or when a student has no school at all.
 *
 * Example update in dashboard.tsx:
 *
 *   // Before (redirects to subscription gate):
 *   return <Redirect href={{ pathname: "/profile", params: { check: "subscription" } }} />;
 *
 *   // After (shows free daily quiz):
 *   return <Redirect href="/main/freemium" />;
 */

import FreemiumQuizZone from "@/src/components/FreemiumQuizZone";
import { useRouter } from "expo-router";

export default function FreemiumPage() {
  const router = useRouter();

  return (
    <FreemiumQuizZone
      setVisible={() => router.replace("/(protected)/(tabs)/(home)")}
    />
  );
}
