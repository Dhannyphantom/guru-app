/* eslint-disable react/no-unescaped-entities */
/**
 * LeaveSchoolModal.js  &  FlagStudentModal.js
 *
 * Drop these into your components/ folder.
 *
 * Usage inside SchoolScreen / SchoolProfile:
 *
 *   import LeaveSchoolModal from "../components/LeaveSchoolModal";
 *   import FlagStudentModal from "../components/FlagStudentModal";
 *
 * ── LeaveSchoolModal ─────────────────────────────────────────────────────────
 * Shows a two-step confirm-then-search flow:
 *   Step 1 – Confirm the user really wants to leave (with school name).
 *   Step 2 – (optional) Search for and select a new school to join immediately.
 *            Re-uses the existing SearchSchool component from JoinSchool.js.
 *
 * Props:
 *   visible    {boolean}
 *   onClose    {() => void}
 *   school     {object}  – the current school doc from Redux (selectSchool)
 *   onSuccess  {() => void} – called after a successful leave so the parent
 *                             can refetch / navigate away
 *
 * ── FlagStudentModal ─────────────────────────────────────────────────────────
 * A compact bottom-sheet style modal.
 * The reporter picks a reason (or types a custom one) then submits.
 *
 * Props:
 *   visible       {boolean}
 *   onClose       {() => void}
 *   school        {object}
 *   targetUser    {object}  – the student being reported { _id, firstName, lastName, username }
 */

// ─────────────────────────────────────────────────────────────────────────────
// LeaveSchoolModal
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useRouter } from "expo-router";

import AppText from "./AppText";
import AppButton from "./AppButton";
import Avatar from "./Avatar";
import { SearchSchool } from "./JoinSchool"; // re-use existing
import colors from "../helpers/colors";
import { selectUser } from "../context/usersSlice";
import {
  selectSchool,
  useLeaveSchoolMutation,
  useJoinSchoolMutation,
  useFlagStudentMutation,
  useLazySearchSchoolsQuery,
} from "../context/schoolSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// FlagStudentModal
// ─────────────────────────────────────────────────────────────────────────────

// const { width, height } = Dimensions.get("screen");

// ── Step identifiers ──────────────────────────────────────────────────────────
const STEP_CONFIRM = "confirm"; // "Are you sure you want to leave?"
// const STEP_SEARCH = "search"; // "Search for your next school"
const STEP_DONE = "done"; // Success screen

