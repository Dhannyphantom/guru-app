import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseUrl = "http://192.168.202.9:3800";
// export const baseUrl = "http://10.255.6.202:3800";
// export const baseUrl = "https://guru-server-0muf.onrender.com";

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
    "FETCH_FRIENDS",
    "FETCH_REWARDS",
    "FETCH_TRANSACTIONS",
    "SEARCH_STUDENTS",
    "PRO_LEADERBOARD",
    "GLOBAL_LEADERBOARD",
    "SCHOOL",
    "SCHOOL_LEADERBOARD",
    "SUPPORT_TICKETS",
    "SUPPORT_TICKET",
    "SUPPORT_STATS",
    "ADMIN_SUPPORT_TICKETS",
    "SCHOOL_CLASSES",
    "MY_QUESTIONS",
  ],
  endpoints: (builder) => ({}),
});
