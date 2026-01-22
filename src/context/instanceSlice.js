// import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import { getFormData } from "../helpers/helperFunctions";

const initialState = {
  categories: [],
};

export const extendedUserApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchCategories: builder.query({
      query: () => "/instance/category",
    }),
    fetchSubjectCategories: builder.query({
      query: (categoryId) =>
        `/instance/subject_category?categoryId=${categoryId}`,
    }),
    fetchSubjTopics: builder.query({
      query: (id) => `/instance/topic?subjectId=${id}`,
    }),

    fetchSubjects: builder.query({
      query: (type) => ({
        url: "/instance/subjects",
        params: { type },
      }),
    }),
    getMyQuestions: builder.query({
      query: ({ subjectId, topicId, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams();

        if (subjectId) params.append("subjectId", subjectId);
        if (topicId) params.append("topicId", topicId);
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        return {
          url: `/instance/my_questions?${params.toString()}`,
          timeout: 15000,
        };
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        // Create cache key based on filters only (not page)
        const { subjectId, topicId } = queryArgs;
        return `${endpointName}-${subjectId || "all"}-${topicId || "all"}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        // If page is 1, replace cache entirely (new filter or refresh)
        if (arg?.page === 1) {
          return newItems;
        }

        // Otherwise, append new questions to existing ones
        return {
          ...newItems,
          data: [...(currentCache?.data || []), ...(newItems?.data || [])],
          pagination: newItems.pagination,
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        // Refetch when page changes
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: (result, error, arg) => [
        "MY_QUESTIONS",
        {
          type: "MY_QUESTIONS",
          id: `${arg.subjectId || "all"}-${arg.topicId || "all"}`,
        },
      ],
      keepUnusedDataFor: 300, // 5 minutes
    }),

    fetchInstance: builder.query({
      query: ({ route, schoolId, topicId, subjectId }) => ({
        url: `/instance/${route}?topicId=${topicId}&subjectId=${subjectId}`,
        timeout: 15000,
      }),
      providesTags: ["FETCH_INSTANCE"],
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
      // invalidatesTags: ["FETCH_QUIZ"],
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
  useLazyFetchInstanceQuery,
  useLazyFetchSubjTopicsQuery,
  useCreateTopicMutation,
} = extendedUserApiSlice;

export default instanceSlice.reducer;
