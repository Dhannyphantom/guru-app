import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useVerifySchoolInstanceMutation } from "../context/schoolSlice";
import {
  useStudentActionMutation,
  useUpdateUserAvatarMutation,
  useLazyFetchUserInfoQuery,
} from "../context/usersSlice";
import PromptModal from "./PromptModal";
import PopMessage from "./PopMessage";
import LottieAnimator from "./LottieAnimator";
import AppModal from "./AppModal";
import {
  getImageObj,
  getPickerName,
  launchGallery,
  capFirstLetter,
  getName,
} from "../helpers/helperFunctions";

// Jamb design system
import AppText from "./jamb/JambText";
import { T, TINTS } from "./jamb/JambTheme";
import { enter } from "./jamb/JambMotion";
import {
  Card,
  Chip,
  Chunky,
  JambPressable,
  Loader,
  Note,
  SectionTitle,
} from "./jamb/JambUI";

import award1st from "../../assets/images/gold-medal.png";
import award2nd from "../../assets/images/silver-medal.png";
import award3rd from "../../assets/images/bronze-medal.png";

const PROFILE_AVATAR = 116;

// ─────────────────────────────────────────────────────────────────────────────
// ProfileButton — chunky action button (flex:1 so two can share a row)
// ─────────────────────────────────────────────────────────────────────────────
const BUTTONS = {
  primary: { face: T.green, lip: T.greenDark, text: "#FFFFFF" },
  yellow: { face: T.yellow, lip: T.yellowDark, text: T.ink },
  danger: { face: T.coral, lip: T.coralDark, text: "#FFFFFF" },
  ghost: {
    face: "#FFFFFF",
    lip: T.lineDark,
    text: T.greenDark,
    border: T.lineDark,
  },
};

