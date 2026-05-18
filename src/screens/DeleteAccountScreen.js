import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";
import AppButton from "../components/AppButton";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import { signOutKeys } from "../helpers/dataStore";
import { parseApiError } from "../helpers/parseApiError";
import { apiSlice } from "../context/apiSlice";
import {
  invalidateAnalyticsCache,
  selectUser,
  updateToken,
  useDeleteAccountMutation,
} from "../context/usersSlice";

const DELETION_ITEMS = [
  "Profile, username, and contact details",
  "Points, ranks, and quiz history",
  "School and class memberships",
  "Subscriptions, wallet balance, and rewards",
  "Friends, invites, and saved progress",
];

const DeleteAccountScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [deleteAccount, { isLoading }] = useDeleteAccountMutation();

  const canSubmit = confirmed && password.trim().length > 0 && !isLoading;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const scrollToPasswordField = () => {
    setTimeout(
      () => {
        scrollRef.current?.scrollToEnd({ animated: true });
      },
      Platform.OS === "ios" ? 150 : 100,
    );
  };

  const clearLocalSession = async () => {
    await AsyncStorage.multiRemove(signOutKeys);
    await invalidateAnalyticsCache();
    dispatch(apiSlice.util.resetApiState());
    dispatch(updateToken(null));
  };

  const handleDelete = async () => {
    if (!confirmed) {
      setError("Please confirm you understand this action is permanent.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password to delete your account.");
      return;
    }

    setError(null);
    try {
      await deleteAccount({ password }).unwrap();
      await clearLocalSession();
      router.replace("/(auth)/welcome");
    } catch (err) {
      setError(parseApiError(err, "Could not delete your account. Try again."));
    }
  };

  const scrollPaddingBottom =
    32 +
    insets.bottom +
    (keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <AppHeader title="Delete account" titleColor={colors.heartDark} />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: scrollPaddingBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <Ionicons name="warning" size={32} color={colors.heartDark} />
            </View>
            <AppText fontWeight="black" style={styles.heroTitle}>
              Permanent account deletion
            </AppText>
            <AppText style={styles.heroSub} size="small">
              Signed in as @{user?.username ?? "your account"}. This cannot be
              undone.
            </AppText>
          </View>

          <View style={styles.card}>
            <AppText fontWeight="bold" style={styles.cardTitle}>
              The following will be removed:
            </AppText>
            {DELETION_ITEMS.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.heartDark}
                  style={styles.bulletIcon}
                />
                <AppText style={styles.bulletText} size="small">
                  {item}
                </AppText>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.checkRow}
            onPress={() => {
              setConfirmed((v) => !v);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
          >
            <View
              style={[styles.checkbox, confirmed && styles.checkboxChecked]}
            >
              {confirmed ? (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              ) : null}
            </View>
            <AppText style={styles.checkLabel} size="small">
              I understand that deleting my account is permanent and all my data
              will be erased.
            </AppText>
          </Pressable>

          <View style={styles.field}>
            <AppText
              fontWeight="semibold"
              style={styles.fieldLabel}
              size="small"
            >
              Confirm with your password
            </AppText>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              onFocus={scrollToPasswordField}
              placeholder="Current password"
              placeholderTextColor={colors.medium}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={colors.heartDark}
              />
              <AppText style={styles.errorText} size="small">
                {error}
              </AppText>
            </View>
          ) : null}

          <AppButton
            title={
              isLoading ? "Deleting account…" : "Delete my account permanently"
            }
            type="warn"
            disabled={!canSubmit}
            onPress={handleDelete}
            contStyle={styles.deleteBtn}
          />
          <AppButton
            title="Cancel"
            type="white"
            disabled={isLoading}
            onPress={() => router.back()}
            contStyle={styles.cancelBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default DeleteAccountScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.heartDark + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    color: colors.black,
    textAlign: "center",
  },
  heroSub: {
    color: colors.medium,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.heartDark + "22",
  },
  cardTitle: {
    color: colors.black,
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletIcon: { marginRight: 8, marginTop: 1 },
  bulletText: {
    flex: 1,
    color: colors.medium,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.medium,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.heartDark,
    borderColor: colors.heartDark,
  },
  checkLabel: {
    flex: 1,
    color: colors.black,
    lineHeight: 20,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    color: colors.black,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.extraLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: colors.black,
    fontFamily: "sf-medium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.heartDark + "12",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: colors.heartDark,
  },
  deleteBtn: {
    marginTop: 4,
    alignSelf: "stretch",
  },
  cancelBtn: {
    marginTop: 10,
    alignSelf: "stretch",
  },
});
