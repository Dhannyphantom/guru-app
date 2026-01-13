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
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
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
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
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
        url: "/payouts/withdraw",
        // url: "/payments/withdraw",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
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

    verifySubscription: builder.mutation({
      query: (data) => ({
        url: "/payouts/verify-subscription",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    renewSubscription: builder.mutation({
      query: (data) => ({
        url: "/users/renew-subscription",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    rechargeAirtime: builder.mutation({
      query: (data) => ({
        url: "/payouts/recharge",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    buyData: builder.mutation({
      query: (data) => ({
        url: "/payouts/data",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["USER", "FETCH_TRANSACTIONS"],
    }),
    studentAction: builder.mutation({
      query: (data) => ({
        url: "/users/students",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SEARCH_STUDENTS", "FETCH_FRIENDS"],
    }),
    updateUserProfile: builder.mutation({
      query: (user) => ({
        url: "/users/updateProfile",
        method: "PUT",
        body: user,
      }),
    }),
    updateReward: builder.mutation({
      query: (data) => ({
        url: "/users/rewards",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FETCH_REWARDS", "USER"],
    }),
    fetchRewards: builder.query({
      query: () => ({
        url: "/users/rewards",
        timeout: 15000,
      }),
      providesTags: ["FETCH_REWARDS"],
    }),
    fetchTransactions: builder.query({
      query: (params) => ({
        url: "/users/transactions",
        timeout: 15000,
        params,
      }),
      providesTags: ["FETCH_TRANSACTIONS"],
    }),
    fetchDataBundles: builder.query({
      query: () => ({
        url: "/payouts/data-bundles",
        timeout: 15000,
      }),
    }),
    fetchPros: builder.query({
      query: () => ({
        url: "/users/professionals",
        timeout: 15000,
      }),
      providesTags: ["FETCH_PROS"],
    }),
    fetchFriends: builder.query({
      query: () => ({
        url: "/users/friends",
        timeout: 15000,
      }),
      providesTags: ["FETCH_FRIENDS"],
    }),
    searchStudents: builder.query({
      query: (q) => ({
        url: `/users/search_students?q=${q}`,
        timeout: 15000,
      }),
      providesTags: ["SEARCH_STUDENTS"],
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
      providesTags: ["USER"],
      transformResponse: async (res) => {
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        return res;
      },
    }),
    fetchAppInfo: builder.query({
      query: () => ({
        url: "/users/app_info",
        timeout: 15000,
      }),
    }),
    fetchBanks: builder.query({
      query: () => ({
        url: "/payouts/banks",
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
    updateUser: (state, action) => {
      state.user = action.payload;
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

export const { updateToken, updateUser, simulateLogIn } = usersSlice.actions;
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
  useRenewSubscriptionMutation,
  useStudentActionMutation,
  useLazySearchStudentsQuery,
  useFetchUserInfoQuery,
  useLazyFetchUserInfoQuery,
  useFetchUserQuery,
  useFetchRewardsQuery,
  useFetchDataBundlesQuery,
  useBuyDataMutation,
  useLazyFetchUserQuery,
  useRechargeAirtimeMutation,
  useFetchProsQuery,
  useFetchFriendsQuery,
  useProVerifyMutation,
  useUpdateRewardMutation,
  useSubscribeUserMutation,
  useFetchProLeaderboardQuery,
  useFetchTransactionsQuery,
  useWithdrawFromWalletMutation,
  useVerifyAccountMutation,
  useVerifySubscriptionMutation,
  useLazyFetchBanksQuery,
} = extendedUserApiSlice;

export default usersSlice.reducer;
