// import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import { getFormData } from "../helpers/helperFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const initialState = {
  categories: [],
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
      query: ({ route, schoolId, topicId, subjectId }) => ({
        url: `/instance/${route}?topicId=${topicId}&subjectId=${subjectId}`,
        timeout: 15000,
      }),
      providesTags: ["FETCH_INSTANCE"],
    }),

    fetchAnalytics: builder.query({
      query: () => ({
        url: "/analytics",
        timeout: 35000,
      }),
      // providesTags: ["FETCH_INSTANCE"],
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
  useFetchAnalyticsQuery,
  useLazyFetchInstanceQuery,
  useLazyFetchSubjTopicsQuery,
  useCreateTopicMutation,
} = extendedUserApiSlice;

export default instanceSlice.reducer;
