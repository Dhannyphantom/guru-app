#!/usr/bin/env python3
"""
Applies the "pay with GT points / subscription points / both" changes to
SubscriptionScreen.jsx.

Usage:
    python3 patch_subscription_screen.py path/to/SubscriptionScreen.jsx

- Makes a backup next to the file (SubscriptionScreen.jsx.bak) first.
- All-or-nothing: every edit must match exactly once, otherwise NOTHING is
  written and the script tells you which edit failed.
- Safe to re-run: it detects an already-patched file and exits.
"""
import re
import shutil
import sys

# ─────────────────────────────────────────────────────────────────────────────
# New code blocks
# ─────────────────────────────────────────────────────────────────────────────

CONSTANTS = r"""// Renewal payment source → value sent to /renew-subscription as `payWith`
const PAY_OPTIONS = {
  "GT Points": "points",
  "Sub Points": "subscriptionPoints",
  Both: "both",
};
const PAY_HINTS = {
  points: "Pay with your GT points (the withdrawable balance).",
  subscriptionPoints:
    "Pay with subscription points earned from competitions. They can only be used for renewals.",
  both: "Subscription points are used first, then GT points cover the rest.",
};

"""

STATE_OLD = """  const [tab, setTab] = useState("MTN");
  const [refreshing, setRefreshing] = useState(false);

  const balance = calculatePointsAmount(user.points);
"""
STATE_NEW = """  const [tab, setTab] = useState("MTN");
  const [refreshing, setRefreshing] = useState(false);
  // Renewal only: "points" | "subscriptionPoints" | "both"
  const [payWith, setPayWith] = useState("points");

  const subPoints = user?.subscriptionPoints || 0;
  const balance = calculatePointsAmount(user.points);
  // Renewals can also draw on subscription points, so the minimum-balance
  // check for that flow looks at the combined balance.
  const renewBalance = calculatePointsAmount((user.points || 0) + subPoints);
  const shownBalance = type === "subscription" ? renewBalance : balance;
"""

EDITABLE_OLD = "  const editable = Number(balance.amount) >= minRequired;"
EDITABLE_NEW = "  const editable = Number(shownBalance.amount) >= minRequired;"

ON_RENEW_NEW = """  const onRenewSub = async (fv) => {
    const cost = Number(fv?.amount?.value || 0);
    const gt = user.points || 0;
    const sub = user.subscriptionPoints || 0;

    const notEnough =
      payWith === "points"
        ? gt < cost
        : payWith === "subscriptionPoints"
          ? sub < cost
          : gt + sub < cost;

    if (notEnough) {
      return setPopper({
        vis: true,
        type: "failed",
        timer: 1500,
        msg:
          payWith === "points"
            ? "You don't have enough Guru Tokens"
            : payWith === "subscriptionPoints"
              ? "You don't have enough subscription points"
              : "You don't have enough points (Guru Tokens + subscription points)",
      });
    }
    try {
      const res = await renewSubscription({
        ...fv?.amount,
        payWith,
      }).unwrap();
      setAmount(fv?.amount?.days);
      if (res?.status === "success") {
        setState({ ...state, status: "success" });
      }
    } catch (errr) {
      setPopper({
        vis: true,
        type: "failed",
        msg: errr?.data?.message ?? errr?.error ?? "Transaction Failed",
      });
      console.log(errr);
    }
  };

  const onBuyData"""

BAR_OLD = """                  {formatPoints(user?.points)}
                </AppText>
              </View>
            </LinearGradient>
"""
BAR_NEW = """                  {formatPoints(user?.points)}
                </AppText>
              </View>
              {type === "subscription" && (
                <>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceItem}>
                    <AppText
                      size="small"
                      fontWeight="medium"
                      style={styles.balanceLabel}
                    >
                      SUB POINTS
                    </AppText>
                    <AppText
                      size="xxlarge"
                      fontWeight="black"
                      style={styles.balanceValue}
                    >
                      {subPoints.toLocaleString()}
                    </AppText>
                  </View>
                </>
              )}
            </LinearGradient>
"""