const ProfileButton = ({
  title,
  icon,
  variant = "primary",
  onPress,
  disabled,
}) => {
  const k = BUTTONS[variant] ?? BUTTONS.primary;
  return (
    <Chunky
      onPress={onPress}
      disabled={disabled}
      face={k.face}
      lip={k.lip}
      faceBorder={k.border}
      radius={16}
      depth={5}
      style={{ flex: 1 }}
      contentStyle={styles.btn}
    >
      <AppText
        fontWeight="black"
        size={14}
        style={{
          color: k.text,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {title}
      </AppText>
      {Boolean(icon) && (
        <Ionicons
          name={icon}
          size={17}
          color={k.text}
          style={{ marginLeft: 8 }}
        />
      )}
    </Chunky>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatTile — one metric in the stats row
// ─────────────────────────────────────────────────────────────────────────────
const StatTile = ({ icon, label, value, tint, index }) => (
  <Animated.View
    entering={enter(index, 200)}
    style={[
      styles.tile,
      { backgroundColor: tint.bg, borderColor: tint.border },
    ]}
  >
    <View style={styles.tileIcon}>
      <Ionicons name={icon} size={15} color={tint.ink} />
    </View>
    <AppText
      fontWeight="black"
      size={17}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={{ color: T.ink, marginTop: 6 }}
    >
      {value}
    </AppText>
    <AppText fontWeight="bold" size={10.5} style={{ color: tint.ink }}>
      {label}
    </AppText>
  </Animated.View>
);

// ─────────────────────────────────────────────────────────────────────────────
// InfoRow — icon tile + label + value (inside the About card)
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, tint, label, value, last }) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <View
      style={[
        styles.infoIcon,
        { backgroundColor: tint.bg, borderColor: tint.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={tint.ink} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText fontWeight="medium" size={10.5} style={{ color: T.sub }}>
        {label}
      </AppText>
      <AppText
        fontWeight="bold"
        size={14}
        numberOfLines={2}
        style={{ color: T.ink, textTransform: "capitalize" }}
      >
        {value}
      </AppText>
    </View>
  </View>
);

const VERIFY_DONE_MSG = {
  accept: "Verification successful",
  reject: "Rejected successfully",
  unverify: "Unverified successfully",
};

// ─────────────────────────────────────────────────────────────────────────────
// RenderUserDetail — the profile sheet
// ─────────────────────────────────────────────────────────────────────────────
const RenderUserDetail = ({
  setVisible,
  userID,
  closeCallback,
  data = null,
}) => {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width * 0.95, 460);

  const [fetchUserInfo, { isLoading: userLoading }] =
    useLazyFetchUserInfoQuery();

  // profile shape:
  //   profile.user         — viewed user's data
  //   profile.relationship — { isViewerFollowing, isFollowingViewer, isSelf }
  //   profile.type / instance / school / verified — verification fields (via `data`)
  const [profile, setProfile] = useState(data);
  const [prompt, setPrompt] = useState({ vis: false });
  const [popper, setPopper] = useState({ vis: false });

  const [verifySchoolInstance, { isLoading: verifyLoading }] =
    useVerifySchoolInstanceMutation();
  const [studentActions, { isLoading: followLoading }] =
    useStudentActionMutation();

  const user = profile?.user;
  const isVerification = profile?.type === "verify";
  const isStudent = user?.accountType === "student";
  const instanceLabel = profile?.instance ?? user?.accountType ?? "account";

  // ── Relationship (server flags) ──────────────────────────────────────────
  const {
    isViewerFollowing = false,
    isFollowingViewer = false,
    isSelf = false,
  } = profile?.relationship ?? {};

  const follow = isViewerFollowing
    ? isFollowingViewer
      ? { title: "Friends", icon: "people", variant: "ghost" }
      : { title: "Following", icon: "checkmark", variant: "ghost" }
    : isFollowingViewer
      ? { title: "Follow Back", icon: "person-add", variant: "yellow" }
      : { title: "Follow", icon: "person-add", variant: "primary" };

  const showFollow = !isVerification && !isSelf && isStudent;

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

  const runVerification = async (type) => {
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
          msg: VERIFY_DONE_MSG[type],
          type: "success",
          cb: () => handleCloseModal(),
        });
      }
    } catch (_) {}
  };

  const handlePrompt = async (type) => {
    if (type === "unfollow") return executeFollow("unfollow");
    if (VERIFY_DONE_MSG[type]) return runVerification(type);
  };

  const getUserInfoData = async () => {
    try {
      const res = await fetchUserInfo(userID).unwrap();
      // res = { user, status, relationship }
      // Spread into existing profile so verification fields are preserved.
      setProfile((prev) => ({ ...prev, ...res }));
    } catch (_) {}
  };

  useEffect(() => {
    if (userID) getUserInfoData();
  }, [userID]);

  // ── Derived display values ───────────────────────────────────────────────
  const gtPoints = user?.points != null ? user.points.toLocaleString() : "—";
  const totalPoints =
    user?.totalPoints != null ? user.totalPoints.toLocaleString() : "—";
  const streakDisplay = user?.streak ? `${user.streak}d` : "0d";
  const rankNumber = user?.leaderboardRank ?? "—";

  const chips = [];
  if (user?.accountType)
    chips.push({
      label: capFirstLetter(user.accountType),
      icon: isStudent ? "school" : "person",
      color: T.blueDark,
      bg: T.blueSoft,
    });
  if (user?.class?.level)
    chips.push({
      label: String(user.class.level).toUpperCase(),
      icon: "book",
      color: T.purpleDark,
      bg: T.purpleSoft,
    });
  if (user?.gender)
    chips.push({
      label: capFirstLetter(user.gender),
      icon: "male-female",
      color: T.greenDark,
      bg: T.greenSoft,
    });
  if (user?.rank)
    chips.push({
      label: capFirstLetter(user.rank),
      icon: "ribbon",
      color: T.yellowInk,
      bg: T.yellowSoft,
    });

  const schoolName = profile?.school?.name ?? user?.school?.name;
  const location = [user?.lga, user?.state ? `${user.state} state` : null]
    .filter(Boolean)
    .join(", ");
  const infoRows = [
    schoolName && {
      icon: "school",
      tint: TINTS[0],
      label: "School",
      value: schoolName,
    },
    location && {
      icon: "location",
      tint: TINTS[2],
      label: "Location",
      value: location,
    },
  ].filter(Boolean);

  return (
    <>
      <View style={[styles.sheet, { width: sheetWidth }]}>
        {/* ── Chalkboard banner ───────────────────────────────────────── */}
        <View style={styles.banner}>
          <View pointerEvents="none" style={styles.frame} />
          <AppText
            fontWeight="black"
            size={44}
            style={[styles.doodle, { top: 4, right: 70 }]}
          >
            π
          </AppText>
          <AppText
            fontWeight="black"
            size={34}
            style={[styles.doodle, { bottom: 6, left: "58%" }]}
          >
            ÷
          </AppText>
          <AppText
            fontWeight="black"
            size={30}
            style={[styles.doodle, { bottom: 4, left: 18 }]}
          >
            √
          </AppText>

          <View style={styles.tag}>
            <AppText
              fontWeight="black"
              size={10}
              style={{ color: T.yellow, letterSpacing: 1.2 }}
            >
              {isVerification ? "VERIFICATION REQUEST" : "PROFILE"}
            </AppText>
          </View>

          <JambPressable
            onPress={handleCloseModal}
            scaleTo={0.9}
            hitSlop={8}
            style={styles.closeWrap}
            contentStyle={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={T.chalk} />
          </JambPressable>
        </View>

        {/* ── Avatar overlapping the banner ───────────────────────────── */}
        <View style={styles.avatarWrap}>
          <Avatar
            size={PROFILE_AVATAR}
            source={user?.avatar?.image}
            imageStyle={{ backgroundColor: T.paper }}
            border={{ width: 5, color: T.card }}
            disabled
          />
        </View>

        {!user ? (
          <Loader label={userLoading ? "Loading profile…" : undefined} />
        ) : (
          <View style={styles.body}>
            {/* ── Identity ──────────────────────────────────────────── */}
            <AppText
              fontWeight="black"
              size={22}
              numberOfLines={2}
              ellipsizeMode="tail"
              style={styles.name}
            >
              {getName(user)}
            </AppText>
            {Boolean(user?.username) && (
              <AppText
                fontWeight="semibold"
                size={13}
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.username}
              >
                @{user.username}
              </AppText>
            )}

            {chips.length > 0 && (
              <View style={styles.chips}>
                {chips.map((c) => (
                  <Chip
                    key={c.label}
                    label={c.label}
                    icon={c.icon}
                    color={c.color}
                    bg={c.bg}
                  />
                ))}
              </View>
            )}

            {/* ── Verification status note ──────────────────────────── */}
            {isVerification && (
              <Note
                icon={profile?.verified ? "shield-checkmark" : "time"}
                tone={profile?.verified ? "green" : "yellow"}
                title={
                  profile?.verified
                    ? `Verified ${instanceLabel}`
                    : `Pending ${instanceLabel} verification`
                }
                style={{ marginBottom: 0, marginTop: 16 }}
              >
                <AppText
                  fontWeight="medium"
                  size={12}
                  style={{ color: T.sub, marginTop: 2, lineHeight: 17 }}
                >
                  {profile?.verified
                    ? "This account is currently linked to your school."
                    : "Review the details below before accepting or rejecting."}
                </AppText>
              </Note>
            )}

            {/* ── Stats (students only) ─────────────────────────────── */}
            {isStudent && (
              <View style={styles.statsRow}>
                <StatTile
                  index={0}
                  icon="diamond"
                  label="GT"
                  value={gtPoints}
                  tint={TINTS[0]}
                />
                <StatTile
                  index={1}
                  icon="star"
                  label="Points"
                  value={totalPoints}
                  tint={TINTS[1]}
                />
                <StatTile
                  index={2}
                  icon="flame"
                  label="Streak"
                  value={streakDisplay}
                  tint={TINTS[2]}
                />
                <StatTile
                  index={3}
                  icon="trophy"
                  label="Rank #"
                  value={rankNumber}
                  tint={TINTS[3]}
                />
              </View>
            )}

            {/* ── About ─────────────────────────────────────────────── */}
            {infoRows.length > 0 && (
              <Card
                index={1}
                base={200}
                style={{ marginBottom: 0, marginTop: 16 }}
              >
                <SectionTitle
                  icon="id-card"
                  color={T.greenDark}
                  bg={T.greenSoft}
                  title="About"
                />
                {infoRows.map((row, i) => (
                  <InfoRow
                    key={row.label}
                    {...row}
                    last={i === infoRows.length - 1}
                  />
                ))}
              </Card>
            )}

            {/* ── Actions ───────────────────────────────────────────── */}
            <View style={styles.actions}>
              {isVerification ? (
                profile?.verified ? (
                  <ProfileButton
                    title="Unverify"
                    icon="close-circle"
                    variant="danger"
                    onPress={() => handleVerification("unverify")}
                  />
                ) : (
                  <>
                    <ProfileButton
                      title="Reject"
                      icon="close"
                      variant="danger"
                      onPress={() => handleVerification("reject")}
                    />
                    <ProfileButton
                      title="Accept"
                      icon="checkmark"
                      variant="primary"
                      onPress={() => handleVerification("accept")}
                    />
                  </>
                )
              ) : showFollow ? (
                <ProfileButton
                  title={follow.title}
                  icon={follow.icon}
                  variant={follow.variant}
                  onPress={handleFollowPress}
                  disabled={followLoading}
                />
              ) : (
                <ProfileButton
                  title="Close"
                  icon="close"
                  variant="ghost"
                  onPress={handleCloseModal}
                />
              )}
            </View>
          </View>
        )}

        <LottieAnimator
          visible={verifyLoading || followLoading || userLoading}
          absolute
          wTransparent
        />
        <PromptModal
          prompt={prompt}
          setPrompt={setPrompt}
          onPress={handlePrompt}
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
  // Stable component identity — an inline arrow here would remount the sheet
  // (and refetch the profile) on every parent re-render.
  const Content = useCallback(
    () => (
      <RenderUserDetail
        data={data}
        userID={userID}
        closeCallback={closeCallback}
        setVisible={setVisible}
      />
    ),
    [data, userID, closeCallback, setVisible],
  );

  return (
    <AppModal visible={visible} setVisible={setVisible} Component={Content} />
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
  const { width } = useWindowDimensions();
  const [updateAvatar, { isLoading }] = useUpdateUserAvatarMutation();

  const [loaded, setLoaded] = useState(false);
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
  const interactive = Boolean(imagePicker || onPress || userID);
  const badge = Math.max(28, Math.round(size * 0.28));

  const handleImageLoad = () => {
    !loaded && setLoaded(true);
  };

  const handleAvatarPress = async () => {
    if (imagePicker) {
      const res = await launchGallery();

      imagePicker(res?.asset);
      if (res?.asset) {
        try {
          await updateAvatar({
            uri: res.asset.uri,
            height: res.asset.height,
            width: res.asset.width,
            mimeType: res.asset.mimeType,
            fileName: res.asset.fileName,
            assetId: getPickerName(res.asset.uri),
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
      <JambPressable
        onPress={handleAvatarPress}
        disabled={disabled || !interactive}
        scaleTo={0.95}
        style={{ width: horizontal ? undefined : size }}
        contentStyle={[
          {
            alignItems: "center",
            flexDirection: horizontal ? "row" : "column",
          },
          style,
        ]}
      >
        <View style={{ width: size, height: size, alignItems: "center" }}>
          <View
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: border?.width ?? 0,
                borderColor: border?.color ?? "transparent",
              },
              imageStyle,
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
                  visible={!loaded}
                  name="avatar"
                  loop={true}
                  size={size * 1.5}
                  absolute
                  wTransparent
                />
              </>
            ) : (
              <Ionicons name="person" size={size * 0.5} color={T.faint} />
            )}
            <LottieAnimator visible={isLoading} absolute wTransparent />
          </View>

          {/* Medal (outside the clipped circle) */}
          {Boolean(award) && (
            <View style={[styles.award, { bottom: -(size / 1.8) / 2 }]}>
              <Image
                source={awardSrc}
                style={{ width: size / 1.8, height: size / 1.8 }}
              />
            </View>
          )}

          {/* Edit badge — small pencil-yellow chip on the bottom-right */}
          {Boolean(imagePicker) && (
            <View
              style={[
                styles.edit,
                {
                  width: badge,
                  height: badge,
                  borderRadius: badge / 2,
                },
              ]}
            >
              <Ionicons name="pencil" size={badge * 0.5} color={T.ink} />
            </View>
          )}
        </View>
      </JambPressable>

      {name && (
        <AppText
          size={textFontsize}
          fontWeight={textFontweight}
          numberOfLines={numberOfLines}
          ellipsizeMode="tail"
          style={[
            styles.name,
            {
              marginLeft: horizontal ? 10 : 0,
              marginTop: horizontal ? 0 : 10,
              maxWidth: width * 0.3,
            },
            textStyle,
          ]}
        >
          {name}
        </AppText>
      )}

      {Boolean(userID) && (
        <ProfileModal
          visible={modal}
          data={data}
          userID={userID}
          setVisible={setModal}
        />
      )}
    </View>
  );
};

export default Avatar;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Avatar ────────────────────────────────────────────────────────────────
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: T.paper,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 1000,
  },
  award: {
    position: "absolute",
    zIndex: 100,
  },
  edit: {
    position: "absolute",
    right: -2,
    bottom: -2,
    zIndex: 5,
    backgroundColor: T.yellow,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.yellowDark,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    textAlign: "center",
    textTransform: "capitalize",
    color: T.ink,
  },

  // ── Profile sheet ─────────────────────────────────────────────────────────
  sheet: {
    alignSelf: "center",
    backgroundColor: T.paper,
    borderRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: T.line,
    overflow: "hidden",
  },
  banner: {
    height: 112,
    backgroundColor: T.board,
    borderBottomWidth: 5,
    borderBottomColor: T.boardDark,
  },
  frame: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,248,231,0.22)",
  },
  doodle: { position: "absolute", color: "rgba(255,248,231,0.07)" },
  tag: {
    position: "absolute",
    top: 18,
    left: 20,
    backgroundColor: "rgba(255,199,54,0.18)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closeWrap: { position: "absolute", top: 12, right: 12, zIndex: 5 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,248,231,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,248,231,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    alignItems: "center",
    marginTop: -(PROFILE_AVATAR / 2),
    zIndex: 10,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  name: {
    width: "100%",
    marginTop: 10,
    textAlign: "center",
    textTransform: "capitalize",
    color: T.ink,
    lineHeight: 28,
  },
  username: {
    textAlign: "center",
    color: T.sub,
    marginTop: 1,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── About ─────────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: T.line,
    borderStyle: "dashed",
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
