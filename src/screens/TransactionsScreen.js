/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import colors, { successGradient } from "../helpers/colors";
import {
  useFetchWalletTransactionsQuery,
  useFetchPayoutRequestsQuery,
} from "../context/instanceSlice";
import AppText from "../components/AppText";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
const ITEM_HEIGHT = 88; // estimated row height for getItemLayout

// =============================================================================
// CONSTANTS
// =============================================================================
const TABS = [
  { key: "wallet", label: "Wallet", icon: "swap-horizontal" },
  { key: "payouts", label: "Payouts", icon: "cash-outline" },
];

const WALLET_FILTER_OPTIONS = {
  accountType: [
    { label: "All Accounts", value: "" },
    { label: "School", value: "school" },
    { label: "Student", value: "student" },
    { label: "Guru", value: "guru" },
  ],
  transType: [
    { label: "All Types", value: "" },
    { label: "Credit", value: "credit" },
    { label: "Debit", value: "debit" },
    { label: "Points", value: "points" },
  ],
  category: [
    { label: "All Categories", value: "" },
    { label: "Subscription", value: "subscription" },
    { label: "Payout", value: "payout" },
    { label: "Refund", value: "refund" },
    { label: "Transfer", value: "transfer" },
    { label: "Adjustment", value: "adjustment" },
  ],
  status: [
    { label: "All Statuses", value: "" },
    { label: "Completed", value: "completed" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "failed" },
  ],
};

const PAYOUT_FILTER_OPTIONS = {
  payoutType: [
    { label: "All Types", value: "" },
    { label: "Withdrawal", value: "withdrawal" },
    { label: "Airtime", value: "airtime" },
    { label: "Data", value: "data" },
  ],
  status: [
    { label: "All Statuses", value: "" },
    { label: "Completed", value: "completed" },
    { label: "Processing", value: "processing" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "failed" },
  ],
};

