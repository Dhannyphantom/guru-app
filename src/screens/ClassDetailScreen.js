import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeIn,
  ZoomIn,
  FadeOut,
  ZoomOut,
} from "react-native-reanimated";

import AppText from "../components/AppText";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useFetchSchoolClassesQuery,
  useRemoveStudentFromClassMutation,
  useAddStudentToClassMutation,
  useTransferStudentsMutation,
} from "../context/schoolSlice";
import { useRouter, useLocalSearchParams } from "expo-router";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";
import { schoolClasses } from "../helpers/dataStore";
import { StatusBar } from "expo-status-bar";
import Avatar from "../components/Avatar";
import { getFullName } from "../helpers/helperFunctions";
import AppHeader from "../components/AppHeader";

const { width } = Dimensions.get("screen");

const getClassColor = (level) => {
  const colorsObj = {
    "jss 1": colors.primary,
    "jss 2": colors.accent,
    "jss 3": "#9C27B0",
    "sss 1": "#FF9800",
    "sss 2": "#F44336",
    "sss 3": "#00BCD4",
  };
  return colorsObj[level?.toLowerCase()] || colors.primary;
};

// Student Card Component
const StudentCard = ({ student, onUpgrade, onRemove, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.studentCard}
        >
          <View style={styles.studentInfo}>
            <Avatar source={student?.avatar?.image} size={50} />
            <View style={styles.studentDetails}>
              <AppText
                style={{ textTransform: "capitalize" }}
                fontWeight="semibold"
                size="regular"
              >
                {getFullName(student)}
              </AppText>
              <AppText
                size="small"
                style={{ color: colors.medium, marginTop: 2 }}
              >
                {student.email || "No email"}
              </AppText>
            </View>
          </View>

          <View style={styles.studentActions}>
            <Pressable
              onPress={() => onUpgrade(student)}
              style={[styles.iconButton, { backgroundColor: "#4CAF50" + "20" }]}
            >
              <Ionicons name="repeat" size={18} color="#4CAF50" />
            </Pressable>

            <Pressable
              onPress={() => onRemove(student)}
              style={[
                styles.iconButton,
                { backgroundColor: colors.heart + "20", marginLeft: 8 },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.heart} />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Teacher Card Component
const TeacherCard = ({ teacher, index }) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={styles.teacherCard}>
        <View style={styles.teacherInfo}>
          <View
            style={[styles.studentAvatar, { backgroundColor: colors.primary }]}
          >
            <AppText
              fontWeight="bold"
              size="large"
              style={{ color: colors.white }}
            >
              {teacher.firstName?.[0]}
              {teacher.lastName?.[0]}
            </AppText>
          </View>
          <View style={styles.studentDetails}>
            <AppText fontWeight="semibold" size="regular">
              {teacher.firstName} {teacher.lastName}
            </AppText>
            <AppText
              size="small"
              style={{ color: colors.medium, marginTop: 2 }}
            >
              {teacher.email || "No email"}
            </AppText>
          </View>
        </View>
        <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
      </View>
    </Animated.View>
  );
};

