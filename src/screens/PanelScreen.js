import { FlatList, StyleSheet, View, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useSelector } from "react-redux";
import {
  selectAppInfo,
  selectUser,
  useLazyFetchAppInfoQuery,
} from "../context/usersSlice";
import { useEffect, useState } from "react";
import { panelItems } from "../helpers/dataStore";
import { EditItem } from "./InstanceEditScreen";
import AppHeader from "../components/AppHeader";
import PopMessage from "../components/PopMessage";
import LottieAnimator from "../components/LottieAnimator";
import { useRouter } from "expo-router";

const PanelScreen = () => {
  const user = useSelector(selectUser);
  const isManager = user?.accountType === "manager";
  const [popper, setPopper] = useState({ vis: false });

  const [fetchAppInfo, { isLoading }] = useLazyFetchAppInfoQuery();

  const appInfo = useSelector(selectAppInfo);
  const router = useRouter();

  const handleItemPress = async (item) => {
    if (item?.screen) {
      router.push(item?.screen);
    } else {
      try {
        const { data } = await fetchAppInfo();
        const USER_TOKEN = data?.PRO_TOKEN ?? appInfo?.PRO_TOKEN;
        await Clipboard.setStringAsync(USER_TOKEN);
        await Share.share({
          message: `Your Guru pro token is\n\n${USER_TOKEN}`,
          title: "Get Pro Token",
        });
      } catch (errr) {
        console.log(errr);
      }
    }
  };

  useEffect(() => {
    if (!isManager) {
      router?.back();
    }
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Guru Panel" />
      <FlatList
        data={panelItems}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EditItem data={item} onPress={handleItemPress} />
        )}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default PanelScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
});
