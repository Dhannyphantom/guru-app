// import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getFormData } from "../helpers/helperFunctions";

const initialState = {
  school: null,
  verified: false,
};

const DASHBOARD_CACHE_KEY = "school_dashboard";
const DASHBOARD_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// ─── Leaderboard cache constants ────────────────────────────────────────────
// Page 0 is persisted so the list renders instantly on next open,
// even when the device is offline. Subsequent pages are always fetched live.
const LEADERBOARD_CACHE_KEY = "leaderboard";
const LEADERBOARD_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

/**
 * Build a consistent AsyncStorage key for a leaderboard endpoint.
 * We only cache offset=0 (the first page) so the stale-while-revalidate
 * experience works without storing unbounded data.
 */
const leaderboardCacheKey = (namespace, id = "") =>
  `${LEADERBOARD_CACHE_KEY}_${namespace}${id ? `_${id}` : ""}`;

const SCHOOLS_LB_CACHE_KEY = leaderboardCacheKey("schools_global");

/**
 * Generic queryFn that:
 *  1. Returns the AsyncStorage cache immediately when offset === 0
 *     and the cached data is still fresh (or when offline).
 *  2. Fetches fresh data from the API.
 *  3. Persists the fresh page-0 response back to AsyncStorage.
 *
 * @param {Function} buildUrl   - (arg) => URL string
 * @param {string}   cacheKey   - AsyncStorage key
 */