const SORT_OPTIONS = [
  { label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Oldest First", sortBy: "createdAt", sortOrder: "asc" },
  { label: "Highest Amount", sortBy: "amount", sortOrder: "desc" },
  { label: "Lowest Amount", sortBy: "amount", sortOrder: "asc" },
];

// =============================================================================
// UTILITY
// =============================================================================
const fmt = (n) =>
  typeof n === "number" ? `₦${n.toLocaleString()}` : n ?? "₦0";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const STATUS_META = {
  completed: {
    color: colors.green,
    bg: colors.green + "18",
    icon: "checkmark-circle",
  },
  pending: { color: colors.warning, bg: colors.warning + "18", icon: "time" },
  processing: {
    color: colors.primary,
    bg: colors.primary + "18",
    icon: "sync",
  },
  failed: {
    color: colors.heart,
    bg: colors.heart + "18",
    icon: "close-circle",
  },
};

const TYPE_META = {
  credit: { color: colors.green, icon: "arrow-down-circle", label: "Credit" },
  debit: { color: colors.heart, icon: "arrow-up-circle", label: "Debit" },
  points: { color: colors.warning, icon: "star", label: "Points" },
  withdrawal: {
    color: colors.accent,
    icon: "card-outline",
    label: "Withdrawal",
  },
  airtime: { color: colors.primary, icon: "call-outline", label: "Airtime" },
  data: {
    color: colors.greenDark || colors.green,
    icon: "wifi-outline",
    label: "Data",
  },
};

const ACCOUNT_COLORS = {
  school: [colors.accentDeep, colors.accent],
  student: [colors.greenDark, colors.green],
  guru: [colors.primaryDeep, colors.primary],
};

// =============================================================================
// MAIN SCREEN
// =============================================================================
const TransactionsScreen = () => {
  const [activeTab, setActiveTab] = useState("wallet");

  const router = useRouter();

  // ── Wallet filters ────────────────────────────────────────────────
  const [walletFilters, setWalletFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    accountType: "",
    transType: "",
    category: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    startDate: "",
    endDate: "",
  });

  // ── Payout filters ────────────────────────────────────────────────
  const [payoutFilters, setPayoutFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    payoutType: "",
    status: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    startDate: "",
    endDate: "",
  });

  // ── UI state ──────────────────────────────────────────────────────
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null); // "wallet" | "payout"

  const searchDebounceRef = useRef(null);

  // ── Queries ───────────────────────────────────────────────────────
  const cleanParams = (params) =>
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined),
    );

  const {
    data: walletData,
    isLoading: walletLoading,
    isFetching: walletFetching,
    refetch: refetchWallet,
  } = useFetchWalletTransactionsQuery(cleanParams(walletFilters), {
    skip: activeTab !== "wallet",
  });

  const {
    data: payoutData,
    isLoading: payoutLoading,
    isFetching: payoutFetching,
    refetch: refetchPayouts,
  } = useFetchPayoutRequestsQuery(cleanParams(payoutFilters), {
    skip: activeTab !== "payouts",
  });

  const walletTransactions = walletData?.data?.transactions || [];
  const walletPagination = walletData?.data?.pagination || {};
  const walletSummary = walletData?.data?.summary || {};

  const payoutRequests = payoutData?.data?.payouts || [];
  const payoutPagination = payoutData?.data?.pagination || {};
  const payoutSummary = payoutData?.data?.summary || {};

  const isWallet = activeTab === "wallet";
  const loading = isWallet ? walletLoading : payoutLoading;
  const fetching = isWallet ? walletFetching : payoutFetching;
  const filters = isWallet ? walletFilters : payoutFilters;
  const setFilters = isWallet ? setWalletFilters : setPayoutFilters;

  // Count active (non-default) filters for the badge
  const activeFilterCount = useMemo(() => {
    const f = isWallet ? walletFilters : payoutFilters;
    const ignored = new Set(["page", "limit", "search", "sortBy", "sortOrder"]);
    return Object.entries(f).filter(([k, v]) => !ignored.has(k) && v !== "")
      .length;
  }, [walletFilters, payoutFilters, isWallet]);

  // ── Search with debounce ──────────────────────────────────────────
  const handleSearch = useCallback(
    (text) => {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setFilters((prev) => ({ ...prev, search: text, page: 1 }));
      }, 400);
    },
    [setFilters],
  );

  // ── Pagination ────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    const pagination = isWallet ? walletPagination : payoutPagination;
    if (!pagination.hasNextPage || fetching) return;
    setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
  }, [isWallet, walletPagination, payoutPagination, fetching, setFilters]);

  const onRefresh = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    if (isWallet) refetchWallet();
    else refetchPayouts();
  }, [isWallet, refetchWallet, refetchPayouts, setFilters]);

  // ── Sorting shortcut (cycles through SORT_OPTIONS) ────────────────
  const currentSortLabel = useMemo(() => {
    const match = SORT_OPTIONS.find(
      (o) => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder,
    );
    return match?.label || "Sort";
  }, [filters.sortBy, filters.sortOrder]);

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex(
      (o) => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder,
    );
    const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
    setFilters((prev) => ({
      ...prev,
      sortBy: next.sortBy,
      sortOrder: next.sortOrder,
      page: 1,
    }));
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.primaryDeep, colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router?.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <AppText style={styles.headerTitle} fontWeight="bold">
              Transactions
            </AppText>
            <AppText style={styles.headerSub}>
              Wallet activity & payout history
            </AppText>
          </View>
        </View>

        {/* Summary pills */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.summaryRow}
        >
          {isWallet ? (
            <>
              <SummaryPill
                label="Total"
                value={fmt(walletSummary.totalAmount)}
                icon="wallet-outline"
              />
              <SummaryPill
                label="Credits"
                value={fmt(walletSummary.totalCredits)}
                icon="arrow-down-circle-outline"
                tint={colors.green}
              />
              <SummaryPill
                label="Debits"
                value={fmt(walletSummary.totalDebits)}
                icon="arrow-up-circle-outline"
                tint={colors.heart}
              />
            </>
          ) : (
            <>
              <SummaryPill
                label="Total"
                value={fmt(payoutSummary.totalAmount)}
                icon="cash-outline"
              />
              <SummaryPill
                label="Done"
                value={payoutSummary.completedCount ?? 0}
                icon="checkmark-circle-outline"
                tint={colors.green}
              />
              <SummaryPill
                label="Failed"
                value={payoutSummary.failedCount ?? 0}
                icon="close-circle-outline"
                tint={colors.heart}
              />
            </>
          )}
        </Animated.View>
      </LinearGradient>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? colors.primary : colors.medium}
            />
            <AppText
              style={{
                ...styles.tabLabel,
                ...(activeTab === tab.key ? styles.tabLabelActive : {}),
              }}
              fontWeight={activeTab === tab.key ? "bold" : "normal"}
            >
              {tab.label}
            </AppText>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Toolbar: search + filter + sort ─────────────────────────── */}
      <View style={styles.toolbar}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.medium}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isWallet ? "Reference or description…" : "Reference, name, phone…"
            }
            placeholderTextColor={colors.lighter}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={() => setFilterSheetOpen(true)}
          style={styles.toolbarBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <AppText style={styles.filterBadgeText}>
                {activeFilterCount}
              </AppText>
            </View>
          )}
        </TouchableOpacity>

        {/* Sort button */}
        <TouchableOpacity
          onPress={cycleSort}
          style={styles.toolbarBtn}
          activeOpacity={0.75}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.chipRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {Object.entries(filters)
              .filter(([k, v]) => {
                const ignored = new Set([
                  "page",
                  "limit",
                  "search",
                  "sortBy",
                  "sortOrder",
                ]);
                return !ignored.has(k) && v !== "";
              })
              .map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.chip}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, [key]: "", page: 1 }))
                  }
                  activeOpacity={0.75}
                >
                  <AppText style={styles.chipText}>{val}</AppText>
                  <Ionicons name="close" size={12} color={colors.primary} />
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  accountType: "",
                  transType: "",
                  category: "",
                  status: "",
                  payoutType: "",
                  startDate: "",
                  endDate: "",
                  page: 1,
                }))
              }
              style={styles.clearChip}
            >
              <AppText style={styles.clearChipText}>Clear all</AppText>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* Sort label */}
      <View style={styles.sortLabel}>
        <Ionicons name="funnel-outline" size={12} color={colors.medium} />
        <AppText style={styles.sortLabelText}>{currentSortLabel}</AppText>
        {(isWallet ? walletPagination.total : payoutPagination.total) !==
          undefined && (
          <AppText style={styles.countLabel}>
            {(isWallet
              ? walletPagination.total
              : payoutPagination.total
            ).toLocaleString()}{" "}
            records
          </AppText>
        )}
      </View>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loaderText}>Loading…</AppText>
        </View>
      ) : (
        <FlatList
          data={isWallet ? walletTransactions : payoutRequests}
          keyExtractor={(item) => item._id || item.reference}
          renderItem={({ item, index }) =>
            isWallet ? (
              <WalletTransactionRow
                item={item}
                index={index}
                onPress={() => {
                  setDetailItem(item);
                  setDetailType("wallet");
                }}
              />
            ) : (
              <PayoutRequestRow
                item={item}
                index={index}
                onPress={() => {
                  setDetailItem(item);
                  setDetailType("payout");
                }}
              />
            )
          }
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={fetching && filters.page === 1}
              onRefresh={onRefresh}
            />
          }
          ListEmptyComponent={<EmptyState isWallet={isWallet} />}
          ListFooterComponent={
            fetching && filters.page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={styles.footerLoaderText}>Loading more…</AppText>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Filter sheet ─────────────────────────────────────────────── */}
      <FilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        isWallet={isWallet}
        filters={filters}
        onApply={(newFilters) => {
          setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
          setFilterSheetOpen(false);
        }}
      />

      {/* ── Detail modal ─────────────────────────────────────────────── */}
      <DetailModal
        item={detailItem}
        type={detailType}
        onClose={() => setDetailItem(null)}
      />
    </View>
  );
};