export const LeaveSchoolModal = ({ visible, onClose, onSuccess }) => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(STEP_CONFIRM);
  const [nextSchool, setNextSchool] = useState(null); // school to join
  const [searched, setSearched] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const [leaveSchool, { isLoading: leaving }] = useLeaveSchoolMutation();
  const [joinSchool, { isLoading: joining }] = useJoinSchoolMutation();
  const [searchSchools, { data: searchData, isLoading: searching }] =
    useLazySearchSchoolsQuery();

  // ── reset on close ────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep(STEP_CONFIRM);
    setNextSchool(null);
    setSearched(false);
    setModalError(null);
    setModalSuccess(null);
    setShowSearch(false);
    onClose?.();
  };

  // ── STEP 1: confirm leave (optionally with a next school already selected) ─
  const confirmLeave = async () => {
    try {
      const body = { schoolId: school?._id };
      if (nextSchool?._id) body.nextSchoolId = nextSchool._id;

      const res = await leaveSchool(body).unwrap();

      if (res.status === "success") {
        setStep(STEP_DONE);
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 2200);
      }
    } catch (err) {
      setModalError(err?.data?.message ?? "Something went wrong. Try again.");
    }
  };

  // ── search handler (mirrors JoinSchool's onSearch) ─────────────────────────
  const onSearch = async (type, query) => {
    switch (type) {
      case "focus":
        setShowSearch(true);
        setModalError(null);
        setModalSuccess(null);
        break;
      case "blur":
        Keyboard.dismiss();
        setShowSearch(false);
        break;
      case "callback":
        try {
          await searchSchools(query).unwrap();
          setSearched(true);
        } catch {
          setModalError("Search failed. Check your connection.");
        }
        break;
    }
  };

  // ── school picked from the search list ────────────────────────────────────
  const onSchoolPicked = (item) => {
    setNextSchool(item);
    setShowSearch(false);
    setModalError(null);
    setModalSuccess(
      `${item.name} selected — you'll be added when you confirm.`,
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.lsContainer, { paddingTop: insets.top }]}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.lsHeader}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.dark} />
          </Pressable>
          <AppText fontWeight="heavy" size="xlarge" style={styles.lsTitle}>
            Leave School
          </AppText>
          <View style={{ width: 24 }} />
        </View>

        {/* ── STEP: confirm ──────────────────────────────────────────────── */}
        {step === STEP_CONFIRM && (
          <ScrollView
            contentContainerStyle={styles.lsBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* School card */}
            <View style={styles.lsSchoolCard}>
              <Ionicons name="school" size={36} color={colors.primary} />
              <AppText
                fontWeight="heavy"
                size="xlarge"
                style={{ ...styles.lsSchoolName, textTransform: "capitalize" }}
              >
                {school?.name}
              </AppText>
              <AppText
                size="small"
                style={{ color: colors.medium, marginTop: 4 }}
              >
                {school?.lga}, {school?.state}
              </AppText>
            </View>

            {/* Warning copy */}
            <View style={styles.lsWarningBox}>
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.warningDark}
              />
              <AppText
                size="small"
                fontWeight="medium"
                style={styles.lsWarningText}
              >
                Leaving will remove you from all classes, quizzes and
                assignments in this school. Your progress and points are kept —
                only the school affiliation is removed.
              </AppText>
            </View>

            {/* Optional: choose next school first */}
            <AppText
              fontWeight="bold"
              size="medium"
              style={{ marginTop: 24, marginBottom: 8 }}
            >
              Want to join another school right away?
            </AppText>
            <AppText
              size="small"
              style={{ color: colors.medium, marginBottom: 12 }}
            >
              Select your next school below (optional). If you skip this you can
              always search for a school later.
            </AppText>

            <SearchSchool
              onSearch={onSearch}
              onSchoolPicked={onSchoolPicked}
              data={searchData?.data}
              showSearch={showSearch}
              loading={{
                search: searching,
                searched,
                page: joining,
              }}
              error={modalError}
              success={modalSuccess}
            />

            {/* Next school preview */}
            {nextSchool && (
              <View style={styles.lsNextSchoolPreview}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.success}
                />
                <AppText
                  size="small"
                  fontWeight="bold"
                  style={[
                    styles.lsNextSchoolText,
                    { textTransform: "capitalize" },
                  ]}
                >
                  Will join: {nextSchool.name}
                </AppText>
                <Pressable
                  onPress={() => {
                    setNextSchool(null);
                    setModalSuccess(null);
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.medium}
                  />
                </Pressable>
              </View>
            )}

            {/* Error banner */}
            {modalError && !showSearch && (
              <View style={styles.lsBannerError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.white}
                />
                <AppText
                  size="small"
                  fontWeight="bold"
                  style={{ color: colors.white, flex: 1, marginLeft: 6 }}
                >
                  {modalError}
                </AppText>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.lsActions}>
              <AppButton
                title="Cancel"
                type="outline"
                onPress={handleClose}
                contStyle={styles.lsBtn}
              />
              <AppButton
                title={leaving ? "Leaving…" : "Confirm & Leave"}
                onPress={confirmLeave}
                disabled={leaving}
                type="warn"
                contStyle={styles.lsBtn}
              />
            </View>

            {leaving && (
              <ActivityIndicator
                color={colors.heart}
                style={{ marginTop: 12 }}
              />
            )}
          </ScrollView>
        )}

        {/* ── STEP: done ─────────────────────────────────────────────────── */}
        {step === STEP_DONE && (
          <View style={styles.lsDoneContainer}>
            <Ionicons
              name="checkmark-circle"
              size={72}
              color={colors.success}
            />
            <AppText
              fontWeight="heavy"
              size="xxlarge"
              style={{ marginTop: 16, textAlign: "center" }}
            >
              You've left the school
            </AppText>
            {nextSchool && (
              <AppText
                size="medium"
                style={{
                  color: colors.medium,
                  textAlign: "center",
                  marginTop: 8,
                  textTransform: "capitalize",
                }}
              >
                Join request sent to {nextSchool.name}. Await teacher
                verification.
              </AppText>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const PRESET_REASONS = [
  "This person doesn't attend this school",
  "I've never seen this student in class",
  "This is a duplicate / fake account",
  "This student left this school",
];

export const FlagStudentModal = ({ visible, onClose, school, targetUser }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  const [flagStudent, { isLoading }] = useFlagStudentMutation();

  const targetName =
    targetUser?.firstName && targetUser?.lastName
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : targetUser?.username ?? "this student";

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason("");
    setDone(false);
    setError(null);
    onClose?.();
  };

  const handleSubmit = async () => {
    const reason =
      selectedReason === "other" ? customReason.trim() : selectedReason;

    if (!reason) {
      setError("Please select or enter a reason.");
      return;
    }

    try {
      await flagStudent({
        schoolId: school?._id,
        targetUserId: targetUser?._id,
        reason,
      }).unwrap();

      setDone(true);
      setTimeout(handleClose, 2000);
    } catch (err) {
      setError(err?.data?.message ?? "Could not submit report. Try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.fsContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.fsHeader}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.dark} />
          </Pressable>
          <AppText fontWeight="heavy" size="xlarge">
            Report Student
          </AppText>
          <View style={{ width: 24 }} />
        </View>

        {done ? (
          /* ── Success state ──────────────────────────────────────────────── */
          <View style={styles.fsDoneContainer}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colors.success}
            />
            <AppText
              fontWeight="heavy"
              size="xlarge"
              style={{ marginTop: 16, textAlign: "center" }}
            >
              Report Submitted
            </AppText>
            <AppText
              size="small"
              style={{
                color: colors.medium,
                textAlign: "center",
                marginTop: 8,
                paddingHorizontal: 24,
              }}
            >
              School teachers have been notified and will review the report.
            </AppText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.fsBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Target student preview */}
            <View style={styles.fsTargetRow}>
              <Avatar
                source={targetUser?.avatar?.image}
                size={52}
                name={targetName}
                border={{ width: 1.5, color: colors.heart + "80" }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText
                  fontWeight="heavy"
                  size="large"
                  style={{ textTransform: "capitalize" }}
                >
                  {targetName}
                </AppText>
                {targetUser?.class?.level && (
                  <AppText
                    size="small"
                    style={{ color: colors.medium, marginTop: 2 }}
                  >
                    {targetUser.class.level.toUpperCase()}
                  </AppText>
                )}
              </View>
              <View style={styles.fsDangerBadge}>
                <Ionicons name="flag" size={14} color={colors.heart} />
                <AppText
                  size="xsmall"
                  fontWeight="bold"
                  style={{ color: colors.heart, marginLeft: 4 }}
                >
                  Reporting
                </AppText>
              </View>
            </View>

            <AppText
              fontWeight="bold"
              size="medium"
              style={{ marginTop: 20, marginBottom: 12 }}
            >
              Why are you reporting this student?
            </AppText>

            {/* Preset reasons */}
            {PRESET_REASONS.map((r) => {
              const isSelected = selectedReason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setSelectedReason(r);
                    setError(null);
                  }}
                  style={[
                    styles.fsReasonRow,
                    isSelected && styles.fsReasonRowActive,
                  ]}
                >
                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={isSelected ? colors.primary : colors.medium}
                  />
                  <AppText
                    size="small"
                    fontWeight={isSelected ? "bold" : "medium"}
                    style={[
                      styles.fsReasonText,
                      isSelected && { color: colors.primaryDeeper },
                    ]}
                  >
                    {r}
                  </AppText>
                </Pressable>
              );
            })}

            {/* "Other" option with text input */}
            <Pressable
              onPress={() => {
                setSelectedReason("other");
                setError(null);
              }}
              style={[
                styles.fsReasonRow,
                selectedReason === "other" && styles.fsReasonRowActive,
              ]}
            >
              <Ionicons
                name={
                  selectedReason === "other"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  selectedReason === "other" ? colors.primary : colors.medium
                }
              />
              <AppText
                size="small"
                fontWeight={selectedReason === "other" ? "bold" : "medium"}
                style={[
                  styles.fsReasonText,
                  selectedReason === "other" && { color: colors.primaryDeeper },
                ]}
              >
                Other reason…
              </AppText>
            </Pressable>

            {selectedReason === "other" && (
              <TextInput
                style={styles.fsTextInput}
                placeholder="Describe the issue…"
                placeholderTextColor={colors.medium}
                multiline
                maxLength={200}
                value={customReason}
                onChangeText={(t) => {
                  setCustomReason(t);
                  setError(null);
                }}
              />
            )}

            {/* Disclaimer */}
            <View style={styles.fsDisclaimer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.medium}
              />
              <AppText
                size="xsmall"
                style={{ color: colors.medium, flex: 1, marginLeft: 6 }}
              >
                Your report is anonymous to the reported student. School
                teachers will review it and take action if necessary.
              </AppText>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.fsBannerError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.white}
                />
                <AppText
                  size="small"
                  fontWeight="bold"
                  style={{ color: colors.white, flex: 1, marginLeft: 6 }}
                >
                  {error}
                </AppText>
              </View>
            )}

            {/* Submit */}
            <AppButton
              title={isLoading ? "Submitting…" : "Submit Report"}
              onPress={handleSubmit}
              type="accent"
              disabled={isLoading}
              contStyle={styles.fsSubmitBtn}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── LeaveSchoolModal ───────────────────────────────────────────────────────
  lsContainer: {
    flex: 1,
    backgroundColor: colors.unchange ?? colors.white,
  },
  lsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
  },
  lsTitle: { flex: 1, textAlign: "center" },
  lsBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  lsSchoolCard: {
    backgroundColor: colors.primary + "30",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.primaryDeep,
    marginBottom: 20,
  },
  lsSchoolName: { marginTop: 10, textAlign: "center" },
  lsWarningBox: {
    flexDirection: "row",
    backgroundColor: colors.warningLight + 30,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  lsWarningText: {
    flex: 1,
    color: colors.warningDark ?? "#856404",
    lineHeight: 20,
  },
  lsNextSchoolPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight ?? "#d4edda",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  lsNextSchoolText: {
    flex: 1,
    color: colors.success ?? "#155724",
  },
  lsBannerError: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.heart ?? "#e53935",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  lsActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  lsBtn: { flex: 1 },
  lsBtnDanger: { backgroundColor: colors.heart ?? "#e53935" },
  lsDoneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  // ── FlagStudentModal ───────────────────────────────────────────────────────
  fsContainer: {
    flex: 1,
    backgroundColor: colors.unchange ?? colors.white,
  },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
  },
  fsBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  fsTargetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.heart + "30",
  },
  fsDangerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.heart + "15",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  fsReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.extraLight,
  },
  fsReasonRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLighter ?? colors.primary + "12",
  },
  fsReasonText: {
    flex: 1,
    marginLeft: 10,
    color: colors.dark,
    lineHeight: 20,
  },
  fsTextInput: {
    borderWidth: 1.5,
    borderColor: colors.primary + "60",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.dark,
    marginBottom: 8,
  },
  fsDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    gap: 6,
  },
  fsBannerError: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.heart ?? "#e53935",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  fsSubmitBtn: {
    marginTop: 24,
  },
  fsDoneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});
