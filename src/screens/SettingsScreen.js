import { StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
// import Separator from "../components/Separator";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultSettings } from "../helpers/dataStore";
import { ProfileLink } from "./ProfileScreen";
import { useRouter } from "expo-router";

const SettingsScreen = () => {
  const [settingsData, setSettingsData] = useState([]);

  const router = useRouter();

  const fetchSettings = async () => {
    const savedSettings = await AsyncStorage.getItem("settings");
    if (savedSettings) {
      setSettingsData(JSON.parse(savedSettings));
    } else {
      await AsyncStorage.setItem("settings", JSON.stringify(defaultSettings));
      setSettingsData(defaultSettings);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title={"Settings & More"} />
      <View style={styles.section}>
        <AppText size={"large"} weight="bold" style={styles.headerTitle}>
          Settings
        </AppText>
        {/* <Separator /> */}
        <ProfileLink
          title={`Turn ${
            settingsData?.notifications ? "off" : "on"
          } notifications`}
          icon={
            setSettingsData?.notifications
              ? "notifications-off"
              : "notifications"
          }
        />
      </View>
      <View style={styles.section}>
        <AppText size={"large"} weight="bold" style={styles.headerTitle}>
          Help
        </AppText>
        {/* <Separator /> */}
        <View>
          <ProfileLink
            title={"Contact us"}
            onPress={() => router.push("/main/support")}
            icon={"call"}
          />
          <ProfileLink
            title={"FAQs"}
            onPress={() => router.push("/main/faqs")}
            icon={"help-circle"}
          />
        </View>
      </View>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 15,
    backgroundColor: colors.white,
    borderRadius: 5,
  },
  headerTitle: {
    padding: 15,
  },
});
