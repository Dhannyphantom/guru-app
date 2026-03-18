import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import { useCallback, useState } from "react";

const initialState = {
  token: null,
  user: null,
  appInfo: null,
  stat: null,
};

// ── Cache config ──────────────────────────────────────────────────────────────
const ANALYTICS_CACHE_KEY = "user_analytics_me";
const ANALYTICS_CACHE_TTL = 1000 * 60 * 20; // 20 minutes
//   Analytics is the heaviest endpoint so we cache it aggressively.
//   20 min is intentional — quiz data only changes on submission,
//   and the student is unlikely to submit a quiz mid-session.

/** Wipe the analytics AsyncStorage entry so the next query hits the network. */
export const invalidateAnalyticsCache = async () => {
  try {
    await AsyncStorage.removeItem(ANALYTICS_CACHE_KEY);
  } catch (_) {}
};

// analyticsEndpoint.js  (document 2 you shared)

export const useAnalyticsRefresh = (refetch) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await invalidateAnalyticsCache();
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return { refreshing, onRefresh };
};

/**
 * Read the raw cached entry.
 * Returns { data, timestamp, ageMs } or null if missing / expired.
 */
export const readAnalyticsCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageMs = Date.now() - parsed.timestamp;
    if (ageMs >= ANALYTICS_CACHE_TTL) return null; // stale
    return { data: parsed.data, timestamp: parsed.timestamp, ageMs };
  } catch (_) {
    return null;
  }
};

