import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";

const initialState = {
  token: null,
  user: null,
  appInfo: null,
};

export const extendedUserApiSlice = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    createUser: builder.mutation({
      query: (user) => ({
        url: "/users/register",
        method: "POST",
        body: user,
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("token", res.token);
        return res;
      },
    }),
    updateUserAvatar: builder.mutation({
      query: (media) => {
        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            ...media,
            media: true,
            bucket: "avatars",
          })
        );
        formData.append("upload", {
          uri: media.uri,
          name: media.fileName,
          type: media.mimeType,
        });

        return {
          url: "/users/updateAvatar",
          method: "POST",
          body: formData,
        };
      },
    }),
    signInUser: builder.mutation({
      query: (user) => ({
        url: "/users/login",
        method: "POST",
        body: user,
      }),
      transformResponse: async (res) => {
        await AsyncStorage.setItem("token", res.token);
        return res;
      },
    }),
    subscribeUser: builder.mutation({
      query: (data) => ({
        url: "/payments/subscribe",
        method: "POST",
        body: data,
        timeout: 15000,
      }),
    }),
    withdrawFromWallet: builder.mutation({
      query: (data) => ({
        url: "/payments/withdraw",
        method: "POST",
        body: data,
      }),
    }),
    proVerify: builder.mutation({
      query: (data) => ({
        url: "/users/professional",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FETCH_PROS"],
    }),
    verifyAccount: builder.mutation({
      query: (data) => ({
        url: "/payments/verify_account",
        method: "POST",
        body: data,
      }),
    }),
    updateUserProfile: builder.mutation({
      query: (user) => ({
        url: "/users/updateProfile",
        method: "PUT",
        body: user,
      }),
    }),
    fetchPros: builder.query({
      query: () => ({
        url: "/users/professionals",
        timeout: 15000,
      }),
      providesTags: ["FETCH_PROS"],
    }),
    fetchProLeaderboard: builder.query({
      query: () => ({
        url: "/users/pro_leaderboard",
        timeout: 15000,
      }),
      providesTags: ["PRO_LEADERBORAD"],
    }),
    fetchUserInfo: builder.query({
      query: (userId) => ({
        url: `/users/userInfo?userId=${userId}`,
        timeout: 15000,
      }),
    }),

    fetchUser: builder.query({
      query: (token) => ({
        url: "/users/user",
        timeout: 15000,
        headers: {
          "x-auth-token": token,
        },
      }),
    }),
    fetchAppInfo: builder.query({
      query: () => ({
        url: "/users/app_info",
        timeout: 15000,
      }),
    }),
    fetchBanks: builder.query({
      query: () => ({
        url: "/payments/banks",
        timeout: 15000,
      }),
    }),
  }),
});

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    updateToken: (state, action) => {
      state.token = action.payload;
    },
    simulateLogIn: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      extendedUserApiSlice.endpoints.createUser.matchFulfilled,
      (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      }
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchAppInfo.matchFulfilled,
      (state, action) => {
        state.appInfo = action.payload?.data;
      }
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.signInUser.matchFulfilled,
      (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        // extendedUserApiSlice.endpoints.fetchUser.initiate();
      }
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.fetchUser.matchFulfilled,
      (state, action) => {
        state.user = action.payload.user;
      }
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.updateUserAvatar.matchFulfilled,
      (state, action) => {
        state.user = { ...state.user, avatar: action.payload.avatar };
      }
    );
    builder.addMatcher(
      extendedUserApiSlice.endpoints.updateUserProfile.matchFulfilled,
      (state, action) => {
        state.user = { ...state.user, ...action.payload.user };
      }
    );
  },
});

export const { updateToken, simulateLogIn } = usersSlice.actions;
// SELECTORS
export const selectToken = (state) => state.users.token;
export const selectUser = (state) => state.users.user;
export const selectAppInfo = (state) => state.users.appInfo;

//
export const {
  useCreateUserMutation,
  useSignInUserMutation,
  useUpdateUserAvatarMutation,
  useFetchAppInfoQuery,
  useLazyFetchAppInfoQuery,
  useUpdateUserProfileMutation,
  useFetchUserInfoQuery,
  useLazyFetchUserInfoQuery,
  useLazyFetchUserQuery,
  useFetchProsQuery,
  useProVerifyMutation,
  useSubscribeUserMutation,
  useFetchProLeaderboardQuery,
  useWithdrawFromWalletMutation,
  useVerifyAccountMutation,
  useLazyFetchBanksQuery,
} = extendedUserApiSlice;

export default usersSlice.reducer;
