// import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
// import { getFormData } from "../helpers/helperFunctions";

const initialState = {
  school: null,
  verified: false,
};

export const extendedUserApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchClasses: builder.query({
      query: (id) => `/school/classes?schoolId=${id}`,
    }),
    searchSchools: builder.query({
      query: (str) => `/school/search?q=${str}`,
    }),
    fetchSchool: builder.query({
      query: () => ({
        url: "/school/fetch",
        timeout: 15000,
      }),
    }),
    fetchSchoolInstance: builder.query({
      query: (data) => ({
        url: `/school/instances?type=${data?.type}&schoolId=${data?.schoolId}`,
        timeout: 15000,
      }),
    }),
    fetchSchoolQuiz: builder.query({
      query: ({ schoolId, type, quizId }) => ({
        url: `/school/quiz?schoolId=${schoolId}&type=${type}&quizId=${quizId}`,
        timeout: 15000,
      }),
      providesTags: ["FETCH_QUIZ"],
    }),
    fetchAssignments: builder.query({
      query: (schoolId) => ({
        url: `/school/assignments?schoolId=${schoolId}`,
        timeout: 15000,
      }),
      providesTags: ["FETCH_ASSIGNMENTS"],
    }),
    deleteAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment",
          method: "DELETE",
          params: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
    }),
    updateAssignmentStatus: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment",
          method: "PATCH",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
    }),
    updateAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment",
          method: "PUT",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
    }),
    fetchAnnouncements: builder.query({
      query: (schoolId) => ({
        url: `/school/announcements?schoolId=${schoolId}`,
        timeout: 15000,
      }),
    }),
    updateSchoolQuiz: builder.mutation({
      query: (data) => {
        return {
          url: "/school/quiz",
          method: "PUT",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_QUIZ"],
    }),
    createSchoolQuiz: builder.mutation({
      query: (data) => {
        return {
          url: "/school/quiz",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_QUIZ"],
    }),
    getQuizQuestions: builder.mutation({
      query: (data) => {
        return {
          url: "/school/get_quiz",
          method: "POST",
          body: data,
        };
      },
    }),
    submitQuiz: builder.mutation({
      query: (data) => {
        return {
          url: "/school/submit_quiz",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_QUIZ"],
    }),
    changeSchoolQuiz: builder.mutation({
      query: (data) => {
        return {
          url: "/school/quiz_status",
          method: "PUT",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_QUIZ"],
    }),
    createAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
    }),
    createAnnouncement: builder.mutation({
      query: (data) => {
        return {
          url: "/school/announcement",
          method: "POST",
          body: data,
        };
      },
    }),
    createSchool: builder.mutation({
      query: (data) => {
        return {
          url: "/school/create",
          method: "POST",
          body: data,
        };
      },
    }),
    verifySchoolInstance: builder.mutation({
      query: (data) => {
        return {
          url: "/school/verify",
          method: "POST",
          body: data,
        };
      },
    }),
    joinSchool: builder.mutation({
      query: (schoolId) => {
        return {
          url: "/school/join",
          method: "POST",
          body: { schoolId },
        };
      },
    }),
    createClass: builder.mutation({
      query: (data) => {
        return {
          url: "/school/class",
          method: "POST",
          body: data,
        };
      },
    }),
  }),
});

export const schoolSlice = createSlice({
  name: "school",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchSchool.matchFulfilled,
      (state, action) => {
        state.school = action.payload.data;
        state.verified = action.payload.isVerified;
      }
    );
  },
});

export const {} = schoolSlice.actions;
// SELECTORS
export const selectSchool = (state) => state.school.school;
export const selectSchoolVerified = (state) => state.school.verified;

//
export const {
  useCreateSchoolMutation,
  useLazyFetchSchoolQuery,
  useFetchSchoolQuery,
  useCreateClassMutation,
  useCreateAssignmentMutation,
  useLazyFetchClassesQuery,
  useCreateAnnouncementMutation,
  useCreateSchoolQuizMutation,
  useFetchAnnouncementsQuery,
  useChangeSchoolQuizMutation,
  useFetchAssignmentsQuery,
  useSubmitQuizMutation,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
  useUpdateAssignmentStatusMutation,
  useUpdateSchoolQuizMutation,
  useGetQuizQuestionsMutation,
  useVerifySchoolInstanceMutation,
  useLazyFetchSchoolQuizQuery,
  useFetchSchoolQuizQuery,
  useLazySearchSchoolsQuery,
  useLazyFetchSchoolInstanceQuery,
  useJoinSchoolMutation,
} = extendedUserApiSlice;

export default schoolSlice.reducer;
