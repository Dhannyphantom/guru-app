import { Stack } from "expo-router";
import { Provider, useSelector } from "react-redux";
import store from "@/src/context/store";
import { selectToken } from "../context/usersSlice";

const Main = () => {
  const token = useSelector(selectToken);
  const isLoggedIn = Boolean(token);
  return (
    <Stack>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Main />
    </Provider>
  );
}
