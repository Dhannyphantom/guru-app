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
  KeyboardAvoidingView,
} from "react-native";
import {
  FontAwesome,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeIn,
  BounceInLeft,
  FadeOut,
  FadeInLeft,
  LinearTransition,
} from "react-native-reanimated";

import AppText from "../components/AppText";
// import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useFetchSchoolClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useShiftClassesMutation,
} from "../context/schoolSlice";
import { useRouter } from "expo-router";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";
import { getClassColor, PAD_BOTTOM, schoolClasses } from "../helpers/dataStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavBack } from "../components/AppIcons";

const { width } = Dimensions.get("screen");

// Class Card Component
const ClassCard = ({ classItem, onPress, onEdit, onDelete, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  const classColor = getClassColor(classItem.level);
  const studentCount = classItem.students?.length || 0;
  const teacherCount = classItem.teachers?.length || 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.classCard, { borderLeftColor: classColor }]}
        >
          <View style={styles.classHeader}>
            <View
              style={[styles.classIcon, { backgroundColor: classColor + "20" }]}
            >
              <MaterialCommunityIcons
                name="google-classroom"
                size={32}
                color={classColor}
              />
            </View>
            <View style={styles.classContent}>
              <AppText fontWeight="bold" size="large">
                {classItem.alias || classItem.level.toUpperCase()}
              </AppText>
              <AppText
                size="small"
                style={{ color: colors.medium, marginTop: 2 }}
              >
                {classItem.level.toUpperCase()}
              </AppText>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={16} color={colors.medium} />
                  <AppText
                    size="xsmall"
                    style={{ color: colors.medium, marginLeft: 4 }}
                  >
                    {studentCount} Students
                  </AppText>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="person" size={16} color={colors.medium} />
                  <AppText
                    size="xsmall"
                    style={{ color: colors.medium, marginLeft: 4 }}
                  >
                    {teacherCount} Teachers
                  </AppText>
                </View>
              </View>
            </View>
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit(classItem);
                }}
                style={styles.actionButton}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
              {/* <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(classItem);
                }}
                style={[styles.actionButton, { marginLeft: 8 }]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.heart} />
              </Pressable> */}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Stats Summary Card