// =============================================================================
// SUMMARY PILL
// =============================================================================
const SummaryPill = ({ label, value, icon, tint }) => (
  <View style={styles.summaryPill}>
    <Ionicons name={icon} size={14} color={tint || "rgba(255,255,255,0.8)"} />
    <AppText style={styles.summaryPillValue}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </AppText>
    <AppText style={styles.summaryPillLabel}>{label}</AppText>
  </View>
);

// =============================================================================
// WALLET TRANSACTION ROW
// =============================================================================
const WalletTransactionRow = ({ item, index, onPress }) => {
  const typeMeta = TYPE_META[item.transactionType] || TYPE_META.credit;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const acctGradient =
    ACCOUNT_COLORS[item.accountType] || ACCOUNT_COLORS.student;
  const isCredit = item.transactionType === "credit";

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 40, 300)).springify()}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.78}
      >
        {/* Left icon */}
        <View
          style={[
            styles.rowIconWrap,
            { backgroundColor: typeMeta.color + "18" },
          ]}
        >
          <Ionicons name={typeMeta.icon} size={22} color={typeMeta.color} />
        </View>

        {/* Middle content */}
        <View style={styles.rowBody}>
          <View style={styles.rowTitleRow}>
            <AppText style={styles.rowTitle} numberOfLines={1}>
              {item.description || item.category}
            </AppText>
            {/* Account badge */}
            <View style={styles.acctBadgeWrap}>
              <LinearGradient colors={acctGradient} style={styles.acctBadge}>
                <AppText style={styles.acctBadgeText}>
                  {item.accountType?.toUpperCase().slice(0, 3)}
                </AppText>
              </LinearGradient>
            </View>
          </View>
          <AppText style={styles.rowRef} numberOfLines={1}>
            {item.reference}
          </AppText>
          <View style={styles.rowMeta}>
            <AppText style={styles.rowDate}>{fmtDate(item.createdAt)}</AppText>
            <AppText style={styles.rowDot}>·</AppText>
            <AppText style={styles.rowTime}>{fmtTime(item.createdAt)}</AppText>
            <AppText style={styles.rowDot}>·</AppText>
            <View
              style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusMeta.color },
                ]}
              />
              <AppText
                style={{ ...styles.statusText, color: statusMeta.color }}
              >
                {item.status}
              </AppText>
            </View>
          </View>
        </View>

        {/* Right amount */}
        <View style={styles.rowRight}>
          <AppText
            style={{
              ...styles.rowAmount,
              color: isCredit ? colors.green : colors.heart,
            }}
            fontWeight="bold"
          >
            {isCredit ? "+" : "-"}
            {fmt(item.amount)}
          </AppText>
          <AppText style={styles.rowCategory}>{item.category}</AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================================================================
