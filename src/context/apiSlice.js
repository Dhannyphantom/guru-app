import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseUrl = "http://192.168.197.9:3800";
// export const baseUrl = "http://10.255.11.44:3800";
// export const baseUrl = "https://guru-server-0muf.onrender.com";
// export const baseUrl = "http://10.255.174.69:3800";

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
  tagTypes: ["FETCH_QUIZ", "FETCH_INSTANCE", "FETCH_PROS", "PRO_LEADERBORAD"],
  endpoints: (builder) => ({}),
});
