import { Dimensions, FlatList, StyleSheet, Share, View } from "react-native";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Screen from "../components/Screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Points from "../components/Points";
import { formatPoints } from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import AppButton from "../components/AppButton";
import { rewards } from "../helpers/dataStore";
import AnimatedPressable from "../components/AnimatedPressable";
import { StatusBar } from "expo-status-bar";
import { NavBack } from "../components/AppIcons";
import { baseUrl } from "../context/apiSlice";
import { useState } from "react";
import PopMessage from "../components/PopMessage";

const { width, height } = Dimensions.get("screen");

const RewardItem = ({ item, hideBtn }) => {
  return (
    <View style={styles.reward}>
      <View style={styles.rewardIcon}>
        <Ionicons
          name="gift"
          size={22}
          color={hideBtn ? colors.medium : colors.heartLight}
        />
      </View>
      <View style={[styles.rowContent, { width: hideBtn ? "80%" : "55%" }]}>
        <AppText fontWeight="medium" style={styles.rewardTitle} size={"large"}>
          {item.title}
        </AppText>
        <AppText
          style={{ color: colors.medium, marginTop: 5 }}
          fontWeight="bold"
          size={"small"}
        >
          {formatPoints(item.point)}
        </AppText>
      </View>
      {!hideBtn && (
        <View style={styles.rewardBtnView}>
          <AppButton title={"Claim"} style={styles.rewardBtn} />
        </View>
      )}
    </View>
  );
};

const InviteScreen = () => {
  const topper = useSafeAreaInsets().top;
  const user = useSelector(selectUser);
  const [popper, setPopper] = useState({ vis: false });

  const referalCode = `${user?.username}034`;

  const startSharing = async () => {
    // await Clipboard.setStringAsync(appInfo?.PRO_TOKEN);
    await Share.share({
      message: `🎉 Hey there!
      \nJoin me on Guru, the ultimate quiz app! 🧠💡\nLet’s compete, learn, and earn rewards together. It's fun, free, and full of challenges you'll love.
      
      👉 Download now and let’s ace these quizzes and national exams!
      
      🔗 ${baseUrl}/users/referral?id=${user?._id}
      
      Let the games begin! 🚀✨`,
      title: "Invite your Friends",
    });
    // await Sharing.shareAsync(referalCode, {
    //   dialogTitle: "Invite your friends",
    // });
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(referalCode);
    setPopper({
      vis: true,
      msg: "Referral code copied to clipboard successfully",
      type: "success",
      timer: 2500,
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topper + 20 }]}>
        <AppText style={styles.headerTitle} fontWeight="heavy" size={"xlarge"}>
          Invite Friends
        </AppText>

        <AppText style={styles.headerMsg} fontWeight="bold" size={"xxlarge"}>
          Earn and redeem rewards
        </AppText>
      </View>
      <View style={styles.main}>
        <View style={[styles.content, { paddingBottom: 0 }]}>
          <View style={[styles.row, { marginLeft: 10, marginTop: 5 }]}>
            <Points type="logo" size={50} />
            <View style={styles.rowContent}>
              <AppText fontWeight="black" size={"xxxlarge"}>
                {formatPoints(1203)}
              </AppText>
              <AppText style={styles.rowContMsg} fontWeight="medium">
                Total Guru Tokens earned
              </AppText>
            </View>
            <AnimatedPressable
              style={{
                flex: 1,
                alignItems: "center",
              }}
              onPress={startSharing}
            >
              <AntDesign name="sharealt" size={35} color={colors.primary} />
            </AnimatedPressable>
          </View>
          <View style={[styles.separator, { marginVertical: 10 }]} />
          <AppText
            style={[styles.rowContMsg, { marginLeft: 5 }]}
            fontWeight="medium"
          >
            Referral Code
          </AppText>
          <View style={styles.referal}>
            <View style={styles.codeView}>
              <AppText style={styles.codeTxt} fontWeight="light">
                {referalCode}
              </AppText>
              <AnimatedPressable onPress={onCopy} style={styles.row}>
                <AppText>Copy</AppText>
                <Ionicons
                  name="copy"
                  color={colors.medium}
                  style={{ marginLeft: 4 }}
                  size={15}
                />
              </AnimatedPressable>
            </View>
            {/* <AppButton
              title={"Share"}
              type="primary"
              contStyle={styles.shareBtn}
            /> */}
          </View>
        </View>
        <View style={styles.list}>
          <FlatList
            data={["REWARDS"]}
            keyExtractor={(item) => item}
            // contentContainerStyle={{ paddingTop: 60 }}
            renderItem={() => (
              <>
                <View style={[styles.content, { width: width * 0.98 }]}>
                  <AppText
                    style={styles.contHeaderTxt}
                    size={"xlarge"}
                    fontWeight="bold"
                  >
                    Rewards
                  </AppText>

                  <View>
                    <FlatList
                      data={rewards}
                      keyExtractor={(item) => item._id}
                      ItemSeparatorComponent={() => (
                        <View style={styles.separator} />
                      )}
                      renderItem={({ item, index }) => (
                        <RewardItem item={item} index={index} />
                      )}
                    />
                  </View>
                </View>
                <View style={[styles.content, { width: width * 0.98 }]}>
                  <AppText
                    style={styles.contHeaderTxt}
                    size={"xlarge"}
                    fontWeight="bold"
                  >
                    Rewards History
                  </AppText>

                  {/* <View style={{ flex: 1 }}> */}
                  <FlatList
                    data={rewards}
                    keyExtractor={(item) => item._id}
                    ItemSeparatorComponent={() => (
                      <View style={styles.separator} />
                    )}
                    renderItem={({ item, index }) => (
                      <RewardItem item={item} index={index} hideBtn />
                    )}
                  />
                  {/* </View> */}
                </View>
              </>
            )}
          />
        </View>
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="light" />
    </View>
  );
};

export default InviteScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  codeView: {
    flexDirection: "row",
    backgroundColor: colors.lightly,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  codeTxt: {
    marginLeft: 5,
    letterSpacing: 3,
    textTransform: "lowercase",
  },
  contHeaderTxt: {
    marginLeft: 10,
    marginTop: 5,
    marginBottom: 20,
  },
  content: {
    width: width * 0.88,
    backgroundColor: colors.white,
    // minHeight: height * 0.1,
    borderRadius: 10,
    marginBottom: 10,
    // // elevation: 2,
    alignSelf: "center",
    // bottom: 70,
    // zIndex: 5,
    // // bottom: (height * 0.22) / 2.5,
    padding: 10,
    // paddingBottom: 20,
  },
  header: {
    width,
    height: height * 0.22,
    backgroundColor: colors.primaryDeep,
    padding: 20,
    paddingLeft: 25,
  },
  headerTitle: {
    color: colors.white,
  },
  headerMsg: {
    color: colors.white,
  },
  list: {
    flex: 1,
    // bottom: 60,
    // bottom: (height * 0.22) / 2.5,
  },
  main: {
    flex: 1,
    bottom: (height * 0.22) / 2.5,
  },
  referal: {
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowContent: {
    marginLeft: 15,
    width: "55%",
  },
  rowContMsg: {
    color: colors.medium,
  },
  reward: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardTitle: {},
  rewardBtnView: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 5,
  },
  rewardBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  rewardIcon: {
    backgroundColor: colors.extraLight,
    padding: 10,
    borderRadius: 100,
  },
  separator: {
    width: width * 0.8,
    height: 2,
    backgroundColor: colors.extraLight,
    alignSelf: "center",
    marginVertical: 20,
  },
});