// PAYOUT REQUEST ROW
// =============================================================================
const PayoutRequestRow = ({ item, index, onPress }) => {
  const typeMeta = TYPE_META[item.payoutType] || TYPE_META.withdrawal;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 40, 300)).springify()}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.78}
      >
        {/* Left icon */}
        <View
          style={[
            styles.rowIconWrap,
            { backgroundColor: typeMeta.color + "18" },
          ]}
        >
          <Ionicons name={typeMeta.icon} size={22} color={typeMeta.color} />
        </View>

        {/* Middle */}
        <View style={styles.rowBody}>
          <View style={styles.rowTitleRow}>
            <AppText style={styles.rowTitle} numberOfLines={1}>
              {typeMeta.label}
              {item.payoutType === "airtime" || item.payoutType === "data"
                ? ` · ${item.network || ""}`
                : ""}
            </AppText>
            {/* Points converted */}
            <View style={styles.pointsPill}>
              <Ionicons name="star" size={10} color={colors.warning} />
              <AppText style={styles.pointsPillText}>
                {item.pointsConverted?.toLocaleString() || 0} pts
              </AppText>
            </View>
          </View>

          {/* Destination */}
          <AppText style={styles.rowRef} numberOfLines={1}>
            {item.accountName || item.phoneNumber || item.reference}
          </AppText>

          <View style={styles.rowMeta}>
            <AppText style={styles.rowDate}>{fmtDate(item.createdAt)}</AppText>
            <AppText style={styles.rowDot}>·</AppText>
            <View
              style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusMeta.color },
                ]}
              />
              <AppText
                style={{ ...styles.statusText, color: statusMeta.color }}
              >
                {item.status}
              </AppText>
            </View>
          </View>
        </View>

        {/* Right */}
        <View style={styles.rowRight}>
          <AppText
            style={{ ...styles.rowAmount, color: colors.heart }}
            fontWeight="bold"
          >
            -{fmt(item.amount)}
          </AppText>
          <AppText style={styles.rowCategory}>{item.payoutType}</AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================================================================