const StatsSummaryCard = ({ totalClasses, totalStudents, totalTeachers }) => {
  return (
    <Animated.View entering={FadeIn} style={styles.statsCard}>
      <View style={styles.statBox}>
        <View
          style={[
            styles.statIconBox,
            { backgroundColor: colors.primary + "20" },
          ]}
        >
          <MaterialCommunityIcons
            name="google-classroom"
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <AppText size="xxsmall" style={{ color: colors.medium }}>
            Classes
          </AppText>
          <AppText fontWeight="bold" size="xlarge">
            {totalClasses}
          </AppText>
        </View>
      </View>

      <View style={styles.statBox}>
        <View
          style={[styles.statIconBox, { backgroundColor: "#4CAF50" + "20" }]}
        >
          <Ionicons name="people" size={24} color="#4CAF50" />
        </View>
        <View style={{ marginLeft: 12 }}>
          <AppText size="xxsmall" style={{ color: colors.medium }}>
            Students
          </AppText>
          <AppText fontWeight="bold" size="xlarge">
            {totalStudents}
          </AppText>
        </View>
      </View>

      <View style={styles.statBox}>
        <View
          style={[styles.statIconBox, { backgroundColor: "#FF9800" + "20" }]}
        >
          <Ionicons name="person" size={24} color="#FF9800" />
        </View>
        <View style={{ marginLeft: 12 }}>
          <AppText size="xxsmall" style={{ color: colors.medium }}>
            Teachers
          </AppText>
          <AppText fontWeight="bold" size="xlarge">
            {totalTeachers}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
};

// Edit/Create Class Modal
const EditClassModal = ({
  visible,
  onClose,
  classData,
  onSave,
  isCreating,
}) => {
  const [alias, setAlias] = useState(classData?.alias || "");
  const [selectedLevel, setSelectedLevel] = useState(
    classData?.level?.toUpperCase() || "",
  );

  React.useEffect(() => {
    if (classData) {
      setAlias(classData.alias || "");
      setSelectedLevel(classData.level?.toUpperCase() || "");
    } else {
      // Reset fields when creating new class
      setAlias("");
      setSelectedLevel("");
    }
  }, [classData, visible]);

  const handleSave = () => {
    if (!selectedLevel) {
      return; // Prevent saving without a level selected
    }

    onSave({
      classId: classData?._id,
      alias: alias.trim(),
      level: selectedLevel,
    });
  };

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
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          behavior="padding"
        >
          <Animated.View
            layout={LinearTransition.springify()}
            entering={FadeInLeft}
            style={styles.editModalContent}
          >
            <View style={styles.modalHeader}>
              <AppText fontWeight="bold" size="large">
                {isCreating ? "Create Class" : "Edit Class"}
              </AppText>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.medium} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <AppText
                fontWeight="semibold"
                size="regular"
                style={styles.inputLabel}
              >
                Class Alias (E.g JSS 2B, The Elites)
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="e.g., The Overcomers, SS2 Gold"
                placeholderTextColor={colors.medium}
                value={alias}
                onChangeText={setAlias}
                maxLength={50}
              />
              <AppText size="xxsmall" style={styles.charCount}>
                {alias.length}/50
              </AppText>
              <AppText
                fontWeight="semibold"
                size="regular"
                style={styles.inputLabel}
              >
                Class Level
              </AppText>
              <View style={styles.levelOptions}>
                {schoolClasses.map((level) => (
                  <Pressable
                    key={level._id}
                    disabled={!isCreating}
                    onPress={() => setSelectedLevel(level.name)}
                    style={[
                      styles.levelOption,
                      selectedLevel === level.name && styles.levelOptionActive,
                    ]}
                  >
                    <AppText
                      size="small"
                      fontWeight={
                        selectedLevel === level.name ? "bold" : "regular"
                      }
                      style={{
                        color:
                          selectedLevel === level.name
                            ? colors.primary
                            : colors.medium,
                      }}
                    >
                      {level.name}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={onClose}
                contStyle={{ flex: 1, marginRight: 10 }}
                // backgroundColor={colors.light}
                // textColor={colors.medium}
                type="white"
              />
              <AppButton
                title={isCreating ? "Create Class" : "Save Changes"}
                onPress={handleSave}
                contStyle={{ flex: 1 }}
                disabled={!selectedLevel}
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

// Delete Confirmation Modal
const UpgradeConfirmModal = ({
  visible,
  onClose,
  type,
  classData,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.modalOverlay}
      >
        <Animated.View
          entering={BounceInLeft.damping(20)}
          style={styles.deleteModalContent}
        >
          <View style={styles.deleteIcon}>
            <Ionicons name="warning" size={48} color={colors.heart} />
          </View>
          <AppText
            fontWeight="bold"
            size="xlarge"
            style={{ textAlign: "center", marginTop: 16 }}
          >
            {type === "up" ? "Upgrade All Classes" : "Downgrade All Classes"}
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
            {type === "up" ? (
              <>
                Are you sure you want to upgrade{" "}
                <AppText fontWeight="bold">
                  {classData?.alias || classData?.level?.toUpperCase()}
                </AppText>
                ?{"\n\n"}
                All students in their respective class will be moved to the next
                level (e.g., JSS 1 → JSS 2 → JSS 3 → SS 1).{"\n\n"}
                This action CANNOT be undone and should ONLY be done annually
                after an academic session
              </>
            ) : (
              <>
                Are you sure you want to downgrade{" "}
                <AppText fontWeight="bold">
                  {classData?.alias || classData?.level?.toUpperCase()}
                </AppText>
                ?{"\n\n"}
                All students in their respective class will be moved to the
                previous level (e.g., SS 1 → JSS 3 → JSS 2 → JSS 1).{"\n\n"}
                This should only be done to undo an accidental upgrade
              </>
            )}
          </AppText>

          <View style={styles.warningBox}>
            <MaterialCommunityIcons
              name="alert"
              size={20}
              color={colors.warning}
            />
            <AppText
              size="small"
              style={{ color: colors.medium, marginLeft: 8, flex: 1 }}
            >
              Important: Students currently in{" "}
              {type === "up" ? "SSS 3" : "JSS 1"} will be automatically
              graduated and will no longer have access to Guru but remain as a
              school alumni.
            </AppText>
          </View>

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              onPress={onClose}
              // contStyle={{ flex: 1, marginRight: 10 }}
              backgroundColor={colors.light}
              type="white"
              textColor={colors.medium}
            />
            <AppButton
              title={type === "up" ? "Upgrade Class" : "Downgrade Class"}
              onPress={onConfirm}
              type={type === "up" ? "primary" : "warn"}
              // contStyle={{ flex: 1 }}
              backgroundColor={colors.heart}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const sorter = {
  "jss 1": 0,
  "jss 2": 1,
  "jss 3": 2,
  "sss 1": 3,
  "sss 2": 4,
  "sss 3": 5,
};

// Main Classroom Screen
const ClassroomScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState({
    vis: false,
    type: null,
  });
  const [selectedClass, setSelectedClass] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [popper, setPopper] = useState({ vis: false });

  const router = useRouter();
  const school = useSelector(selectSchool);
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch } = useFetchSchoolClassesQuery(school?._id);
  const [createClass, { isLoading: creating }] = useCreateClassMutation();
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const [shiftClasses, { isLoading: shifting }] = useShiftClassesMutation();

  const classesx = data?.data?.classes || [];
  const classes = classesx
    ?.slice()
    ?.sort?.((a, b) => sorter[a?.level] - sorter[b?.level]);

  // Calculate stats
  const totalClasses = classes.length;
  const totalStudents = classes.reduce(
    (sum, cls) => sum + (cls.students?.length || 0),
    0,
  );
  const totalTeachers = classes.reduce(
    (sum, cls) => sum + (cls.teachers?.length || 0),
    0,
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClassPress = (classItem) => {
    router.push({
      pathname: "/school/class_detail",
      params: {
        classId: classItem?._id,
        className: classItem.alias || classItem.level.toUpperCase(),
        classLevel: classItem.level,
      },
    });
  };

  const handleEditClass = (classItem) => {
    setSelectedClass(classItem);
    setIsCreating(false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (editData) => {
    try {
      let res;

      if (isCreating) {
        // Create new class
        res = await createClass({
          schoolId: school?._id,
          class: editData.level,
          name: editData.alias,
        }).unwrap();
      } else {
        // Update existing class
        res = await updateClass({
          schoolId: school?._id,
          ...editData,
        }).unwrap();
      }

      if (res.success) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: isCreating
            ? "Class created successfully"
            : "Class updated successfully",
          type: "success",
        });
        setEditModalVisible(false);
        setSelectedClass(null);
        setIsCreating(false);
      }
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg:
          error?.data?.message ||
          (isCreating ? "Failed to create class" : "Failed to update class"),
        type: "failed",
      });
    }
  };

  const handleConfirmUpgrade = async () => {
    try {
      const res = await shiftClasses({
        schoolId: school?._id,
        action: upgradeModalVisible.type === "up" ? "upgrade" : "downgrade",
      }).unwrap();

      if (res.success) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: `Class ${upgradeModalVisible.type === "up" ? "upgraded" : "downgraded"} successfully`,
          type: "success",
        });
        setUpgradeModalVisible({ vis: false, type: null });
        setSelectedClass(null);
      }
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message || "Failed to upgrade or downgrade class",
        type: "failed",
      });
    }
  };

  const handleUpgradeClass = (direction) => {
    if (direction === "up") {
      setSelectedClass(null);
      setUpgradeModalVisible({ vis: true, type: "up" });
    } else {
      setSelectedClass(null);
      setUpgradeModalVisible({ vis: true, type: "down" });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <View style={{ flexDirection: "row" }}>
          <NavBack color="black" style={{ paddingRight: 10 }} />
          <View>
            <AppText fontWeight="bold" size="xxlarge">
              Classrooms
            </AppText>
            <AppText
              size="regular"
              style={{ color: colors.medium, marginTop: 4 }}
            >
              Manage your school classes
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={() => handleUpgradeClass("up")}
            style={styles.addButton}
          >
            <FontAwesome5
              name="angle-double-up"
              size={20}
              color={colors.accent}
            />
            <AppText size="xsmall" fontWeight="bold">
              Sessional Upgrade
            </AppText>
          </Pressable>
          {/* <Pressable
            onPress={() => handleUpgradeClass("down")}
            style={styles.addButton}
          >
            <FontAwesome5
              name="angle-double-down"
              size={20}
              color={colors.heart}
            />
            <AppText size="small" fontWeight="bold">
              Downgrade
            </AppText> */}
          {/* </Pressable> */}
        </View>
      </View>

      {/* Stats Summary */}
      {!isLoading && classes.length > 0 && (
        <StatsSummaryCard
          totalClasses={totalClasses}
          totalStudents={totalStudents}
          totalTeachers={totalTeachers}
        />
      )}

      {/* Classes List */}
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
              Loading classes...
            </AppText>
          </View>
        ) : classes.length > 0 ? (
          <View style={styles.classesContainer}>
            {classes.map((classItem, index) => (
              <ClassCard
                key={classItem?._id}
                classItem={classItem}
                index={index}
                onPress={() => handleClassPress(classItem)}
                onEdit={handleEditClass}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color={colors.light} />
            <AppText
              fontWeight="semibold"
              size="large"
              style={{ marginTop: 16, color: colors.medium }}
            >
              Fetching classses...
            </AppText>
          </View>
        )}
      </ScrollView>

      {/* Edit/Create Modal */}
      <EditClassModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedClass(null);
          setIsCreating(false);
        }}
        classData={selectedClass}
        onSave={handleSaveEdit}
        isCreating={isCreating}
      />

      {/* Delete Confirmation Modal */}
      <UpgradeConfirmModal
        visible={upgradeModalVisible.vis}
        onClose={() => {
          setUpgradeModalVisible({ vis: false, type: null });
          setSelectedClass(null);
        }}
        classData={selectedClass}
        type={upgradeModalVisible.type}
        onConfirm={handleConfirmUpgrade}
      />

      {/* Loading Overlay */}
      <LottieAnimator
        visible={updating || shifting || creating}
        absolute
        wTransparent
      />

      {/* Pop Message */}
      <PopMessage popData={popper} setPopData={setPopper} />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    // width: 48,
    // height: 48,
    // borderRadius: 24,
    // backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
    paddingHorizontal: 10,
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    borderRadius: 16,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
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
    paddingBottom: PAD_BOTTOM,
  },
  classesContainer: {
    paddingHorizontal: 20,
  },
  classCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  classIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  classContent: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
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
  editModalContent: {
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
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "sf-regular",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: colors.black,
  },
  charCount: {
    textAlign: "right",
    color: colors.medium,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    justifyContent: "space-between",
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
  warningBox: {
    flexDirection: "row",
    backgroundColor: colors.warning + "15",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
});

export default ClassroomScreen;
