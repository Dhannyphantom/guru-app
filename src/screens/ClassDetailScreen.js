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
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeIn,
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
} from "../context/schoolSlice";
import { useRouter, useLocalSearchParams } from "expo-router";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";
import { schoolClasses } from "../helpers/dataStore";

const { width } = Dimensions.get("screen");

// Student Card Component
const StudentCard = ({ student, onUpgrade, onDowngrade, onRemove, index }) => {
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
            <View style={styles.studentAvatar}>
              <AppText
                fontWeight="bold"
                size="large"
                style={{ color: colors.white }}
              >
                {student.firstName?.[0]}
                {student.lastName?.[0]}
              </AppText>
            </View>
            <View style={styles.studentDetails}>
              <AppText fontWeight="semibold" size="regular">
                {student.firstName} {student.lastName}
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
              <Ionicons name="arrow-up" size={18} color="#4CAF50" />
            </Pressable>
            <Pressable
              onPress={() => onDowngrade(student)}
              style={[
                styles.iconButton,
                { backgroundColor: "#FF9800" + "20", marginLeft: 8 },
              ]}
            >
              <Ionicons name="arrow-down" size={18} color="#FF9800" />
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
  currentLevel,
  type,
  onConfirm,
}) => {
  const [targetLevel, setTargetLevel] = useState("");
  const [transferAll, setTransferAll] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTargetLevel("");
      setTransferAll(false);
    }
  }, [visible]);

  const availableLevels = schoolClasses.filter((level) => {
    const currentIndex = schoolClasses.findIndex(
      (l) => l.name === currentLevel,
    );
    const levelIndex = schoolClasses.findIndex((l) => l.name === level.name);

    if (type === "upgrade") {
      return levelIndex > currentIndex;
    } else {
      return levelIndex < currentIndex;
    }
  });

  const handleConfirm = () => {
    if (!targetLevel) return;
    onConfirm({
      student: transferAll ? null : student,
      targetLevel,
      transferAll,
    });
  };

  const studentCount = students?.length || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn} style={styles.transferModalContent}>
          <View style={styles.modalHeader}>
            <AppText fontWeight="bold" size="large">
              {type === "upgrade" ? "Upgrade" : "Downgrade"} Student
              {transferAll ? "s" : ""}
            </AppText>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.medium} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {!transferAll && student && (
              <View style={styles.studentPreview}>
                <View style={[styles.studentAvatar, { width: 40, height: 40 }]}>
                  <AppText fontWeight="bold" style={{ color: colors.white }}>
                    {student.firstName?.[0]}
                    {student.lastName?.[0]}
                  </AppText>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <AppText fontWeight="semibold">
                    {student.firstName} {student.lastName}
                  </AppText>
                  <AppText size="small" style={{ color: colors.medium }}>
                    Current: {currentLevel}
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
                {type === "upgrade" ? "Upgrade" : "Downgrade"} all students (
                {studentCount})
              </AppText>
            </Pressable>

            <AppText
              fontWeight="semibold"
              size="regular"
              style={styles.inputLabel}
            >
              Select Target Class
            </AppText>

            {availableLevels.length > 0 ? (
              <View style={styles.levelOptions}>
                {availableLevels.map((level) => (
                  <Pressable
                    key={level._id}
                    onPress={() => setTargetLevel(level.name)}
                    style={[
                      styles.levelOption,
                      targetLevel === level.name && styles.levelOptionActive,
                    ]}
                  >
                    <AppText
                      size="small"
                      fontWeight={
                        targetLevel === level.name ? "bold" : "regular"
                      }
                      style={{
                        color:
                          targetLevel === level.name
                            ? colors.primary
                            : colors.medium,
                      }}
                    >
                      {level.name}
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
              backgroundColor={colors.light}
              textColor={colors.medium}
            />
            <AppButton
              title={`${type === "upgrade" ? "Upgrade" : "Downgrade"}`}
              onPress={handleConfirm}
              contStyle={{ flex: 1 }}
              disabled={!targetLevel || availableLevels.length === 0}
              backgroundColor={type === "upgrade" ? "#4CAF50" : "#FF9800"}
            />
          </View>
        </Animated.View>
      </View>
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
  const [downgradeModalVisible, setDowngradeModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [popper, setPopper] = useState({ vis: false });

  const router = useRouter();
  const school = useSelector(selectSchool);

  const { data, isLoading, refetch } = useFetchSchoolClassesQuery(school?._id);
  const [removeStudent, { isLoading: removing }] =
    useRemoveStudentFromClassMutation();
  const [addStudent, { isLoading: adding }] = useAddStudentToClassMutation();

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

  const handleDowngrade = (student) => {
    setSelectedStudent(student);
    setDowngradeModalVisible(true);
  };

  const handleRemove = (student) => {
    setSelectedStudent(student);
    setRemoveModalVisible(true);
  };

  const handleConfirmTransfer = async ({
    student,
    targetLevel,
    transferAll,
  }) => {
    try {
      const targetClass = classes.find((cls) => cls.level === targetLevel);

      if (!targetClass) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: "Target class not found",
          type: "failed",
        });
        return;
      }

      const studentsToTransfer = transferAll ? students : [student];

      // Remove from current class and add to target class
      for (const std of studentsToTransfer) {
        await removeStudent({
          schoolId: school?._id,
          classId: currentClass._id,
          studentId: std._id,
        }).unwrap();

        await addStudent({
          schoolId: school?._id,
          classId: targetClass._id,
          studentId: std._id,
        }).unwrap();
      }

      setPopper({
        vis: true,
        timer: 2000,
        msg: `Successfully transferred ${transferAll ? studentsToTransfer.length + " students" : "student"}`,
        type: "success",
      });

      setUpgradeModalVisible(false);
      setDowngradeModalVisible(false);
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

  const getClassColor = (level) => {
    const colors = {
      jss1: "#4CAF50",
      jss2: "#2196F3",
      jss3: "#9C27B0",
      sss1: "#FF9800",
      sss2: "#F44336",
      sss3: "#00BCD4",
    };
    return colors[level?.toLowerCase()] || "#607D8B";
  };

  const classColor = getClassColor(classLevel);

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: classColor }]}>
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
            style={{ color: colors.white + "CC", marginTop: 4 }}
          >
            {classLevel?.toUpperCase()}
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: "#4CAF50" + "20" }]}>
          <Ionicons name="people" size={24} color="#4CAF50" />
          <AppText fontWeight="bold" size="xlarge" style={{ marginTop: 8 }}>
            {students.length}
          </AppText>
          <AppText size="small" style={{ color: colors.medium }}>
            Students
          </AppText>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: colors.primary + "20" }]}
        >
          <Ionicons name="person" size={24} color={colors.primary} />
          <AppText fontWeight="bold" size="xlarge" style={{ marginTop: 8 }}>
            {teachers.length}
          </AppText>
          <AppText size="small" style={{ color: colors.medium }}>
            Teachers
          </AppText>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab("students")}
          style={[styles.tab, activeTab === "students" && styles.activeTab]}
        >
          <AppText
            fontWeight={activeTab === "students" ? "bold" : "regular"}
            style={{
              color: activeTab === "students" ? colors.primary : colors.medium,
            }}
          >
            Students ({students.length})
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("teachers")}
          style={[styles.tab, activeTab === "teachers" && styles.activeTab]}
        >
          <AppText
            fontWeight={activeTab === "teachers" ? "bold" : "regular"}
            style={{
              color: activeTab === "teachers" ? colors.primary : colors.medium,
            }}
          >
            Teachers ({teachers.length})
          </AppText>
        </Pressable>
      </View>

      {/* Search Bar */}
      {activeTab === "students" && (
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
                  onDowngrade={handleDowngrade}
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
        students={students}
        currentLevel={classLevel}
        type="upgrade"
        onConfirm={handleConfirmTransfer}
      />

      {/* Downgrade Modal */}
      <TransferModal
        visible={downgradeModalVisible}
        onClose={() => {
          setDowngradeModalVisible(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        students={students}
        currentLevel={classLevel}
        type="downgrade"
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
    </Screen>
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
    marginTop: -30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
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
