import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Avatar from "./Avatar";
import AppButton from "./AppButton";

const { width, height } = Dimensions.get("screen");

export const ProfileCard = ({ data }) => {
  let bgColor, txtColor, borderColor;
  // let stats = "accepted";
  switch (data?.status) {
    case "pending":
      bgColor = colors.white;
      borderColor = colors.extraLight;
      txtColor = colors.medium;

      break;
    case "rejected":
      bgColor = colors.heart;
      borderColor = colors.heartDark;
      txtColor = colors.heartLighter;
      break;
    case "accepted":
      bgColor = colors.accent;
      borderColor = colors.accentDeeper;
      txtColor = colors.accentLightest;
      break;
  }
  return (
    <View style={styles.profile}>
      <Avatar name={data?.name} textFontsize="small" size={width * 0.15} />
      <View
        style={[
          styles.profileStatus,
          { borderColor, backgroundColor: bgColor },
        ]}
      >
        <AppText size={"small"} style={{ color: txtColor }}>
          {data?.status}
        </AppText>
      </View>
    </View>
  );
};

const FriendCard = ({
  data,
  type = "follow",
  userID,
  hideBtn = false,
  onPress,
}) => {
  const isFollow = type == "follow";
  const isInvite = type == "invite";
  const isStudent = type === "student";
  const isMine = Boolean(userID) && userID == data?.user?._id;
  let btnTxt, btnType;

  switch (data.status) {
    case "pending":
      btnTxt = isFollow ? "Following" : isInvite ? "Invite" : "Pending";
      btnType = isStudent ? "primary" : "white";

      break;
    case "rejected":
      btnTxt = "Rejected";
      btnType = "warn";
      break;
    case "accepted":
      btnTxt = isFollow ? "Mutual" : "Accepted";
      btnType = isStudent ? "white" : "accent";
      break;

    case "invite":
      btnTxt = "Follow";
      btnType = "primary";
      break;

    default:
      btnTxt = type == "follow" ? "Follow" : "Invite";
      btnType = "primary";
      break;
  }

  switch (data.verified) {
    case false:
      btnTxt = isStudent
        ? "Verify"
        : isFollow
        ? "Following"
        : isInvite
        ? "Invite"
        : "Pending";
      btnType = isStudent ? "primary" : "white";

      break;

    case true:
      btnTxt = isStudent ? "Verified" : isFollow ? "Mutual" : "Accepted";
      btnType = isStudent ? "white" : "accent";
      break;
  }

  return (
    <View style={styles.container}>
      <Avatar source={data?.user?.avatar?.image} size={width * 0.13} />
      <View style={styles.textView}>
        <AppText fontWeight="bold" style={styles.nameTxt}>
          {data?.user?.preffix ? data?.user?.preffix + " " : ""}
          {data?.user
            ? `${data?.user?.firstName} ${data?.user?.lastName}`
            : data?.name}
        </AppText>
        <AppText
          fontWeight="medium"
          size={"small"}
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.school}
        >
          {data?.school ?? data?.user?.username}
        </AppText>
      </View>

      {!hideBtn && !isMine && (
        <View style={styles.btnStyle}>
          <AppButton
            title={btnTxt}
            type={btnType}
            style={styles.btn}
            onPress={() => onPress && onPress(data, btnTxt)}
            // contStyle={styles.btnStyle}
          />
          {isStudent && data?.status == "pending" && (
            <AppButton
              title={"X"}
              type={"warn"}
              style={styles.btn}
              contStyle={{ marginLeft: 5 }}
              onPress={() => onPress && onPress(data, btnTxt)}
              // contStyle={styles.btnStyle}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default FriendCard;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  btnStyle: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  rank: {
    marginRight: 8,
    color: colors.primaryDeeper,
    textTransform: "capitalize",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameTxt: {
    // textAlign: "center",
    // marginBottom: 8,
    // marginTop: 4,
    textTransform: "capitalize",
  },
  profile: {
    marginRight: 15,
    alignItems: "center",
  },
  profileStatus: {
    borderWidth: 2,
    borderColor: "red",
    paddingBottom: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: "pink",
    marginTop: 6,
  },
  school: {
    // marginBottom: 6,
    textTransform: "capitalize",
    // width: "85%",
    color: colors.medium,
    marginTop: 2,
  },
  textView: {
    marginLeft: 15,
    flex: 1,
    maxWidth: "60%",
  },
});