const makeLeaderboardQueryFn =
  (buildUrl, cacheKey) => async (arg, _queryApi, _extraOptions, baseQuery) => {
    const isFirstPage = (arg?.offset ?? 0) === 0;

    // ── 1. Serve cache for the first page ─────────────────────────────
    if (isFirstPage) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          const isFresh = age < LEADERBOARD_CACHE_TTL;

          if (isFresh) {
            // Fresh cache — return it straight away; the component can still
            // trigger a background refetch via the normal RTK polling/refetch API.
            return { data: { ...data, _fromCache: true, _cacheAge: age } };
          }

          // Stale cache — try the network but fall back to the stale data
          // so the user sees something while offline.
          const result = await baseQuery(buildUrl(arg));
          if (result.error) {
            // Offline / network failure → return stale cache with a flag
            return {
              data: { ...data, _fromCache: true, _cacheAge: age, _stale: true },
            };
          }

          // Network succeeded → persist & return fresh data
          try {
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify({ data: result.data, timestamp: Date.now() }),
            );
          } catch (_) {}

          return { data: { ...result.data, _fromCache: false } };
        }
      } catch (_) {
        // AsyncStorage read failed — fall through to network fetch
      }
    }

    // ── 2. Non-first-page (or no cache yet) → always hit the network ──
    const result = await baseQuery(buildUrl(arg));
    if (result.error) return { error: result.error };

    // Persist only the first page
    if (isFirstPage) {
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: result.data, timestamp: Date.now() }),
        );
      } catch (_) {}
    }

    return { data: { ...result.data, _fromCache: false } };
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
      providesTags: ["SCHOOL"],
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
        url: "/school/assignment/history",
        timeout: 15000,
        params,
      }),
    }),
    fetchQuizHistory: builder.query({
      query: (params) => ({
        url: "/school/quiz_session_students",
        timeout: 15000,
        params,
      }),
    }),
    fetchUserQuizHistory: builder.query({
      query: (params) => ({
        url: `/school/quiz_history_user`,
        timeout: 15000,
        params,
      }),
    }),

    // ─────────────────────────────────────────────────────────────────
    // SCHOOL LEADERBOARD  (with AsyncStorage cache on page 0)
    // ─────────────────────────────────────────────────────────────────
    fetchSchoolLeaderboard: builder.query({
      queryFn: makeLeaderboardQueryFn(
        ({
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
        leaderboardCacheKey("school"),
      ),
      // A single stable cache entry for this endpoint so RTK merges pages
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (currentCache, newItems, { arg }) => {
        if ((arg?.offset ?? 0) === 0) {
          // First page (or refresh) → replace everything
          return newItems;
        }
        // Subsequent pages → append
        return {
          ...newItems,
          data: {
            ...newItems.data,
            leaderboard: [
              ...(currentCache?.data?.leaderboard ?? []),
              ...(newItems?.data?.leaderboard ?? []),
            ],
          },
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.offset !== previousArg?.offset,
      providesTags: ["SCHOOL_LEADERBOARD"],
    }),

    fetchSchoolsLeaderboard: builder.query({
      queryFn: makeLeaderboardQueryFn(
        ({ limit = 25, offset = 0, sortBy = "totalPoints" } = {}) => ({
          url: `/school/leaderboard_schools?limit=${limit}&offset=${offset}&sortBy=${sortBy}`,
          timeout: 15000,
        }),
        SCHOOLS_LB_CACHE_KEY,
      ),

      // One stable cache entry — RTK merges pages into it via `merge`
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        // Include sortBy so switching sort busts the cache cleanly
        `${endpointName}-${queryArgs?.sortBy ?? "totalPoints"}`,

      merge: (currentCache, newItems, { arg }) => {
        if ((arg?.offset ?? 0) === 0) {
          // First page (or refresh / sort change) → replace everything
          return newItems;
        }
        // Subsequent pages → append school entries
        return {
          ...newItems,
          data: {
            ...newItems.data,
            leaderboard: [
              ...(currentCache?.data?.leaderboard ?? []),
              ...(newItems?.data?.leaderboard ?? []),
            ],
          },
        };
      },

      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.offset !== previousArg?.offset ||
        currentArg?.sortBy !== previousArg?.sortBy,

      providesTags: ["SCHOOLS_LEADERBOARD"],
    }),

    // ─────────────────────────────────────────────────────────────────
    // SCHOOL LEADERBOARD BY ID  (with AsyncStorage cache on page 0)
    // ─────────────────────────────────────────────────────────────────
    fetchSchoolLeaderboardById: builder.query({
      queryFn: (arg, queryApi, extraOptions, baseQuery) => {
        const cacheKey = leaderboardCacheKey("school", arg?.schoolId);
        return makeLeaderboardQueryFn(
          ({
            schoolId,
            limit = 50,
            offset = 0,
            sortBy = "totalPoints",
            classLevel,
          } = {}) => ({
            url: `/leaderboard/school/${schoolId}?limit=${limit}&offset=${offset}&sortBy=${sortBy}${
              classLevel ? `&classLevel=${classLevel}` : ""
            }`,

            // url: `/leaderboard/school/${schoolId}?limit=${limit}&offset=${offset}&sortBy=${sortBy}${
            //   classLevel ? `&classLevel=${classLevel}` : ""
            // }`,
            timeout: 15000,
          }),
          cacheKey,
        )(arg, queryApi, extraOptions, baseQuery);
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.schoolId}`,
      merge: (currentCache, newItems, { arg }) => {
        if ((arg?.offset ?? 0) === 0) return newItems;
        return {
          ...newItems,
          data: {
            ...newItems.data,
            leaderboard: [
              ...(currentCache?.data?.leaderboard ?? []),
              ...(newItems?.data?.leaderboard ?? []),
            ],
          },
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.offset !== previousArg?.offset,
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
      invalidatesTags: ["FETCH_QUIZ", "SCHOOL"],
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
      invalidatesTags: ["FETCH_ASSIGNMENTS", "SCHOOL"],
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
    fetchSchoolClasses: builder.query({
      query: (schoolId) => ({
        url: `/school/${schoolId}/classes`,
        timeout: 15000,
      }),
      providesTags: ["SCHOOL_CLASSES"],
    }),
    createClass: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `/school/${schoolId}/classes`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    transferStudents: builder.mutation({
      query: ({ schoolId, classLevel, ...body }) => ({
        url: `/school/${schoolId}/classes/${classLevel}/transfer`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    shiftClasses: builder.mutation({
      query: ({ schoolId, action }) => ({
        url: `/school/${schoolId}/class-shift`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    updateClass: builder.mutation({
      query: ({ schoolId, classId, ...body }) => ({
        url: `/school/${schoolId}/classes/${classId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    deleteClass: builder.mutation({
      query: ({ schoolId, classId }) => ({
        url: `/school/${schoolId}/classes/${classId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    addStudentToClass: builder.mutation({
      query: ({ schoolId, classId, studentId }) => ({
        url: `/school/${schoolId}/classes/${classId}/students`,
        method: "POST",
        body: { studentId },
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    removeStudentFromClass: builder.mutation({
      query: ({ schoolId, classId, studentId }) => ({
        url: `/school/${schoolId}/classes/${classId}/students/${studentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    addTeacherToClass: builder.mutation({
      query: ({ schoolId, classId, teacherId }) => ({
        url: `/school/${schoolId}/classes/${classId}/teachers`,
        method: "POST",
        body: { teacherId },
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    removeTeacherFromClass: builder.mutation({
      query: ({ schoolId, classId, teacherId }) => ({
        url: `/school/${schoolId}/classes/${classId}/teachers/${teacherId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SCHOOL_CLASSES"],
    }),
    fetchSchoolDashboard: builder.query({
      queryFn: async (schoolId, _queryApi, _extraOptions, baseQuery) => {
        try {
          const cached = await AsyncStorage.getItem(
            `${DASHBOARD_CACHE_KEY}_${schoolId}`,
          );
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            if (age < DASHBOARD_CACHE_TTL) {
              return { data: { ...data, _fromCache: true, _cacheAge: age } };
            }
          }
        } catch (_) {}

        const result = await baseQuery(`/school/${schoolId}/dashboard`);
        if (result.error) return { error: result.error };

        try {
          await AsyncStorage.setItem(
            `${DASHBOARD_CACHE_KEY}_${schoolId}`,
            JSON.stringify({ data: result.data, timestamp: Date.now() }),
          );
        } catch (_) {}

        return { data: { ...result.data, _fromCache: false } };
      },
      keepUnusedDataFor: 300,
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

// SELECTORS
export const selectSchool = (state) => state.school.school;
export const selectSchoolVerified = (state) => state.school.verified;

export const {
  useCreateSchoolMutation,
  useLazyFetchSchoolQuery,
  useFetchSchoolQuery,
  useFetchSchoolClassesQuery,
  useCreateClassMutation,
  useCreateClassxMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useTransferStudentsMutation,
  useAddStudentToClassMutation,
  useRemoveStudentFromClassMutation,
  useFetchSchoolDashboardQuery,
  useAddTeacherToClassMutation,
  useRemoveTeacherFromClassMutation,
  useCreateAssignmentMutation,
  useLazyFetchClassesQuery,
  useFetchClassesQuery,
  useCreateAnnouncementMutation,
  useShiftClassesMutation,
  useCreateSchoolQuizMutation,
  useFetchAnnouncementsQuery,
  useChangeSchoolQuizMutation,
  useFetchQuizHistoryQuery,
  useFetchUserQuizHistoryQuery,
  useFetchAssignmentsQuery,
  useFetchSchoolLeaderboardQuery,
  useSubmitQuizMutation,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
  useUpdateAssignmentStatusMutation,
  useFetchSchoolsLeaderboardQuery,
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