FORM_OLD = """                  <>
                    <FormikInput
                      name={"amount"}
                      placeholder={"Select Subscription Plan"}
"""
FORM_NEW = """                  <>
                    <AppText
                      fontWeight="bold"
                      style={{ marginHorizontal: 15, marginTop: 10 }}
                    >
                      Pay with
                    </AppText>
                    <TabSelector
                      options={[
                        { label: "GT Points", color: colors.accentDeeper },
                        { label: "Sub Points", color: colors.primary },
                        { label: "Both", color: colors.greenDark },
                      ]}
                      onChange={(item) =>
                        setPayWith(PAY_OPTIONS[item?.label] ?? "points")
                      }
                    />
                    <AppText
                      size="small"
                      style={{
                        marginHorizontal: 15,
                        marginBottom: 10,
                        color: colors.medium,
                        textAlign: "center",
                      }}
                    >
                      {PAY_HINTS[payWith]}
                    </AppText>
                    <FormikInput
                      name={"amount"}
                      placeholder={"Select Subscription Plan"}
"""

NOTICE_OLD = """                <AppText fontWeight="black" style={styles.minNoticeAmount}>
                  {balance.format}
                </AppText>
"""
NOTICE_NEW = """                <AppText fontWeight="black" style={styles.minNoticeAmount}>
                  {shownBalance.format}
                </AppText>
"""

PROGRESS_OLD = "(Number(balance.amount) / minRequired) * 100,"
PROGRESS_NEW = "(Number(shownBalance.amount) / minRequired) * 100,"

CARD_OLD = """                          : `Total Earned: ${formatPoints(user.totalPoints)}`}
                      </AppText>
"""
CARD_NEW = """                          : `Total Earned: ${formatPoints(user.totalPoints)}`}
                      </AppText>
                      {!isSchool && (
                        <AppText
                          style={{
                            color: colors.primaryLighter,
                            marginTop: 4,
                          }}
                          size={12}
                          fontWeight="medium"
                        >
                          {`Subscription Points: ${(user?.subscriptionPoints || 0).toLocaleString()} (renewals only)`}
                        </AppText>
                      )}
"""

SUB_HISTORY_NEW = """const SubHistory = ({ item }) => {
  if (!item) return null;
  const meta = item?.metadata ?? {};
  const isPrize =
    item?.category === "adjustment" && meta?.pointsType === "subscription";
  const isSub =
    isPrize || ["credit", "points"].includes(item?.transactionType);
  const paidWithSub = Number(meta?.fromSubscriptionPoints || 0);
  const paidWithGT = Number(meta?.fromPoints || 0);

  const title = isPrize
    ? "Competition Prize"
    : isSub
      ? "Subscription"
      : "Withdrawal";

  const amountText = isPrize
    ? `+${Number(item?.amount || 0).toLocaleString()} sub pts`
    : item?.transactionType === "points"
      ? formatPoints(meta?.pointsSpent)
      : getCurrencyAmount(item.amount);

  const detailText = isPrize
    ? "Subscription points"
    : isSub
      ? `+${meta?.days} days`
      : meta?.payoutType;

  return (
    <View
      style={[
        styles.subHistory,
        {
          borderWidth: 2,
          borderColor: isSub ? colors.accentLighter : colors.greenLighter,
        },
      ]}
    >
      <View style={styles.subHistoryIcon}>
        <MaterialCommunityIcons
          name={isPrize ? "trophy" : isSub ? "dots-circle" : "dots-hexagon"}
          color={isSub ? colors.accentLight : colors.greenLight}
          size={15}
          style={{
            backgroundColor: isSub ? colors.accentDeeper : colors.green,
            alignSelf: "center",
            borderRadius: 50,
            padding: 5,
            boxShadow: `2px 8px 12px ${colors.primary}25`,
          }}
        />
      </View>
      <View style={styles.subHistoryContent}>
        <AppText
          fontWeight="black"
          size={"large"}
          style={{ color: colors.medium }}
        >
          {title}
        </AppText>
        <AppText
          fontWeight="medium"
          size={"medium"}
          style={{ color: colors.medium }}
        >
          {item?.description}
        </AppText>
        {!isPrize && paidWithSub > 0 ? (
          <AppText size={"small"} style={{ color: colors.medium }}>
            {paidWithGT > 0
              ? `Paid: ${formatPoints(paidWithGT)} + ${paidWithSub.toLocaleString()} sub pts`
              : `Paid with ${paidWithSub.toLocaleString()} sub pts`}
          </AppText>
        ) : null}
        <AppText
          style={{
            marginTop: 4,
            color: isSub ? colors.accentDeeper : colors.greenDark,
          }}
          fontWeight="heavy"
          size={"xlarge"}
        >
          {amountText}
        </AppText>
      </View>
      <View style={styles.subHistoryDetail}>
        <AppText fontWeight="bold" size={"small"}>
          {" "}
          {detailText}{" "}
        </AppText>
        {meta?.flutterwaveReference && (
          <AppText
            numberOfLines={1}
            style={{ marginTop: 6, maxWidth: width * 0.2 }}
            size={"small"}
          >
            <AppText fontWeight="bold">ID: </AppText>
            {meta?.flutterwaveReference}
          </AppText>
        )}

        <AppText style={{ marginTop: 10 }} fontWeight="thin" size={"small"}>
          {dateFormatter(item.createdAt, "fullDate")}
        </AppText>
      </View>
    </View>
  );
};

const SubscriptionScreen"""


