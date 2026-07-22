import { apiSlice } from "./apiSlice";

export const competitionApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchActiveCompetition: builder.query({
      query: () => "/competition/active",
      providesTags: ["COMPETITION"],
    }),
    fetchCompetitionDetails: builder.query({
      query: (id) => `/competition/${id}`,
      providesTags: (result, error, id) => [{ type: "COMPETITION", id }],
    }),
    fetchCompetitionLeaderboard: builder.query({
      query: (id) => `/competition/${id}/leaderboard`,
      providesTags: (result, error, id) => [
        { type: "COMPETITION_LEADERBOARD", id },
      ],
    }),
    fetchCompetitionQuestions: builder.mutation({
      query: (competitionId) => ({
        url: `/competition/${competitionId}/questions`,
        method: "POST",
      }),
    }),
    submitCompetitionQuiz: builder.mutation({
      query: ({ competitionId, ...body }) => ({
        url: `/competition/${competitionId}/submit`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["COMPETITION", "COMPETITION_LEADERBOARD", "USER_STAT"],
    }),
    publishResults: builder.mutation({
      query: (competitionId) => ({
        // NOTE: this previously had a leading space before the path
        // ("` /competition/manage/...`"), which silently broke the request
        // in some RN/fetch setups since the URL no longer matched
        // apiSlice's baseUrl join logic. Fixed below.
        url: `/competition/manage/${competitionId}/publish-results`,
        method: "POST",
      }),
      invalidatesTags: ["COMPETITION", "COMPETITION_LEADERBOARD", "USER_STAT"],
    }),
    fetchCompetitionsList: builder.query({
      query: () => "/competition/manage/list",
      providesTags: ["COMPETITION_MANAGE"],
    }),
    fetchCompetitionSubjectsTopics: builder.query({
      query: () => "/competition/manage/subjects-topics",
      providesTags: ["COMPETITION_SUBJECTS"],
    }),
    createCompetition: builder.mutation({
      query: (body) => ({
        url: "/competition/manage",
        method: "POST",
        body,
      }),
      invalidatesTags: ["COMPETITION_MANAGE", "COMPETITION"],
    }),
    updateCompetition: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/competition/manage/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["COMPETITION_MANAGE", "COMPETITION"],
    }),
    publishCompetition: builder.mutation({
      query: (id) => ({
        url: `/competition/manage/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: ["COMPETITION_MANAGE", "COMPETITION"],
    }),
    deleteCompetition: builder.mutation({
      query: (id) => ({
        url: `/competition/manage/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["COMPETITION_MANAGE", "COMPETITION"],
    }),
  }),
});

export const {
  useFetchActiveCompetitionQuery,
  useFetchCompetitionDetailsQuery,
  useFetchCompetitionLeaderboardQuery,
  useFetchCompetitionQuestionsMutation,
  useSubmitCompetitionQuizMutation,
  usePublishResultsMutation,
  useFetchCompetitionsListQuery,
  useFetchCompetitionSubjectsTopicsQuery,
  useCreateCompetitionMutation,
  useUpdateCompetitionMutation,
  usePublishCompetitionMutation,
  useDeleteCompetitionMutation,
} = competitionApiSlice;
