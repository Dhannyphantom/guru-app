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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeIn,
  //   SlideInRight,
} from "react-native-reanimated";

import AppText from "../components/AppText";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useFetchSchoolClassesQuery,
  useUpdateClassMutation,
  useDeleteClassMutation,
} from "../context/schoolSlice";
// import Avatar from "../components/Avatar";
import { useRouter } from "expo-router";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";
import { schoolClasses } from "../helpers/dataStore";

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
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(classItem);
              }}
              style={[styles.actionButton, { marginLeft: 8 }]}
            >
              <Ionicons name="trash-outline" size={20} color={colors.heart} />
            </Pressable>
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

// Edit Class Modal
const EditClassModal = ({ visible, onClose, classData, onSave }) => {
  const [alias, setAlias] = useState(classData?.alias || "");
  const [selectedLevel, setSelectedLevel] = useState(
    classData?.level?.toUpperCase() || "",
  );

  React.useEffect(() => {
    if (classData) {
      setAlias(classData.alias || "");
      setSelectedLevel(classData.level?.toUpperCase() || "");
    }
  }, [classData]);

  const handleSave = () => {
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.modalHeader}>
            <AppText fontWeight="bold" size="large">
              Edit Class
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
              Class Level
            </AppText>
            <View style={styles.levelOptions}>
              {schoolClasses.map((level) => (
                <Pressable
                  key={level._id}
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

            <AppText
              fontWeight="semibold"
              size="regular"
              style={[styles.inputLabel, { marginTop: 20 }]}
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
              title="Save Changes"
              onPress={handleSave}
              contStyle={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ visible, onClose, classData, onConfirm }) => {
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
            Delete Class?
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
            Are you sure you want to delete{" "}
            <AppText fontWeight="bold">
              {classData?.alias || classData?.level?.toUpperCase()}
            </AppText>
            ?{"\n\n"}This action cannot be undone.
          </AppText>

          {(classData?.students?.length > 0 ||
            classData?.teachers?.length > 0) && (
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
                This class has {classData?.students?.length || 0} students and{" "}
                {classData?.teachers?.length || 0} teachers assigned.
              </AppText>
            </View>
          )}

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              onPress={onClose}
              contStyle={{ flex: 1, marginRight: 10 }}
              backgroundColor={colors.light}
              textColor={colors.medium}
            />
            <AppButton
              title="Delete"
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

// Main Classroom Screen
const ClassroomScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [popper, setPopper] = useState({ vis: false });

  const router = useRouter();
  const school = useSelector(selectSchool);

  const { data, isLoading, refetch, error } = useFetchSchoolClassesQuery(
    school?._id,
  );
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const [deleteClass, { isLoading: deleting }] = useDeleteClassMutation();

  const classes = data?.data?.classes || [];

  // Filter classes based on search
  const filteredClasses = classes.filter((cls) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cls.level?.toLowerCase().includes(searchLower) ||
      cls.alias?.toLowerCase().includes(searchLower)
    );
  });

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
    return;
    router.push({
      pathname: "/main/school/class-details",
      params: {
        classId: classItem?._id,
        className: classItem.alias || classItem.level.toUpperCase(),
        classLevel: classItem.level,
      },
    });
  };

  const handleEditClass = (classItem) => {
    setSelectedClass(classItem);
    setEditModalVisible(true);
  };

  const handleDeleteClass = (classItem) => {
    setSelectedClass(classItem);
    setDeleteModalVisible(true);
  };

  const handleSaveEdit = async (editData) => {
    try {
      const res = await updateClass({
        schoolId: school?._id,
        ...editData,
      }).unwrap();

      if (res.success) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: "Class updated successfully",
          type: "success",
        });
        setEditModalVisible(false);
        setSelectedClass(null);
      }
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message || "Failed to update class",
        type: "failed",
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await deleteClass({
        schoolId: school?._id,
        classId: selectedClass._id,
      }).unwrap();

      if (res.success) {
        setPopper({
          vis: true,
          timer: 2000,
          msg: "Class deleted successfully",
          type: "success",
        });
        setDeleteModalVisible(false);
        setSelectedClass(null);
      }
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message || "Failed to delete class",
        type: "failed",
      });
    }
  };

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
        <Pressable
          onPress={() => router.push("/school/classes")}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      {/* Stats Summary */}
      {!isLoading && classes.length > 0 && (
        <StatsSummaryCard
          totalClasses={totalClasses}
          totalStudents={totalStudents}
          totalTeachers={totalTeachers}
        />
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.medium} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes..."
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
        ) : filteredClasses.length > 0 ? (
          <View style={styles.classesContainer}>
            {filteredClasses.map((classItem, index) => (
              <ClassCard
                key={classItem?._id}
                classItem={classItem}
                index={index}
                onPress={() => handleClassPress(classItem)}
                onEdit={handleEditClass}
                onDelete={handleDeleteClass}
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
              {searchQuery ? "No Classes Found" : "No Classes Yet"}
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
                : "Create your first classroom to get started"}
            </AppText>
            {!searchQuery && (
              <AppButton
                title="Create Class"
                onPress={() => router.push("/main/school/new-class")}
                contStyle={{ marginTop: 20, width: width * 0.6 }}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <EditClassModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedClass(null);
        }}
        classData={selectedClass}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setSelectedClass(null);
        }}
        classData={selectedClass}
        onConfirm={handleConfirmDelete}
      />

      {/* Loading Overlay */}
      <LottieAnimator visible={updating || deleting} absolute wTransparent />

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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    borderRadius: 16,
    // ele
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
    paddingBottom: 100,
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
    //    ele
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
