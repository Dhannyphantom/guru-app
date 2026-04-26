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
import { useStudentActionMutation } from "../context/usersSlice";
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

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — one metric cell inside the stats grid
// ─────────────────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, accent }) => (
  <View style={statStyles.pill}>
    <AppText
      fontWeight="black"
      size="large"
      style={{ color: accent ?? colors.primaryDeep }}
    >
      {value ?? "—"}
    </AppText>
    <AppText size="xsmall" fontWeight="medium" style={{ color: colors.medium }}>
      {label}
    </AppText>
  </View>
);

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// RenderUserDetail
// ─────────────────────────────────────────────────────────────────────────────
const RenderUserDetail = ({
  setVisible,
  userID,
  closeCallback,
  data = null,
}) => {
  const [fetchUserInfo, { isLoading: userLoading }] =
    useLazyFetchUserInfoQuery();

  // profile shape:
  //   profile.user         — viewed user's data (no following/followers arrays)
  //   profile.relationship — { isViewerFollowing, isFollowingViewer, isSelf }
  //   profile.type / profile.instance / profile.school / profile.verified
  //     — verification-specific fields passed in via `data` prop
  const [profile, setProfile] = useState(data);
  const [prompt, setPrompt] = useState({ vis: false });
  const [popper, setPopper] = useState({ vis: false });
  const [bools, setBools] = useState({ loading: Boolean(userID) });

  const [verifySchoolInstance, { isLoading: verifyLoading }] =
    useVerifySchoolInstanceMutation();
  const [studentActions, { isLoading: followLoading }] =
    useStudentActionMutation();

  const user = profile?.user;
  const isVerification = profile?.type === "verify";
  const isStudent = user?.accountType === "student";

  // ── Relationship — sourced from server flags, no client-side array scanning
  const {
    isViewerFollowing = false,
    isFollowingViewer = false,
    isSelf = false,
  } = profile?.relationship ?? {};

  // Follow button label derived from the two directional flags
  let followLabel = "Follow";
  if (isViewerFollowing && isFollowingViewer) followLabel = "Friends";
  else if (isViewerFollowing) followLabel = "Following";
  else if (isFollowingViewer) followLabel = "Follow Back";

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCloseModal = async () => {
    setVisible(false);
    closeCallback && (await closeCallback(true));
  };

  const executeFollow = async (type) => {
    try {
      await studentActions({ type, user: user?._id }).unwrap();
      // Optimistic update — flip isViewerFollowing without a refetch
      setProfile((prev) => ({
        ...prev,
        relationship: {
          ...prev?.relationship,
          isViewerFollowing: type === "follow",
        },
      }));
    } catch (_) {}
  };

  const handleFollowPress = () => {
    if (isViewerFollowing) {
      setPrompt({
        vis: true,
        data: {
          title: "Unfollow",
          msg: `Unfollow @${user?.username}?`,
          btn: "Unfollow",
          type: "unfollow",
        },
      });
    } else {
      executeFollow("follow");
    }
  };

  const handleVerification = (type) => {
    const titles = {
      accept: `Accept ${capFirstLetter(profile?.instance)}`,
      reject: `Reject ${profile?.instance}`,
      unverify: `Unverify ${profile?.instance}`,
    };
    const msgs = {
      accept: `Are you completely sure this ${profile?.instance} account is valid for your school profile?`,
      reject: `Not a ${profile?.instance} in your school?\n\nAre you sure you want to proceed?`,
      unverify: `${profile?.instance} account no longer valid? Are you sure you want to proceed?`,
    };
    setPrompt({
      vis: true,
      data: {
        title: titles[type],
        msg: msgs[type],
        btn: "Yes, I'm sure",
        type,
      },
    });
  };

  const handlePrompt = async (type) => {
    switch (type) {
      case "unfollow":
        await executeFollow("unfollow");
        break;

      case "accept":
        try {
          const res = await verifySchoolInstance({
            instance: user?.accountType,
            instanceId: user?._id,
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
        } catch (_) {}
        break;

      case "reject":
        try {
          const res = await verifySchoolInstance({
            instance: user?.accountType,
            instanceId: user?._id,
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
        } catch (_) {}
        break;

      case "unverify":
        try {
          const res = await verifySchoolInstance({
            instance: user?.accountType,
            instanceId: user?._id,
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
        } catch (_) {}
        break;

      default:
        break;
    }
  };

  const getUserInfoData = async () => {
    try {
      const res = await fetchUserInfo(userID).unwrap();
      // res = { user, status, relationship }
      // Spread into existing profile so verification fields (type, instance,
      // school, verified) passed in via the `data` prop are preserved.
      setProfile((prev) => ({ ...prev, ...res }));
    } catch (_) {}
  };

  useEffect(() => {
    getUserInfoData();
  }, [data]);

  // ── Derived display values ────────────────────────────────────────────────
  const gtPoints = user?.points != null ? user.points.toLocaleString() : "—";
  const totalPoints =
    user?.totalPoints != null ? user.totalPoints.toLocaleString() : "—";
  const streakDisplay = user?.streak ? `${user.streak}d` : "0d";
  const streakAccent = user?.streak >= 7 ? "#E88C00" : colors.medium;
  const rankNumber = user?.leaderboardRank ?? "—";

  return (
    <>
      <View style={styles.user}>
        {/* ── Avatar ────────────────────────────────────────────────────── */}
        <Avatar
          size={Platform.OS === "web" ? 200 : width * 0.6}
          name={getName(user)}
          imageStyle={{ backgroundColor: "#fff" }}
          textFontsize={30}
          source={user?.avatar?.image}
          border={{ width: 6, color: colors.white }}
          textStyle={{ maxWidth: width * 0.9 }}
          disabled
        />

        {/* ── Username ──────────────────────────────────────────────────── */}
        {user?.username && (
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
            size="large"
          >
            @{user?.username}
          </AppText>
        )}

        {/* ── School ────────────────────────────────────────────────────── */}
        <AppText
          style={styles.schoolName}
          numberOfLines={2}
          ellipsizeMode="middle"
          fontWeight="bold"
          size="large"
        >
          {profile?.school?.name ?? user?.school?.name}
        </AppText>

        {/* ── Location ──────────────────────────────────────────────────── */}
        <AppText
          style={styles.addressTxt}
          numberOfLines={2}
          ellipsizeMode="middle"
          fontWeight="medium"
          size="small"
        >
          {user?.lga}
          {user?.state ? `, ${user?.state} state` : ""}
        </AppText>

        {/* ── Account type + class ──────────────────────────────────────── */}
        {user?.accountType && (
          <AppText style={styles.accountType} fontWeight="bold">
            {user?.gender}{" "}
            {user?.class?.level && (
              <AppText
                fontWeight="black"
                style={{
                  color: colors.primaryDeep,
                  textTransform: "uppercase",
                }}
              >
                {user?.class?.level + " "}
              </AppText>
            )}
            {user?.accountType}
          </AppText>
        )}

        {/* ── Rank badge (string: "beginner", "expert", etc.) ───────────── */}
        {user?.rank && (
          <View style={styles.rankBadge}>
            <AppText
              size="xsmall"
              fontWeight="bold"
              style={{
                color: colors.primaryDeep,
                textTransform: "capitalize",
              }}
            >
              {user.rank}
            </AppText>
          </View>
        )}

        {/* ── Stats grid (students only) ────────────────────────────────── */}
        {isStudent && (
          <View style={styles.statsGrid}>
            <StatPill label="GT" value={gtPoints} accent={colors.primaryDeep} />
            <View style={styles.statDivider} />
            <StatPill label="Points" value={totalPoints} />
            <View style={styles.statDivider} />
            <StatPill
              label="Streak"
              value={streakDisplay}
              accent={streakAccent}
            />
            <View style={styles.statDivider} />
            <StatPill
              label="Rank #"
              value={rankNumber}
              accent={colors.primaryDeep}
            />
          </View>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {isVerification ? (
          <View style={styles.btns}>
            {profile?.verified ? (
              <AppButton
                title="Unverify"
                onPress={() => handleVerification("unverify")}
                type="accent"
              />
            ) : (
              <>
                <AppButton
                  title="Accept"
                  onPress={() => handleVerification("accept")}
                  icon={{ left: true, name: "check" }}
                />
                <AppButton
                  title="Reject"
                  onPress={() => handleVerification("reject")}
                  icon={{ left: true, name: "cancel" }}
                  type="warn"
                />
              </>
            )}
          </View>
        ) : (
          <View style={styles.btns}>
            {/* Follow button — hidden for self or non-students */}
            {!isSelf && isStudent && (
              <AppButton
                title={followLabel}
                onPress={handleFollowPress}
                type={isViewerFollowing ? "accent" : "primary"}
                loading={followLoading}
              />
            )}
            <AppButton
              title="Close"
              onPress={handleCloseModal}
              type="white"
              contStyle={!isSelf && isStudent ? {} : { marginTop: 50 }}
            />
          </View>
        )}

        {/* ── Verification close X ──────────────────────────────────────── */}
        {isVerification && (
          <AnimatedPressable onPress={handleCloseModal} style={styles.close}>
            <Ionicons name="close" size={30} color={colors.medium} />
          </AnimatedPressable>
        )}

        <LottieAnimator
          visible={verifyLoading || followLoading}
          absolute
          wTransparent
        />
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

// ─────────────────────────────────────────────────────────────────────────────
// ProfileModal
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
const Avatar = ({
  size = 80,
  name,
  horizontal = false,
  award,
  style,
  contStyle = {},
  data,
  userID,
  onPress,
  source,
  imageStyle,
  imagePicker,
  imagePickerError,
  maxWidth,
  numberOfLines = 2,
  border,
  disabled,
  textFontweight = "bold",
  textFontsize = "large",
  textStyle,
}) => {
  const [updateAvatar, { isLoading }] = useUpdateUserAvatarMutation();

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
          imagePickerError?.(true, err);
        }
      } else {
        imagePickerError?.(true, "Cancelled: No image selected");
      }
    } else if (onPress) {
      onPress?.();
    } else if (userID) {
      setModal(true);
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
          numberOfLines={numberOfLines}
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Avatar component ──────────────────────────────────────────────────────
  award: {
    position: "absolute",
    zIndex: 100,
  },
  edit: {
    position: "absolute",
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
    textAlign: "center",
    textTransform: "capitalize",
  },

  // ── RenderUserDetail component ────────────────────────────────────────────
  user: {
    width: width * 0.95,
    backgroundColor: colors.lightly,
    borderRadius: 25,
    minHeight: height * 0.4,
    elevation: 8,
    alignItems: "center",
    paddingTop: 35,
    paddingBottom: 15,
  },
  schoolName: {
    width: "90%",
    marginTop: 10,
    textAlign: "center",
    textTransform: "capitalize",
  },
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
  rankBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
    backgroundColor: colors.primaryLighter + "25",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 14,
    marginHorizontal: 20,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: colors.extraLight,
  },
  btns: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 25,
  },
  close: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 20,
  },
});
