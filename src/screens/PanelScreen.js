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

const PanelScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const isManager = user?.accountType === "manager";
  const [popper, setPopper] = useState({ vis: false });

  const [fetchAppInfo, { isLoading }] = useLazyFetchAppInfoQuery();

  const appInfo = useSelector(selectAppInfo);

  const handleItemPress = async (item) => {
    if (item?.screen) {
      navigation.navigate(item?.screen);
    } else {
      const { data } = await fetchAppInfo();
      await Clipboard.setStringAsync(appInfo?.PRO_TOKEN);
      await Share.share({
        message: `Your Guru pro token is\n\n${
          data?.PRO_TOKEN ?? appInfo.PRO_TOKEN
        }`,
        title: "Get Pro Token",
      });
      // setPopper({
      //   vis: true,
      //   msg: "Pro Token copied to clipboard successfully",
      //   type: "success",
      // });
    }
  };

  useEffect(() => {
    if (!isManager) {
      navigation?.goBack();
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