/** Persist analytics data to AsyncStorage. */
const writeAnalyticsCache = async (data) => {
  try {
    await AsyncStorage.setItem(
      ANALYTICS_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch (_) {}
};

// **
//  * analyticsEndpoint — pass your RTK Query builder to get back the endpoint def.
//  *
//  * Usage inside createApi / injectEndpoints:
//  *   fetchUserAnalytics: analyticsEndpoint(builder)
//  */
export const analyticsEndpoint = (builder) =>
  builder.query({
    /**
     * queryFn intercepts the call so we can layer AsyncStorage caching
     * on top of the normal baseQuery without any middleware.
     *
     * Flow:
     *  1. Check AsyncStorage → return immediately if cache is fresh
     *  2. Hit network via baseQuery
     *  3. On success → write to AsyncStorage, return data with meta flags
     *  4. On error   → try to serve stale cache rather than blank screen
     */
    queryFn: async (_arg, _queryApi, _extraOptions, baseQuery) => {
      // ── Step 1: Fresh cache hit ──────────────────────────────────────────
      const cached = await readAnalyticsCache();
      if (cached) {
        return {
          data: {
            ...cached.data,
            _meta: {
              fromCache: true,
              cacheAgeMs: cached.ageMs,
              cachedAt: new Date(cached.timestamp).toISOString(),
            },
          },
        };
      }

      // ── Step 2: Network fetch ────────────────────────────────────────────
      const result = await baseQuery("/analytics/me");

      // ── Step 3: Success → persist + return ──────────────────────────────
      if (!result.error) {
        await writeAnalyticsCache(result.data);
        return {
          data: {
            ...result.data,
            _meta: {
              fromCache: false,
              cacheAgeMs: 0,
              cachedAt: new Date().toISOString(),
            },
          },
        };
      }

      // ── Step 4: Network failed → serve stale cache if available ─────────
      // This prevents a blank screen when the device is briefly offline.
      try {
        const raw = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
        if (raw) {
          const stale = JSON.parse(raw);
          return {
            data: {
              ...stale.data,
              _meta: {
                fromCache: true,
                stale: true,
                cacheAgeMs: Date.now() - stale.timestamp,
                cachedAt: new Date(stale.timestamp).toISOString(),
              },
            },
          };
        }
      } catch (_) {}

      // Nothing at all — propagate the error
      return { error: result.error };
    },

    // Keep the data in the Redux store for 10 min after the component unmounts.
    // This means navigating away and back won't trigger a refetch if the
    // in-memory cache is still warm.
    keepUnusedDataFor: 600,
  });

export const extendedUserApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchUserAnalytics: analyticsEndpoint(builder),
    createUser: builder.mutation({
      query: (user) => ({
        url: "/users/register",
        method: "POST",
        body: user,
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        return res;
      },
    }),
    updateUserAvatar: builder.mutation({
      query: (media) => {
        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            ...media,
            media: true,
            bucket: "avatars",
          }),
        );
        formData.append("file", {
          uri: media.uri,
          name: media.fileName,
          type: media.mimeType,
        });

        return {
          url: "/users/updateAvatar",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["USER"],
    }),
    signInUser: builder.mutation({
      query: (user) => ({
        url: "/users/login",
        method: "POST",
        body: user,
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        return res;
      },
    }),
    subscribeUser: builder.mutation({
      query: (data) => ({
        url: "/payments/subscribe",
        method: "POST",
        body: data,
        timeout: 15000,
      }),
    }),
    withdrawFromWallet: builder.mutation({
      query: (data) => ({
        url: "/payouts/withdraw",
        // url: "/payments/withdraw",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),

    proVerify: builder.mutation({
      query: (data) => ({
        url: "/users/professional",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FETCH_PROS"],
    }),
    verifyAccount: builder.mutation({
      query: (data) => ({
        url: "/payments/verify_account",
        method: "POST",
        body: data,
      }),
    }),

    verifySubscription: builder.mutation({
      query: (data) => ({
        url: "/payouts/verify-subscription",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "SCHOOL", "FETCH_TRANSACTIONS"],
    }),
    renewSubscription: builder.mutation({
      query: (data) => ({
        url: "/users/renew-subscription",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    rechargeAirtime: builder.mutation({
      query: (data) => ({
        url: "/payouts/recharge",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    buyData: builder.mutation({
      query: (data) => ({
        url: "/payouts/data",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    studentAction: builder.mutation({
      query: (data) => ({
        url: "/users/students",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SEARCH_STUDENTS", "FETCH_FRIENDS"],
    }),
    updateUserActivity: builder.mutation({
      query: (data) => ({
        url: "/users/activity",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER"],
    }),
    updateUserProfile: builder.mutation({
      query: (user) => ({
        url: "/users/updateProfile",
        method: "PUT",
        body: user,
      }),
    }),
    updateReward: builder.mutation({
      query: (data) => ({
        url: "/users/rewards",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FETCH_REWARDS", "USER"],
    }),
    fetchRewards: builder.query({
      query: () => ({
        url: "/users/rewards",
        timeout: 15000,
      }),
      providesTags: ["FETCH_REWARDS"],
    }),
    findMoreFriends: builder.query({
      query: ({ limit = 20, accountType = "student", offset = 0 } = {}) => ({
        url: `/users/suggestions?limit=${limit}&offset=${offset}&accountType=${accountType}`,
        timeout: 15000,
      }),
      // Merge incoming data with existing data for infinite scroll
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      merge: (currentCache, newItems, { arg }) => {
        // If offset is 0, replace the cache (refresh scenario)
        if (arg?.offset === 0) {
          return newItems;
        }
        // Otherwise, append new items to existing suggestions
        return {
          ...newItems,
          data: {
            ...newItems.data,
            suggestions: [
              ...(currentCache?.data?.suggestions || []),
              ...(newItems?.data?.suggestions || []),
            ],
          },
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.offset !== previousArg?.offset;
      },
    }),
    fetchUserStats: builder.query({
      query: () => ({
        url: "/users/user_stats",
        timeout: 15000,
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("user_stat", JSON.stringify(res?.data));
        return res;
      },
      providesTags: ["USER_STAT"],
    }),
    readAnnouncements: builder.mutation({
      query: (data) => ({
        url: "/users/announcements/read",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["USER_STAT"],
    }),
    fetchTransactions: builder.query({
      query: (params) => ({
        url: "/users/transactions",
        timeout: 15000,
        params,
      }),
      providesTags: ["FETCH_TRANSACTIONS"],
    }),
    sendEmailOtp: builder.mutation({
      query: (email) => ({
        url: "/users/email/send-otp",
        method: "POST",
        body: { email },
      }),
    }),
    verifyEmailOtp: builder.mutation({
      query: ({ email, otp }) => ({
        url: "/users/email/verify-otp",
        method: "POST",
        body: { email, otp },
      }),
      invalidatesTags: ["USER"], // refresh user data after verification
    }),
    fetchDataBundles: builder.query({
      query: () => ({
        url: "/payouts/data-bundles",
        timeout: 15000,
      }),
    }),
    fetchPros: builder.query({
      query: () => ({
        url: "/users/professionals",
        timeout: 15000,
      }),
      providesTags: ["FETCH_PROS"],
    }),
    fetchFriends: builder.query({
      query: () => ({
        url: "/users/friends",
        timeout: 15000,
      }),
      providesTags: ["FETCH_FRIENDS"],
    }),
    searchStudents: builder.query({
      query: (q) => ({
        url: `/users/search_students?q=${q}`,
        timeout: 15000,
      }),
      providesTags: ["SEARCH_STUDENTS"],
    }),
    fetchProLeaderboard: builder.query({
      query: ({ limit = 50, offset = 0 } = {}) => ({
        url: `/users/pro_leaderboard?limit=${limit}&offset=${offset}`,
        timeout: 15000,
      }),
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.offset === 0) {
          return newItems;
        }
        return {
          ...newItems,
          data: {
            ...newItems.data,
            leaderboard: [
              ...(currentCache?.data?.leaderboard || []),
              ...(newItems?.data?.leaderboard || []),
            ],
          },
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.offset !== previousArg?.offset;
      },
      providesTags: ["PRO_LEADERBOARD"],
    }),

    fetchGlobalLeaderboard: builder.query({
      query: ({
        limit = 50,
        offset = 0,
        timeframe = "all-time",
        sortBy = "totalPoints",
      } = {}) => ({
        url: `/users/leaderboard/global?limit=${limit}&offset=${offset}&timeframe=${timeframe}&sortBy=${sortBy}`,
        timeout: 15000,
      }),
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.offset === 0) {
          return newItems;
        }
        return {
          ...newItems,
          data: {
            ...newItems.data,
            leaderboard: [
              ...(currentCache?.data?.leaderboard || []),
              ...(newItems?.data?.leaderboard || []),
            ],
          },
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.offset !== previousArg?.offset;
      },
      providesTags: ["GLOBAL_LEADERBOARD"],
    }),

    fetchUserInfo: builder.query({
      query: (userId) => ({
        url: `/users/userInfo?userId=${userId}`,
        timeout: 15000,
      }),
    }),

    fetchUser: builder.query({
      query: (token) => ({
        url: "/users/user",
        timeout: 15000,
        headers: {
          "x-auth-token": token,
        },
      }),
      providesTags: ["USER"],
      transformResponse: async (res) => {
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        return res;
      },
    }),
    fetchAppInfo: builder.query({
      query: () => ({
        url: "/users/app_info",
        timeout: 15000,
      }),
    }),
    fetchBanks: builder.query({
      query: () => ({
        url: "/payouts/banks",
        timeout: 15000,
      }),
    }),
    resetUserPassword: builder.mutation({
      query: (data) => ({
        url: "/users/password/reset",
        method: "POST",
        body: data,
      }),
      // invalidatesTags: ["SUPPORT_TICKETS"],
    }),
    createSupportTicket: builder.mutation({
      query: (data) => ({
        url: "/support/ticket",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SUPPORT_TICKETS"],
    }),

    fetchMyTickets: builder.query({
      query: ({ status, category, page = 1, limit = 20 } = {}) => ({
        url: "/support/tickets",
        params: { status, category, page, limit },
      }),
      providesTags: ["SUPPORT_TICKETS"],
    }),

    fetchSingleTicket: builder.query({
      query: (ticketId) => ({
        url: `/support/ticket/${ticketId}`,
      }),
      providesTags: (result, error, ticketId) => [
        { type: "SUPPORT_TICKET", id: ticketId },
      ],
    }),

    sendTicketMessage: builder.mutation({
      query: ({ ticketId, text, attachments }) => ({
        url: `/support/ticket/${ticketId}/message`,
        method: "POST",
        body: { text, attachments },
      }),
      invalidatesTags: (result, error, { ticketId }) => [
        { type: "SUPPORT_TICKET", id: ticketId },
      ],
    }),

    markTicketMessagesRead: builder.mutation({
      query: (ticketId) => ({
        url: `/support/ticket/${ticketId}/messages/read`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, ticketId) => [
        { type: "SUPPORT_TICKET", id: ticketId },
      ],
    }),

    rateTicket: builder.mutation({
      query: ({ ticketId, score, feedback }) => ({
        url: `/support/ticket/${ticketId}/rate`,
        method: "POST",
        body: { score, feedback },
      }),
    }),

    deleteTicket: builder.mutation({
      query: (ticketId) => ({
        url: `/support/ticket/${ticketId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SUPPORT_TICKETS"],
    }),

    // =========================
    // ADMIN ROUTES
    // =========================

    fetchAllTicketsAdmin: builder.query({
      query: ({
        status,
        category,
        priority,
        assignedTo,
        page = 1,
        limit = 50,
        search,
      } = {}) => ({
        url: "/support/admin/tickets",
        params: {
          status,
          category,
          priority,
          assignedTo,
          page,
          limit,
          search,
        },
      }),
      providesTags: ["ADMIN_SUPPORT_TICKETS"],
    }),

    adminReplyTicket: builder.mutation({
      query: ({ ticketId, text }) => ({
        url: `/support/admin/ticket/${ticketId}/reply`,
        method: "POST",
        body: { text },
      }),
      invalidatesTags: (result, error, { ticketId }) => [
        "ADMIN_SUPPORT_TICKETS",
        { type: "SUPPORT_TICKET", id: ticketId },
      ],
    }),

    assignTicket: builder.mutation({
      query: ({ ticketId, assignedTo }) => ({
        url: `/support/admin/ticket/${ticketId}/assign`,
        method: "PUT",
        body: { assignedTo },
      }),
      invalidatesTags: ["ADMIN_SUPPORT_TICKETS"],
    }),

    updateTicketStatus: builder.mutation({
      query: ({ ticketId, status, resolution }) => ({
        url: `/support/admin/ticket/${ticketId}/status`,
        method: "PUT",
        body: { status, resolution },
      }),
      invalidatesTags: ["ADMIN_SUPPORT_TICKETS"],
    }),

    updateTicketPriority: builder.mutation({
      query: ({ ticketId, priority }) => ({
        url: `/support/admin/ticket/${ticketId}/priority`,
        method: "PUT",
        body: { priority },
      }),
      invalidatesTags: ["ADMIN_SUPPORT_TICKETS"],
    }),

    fetchSupportStats: builder.query({
      query: () => ({
        url: "/support/admin/stats",
      }),
      providesTags: ["SUPPORT_STATS"],
    }),
  }),
});

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    updateToken: (state, action) => {
      state.token = action.payload;
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    simulateLogIn: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      extendedUserApiSlice.endpoints.createUser.matchFulfilled,
      (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      },
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchAppInfo.matchFulfilled,
      (state, action) => {
        state.appInfo = action.payload?.data;
      },
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.signInUser.matchFulfilled,
      (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        // extendedUserApiSlice.endpoints.fetchUser.initiate();
      },
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchUser.matchFulfilled,
      (state, action) => {
        state.user = action.payload.user;
      },
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchUserStats.matchFulfilled,
      (state, action) => {
        state.stat = action.payload.data;
      },
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.updateUserProfile.matchFulfilled,
      (state, action) => {
        state.user = { ...state.user, ...action.payload.user };
      },
    );
  },
});

export const { updateToken, updateUser, simulateLogIn } = usersSlice.actions;
// SELECTORS
export const selectToken = (state) => state.users.token;
export const selectUser = (state) => state.users.user;
export const selectAppInfo = (state) => state.users.appInfo;

// ** Pull the root analytics payload from the query result. */
export const selectAnalytics = (queryResult) => queryResult?.data?.data ?? null;

/** Profile snapshot. */
export const selectAnalyticsProfile = (queryResult) =>
  queryResult?.data?.data?.profile ?? null;

/** All-time overview stats. */
export const selectAnalyticsOverview = (queryResult) =>
  queryResult?.data?.data?.overview ?? null;

/** Exam readiness block (score, label, components). */
export const selectExamReadiness = (queryResult) =>
  queryResult?.data?.data?.examReadiness ?? null;

/** Subject performance array (sorted strongest → weakest). */
export const selectSubjectPerformance = (queryResult) =>
  queryResult?.data?.data?.subjectPerformance ?? [];

/** Topic performance array (nested under subjects). */
export const selectTopicPerformance = (queryResult) =>
  queryResult?.data?.data?.topicPerformance ?? [];

/** Flat top-10 weakest topics across all subjects. */
export const selectWeakSpots = (queryResult) =>
  queryResult?.data?.data?.weakSpotsDigest ?? [];

/** Flat top-10 strongest topics across all subjects. */
export const selectStrongSpots = (queryResult) =>
  queryResult?.data?.data?.strongSpotsDigest ?? [];

/** Class comparison block. */
export const selectClassComparison = (queryResult) =>
  queryResult?.data?.data?.classComparison ?? null;

/** School comparison block. */
export const selectSchoolComparison = (queryResult) =>
  queryResult?.data?.data?.schoolComparison ?? null;

/** Weekly + monthly trend arrays. */
export const selectTrends = (queryResult) =>
  queryResult?.data?.data?.trends ?? { weekly: [], monthly: [] };

/** Streak history + active days heatmap. */
export const selectStreakHistory = (queryResult) =>
  queryResult?.data?.data?.streakHistory ?? null;

/** Multiplayer stats. */
export const selectMultiplayerStats = (queryResult) =>
  queryResult?.data?.data?.multiplayerStats ?? null;

/** Last 10 quiz sessions. */
export const selectRecentActivity = (queryResult) =>
  queryResult?.data?.data?.recentActivity ?? [];

/** Study consistency block. */
export const selectStudyConsistency = (queryResult) =>
  queryResult?.data?.data?.studyConsistency ?? null;

/** Priority-sorted recommendations array. */
export const selectRecommendations = (queryResult) =>
  queryResult?.data?.data?.recommendations ?? [];

/** Cache metadata (_fromCache, cacheAgeMs, stale). */
export const selectAnalyticsMeta = (queryResult) =>
  queryResult?.data?._meta ?? null;

//
export const {
  useCreateUserMutation,
  useSignInUserMutation,
  useUpdateUserAvatarMutation,
  useFetchAppInfoQuery,
  useLazyFetchAppInfoQuery,
  useUpdateUserProfileMutation,
  useRenewSubscriptionMutation,
  useStudentActionMutation,
  useFetchUserStatsQuery,
  useLazySearchStudentsQuery,
  useFetchUserInfoQuery,
  useFindMoreFriendsQuery,
  useLazyFetchUserInfoQuery,
  useFetchUserQuery,
  useFetchRewardsQuery,
  useFetchDataBundlesQuery,
  useFetchGlobalLeaderboardQuery,
  useUpdateUserActivityMutation,
  useBuyDataMutation,
  useLazyFetchUserQuery,
  useRechargeAirtimeMutation,
  useFetchProsQuery,
  useFetchFriendsQuery,
  useProVerifyMutation,
  useUpdateRewardMutation,
  useResetUserPasswordMutation,
  useReadAnnouncementsMutation,
  useSubscribeUserMutation,
  useFetchProLeaderboardQuery,
  useFetchTransactionsQuery,
  useWithdrawFromWalletMutation,
  useVerifyAccountMutation,
  useVerifySubscriptionMutation,
  useLazyFetchBanksQuery,
  useCreateSupportTicketMutation,
  useFetchMyTicketsQuery,
  useFetchSingleTicketQuery,
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useSendTicketMessageMutation,
  useMarkTicketMessagesReadMutation,
  useFetchUserAnalyticsQuery,
  useRateTicketMutation,
  useDeleteTicketMutation,
  useFetchAllTicketsAdminQuery,
  useAdminReplyTicketMutation,
  useUpdateTicketStatusMutation,
  useUpdateTicketPriorityMutation,
  useFetchSupportStatsQuery,
} = extendedUserApiSlice;

export default usersSlice.reducer;