// EMPTY STATE
// =============================================================================
const EmptyState = ({ isWallet }) => (
  <Animated.View entering={FadeIn.duration(400)} style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      <Ionicons
        name={isWallet ? "swap-horizontal-outline" : "cash-outline"}
        size={48}
        color={colors.lighter}
      />
    </View>
    <AppText style={styles.emptyTitle} fontWeight="bold">
      No {isWallet ? "transactions" : "payouts"} found
    </AppText>
    <AppText style={styles.emptySub}>
      Try adjusting your filters or search query
    </AppText>
  </Animated.View>
);

// =============================================================================
// FILTER SHEET
// =============================================================================
const FilterSheet = ({ visible, onClose, isWallet, filters, onApply }) => {
  const [local, setLocal] = useState(filters);

  // Sync when sheet opens
  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible]);

  const set = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

  const filterGroups = isWallet
    ? [
        {
          key: "accountType",
          label: "Account",
          options: WALLET_FILTER_OPTIONS.accountType,
        },
        {
          key: "transType",
          label: "Type",
          options: WALLET_FILTER_OPTIONS.transType,
        },
        {
          key: "category",
          label: "Category",
          options: WALLET_FILTER_OPTIONS.category,
        },
        {
          key: "status",
          label: "Status",
          options: WALLET_FILTER_OPTIONS.status,
        },
      ]
    : [
        {
          key: "payoutType",
          label: "Payout Type",
          options: PAYOUT_FILTER_OPTIONS.payoutType,
        },
        {
          key: "status",
          label: "Status",
          options: PAYOUT_FILTER_OPTIONS.status,
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={fStyles.backdrop} onPress={onClose} />
      <Animated.View
        entering={SlideInDown.springify()}
        exiting={SlideOutDown.duration(200)}
        style={fStyles.sheet}
      >
        {/* Handle */}
        <View style={fStyles.handle} />

        {/* Header */}
        <View style={fStyles.sheetHeader}>
          <View style={fStyles.sheetHeaderLeft}>
            <LinearGradient
              colors={[colors.primaryDeep, colors.primary]}
              style={fStyles.sheetIconBg}
            >
              <Ionicons name="options" size={16} color={colors.white} />
            </LinearGradient>
            <AppText style={fStyles.sheetTitle} fontWeight="bold">
              Filters
            </AppText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close-circle" size={26} color={colors.lighter} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={fStyles.sheetScroll}
        >
          {/* Sort */}
          <AppText style={fStyles.groupLabel}>Sort By</AppText>
          <View style={fStyles.chipGrid}>
            {SORT_OPTIONS.map((opt) => {
              const active =
                local.sortBy === opt.sortBy &&
                local.sortOrder === opt.sortOrder;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      sortBy: opt.sortBy,
                      sortOrder: opt.sortOrder,
                    }))
                  }
                  style={[fStyles.optChip, active && fStyles.optChipActive]}
                  activeOpacity={0.75}
                >
                  <AppText
                    style={{
                      ...fStyles.optChipText,
                      ...(active ? fStyles.optChipTextActive : {}),
                    }}
                  >
                    {opt.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Filter groups */}
          {filterGroups.map((group) => (
            <View key={group.key}>
              <AppText style={fStyles.groupLabel}>{group.label}</AppText>
              <View style={fStyles.chipGrid}>
                {group.options.map((opt) => {
                  const active = local[group.key] === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => set(group.key, opt.value)}
                      style={[fStyles.optChip, active && fStyles.optChipActive]}
                      activeOpacity={0.75}
                    >
                      <AppText
                        style={{
                          ...fStyles.optChipText,
                          ...(active ? fStyles.optChipTextActive : {}),
                        }}
                      >
                        {opt.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Date range */}
          <AppText style={fStyles.groupLabel}>Date Range</AppText>
          <View style={fStyles.dateRow}>
            <View style={fStyles.dateField}>
              <AppText style={fStyles.dateFieldLabel}>From</AppText>
              <TextInput
                style={fStyles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.lighter}
                value={local.startDate}
                onChangeText={(v) => set("startDate", v)}
              />
            </View>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.medium}
              style={{ marginTop: 24 }}
            />
            <View style={fStyles.dateField}>
              <AppText style={fStyles.dateFieldLabel}>To</AppText>
              <TextInput
                style={fStyles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.lighter}
                value={local.endDate}
                onChangeText={(v) => set("endDate", v)}
              />
            </View>
          </View>
        </ScrollView>

        {/* Apply / Reset */}
        <View style={fStyles.sheetFooter}>
          <TouchableOpacity
            onPress={() => {
              const reset = isWallet
                ? {
                    accountType: "",
                    transType: "",
                    category: "",
                    status: "",
                    startDate: "",
                    endDate: "",
                    sortBy: "createdAt",
                    sortOrder: "desc",
                  }
                : {
                    payoutType: "",
                    status: "",
                    startDate: "",
                    endDate: "",
                    sortBy: "createdAt",
                    sortOrder: "desc",
                  };
              onApply(reset);
            }}
            style={fStyles.resetBtn}
            activeOpacity={0.75}
          >
            <AppText style={fStyles.resetBtnLabel}>Reset</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onApply(local)}
            style={{ flex: 1 }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primaryDeep, colors.primary]}
              style={fStyles.applyBtn}
            >
              <AppText style={fStyles.applyBtnLabel} fontWeight="bold">
                Apply Filters
              </AppText>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// =============================================================================
// DETAIL MODAL
// =============================================================================
const DetailModal = ({ item, type, onClose }) => {
  if (!item) return null;

  const isWallet = type === "wallet";

  const rows = isWallet
    ? [
        { label: "Reference", value: item.reference },
        { label: "Type", value: item.transactionType },
        { label: "Category", value: item.category },
        { label: "Account", value: item.accountType },
        { label: "Amount", value: fmt(item.amount) },
        { label: "Balance Before", value: fmt(item.balanceBefore) },
        { label: "Balance After", value: fmt(item.balanceAfter) },
        { label: "Status", value: item.status },
        { label: "Description", value: item.description || "—" },
        { label: "Flutterwave Ref", value: item.flutterwaveReference || "—" },
        {
          label: "User",
          value: item.userId
            ? `${item.userId.firstName || ""} ${
                item.userId.lastName || ""
              }`.trim() || item.userId.email
            : "—",
        },
        {
          label: "Date",
          value: `${fmtDate(item.createdAt)} ${fmtTime(item.createdAt)}`,
        },
      ]
    : [
        { label: "Reference", value: item.reference },
        { label: "Payout Type", value: item.payoutType },
        { label: "Amount", value: fmt(item.amount) },
        {
          label: "Points Used",
          value: (item.pointsConverted || 0).toLocaleString(),
        },
        { label: "Status", value: item.status },
        {
          label: "Bank/Network",
          value: item.accountBank || item.network || "—",
        },
        {
          label: "Account No",
          value: item.accountNumber || item.phoneNumber || "—",
        },
        { label: "Account Name", value: item.accountName || "—" },
        { label: "Flutterwave ID", value: item.flutterwaveId || "—" },
        { label: "Error", value: item.errorMessage || "—" },
        {
          label: "User",
          value: item.userId
            ? `${item.userId.firstName || ""} ${
                item.userId.lastName || ""
              }`.trim() || item.userId.email
            : "—",
        },
        {
          label: "Created",
          value: `${fmtDate(item.createdAt)} ${fmtTime(item.createdAt)}`,
        },
        {
          label: "Completed",
          value: item.completedAt
            ? `${fmtDate(item.completedAt)} ${fmtTime(item.completedAt)}`
            : "—",
        },
      ];

  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={dStyles.overlay}>
        <Animated.View entering={SlideInDown.springify()} style={dStyles.sheet}>
          {/* Header strip */}
          <LinearGradient
            colors={
              isWallet
                ? [colors.primaryDeep, colors.primary]
                : [colors.accentDeep, colors.accent]
            }
            style={dStyles.headerStrip}
          >
            <View style={dStyles.handle} />
            <View style={dStyles.detailHeaderContent}>
              <View>
                <AppText style={dStyles.detailType} fontWeight="bold">
                  {isWallet
                    ? item.transactionType?.toUpperCase()
                    : item.payoutType?.toUpperCase()}
                </AppText>
                <AppText style={dStyles.detailAmount} fontWeight="bold">
                  {fmt(item.amount)}
                </AppText>
              </View>
              <View
                style={[
                  dStyles.statusBadgeLg,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              >
                <Ionicons
                  name={statusMeta.icon}
                  size={14}
                  color={colors.white}
                />
                <AppText style={dStyles.statusTextLg}>{item.status}</AppText>
              </View>
            </View>
          </LinearGradient>

          {/* Rows */}
          <ScrollView
            style={dStyles.body}
            contentContainerStyle={dStyles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {rows.map(({ label, value }) => (
              <View key={label} style={dStyles.detailRow}>
                <AppText style={dStyles.detailLabel}>{label}</AppText>
                <AppText
                  style={dStyles.detailValue}
                  numberOfLines={2}
                  fontWeight={label === "Amount" ? "bold" : "normal"}
                >
                  {value}
                </AppText>
              </View>
            ))}
          </ScrollView>

          {/* Close */}
          <View style={dStyles.footer}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={
                  isWallet
                    ? [colors.primaryDeep, colors.primary]
                    : [colors.accentDeep, colors.accent]
                }
                style={dStyles.closeBtn}
              >
                <AppText style={dStyles.closeBtnLabel} fontWeight="bold">
                  Close
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// =============================================================================
// MAIN STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light || "#f5f5f7",
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  headerCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -60,
    top: -60,
  },
  headerCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: 80,
    bottom: -20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  summaryPillValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
    marginTop: 2,
  },
  summaryPillLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Tab bar ───────────────────────────────────────────────────────
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly || "#eee",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
    position: "relative",
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 14,
    color: colors.medium,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // ── Toolbar ───────────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly || "#eee",
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.extraLight || "#f5f5f7",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    paddingVertical: 0,
  },
  toolbarBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.heart,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.white,
  },

  // ── Filter chips ──────────────────────────────────────────────────
  chipRow: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly || "#eee",
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.primary + "12",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  chipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearChipText: {
    fontSize: 12,
    color: colors.medium,
    textDecorationLine: "underline",
  },

  // ── Sort label ────────────────────────────────────────────────────
  sortLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortLabelText: {
    fontSize: 12,
    color: colors.medium,
    flex: 1,
  },
  countLabel: {
    fontSize: 12,
    color: colors.medium,
  },

  // ── List ──────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    boxShadow: `0px 2px 8px rgba(0,0,0,0.06)`,
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    flex: 1,
    textTransform: "capitalize",
  },
  rowRef: {
    fontSize: 11,
    color: colors.medium,
    letterSpacing: 0.2,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  rowDate: {
    fontSize: 11,
    color: colors.medium,
  },
  rowTime: {
    fontSize: 11,
    color: colors.medium,
  },
  rowDot: {
    fontSize: 11,
    color: colors.lighter,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.black,
  },
  rowCategory: {
    fontSize: 10,
    color: colors.medium,
    textTransform: "capitalize",
  },
  acctBadgeWrap: {},
  acctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  acctBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.warning + "18",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pointsPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.warning,
  },

  // ── Loader / empty ────────────────────────────────────────────────
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: colors.medium,
    fontSize: 14,
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: colors.medium,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 64,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.extraLight || "#f0f0f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.dark || colors.black,
  },
  emptySub: {
    fontSize: 13,
    color: colors.medium,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

// =============================================================================
// FILTER SHEET STYLES
// =============================================================================
const fStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    boxShadow: `0px -4px 24px rgba(0,0,0,0.12)`,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lighter,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly || "#eee",
  },
  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.lightly || "#ddd",
    backgroundColor: colors.white,
  },
  optChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  optChipText: {
    fontSize: 13,
    color: colors.medium,
    fontWeight: "600",
  },
  optChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 12,
    color: colors.medium,
    marginBottom: 6,
    fontWeight: "600",
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: colors.lightly || "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.black,
    backgroundColor: colors.extraLight || "#fafafa",
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightly || "#eee",
  },
  resetBtn: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.lightly || "#ddd",
    borderRadius: 14,
  },
  resetBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.medium,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});

// =============================================================================
// DETAIL MODAL STYLES
// =============================================================================
const dStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    overflow: "hidden",
  },
  headerStrip: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  detailHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  detailType: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  detailAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
  },
  statusBadgeLg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusTextLg: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
    textTransform: "capitalize",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly || "#f0f0f2",
    gap: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.medium,
    width: 120,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 13,
    color: colors.black,
    flex: 1,
    textAlign: "right",
    textTransform: "capitalize",
  },
  footer: {
    flex: 0.2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightly || "#eee",
  },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});

export default TransactionsScreen;
