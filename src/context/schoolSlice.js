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
    fetchAssignmentHistory: builder.query({
      query: (params) => ({
        url: `/school/assignment/history`,
        timeout: 15000,
        params,
      }),
    }),
    fetchSchoolLeaderboard: builder.query({
      query: ({
        limit = 50,
        offset = 0,
        sortBy = "totalPoints",
        classLevel,
      } = {}) => ({
        url: `/school/leaderboard?limit=${limit}&offset=${offset}&sortBy=${sortBy}${
          classLevel ? `&classLevel=${classLevel}` : ""
        }`,
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
      providesTags: ["SCHOOL_LEADERBOARD"],
    }),

    fetchSchoolLeaderboardById: builder.query({
      query: ({
        schoolId,
        limit = 50,
        offset = 0,
        sortBy = "totalPoints",
        classLevel,
      } = {}) => ({
        url: `/leaderboard/school/${schoolId}?limit=${limit}&offset=${offset}&sortBy=${sortBy}${
          classLevel ? `&classLevel=${classLevel}` : ""
        }`,
        timeout: 15000,
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}-${queryArgs.schoolId}`;
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
      providesTags: ["SCHOOL_LEADERBOARD"],
    }),
    fetchAssignmentById: builder.query({
      query: (params) => ({
        url: "/school/assignment",
        timeout: 15000,
        params,
      }),
      providesTags: ["FETCH_ASSIGNMENTS"],
    }),
    gradeAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment/grade",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
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
    publishAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment/publish",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["FETCH_ASSIGNMENTS"],
    }),
    submitAssignment: builder.mutation({
      query: (data) => {
        return {
          url: "/school/assignment/submit",
          method: "POST",
          body: data,
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
    createClassx: builder.mutation({
      query: (data) => {
        return {
          url: "/school/class",
          method: "POST",
          body: data,
        };
      },
    }),
    // ==========================================
    // CLASSES (CRUD)
    // ==========================================
    // FETCH SCHOOL CLASSES
    fetchSchoolClasses: builder.query({
      query: (schoolId) => ({
        url: `/school/${schoolId}/classes`,
        timeout: 15000,
      }),
      providesTags: ["SCHOOL_CLASSES"],
    }),

    // CREATE CLASS (single or "all")
    createClass: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `/school/${schoolId}/classes`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),

    // UPDATE CLASS
    updateClass: builder.mutation({
      query: ({ schoolId, classId, ...body }) => ({
        url: `/school/${schoolId}/classes/${classId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),

    // DELETE CLASS
    deleteClass: builder.mutation({
      query: ({ schoolId, classId }) => ({
        url: `/school/${schoolId}/classes/${classId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    // ADD STUDENT TO CLASS
    addStudentToClass: builder.mutation({
      query: ({ schoolId, classId, studentId }) => ({
        url: `/school/${schoolId}/classes/${classId}/students`,
        method: "POST",
        body: { studentId },
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),

    // REMOVE STUDENT FROM CLASS
    removeStudentFromClass: builder.mutation({
      query: ({ schoolId, classId, studentId }) => ({
        url: `/school/${schoolId}/classes/${classId}/students/${studentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    // ADD TEACHER TO CLASS
    addTeacherToClass: builder.mutation({
      query: ({ schoolId, classId, teacherId }) => ({
        url: `/school/${schoolId}/classes/${classId}/teachers`,
        method: "POST",
        body: { teacherId },
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),

    // REMOVE TEACHER FROM CLASS
    removeTeacherFromClass: builder.mutation({
      query: ({ schoolId, classId, teacherId }) => ({
        url: `/school/${schoolId}/classes/${classId}/teachers/${teacherId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
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
      },
    );
  },
});

// export const {} = schoolSlice.actions;
// SELECTORS
export const selectSchool = (state) => state.school.school;
export const selectSchoolVerified = (state) => state.school.verified;

//
export const {
  useCreateSchoolMutation,
  useLazyFetchSchoolQuery,
  useFetchSchoolQuery,
  useFetchSchoolClassesQuery,
  useCreateClassMutation,
  useCreateClassxMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useAddStudentToClassMutation,
  useRemoveStudentFromClassMutation,
  useAddTeacherToClassMutation,
  useRemoveTeacherFromClassMutation,
  useCreateAssignmentMutation,
  useLazyFetchClassesQuery,
  useCreateAnnouncementMutation,
  useCreateSchoolQuizMutation,
  useFetchAnnouncementsQuery,
  useChangeSchoolQuizMutation,
  useFetchAssignmentsQuery,
  useFetchSchoolLeaderboardQuery,
  useSubmitQuizMutation,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
  useUpdateAssignmentStatusMutation,
  usePublishAssignmentMutation,
  useFetchAssignmentHistoryQuery,
  useUpdateSchoolQuizMutation,
  useFetchAssignmentByIdQuery,
  useGetQuizQuestionsMutation,
  useVerifySchoolInstanceMutation,
  useGradeAssignmentMutation,
  useLazyFetchSchoolQuizQuery,
  useFetchSchoolQuizQuery,
  useLazySearchSchoolsQuery,
  useLazyFetchSchoolInstanceQuery,
  useSubmitAssignmentMutation,
  useJoinSchoolMutation,
} = extendedUserApiSlice;

export default schoolSlice.reducer;