# ─────────────────────────────────────────────────────────────────────────────
# Patch machinery
# ─────────────────────────────────────────────────────────────────────────────
def fail(msg):
    print(f"\n✖ {msg}\n  Nothing was changed.")
    sys.exit(1)


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        fail(
            f"Edit '{label}': expected exactly 1 match, found {n}. "
            "The file differs from the version this patch was written for."
        )
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, new, label):
    matches = list(re.finditer(pattern, text, flags=re.DOTALL))
    if len(matches) != 1:
        fail(
            f"Edit '{label}': expected exactly 1 match, found {len(matches)}. "
            "The file differs from the version this patch was written for."
        )
    m = matches[0]
    return text[: m.start()] + new + text[m.end():]


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    path = sys.argv[1]
    with open(path, "r", encoding="utf-8", newline="") as f:
        raw = f.read()

    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    if "PAY_OPTIONS" in text:
        print("Already patched (PAY_OPTIONS found). Nothing to do.")
        return

    # 1. constants above WithdrawModal
    text = replace_once(
        text,
        "export const WithdrawModal = ({",
        CONSTANTS + "export const WithdrawModal = ({",
        "constants",
    )
    # 2. state + balances, editable
    text = replace_once(text, STATE_OLD, STATE_NEW, "state & balances")
    text = replace_once(text, EDITABLE_OLD, EDITABLE_NEW, "editable")
    # 3. onRenewSub (whole function, up to onBuyData)
    text = replace_regex_once(
        text,
        r"  const onRenewSub = async \(fv\) => \{.*?\n  \};\n\n  const onBuyData",
        ON_RENEW_NEW,
        "onRenewSub",
    )
    # 4. balance bar
    text = replace_once(text, BAR_OLD, BAR_NEW, "balance bar")
    # 5. renewal form selector
    text = replace_once(text, FORM_OLD, FORM_NEW, "renewal form selector")
    # 6. min-balance notice
    text = replace_once(text, NOTICE_OLD, NOTICE_NEW, "minimum notice amount")
    text = replace_once(text, PROGRESS_OLD, PROGRESS_NEW, "minimum notice progress")
    # 7. wallet card
    text = replace_once(text, CARD_OLD, CARD_NEW, "wallet card")
    # 8. SubHistory (whole component, up to SubscriptionScreen)
    text = replace_regex_once(
        text,
        r"const SubHistory = \(\{ item \}\) => \{.*?\n\};\n\nconst SubscriptionScreen",
        SUB_HISTORY_NEW,
        "SubHistory",
    )

    if crlf:
        text = text.replace("\n", "\r\n")

    shutil.copyfile(path, path + ".bak")
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    print(f"✔ Patched {path}  (backup: {path}.bak)")
    print("  8 edits applied. Run your linter/app to confirm.")


if __name__ == "__main__":
    main()
