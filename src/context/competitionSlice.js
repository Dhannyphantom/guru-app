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
    fetchCompetitionsList: builder.query({
      query: () => "/competition/manage/list",
      providesTags: ["COMPETITION_MANAGE"],
    }),
    fetchCompetitionSubjectsTopics: builder.query({
      query: () => "/competition/manage/subjects-topics",
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
  }),
});

export const {
  useFetchActiveCompetitionQuery,
  useFetchCompetitionDetailsQuery,
  useFetchCompetitionLeaderboardQuery,
  useFetchCompetitionQuestionsMutation,
  useSubmitCompetitionQuizMutation,
  useFetchCompetitionsListQuery,
  useFetchCompetitionSubjectsTopicsQuery,
  useCreateCompetitionMutation,
  useUpdateCompetitionMutation,
  usePublishCompetitionMutation,
} = competitionApiSlice;