// Upgrade/Downgrade Modal
const TransferModal = ({
  visible,
  onClose,
  student,
  students,
  classes = [],
  currentLevel,
  type,
  onConfirm,
}) => {
  const [targetLevel, setTargetLevel] = useState({});
  const [transferAll, setTransferAll] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTargetLevel("");
      setTransferAll(false);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!targetLevel) return;
    onConfirm({
      studentId: student?._id,
      targetLevel,
      transferAll,
    });
  };

  const studentCount = students?.length || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.modalOverlay}
      >
        <Animated.View
          entering={ZoomIn.springify()}
          exiting={ZoomOut}
          style={styles.transferModalContent}
        >
          <View style={styles.modalHeader}>
            <AppText fontWeight="bold" size="large">
              Transfer Student
              {transferAll ? "s" : ""}
            </AppText>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.medium} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {!transferAll && student && (
              <View style={styles.studentPreview}>
                <Avatar source={student?.avatar?.image} size={45} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <AppText
                    fontWeight="semibold"
                    style={{ textTransform: "capitalize" }}
                  >
                    {getFullName(student)}
                  </AppText>
                  <AppText size="small" style={{ color: colors.medium }}>
                    Current: {currentLevel?.toUpperCase()}
                  </AppText>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => setTransferAll(!transferAll)}
              style={styles.transferAllOption}
            >
              <View style={styles.checkbox}>
                {transferAll && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </View>
              <AppText style={{ marginLeft: 10, flex: 1 }}>
                Transfer all students ({studentCount})
              </AppText>
            </Pressable>

            <AppText
              fontWeight="semibold"
              size="regular"
              style={styles.inputLabel}
            >
              Select Transfer Class
            </AppText>

            {classes?.length > 0 ? (
              <View style={styles.levelOptions}>
                {classes?.map((level) => (
                  <Pressable
                    key={level._id}
                    onPress={() => setTargetLevel(level)}
                    style={[
                      styles.levelOption,
                      targetLevel?._id === level._id &&
                        styles.levelOptionActive,
                    ]}
                  >
                    <AppText
                      size="small"
                      fontWeight={
                        targetLevel?._id === level._id ? "bold" : "regular"
                      }
                      style={{
                        textTransform: "uppercase",
                        color:
                          targetLevel?._id === level._id
                            ? colors.primary
                            : colors.medium,
                      }}
                    >
                      {level.level}
                      {": "}
                      <AppText
                        fontWeight={
                          targetLevel?._id === level._id ? "bold" : "regular"
                        }
                        style={{
                          textTransform: "capitalize",
                          color:
                            targetLevel?._id === level._id
                              ? colors.primary
                              : colors.medium,
                        }}
                      >
                        {level.alias}
                      </AppText>
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.noLevelsBox}>
                <Ionicons name="alert-circle" size={24} color={colors.medium} />
                <AppText
                  style={{
                    color: colors.medium,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No {type === "upgrade" ? "higher" : "lower"} classes available
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              onPress={onClose}
              contStyle={{ flex: 1, marginRight: 10 }}
              type="warn"
              backgroundColor={colors.light}
              textColor={colors.medium}
            />
            <AppButton
              title={"Transfer"}
              onPress={handleConfirm}
              contStyle={{ flex: 1 }}
              disabled={!targetLevel || classes?.length === 0}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Remove Student Modal
const RemoveStudentModal = ({ visible, onClose, student, onConfirm }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn} style={styles.deleteModalContent}>
          <View style={styles.deleteIcon}>
            <Ionicons name="warning" size={48} color={colors.heart} />
          </View>
          <AppText
            fontWeight="bold"
            size="xlarge"
            style={{ textAlign: "center", marginTop: 16 }}
          >
            Remove Student?
          </AppText>
          <AppText
            size="regular"
            style={{
              color: colors.medium,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 24,
            }}
          >
            Are you sure you want to remove{" "}
            <AppText fontWeight="bold">
              {student?.firstName} {student?.lastName}
            </AppText>{" "}
            from this class?
          </AppText>

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              onPress={onClose}
              contStyle={{ flex: 1, marginRight: 10 }}
              backgroundColor={colors.light}
              textColor={colors.medium}
            />
            <AppButton
              title="Remove"
              onPress={onConfirm}
              contStyle={{ flex: 1 }}
              backgroundColor={colors.heart}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Main Class Detail Screen
const ClassDetailScreen = () => {
  const params = useLocalSearchParams();
  const { classId, className, classLevel } = params;

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [popper, setPopper] = useState({ vis: false });

  // const router = useRouter();
  const school = useSelector(selectSchool);

  const { data, isLoading, refetch } = useFetchSchoolClassesQuery(school?._id);
  const [removeStudent, { isLoading: removing }] =
    useRemoveStudentFromClassMutation();
  const [addStudent, { isLoading: adding }] = useAddStudentToClassMutation();
  const [transferStudent, { isLoading: transferring }] =
    useTransferStudentsMutation();

  const classes = data?.data?.classes || [];
  const currentClass = classes.find((cls) => cls._id === classId);

  const students = currentClass?.students || [];
  const teachers = currentClass?.teachers || [];

  const filteredStudents = students.filter((student) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUpgrade = (student) => {
    setSelectedStudent(student);
    setUpgradeModalVisible(true);
  };

  const handleRemove = (student) => {
    setSelectedStudent(student);
    setRemoveModalVisible(true);
  };

  const handleConfirmTransfer = async ({
    studentId,
    targetLevel,
    transferAll,
  }) => {
    try {
      const targetClass = classes.find((cls) => cls._id === targetLevel?._id);

      if (!targetClass) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: "Target class not found",
          type: "failed",
        });
        return;
      }

      await transferStudent({
        schoolId: school?._id,
        classId,
        studentId,
        targetLevelId: targetLevel?._id,
        upgradeAll: transferAll,
      });

      const studentsToTransfer = transferAll ? students : [studentId];

      // // Remove from current class and add to target class
      // for (const std of studentsToTransfer) {
      //   await removeStudent({
      //     schoolId: school?._id,
      //     classId: currentClass._id,
      //     studentId: std._id,
      //   }).unwrap();

      //   await addStudent({
      //     schoolId: school?._id,
      //     classId: targetClass._id,
      //     studentId: std._id,
      //   }).unwrap();
      // }

      setPopper({
        vis: true,
        timer: 2000,
        msg: `Successfully transferred ${transferAll ? studentsToTransfer.length + " students" : "student"}`,
        type: "success",
      });

      setUpgradeModalVisible(false);
      setSelectedStudent(null);
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message || "Failed to transfer student(s)",
        type: "failed",
      });
    }
  };

  const handleConfirmRemove = async () => {
    try {
      await removeStudent({
        schoolId: school?._id,
        classId: currentClass._id,
        studentId: selectedStudent._id,
      }).unwrap();

      setPopper({
        vis: true,
        timer: 2000,
        msg: "Student removed successfully",
        type: "success",
      });

      setRemoveModalVisible(false);
      setSelectedStudent(null);
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message || "Failed to remove student",
        type: "failed",
      });
    }
  };

  const classColor = getClassColor(classLevel);

  return (
    <View style={styles.container}>
      <AppHeader title={`${classLevel?.toUpperCase()} (${className})`} />
      {/* Header */}
      {/* <View style={[styles.header, { backgroundColor: classColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.headerContent}>
          <AppText
            fontWeight="bold"
            size="xxlarge"
            style={{ color: colors.white }}
          >
            {className}
          </AppText>
          <AppText
            size="regular"
            fontWeight="medium"
            style={{ color: "#ffffff" + "CC", marginTop: 4 }}
          >
            {classLevel?.toUpperCase()}
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View> */}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: classColor + "20" }]}>
          <Ionicons name="people" size={24} color={classColor} />
          <View>
            <AppText fontWeight="bold" size="xlarge">
              {students.length}
            </AppText>
            <AppText size="small" style={{ color: colors.medium }}>
              Students
            </AppText>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: classColor + "10" }]}>
          <Ionicons name="person" size={24} color={classColor} />
          <View>
            <AppText fontWeight="bold" size="xlarge">
              {teachers.length}
            </AppText>
            <AppText size="small" style={{ color: colors.medium }}>
              Teachers
            </AppText>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab("students")}
          style={[
            styles.tab,
            activeTab === "students" && { backgroundColor: classColor + 15 },
          ]}
        >
          <AppText
            fontWeight={activeTab === "students" ? "bold" : "regular"}
            style={{
              color: activeTab === "students" ? classColor : colors.medium,
            }}
          >
            Students ({students.length})
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("teachers")}
          style={[
            styles.tab,
            activeTab === "teachers" && { backgroundColor: classColor + 15 },
          ]}
        >
          <AppText
            fontWeight={activeTab === "teachers" ? "bold" : "regular"}
            style={{
              color: activeTab === "teachers" ? classColor : colors.medium,
            }}
          >
            Teachers ({teachers.length})
          </AppText>
        </Pressable>
      </View>

      {/* Search Bar */}
      {activeTab === "students" && students?.length > 0 && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.medium} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor={colors.medium}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.medium} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LottieAnimator visible />
            <AppText
              size="small"
              style={{ color: colors.medium, marginTop: 10 }}
            >
              Loading...
            </AppText>
          </View>
        ) : activeTab === "students" ? (
          filteredStudents.length > 0 ? (
            <View style={styles.contentContainer}>
              {filteredStudents.map((student, index) => (
                <StudentCard
                  key={student._id}
                  student={student}
                  index={index}
                  onUpgrade={handleUpgrade}
                  onRemove={handleRemove}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.light} />
              <AppText
                fontWeight="semibold"
                size="large"
                style={{ marginTop: 16, color: colors.medium }}
              >
                {searchQuery ? "No Students Found" : "No Students Yet"}
              </AppText>
              <AppText
                size="small"
                style={{
                  color: colors.light,
                  marginTop: 8,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                {searchQuery
                  ? "Try searching with a different keyword"
                  : "Add students to this class to get started"}
              </AppText>
            </View>
          )
        ) : teachers.length > 0 ? (
          <View style={styles.contentContainer}>
            {teachers.map((teacher, index) => (
              <TeacherCard key={teacher._id} teacher={teacher} index={index} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color={colors.light} />
            <AppText
              fontWeight="semibold"
              size="large"
              style={{ marginTop: 16, color: colors.medium }}
            >
              No Teachers Yet
            </AppText>
            <AppText
              size="small"
              style={{
                color: colors.light,
                marginTop: 8,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              Assign teachers to this class
            </AppText>
          </View>
        )}
      </ScrollView>

      {/* Upgrade Modal */}
      <TransferModal
        visible={upgradeModalVisible}
        onClose={() => {
          setUpgradeModalVisible(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        classes={school?.classes}
        students={students}
        currentLevel={classLevel}
        type="upgrade"
        onConfirm={handleConfirmTransfer}
      />

      {/* Remove Modal */}
      <RemoveStudentModal
        visible={removeModalVisible}
        onClose={() => {
          setRemoveModalVisible(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onConfirm={handleConfirmRemove}
      />

      {/* Loading Overlay */}
      <LottieAnimator visible={removing || adding} absolute wTransparent />

      {/* Pop Message */}
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 15,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary + "15",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "sf-regular",
    color: colors.black,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  studentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  studentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  studentActions: {
    flexDirection: "row",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  teacherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teacherInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  transferModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: width * 0.9,
    maxHeight: "80%",
  },
  deleteModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: width * 0.85,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  studentPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  transferAllOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabel: {
    marginBottom: 10,
  },
  levelOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  levelOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderBottomWidth: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  levelOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  noLevelsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  deleteIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.heart + "20",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
});

export default ClassDetailScreen;
