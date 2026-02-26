import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

import { useVerifySchoolInstanceMutation } from "../context/schoolSlice";
import Points from "./Points";
import AppButton from "./AppButton";
import AnimatedPressable from "./AnimatedPressable";
import PromptModal from "./PromptModal";
import PopMessage from "./PopMessage";

import AppText from "../components/AppText";
import LottieAnimator from "./LottieAnimator";
import {
  getImageObj,
  getPickerName,
  launchGallery,
  capFirstLetter,
  getName,
} from "../helpers/helperFunctions";
import {
  useUpdateUserAvatarMutation,
  useLazyFetchUserInfoQuery,
} from "../context/usersSlice";
import colors from "../helpers/colors";
import AppModal from "./AppModal";

import award1st from "../../assets/images/gold-medal.png";
import award2nd from "../../assets/images/silver-medal.png";
import award3rd from "../../assets/images/bronze-medal.png";

const { width, height } = Dimensions.get("screen");

const RenderUserDetail = ({
  setVisible,
  userID,
  closeCallback,
  data = null,
}) => {
  const [fetchUserInfo, { data: userInfo, isLoading: userLoading }] =
    useLazyFetchUserInfoQuery();
  const [profile, setProfile] = useState(data);
  const [prompt, setPrompt] = useState({ vis: false });
  const [popper, setPopper] = useState({ vis: false });
  const [bools, setBools] = useState({ loading: Boolean(userID) });

  const [verifySchoolInstance, { isLoading }] =
    useVerifySchoolInstanceMutation();

  const isVerification = profile?.type === "verify";
  const isStudent = profile?.user?.accountType === "student";

  const handleCloseModal = async () => {
    setVisible(false);
    closeCallback && (await closeCallback(true));
  };

  const handleVerification = (type) => {
    if (type === "accept") {
      setPrompt({
        vis: true,
        data: {
          title: `Accept ${capFirstLetter(profile?.instance)}`,
          msg: `Are you completely sure this ${profile?.instance} account is valid for your school profile?`,
          btn: "Yes, I'm sure",
          type,
        },
      });
    } else if (type == "reject") {
      setPrompt({
        vis: true,
        data: {
          title: `Reject ${profile?.instance}`,
          msg: `Not a ${profile?.instance} in your school?\n\nAre you sure you want to proceed?`,
          btn: "Yes, I'm sure",
          type,
        },
      });
    } else if (type === "unverify") {
      setPrompt({
        vis: true,
        data: {
          title: `Unverify ${profile?.instance}`,
          msg: `${profile?.instance} account no longer valid?, Are you sure you want to proceed?`,
          btn: "Yes, I'm sure",
          type,
        },
      });
    }
  };

  const handlePrompt = async (type) => {
    switch (type) {
      case "accept":
        try {
          const res = await verifySchoolInstance({
            instance: profile?.user?.accountType,
            instanceId: profile?.user?._id,
            schoolId: profile?.school?._id,
            type,
          }).unwrap();

          if (res?.status === "success") {
            setPopper({
              vis: true,
              msg: "Verification successful",
              type: "success",
              cb: () => handleCloseModal(),
            });
          }
        } catch (error) {}
        break;

      case "reject":
        try {
          const res = await verifySchoolInstance({
            instance: profile?.user?.accountType,
            instanceId: profile?.user?._id,
            schoolId: profile?.school?._id,
            type,
          }).unwrap();

          if (res?.status === "success") {
            setPopper({
              vis: true,
              msg: "Rejected successfully",
              type: "success",
              cb: () => handleCloseModal(),
            });
          }
        } catch (error) {}
        break;

      case "unverify":
        try {
          const res = await verifySchoolInstance({
            instance: profile?.user?.accountType,
            instanceId: profile?.user?._id,
            schoolId: profile?.school?._id,
            type,
          }).unwrap();

          if (res?.status === "success") {
            setPopper({
              vis: true,
              msg: "Unverified successfully",
              type: "success",
              cb: () => handleCloseModal(),
            });
          }
        } catch (error) {}
        break;
    }
  };

  const getUserInfoData = async () => {
    try {
      const res = await fetchUserInfo(userID).unwrap();
      setProfile(res ?? data);
    } catch (error) {}
  };

  useEffect(() => {
    getUserInfoData();
  }, [data]);

  return (
    <>
      <View style={styles.user}>
        <Avatar
          size={Platform.OS == "web" ? 200 : width * 0.6}
          name={getName(profile?.user)}
          imageStyle={{ backgroundColor: "#fff" }}
          textFontsize={30}
          source={profile?.user?.avatar?.image}
          border={{ width: 6, color: colors.white }}
          textStyle={{ maxWidth: width * 0.9 }}
          disabled
        />
        {profile?.user?.username && (
          <AppText
            style={{
              width: "90%",
              marginTop: 5,
              textAlign: "center",
              color: colors.primaryDeep,
            }}
            numberOfLines={2}
            ellipsizeMode="middle"
            fontWeight="bold"
            size={"large"}
          >
            @{profile?.user?.username}
          </AppText>
        )}
        <AppText
          style={styles.schoolName}
          numberOfLines={2}
          ellipsizeMode="middle"
          fontWeight="bold"
          size={"large"}
        >
          {profile?.school?.name}
        </AppText>
        <AppText
          style={styles.addressTxt}
          numberOfLines={2}
          ellipsizeMode="middle"
          fontWeight="medium"
          size={"small"}
        >
          {profile?.user?.lga}{" "}
          {profile?.user?.state ? `, ${profile?.user?.state} state` : ""}
        </AppText>
        {profile?.user?.accountType && (
          <AppText style={styles.accountType} fontWeight="bold">
            {profile?.user?.gender}{" "}
            {profile?.user?.class?.level && (
              <AppText
                fontWeight="black"
                style={{
                  color: colors.primaryDeep,
                  textTransform: "uppercase",
                }}
              >
                {profile?.user?.class?.level + " "}{" "}
              </AppText>
            )}
            {profile?.user?.accountType}
          </AppText>
        )}
        {isStudent && (
          <View style={styles.stats}>
            <Points
              value={profile?.user?.rank}
              type="award"
              style={{ marginRight: 30, backgroundColor: colors.unchange }}
            />
            <Points
              value={profile?.user?.totalPoints}
              style={{ backgroundColor: colors.unchange }}
            />
          </View>
        )}
        {isVerification ? (
          <View style={styles.btns}>
            {profile?.verified ? (
              <AppButton
                title={"Unverify"}
                onPress={() => handleVerification("unverify")}
                type="accent"
              />
            ) : (
              <>
                <AppButton
                  title={"Accept"}
                  onPress={() => handleVerification("accept")}
                  icon={{ left: true, name: "check" }}
                />
                <AppButton
                  title={"Reject"}
                  onPress={() => handleVerification("reject")}
                  icon={{ left: true, name: "cancel" }}
                  type="warn"
                />
              </>
            )}
          </View>
        ) : (
          <AppButton
            title={"Close"}
            onPress={handleCloseModal}
            type="white"
            contStyle={{ marginTop: 50 }}
          />
        )}
        {isVerification && (
          <AnimatedPressable onPress={handleCloseModal} style={styles.close}>
            <Ionicons name="close" size={30} color={colors.medium} />
          </AnimatedPressable>
        )}
        <LottieAnimator visible={isLoading} absolute wTransparent />
        <PromptModal
          prompt={prompt}
          setPrompt={setPrompt}
          onPress={handlePrompt}
        />
        <LottieAnimator
          visible={bools.loading && userLoading}
          absolute
          wTransparent
        />
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export const ProfileModal = ({
  visible,
  data,
  userID,
  closeCallback,
  setVisible,
}) => {
  return (
    <AppModal
      visible={visible}
      setVisible={setVisible}
      Component={() => (
        <RenderUserDetail
          data={data}
          userID={userID}
          closeCallback={closeCallback}
          setVisible={setVisible}
        />
      )}
    />
  );
};

const Avatar = ({
  size = 80,
  name,
  horizontal = false,
  award,
  style,
  contStyle = {},
  data,
  userID,
  source,
  imageStyle,
  imagePicker,
  imagePickerError,
  maxWidth,
  border,
  disabled,
  textFontweight = "bold",
  textFontsize = "large",
  textStyle,
}) => {
  const [updateAvatar, { isLoading, error, isError }] =
    useUpdateUserAvatarMutation();

  const [bools, setBools] = useState({ loaded: false });
  const [modal, setModal] = useState(false);

  let awardSrc;
  switch (award) {
    case 1:
      awardSrc = award1st;
      break;
    case 2:
      awardSrc = award2nd;
      break;
    case 3:
      awardSrc = award3rd;

      break;
  }

  const sourceObj = getImageObj(source);

  const handleImageLoad = () => {
    !bools.loaded && setBools({ ...bools, loaded: true });
  };

  const handleAvatarPress = async () => {
    if (imagePicker) {
      const res = await launchGallery();

      imagePicker(res.asset);
      if (res.asset) {
        try {
          await updateAvatar({
            uri: res?.asset.uri,
            height: res?.asset.height,
            width: res?.asset.width,
            mimeType: res?.asset.mimeType,
            fileName: res?.asset.fileName,
            assetId: getPickerName(res?.asset.uri),
          }).unwrap();
        } catch (err) {
          console.log(err);
          imagePickerError?.(true);
        }
      } else {
        imagePickerError && imagePickerError(true);
      }
    } else {
      if (userID) setModal(true);
    }
  };

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: horizontal ? "row" : "column",
        width: maxWidth,
        ...contStyle,
      }}
    >
      <Pressable
        style={{
          width: horizontal ? null : size,
          flexDirection: horizontal ? "row" : "column",
          alignItems: "center",
          ...style,
        }}
        onPress={handleAvatarPress}
        disabled={disabled}
      >
        <View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: border?.width ?? 0,
              borderColor: border?.color ?? "transparent",
              overflow: award ? null : "hidden",
              ...imageStyle,
            },
          ]}
        >
          {source ? (
            <>
              <Image
                source={sourceObj}
                onLoad={handleImageLoad}
                onLoadEnd={handleImageLoad}
                style={styles.image}
              />
              <LottieAnimator
                visible={!bools.loaded}
                name="avatar"
                loop={true}
                size={size * 1.5}
                absolute
                wTransparent
              />
            </>
          ) : (
            <Ionicons name="person" size={size * 0.5} color={colors.medium} />
          )}
          {award && (
            <View style={[styles.award, { bottom: -(size / 1.8) / 2 }]}>
              <Image
                source={awardSrc}
                style={{ width: size / 1.8, height: size / 1.8 }}
              />
            </View>
          )}
          {Boolean(imagePicker) && (
            <View style={styles.edit}>
              <Feather name="edit" size={18} color={colors.primary} />
            </View>
          )}
          <LottieAnimator visible={isLoading} absolute wTransparent />
        </View>
      </Pressable>
      {name && (
        <AppText
          size={textFontsize}
          fontWeight={textFontweight}
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            ...styles.name,
            marginLeft: horizontal ? 10 : 0,
            marginTop: horizontal ? 0 : 10,
            maxWidth: width * 0.3,
            ...textStyle,
          }}
        >
          {name}
        </AppText>
      )}
      <ProfileModal
        visible={modal}
        data={data}
        userID={userID}
        setVisible={setModal}
      />
    </View>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  award: {
    position: "absolute",
    zIndex: 100,
  },
  edit: {
    position: "absolute",
    // top: 0,
    // right: 0,
    backgroundColor: colors.unchange,
    borderRadius: 100,
    opacity: 0.6,
    padding: 10,
    zIndex: 5,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.extraLight,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 1000,
  },
  name: {
    // marginTop: 10,
    textAlign: "center",
    textTransform: "capitalize",
  },
  // FOR RENDERDETAILS COMPONENT
  addressTxt: {
    width: "90%",
    textAlign: "center",
    marginTop: 5,
    textTransform: "capitalize",
  },
  accountType: {
    color: colors.primaryDeeper,
    backgroundColor: colors.extraLight,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 80,
    marginTop: 10,
    textTransform: "capitalize",
  },
  btns: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 25,
  },
  // container: {
  //   flex: 1,
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  close: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 20,
  },
  user: {
    width: width * 0.95,
    backgroundColor: colors.lightly,
    borderRadius: 25,
    minHeight: height * 0.4,
    elevation: 8,
    alignItems: "center",
    paddingTop: 35,
    paddingBottom: 15,
    // justifyContent: "center",
  },
  schoolName: {
    width: "90%",
    marginTop: 10,
    textAlign: "center",
    textTransform: "capitalize",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});
