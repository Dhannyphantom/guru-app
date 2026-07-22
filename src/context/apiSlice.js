import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseUrl } from "../helpers/apiConfig";

export { baseUrl };

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().users.token;

      if (token) {
        headers.set("x-auth-token", token);
      }

      return headers;
    },
    timeout: 15000,
  }),
  tagTypes: [
    "USER",
    "USER_STAT",
    "FETCH_QUIZ",
    "FETCH_INSTANCE",
    "FETCH_ASSIGNMENTS",
    "FETCH_PROS",
    "ANALYTICS",
    "FETCH_FRIENDS",
    "FETCH_REWARDS",
    "FETCH_TRANSACTIONS",
    "SEARCH_STUDENTS",
    "PRO_LEADERBOARD",
    "GLOBAL_LEADERBOARD",
    "SCHOOL",
    "SCHOOL_LEADERBOARD",
    "SCHOOLS_LEADERBOARD",
    "SUPPORT_TICKETS",
    "SUPPORT_TICKET",
    "PRO_LEADERBORAD",
    "SUPPORT_STATS",
    "ADMIN_SUPPORT_TICKETS",
    "SCHOOL_CLASSES",
    "MY_QUESTIONS",
    "WalletTransactions", // ← add these
    "PayoutRequests",
    "COMPETITION",
    "COMPETITION_LEADERBOARD",
    "COMPETITION_MANAGE",

    "COMPETITION_SUBJECTS",
  ],
  endpoints: (builder) => ({}),
});
