import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice";
import usersReducer from "./usersSlice";
import instanceReducer from "./instanceSlice";
import schoolReducer from "./schoolSlice";

export default store = configureStore({
  reducer: {
    users: usersReducer,
    instance: instanceReducer,
    school: schoolReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});
