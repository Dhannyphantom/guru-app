/**
 * Turns your existing subDropdown / subSchoolDrop arrays
 * ( items shaped like { name, value (amount in ₦), days } )
 * into rich plan objects the UI can reason about — per-day price, "best value",
 * "popular", % saved — WITHOUT you having to change dataStore.
 */

export const durationLabel = (days, fallback = "") => {
  const d = Number(days);
  if (!d) return fallback;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (d % 365 === 0) return plural(d / 365, "Year");
  if (d % 30 === 0) return plural(d / 30, "Month");
  if (d % 7 === 0) return plural(d / 7, "Week");
  return plural(d, "Day");
};

export const buildPlans = (list = []) => {
  const plans = (list ?? [])
    .map((item, i) => {
      const amount = Number(item?.value ?? item?.amount ?? item?.price ?? 0);
      const days = Number(item?.days ?? 0);
      return {
        id: String(item?._id ?? item?.id ?? `${item?.name ?? "plan"}-${i}`),
        raw: item,
        amount,
        days,
        perDay: days > 0 ? amount / days : null,
        label: durationLabel(days, item?.name ?? "Plan"),
        best: false,
        popular: false,
        savePct: 0,
      };
    })
    .filter((p) => p.amount > 0);

  const priced = plans.filter((p) => p.perDay);
  if (priced.length >= 2) {
    const max = Math.max(...priced.map((p) => p.perDay));
    const min = Math.min(...priced.map((p) => p.perDay));

    if (min < max) {
      const best = priced.find((p) => p.perDay === min);
      best.best = true;

      priced.forEach((p) => {
        const pct = Math.round((1 - p.perDay / max) * 100);
        p.savePct = pct >= 5 ? pct : 0;
      });
    }

    // "Popular" = the plan closest to one month, if it isn't already "best"
    if (priced.length >= 3) {
      const popular = [...priced]
        .filter((p) => !p.best)
        .sort((a, b) => Math.abs(a.days - 30) - Math.abs(b.days - 30))[0];
      if (popular) popular.popular = true;
    }
  }

  return plans;
};

/** Pre-select the plan most likely to convert: popular → best → first. */
export const pickDefaultPlan = (plans = []) =>
  plans.find((p) => p.popular) ?? plans.find((p) => p.best) ?? plans[0] ?? null;
