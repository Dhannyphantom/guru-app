import { useEffect } from "react";
import HomeScreen from "../../../../screens/HomeScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { updateUser } from "@/src/context/usersSlice";

export default function AppPage() {
  const dispatch = useDispatch();

  useEffect(() => {
    const prepare = async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      dispatch(updateUser(user));
    };
    prepare();
  }, [dispatch]);

  return <HomeScreen />;
}
