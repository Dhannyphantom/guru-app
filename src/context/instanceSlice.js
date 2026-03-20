// import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import { getFormData } from "../helpers/helperFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const initialState = {
  categories: [],
};

// ─── Utility: build a query string from a params object ──────────────────────
// (strips undefined/null/empty-string values)
const buildQuery = (params = {}) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "";
};

export const extendedUserApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchCategories: builder.query({
      query: () => "/instance/category",
      transformResponse: async (res) => {
        await AsyncStorage.setItem("categories", JSON.stringify(res?.data));
        return res;
      },
    }),
    fetchSubjectCategories: builder.query({
      query: (categoryId) =>
        `/instance/subject_category?categoryId=${categoryId}`,
      transformResponse: async (res) => {
        await AsyncStorage.setItem(
          `subjects_${res?.meta?.categoryId}`,
          JSON.stringify(res?.data),
        );
        return res;
      },
    }),
    fetchSubjTopics: builder.query({
      query: (id) => `/instance/topic?subjectId=${id}`,
      transformResponse: async (res) => {
        await AsyncStorage.setItem(
          `topics_${res?.id}`,
          JSON.stringify(res?.data),
        );
        return res;
      },
    }),

    fetchSubjects: builder.query({
      query: (type) => ({
        url: "/instance/subjects",
        params: { type },
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("subjects", JSON.stringify(res?.data));
        return res;
      },
    }),
    submitFreemiumQuiz: builder.mutation({
      query: (data) => ({
        url: "/instance/submit_freemium",
        method: "POST",
        body: data,
      }),
    }),
    getMyQuestions: builder.query({
      query: () => {
        return {
          url: "/instance/my_questions",
          timeout: 15000,
        };
      },
      transformResponse: async (res) => {
        await AsyncStorage.setItem("qBank", JSON.stringify(res));
        return res;
      },
    }),

    fetchInstance: builder.query({
      query: ({ route, topicId, subjectId, page = 1, limit = 20 }) => ({
        url: `/instance/${route}`,
        params: {
          ...(topicId != null && { topicId }),
          ...(subjectId != null && { subjectId }),
          page,
          limit,
        },
        timeout: 15000,
      }),
      // Disable default caching merge so we manage accumulated data in the screen
      providesTags: ["FETCH_INSTANCE"],
    }),

    fetchAnalytics: builder.query({
      query: () => ({
        url: "/analytics",
        timeout: 35000,
      }),
      providesTags: ["ANALYTICS"],
    }),
    transferFunds: builder.mutation({
      query: (data) => {
        return {
          url: "/payouts/wallets/transfer",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["ANALYTICS"],
    }),
    createCategory: builder.mutation({
      query: (data) => {
        const formData = getFormData(data, "categories", true);
        return {
          url: "/create/category",
          method: "POST",
          body: formData,
        };
      },
    }),
    createSubject: builder.mutation({
      query: (data) => {
        const formData = getFormData(data, "subjects", true);
        return {
          url: "/create/subject",
          method: "POST",
          body: formData,
        };
      },
    }),
    fetchPremiumQuiz: builder.mutation({
      query: (quizData) => {
        return {
          url: "/instance/premium_quiz",
          method: "POST",
          body: quizData,
        };
      },
    }),
    submitPremiumQuiz: builder.mutation({
      query: (data) => {
        return {
          url: "/instance/submit_premium",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["USER_STAT"],
    }),
    fetchSubjectsTopics: builder.mutation({
      query: (subjects) => {
        return {
          url: "/instance/subject_topics",
          method: "POST",
          body: subjects,
        };
      },
    }),
    createTopic: builder.mutation({
      query: (data) => {
        return {
          url: "/create/topic",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["PRO_LEADERBORAD"],
    }),
    createQuestion: builder.mutation({
      query: (data) => {
        const formData = getFormData(data, "questions", true);
        return {
          url: "/create/questions",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["PRO_LEADERBORAD"],
    }),
    updateInstance: builder.mutation({
      query: (data) => {
        const formData = data?.media
          ? getFormData(data, data?.bucket, false)
          : data;
        return {
          url: `/instance/${data?.route}`,
          method: "PUT",
          body: formData,
        };
      },
      invalidatesTags: ["FETCH_INSTANCE"],
    }),
    // ------------------------------------------------------------------
    // Wallet transactions list
    // ------------------------------------------------------------------
    fetchWalletTransactions: builder.query({
      query: (params = {}) => `/transactions/wallet${buildQuery(params)}`,
      // Cache key includes all filter params so each unique filter set
      // gets its own cache entry
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
      // Merge pages for infinite-scroll (optional — remove if using
      // standard pagination buttons instead)
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.page && arg.page > 1) {
          currentCache.data.transactions.push(...newItems.data.transactions);
          currentCache.data.pagination = newItems.data.pagination;
        } else {
          return newItems;
        }
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        JSON.stringify(currentArg) !== JSON.stringify(previousArg),
      providesTags: ["WalletTransactions"],
    }),

    // ------------------------------------------------------------------
    // Single wallet transaction by reference
    // ------------------------------------------------------------------
    fetchWalletTransactionByRef: builder.query({
      query: (reference) => `/transactions/wallet/${reference}`,
      providesTags: (result, error, reference) => [
        { type: "WalletTransactions", id: reference },
      ],
    }),

    // ------------------------------------------------------------------
    // Payout requests list
    // ------------------------------------------------------------------
    fetchPayoutRequests: builder.query({
      query: (params = {}) => `/transactions/payouts${buildQuery(params)}`,
      serializeQueryArgs: ({ queryArgs }) => queryArgs,
      merge: (currentCache, newItems, { arg }) => {
        if (arg?.page && arg.page > 1) {
          currentCache.data.payouts.push(...newItems.data.payouts);
          currentCache.data.pagination = newItems.data.pagination;
        } else {
          return newItems;
        }
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        JSON.stringify(currentArg) !== JSON.stringify(previousArg),
      providesTags: ["PayoutRequests"],
    }),

    // ------------------------------------------------------------------
    // Single payout request by reference
    // ------------------------------------------------------------------
    fetchPayoutByRef: builder.query({
      query: (reference) => `/transactions/payouts/${reference}`,
      providesTags: (result, error, reference) => [
        { type: "PayoutRequests", id: reference },
      ],
    }),
  }),
});

export const instanceSlice = createSlice({
  name: "instance",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

export const {} = instanceSlice.actions;
// SELECTORS
export const selectCategories = (state) => state.category.categories;

//
export const {
  useCreateCategoryMutation,
  useCreateSubjectMutation,
  useLazyFetchCategoriesQuery,
  useFetchCategoriesQuery,
  useFetchSubjTopicsQuery,
  useGetMyQuestionsQuery,
  useFetchSubjectsQuery,
  useCreateQuestionMutation,
  useSubmitPremiumQuizMutation,
  useFetchSubjectsTopicsMutation,
  useFetchSubjectCategoriesQuery,
  useFetchPremiumQuizMutation,
  useUpdateInstanceMutation,
  useTransferFundsMutation,
  useFetchAnalyticsQuery,
  useSubmitFreemiumQuizMutation,
  useLazyFetchInstanceQuery,
  useLazyFetchSubjTopicsQuery,
  useCreateTopicMutation,
  //
  useFetchWalletTransactionsQuery,
  useFetchWalletTransactionByRefQuery,
  useFetchPayoutRequestsQuery,
  useFetchPayoutByRefQuery,
} = extendedUserApiSlice;

export default instanceSlice.reducer;
