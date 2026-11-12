import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/jamb/JambText";
import Avatar from "../components/Avatar";
import PopMessage from "../components/PopMessage";
import { NavBack } from "../components/AppIcons";
import JambLoadingOverlay from "../components/jamb/JambLoadingOverlay";
import { T, TINTS } from "../components/jamb/JambTheme";
import { LAYOUT, enter, popIn } from "../components/jamb/JambMotion";
import {
  Card,
  Chip,
  Chunky,
  JambButton,
  JambPressable,
  Loader,
  useCountUp,
} from "../components/jamb/JambUI";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { getFullName } from "../helpers/helperFunctions";
import {
  selectSchool,
  useFetchSchoolClassesQuery,
  useRemoveStudentFromClassMutation,
  useTransferStudentsMutation,
} from "../context/schoolSlice";

const LEVEL_ORDER = ["jss 1", "jss 2", "jss 3", "sss 1", "sss 2", "sss 3"];
const rank = (level) => {
  const i = LEVEL_ORDER.indexOf(String(level || "").toLowerCase());
  return i === -1 ? 99 : i;
};
const byLevel = (a, b) => rank(a?.level) - rank(b?.level);

// ─── Hero: chalkboard with this class's counts ──────────────────────────────

const StatTile = ({ icon, label, value, delay }) => {
  const shown = useCountUp(value, 900, delay);
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={T.chalk} />
      </View>
      <View style={{ marginLeft: 9 }}>
        <AppText fontWeight="black" size={22} style={styles.statValue}>
          {shown}
        </AppText>
        <AppText fontWeight="semibold" size={11} style={styles.statLabel}>
          {label}
        </AppText>
      </View>
    </View>
  );
};

const ClassHero = ({ level, tint, students, teachers }) => {
  const [stage, num] = String(level || "")
    .toUpperCase()
    .split(" ");

  return (
    <Animated.View entering={enter(0)} layout={LAYOUT} style={styles.heroWrap}>
      <View style={styles.heroClip}>
        <View pointerEvents="none" style={styles.heroFrame} />
        <View style={styles.heroRow}>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: tint.bg, borderColor: tint.border },
            ]}
          >
            <AppText
              fontWeight="black"
              size={10}
              style={{ color: tint.ink, letterSpacing: 1 }}
            >
              {stage}
            </AppText>
            <AppText
              fontWeight="black"
              size={24}
              style={{ color: tint.ink, marginTop: -3 }}
            >
              {num}
            </AppText>
          </View>

          <View style={styles.heroDivider} />

          <StatTile
            icon="people"
            label="Students"
            value={students}
            delay={150}
          />
          <StatTile
            icon="person"
            label="Teachers"
            value={teachers}
            delay={250}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Tabs ───────────────────────────────────────────────────────────────────

const Tab = ({ label, count, active, tint, onPress }) => (
  <JambPressable
    onPress={onPress}
    scaleTo={0.97}
    style={{ flex: 1 }}
    contentStyle={[
      styles.tab,
      active && {
        backgroundColor: tint.bg,
        borderColor: tint.border,
        borderBottomWidth: 4,
      },
    ]}
  >
    <AppText
      fontWeight={active ? "black" : "bold"}
      size={13}
      style={{ color: active ? tint.ink : T.sub }}
    >
      {label}
    </AppText>
    <View
      style={[
        styles.tabCount,
        { backgroundColor: active ? "#FFFFFF" : T.lockedBg },
      ]}
    >
      <AppText
        fontWeight="black"
        size={11}
        style={{ color: active ? tint.ink : T.sub }}
      >
        {count}
      </AppText>
    </View>
  </JambPressable>
);

// ─── People ─────────────────────────────────────────────────────────────────

const StudentCard = ({ student, index, onTransfer, onRemove }) => (
  <Card index={Math.min(index, 8)} base={60} style={styles.personCard}>
    <View style={styles.personRow}>
      <Avatar source={student?.avatar?.image} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText
          fontWeight="black"
          size={15}
          numberOfLines={1}
          style={{ color: T.ink, textTransform: "capitalize" }}
        >
          {getFullName(student)}
        </AppText>
        <AppText
          fontWeight="medium"
          size={11.5}
          numberOfLines={1}
          style={{ color: T.sub, marginTop: 1 }}
        >
          {student.email || "No email"}
        </AppText>
      </View>

      <JambPressable
        onPress={() => onTransfer(student)}
        scaleTo={0.9}
        hitSlop={6}
        contentStyle={[
          styles.actionBtn,
          { backgroundColor: T.greenSoft, borderColor: T.greenLine },
        ]}
      >
        <Ionicons name="swap-horizontal" size={17} color={T.greenDark} />
      </JambPressable>
      <JambPressable
        onPress={() => onRemove(student)}
        scaleTo={0.9}
        hitSlop={6}
        style={{ marginLeft: 8 }}
        contentStyle={[
          styles.actionBtn,
          { backgroundColor: T.coralSoft, borderColor: T.coralLine },
        ]}
      >
        <Ionicons name="trash-outline" size={17} color={T.coralDark} />
      </JambPressable>
    </View>
  </Card>
);

const TeacherCard = ({ teacher, index, tint }) => (
  <Card index={Math.min(index, 8)} base={60} style={styles.personCard}>
    <View style={styles.personRow}>
      <View
        style={[
          styles.initials,
          { backgroundColor: tint.bg, borderColor: tint.border },
        ]}
      >
        <AppText fontWeight="black" size={16} style={{ color: tint.ink }}>
          {teacher.firstName?.[0]}
          {teacher.lastName?.[0]}
        </AppText>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText
          fontWeight="black"
          size={15}
          numberOfLines={1}
          style={{ color: T.ink }}
        >
          {teacher.firstName} {teacher.lastName}
        </AppText>
        <AppText
          fontWeight="medium"
          size={11.5}
          numberOfLines={1}
          style={{ color: T.sub, marginTop: 1 }}
        >
          {teacher.email || "No email"}
        </AppText>
      </View>
      <Chip
        icon="shield-checkmark"
        label="Teacher"
        color={T.yellowInk}
        bg={T.yellowSoft}
      />
    </View>
  </Card>
);

const EmptyState = ({ icon, title, body }) => (
  <Card index={1} style={styles.emptyCard}>
    <Ionicons name={icon} size={44} color={T.lineDark} />
    <AppText
      fontWeight="black"
      size={16}
      style={{ color: T.ink, marginTop: 8 }}
    >
      {title}
    </AppText>
    <AppText
      fontWeight="medium"
      size={12}
      style={{ color: T.sub, marginTop: 2, textAlign: "center" }}
    >
      {body}
    </AppText>
  </Card>
);

// ─── Modals ─────────────────────────────────────────────────────────────────

const ModalShell = ({ children, onClose }) => (
  <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={styles.overlay}
    >
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View entering={popIn} style={styles.sheet}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  </Modal>
);

const TransferModal = ({
  student,
  studentCount,
  classes,
  currentLevel,
  onClose,
  onConfirm,
}) => {
  const [target, setTarget] = useState(null);
  const [transferAll, setTransferAll] = useState(false);

  return (
    <ModalShell onClose={onClose}>
      <View style={styles.sheetHead}>
        <AppText fontWeight="black" size={18} style={{ color: T.ink }}>
          Transfer student{transferAll ? "s" : ""}
        </AppText>
        <JambPressable onPress={onClose} contentStyle={styles.closeBtn}>
          <Ionicons name="close" size={18} color={T.sub} />
        </JambPressable>
      </View>

      {!transferAll && student && (
        <View style={styles.preview}>
          <Avatar source={student?.avatar?.image} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText
              fontWeight="black"
              size={14.5}
              numberOfLines={1}
              style={{ color: T.ink, textTransform: "capitalize" }}
            >
              {getFullName(student)}
            </AppText>
            <AppText
              fontWeight="medium"
              size={11.5}
              style={{ color: T.sub, marginTop: 1 }}
            >
              Currently in {String(currentLevel || "").toUpperCase()}
            </AppText>
          </View>
        </View>
      )}

      <JambPressable
        onPress={() => setTransferAll((v) => !v)}
        scaleTo={0.985}
        contentStyle={[
          styles.allRow,
          transferAll && {
            backgroundColor: T.greenSoft,
            borderColor: T.greenLine,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            transferAll && {
              backgroundColor: T.green,
              borderColor: T.greenDark,
            },
          ]}
        >
          {transferAll && <Ionicons name="checkmark" size={15} color="#fff" />}
        </View>
        <AppText
          fontWeight="bold"
          size={13}
          style={{ flex: 1, marginLeft: 10, color: T.ink }}
        >
          Transfer all students ({studentCount})
        </AppText>
      </JambPressable>

      <AppText fontWeight="bold" size={12.5} style={styles.label}>
        Move to which class?
      </AppText>

      {classes.length > 0 ? (
        <ScrollView
          style={{ maxHeight: 220 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.options}>
            {classes.map((c) => {
              const active = target?._id === c._id;
              return (
                <JambPressable
                  key={c._id}
                  onPress={() => setTarget(c)}
                  scaleTo={0.95}
                  style={{ marginRight: 8, marginBottom: 8 }}
                  contentStyle={[
                    styles.option,
                    active && {
                      backgroundColor: T.greenSoft,
                      borderColor: T.greenLine,
                    },
                  ]}
                >
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={T.greenDark}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <AppText
                    fontWeight={active ? "black" : "bold"}
                    size={12.5}
                    style={{
                      color: active ? T.greenDark : T.sub,
                      textTransform: "uppercase",
                    }}
                  >
                    {c.level}
                    {c.alias ? (
                      <AppText
                        fontWeight={active ? "black" : "medium"}
                        size={12.5}
                        style={{
                          color: active ? T.greenDark : T.sub,
                          textTransform: "capitalize",
                        }}
                      >
                        {`: ${c.alias}`}
                      </AppText>
                    ) : null}
                  </AppText>
                </JambPressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noOptions}>
          <Ionicons name="alert-circle" size={26} color={T.lineDark} />
          <AppText
            fontWeight="medium"
            size={12.5}
            style={{ color: T.sub, marginTop: 6, textAlign: "center" }}
          >
            There are no other classes to move students into.
          </AppText>
        </View>
      )}

      <View style={styles.actions}>
        <JambButton
          title="Cancel"
          variant="ghost"
          icon={null}
          small
          onPress={onClose}
          style={{ flex: 1, marginRight: 10 }}
        />
        <JambButton
          title="Transfer"
          icon="swap-horizontal"
          small
          disabled={!target}
          onPress={() =>
            onConfirm({ studentId: student?._id, target, transferAll })
          }
          style={{ flex: 1 }}
        />
      </View>
    </ModalShell>
  );
};

const RemoveModal = ({ student, onClose, onConfirm }) => (
  <ModalShell onClose={onClose}>
    <View style={styles.warnIcon}>
      <Ionicons name="warning" size={34} color={T.coralDark} />
    </View>
    <AppText fontWeight="black" size={20} style={styles.centerTitle}>
      Remove student?
    </AppText>
    <AppText fontWeight="medium" size={13.5} style={styles.centerBody}>
      Are you sure you want to remove{" "}
      <AppText fontWeight="black" size={13.5} style={{ color: T.ink }}>
        {getFullName(student)}
      </AppText>{" "}
      from this class?
    </AppText>

    <View style={styles.actions}>
      <JambButton
        title="Cancel"
        variant="ghost"
        icon={null}
        small
        onPress={onClose}
        style={{ flex: 1, marginRight: 10 }}
      />
      <View style={{ flex: 1 }}>
        <Chunky
          onPress={onConfirm}
          face={T.coral}
          lip={T.coralDark}
          radius={14}
          depth={4}
          contentStyle={styles.dangerBtn}
        >
          <AppText
            fontWeight="black"
            size={13}
            style={{
              color: "#FFFFFF",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Remove
          </AppText>
          <Ionicons
            name="trash"
            size={15}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </Chunky>
      </View>
    </View>
  </ModalShell>
);

// ─── Screen ─────────────────────────────────────────────────────────────────

const ClassDetailScreen = () => {
  const { classId, className, classLevel } = useLocalSearchParams();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [transferring, setTransferring] = useState(null); // student | {} (none) | null (closed)
  const [removing, setRemoving] = useState(null);
  const [popper, setPopper] = useState({ vis: false });

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const school = useSelector(selectSchool);
  const schoolId = school?._id;

  const { data, isLoading, isError, error, refetch } =
    useFetchSchoolClassesQuery(schoolId, { skip: !schoolId });
  const [removeStudent, { isLoading: removeBusy }] =
    useRemoveStudentFromClassMutation();
  const [transferStudent, { isLoading: transferBusy }] =
    useTransferStudentsMutation();

  const classes = useMemo(
    () => [...(data?.data?.classes || [])].sort(byLevel),
    [data],
  );
  const classIndex = classes.findIndex((c) => c._id === classId);
  const currentClass = classes[classIndex];

  // Same tint the class has on the Classrooms list, so the colour carries over.
  const tint = TINTS[(classIndex === -1 ? 0 : classIndex) % TINTS.length];

  const students = useMemo(() => currentClass?.students || [], [currentClass]);
  const teachers = useMemo(() => currentClass?.teachers || [], [currentClass]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q),
    );
  }, [students, searchQuery]);

  const transferTargets = useMemo(
    () => classes.filter((c) => c._id !== classId),
    [classes, classId],
  );

  const hasAlias = Boolean(currentClass?.alias);
  const title =
    currentClass?.alias || className || String(classLevel || "").toUpperCase();

  const toast = (msg, type = "success") =>
    setPopper({ vis: true, timer: 2000, msg, type });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmTransfer = async ({ studentId, target, transferAll }) => {
    try {
      await transferStudent({
        schoolId,
        classLevel,
        studentId,
        targetLevel: target?.level,
        upgradeAll: transferAll,
      }).unwrap();

      toast(
        `Successfully transferred ${
          transferAll ? `${students.length} students` : "student"
        }`,
      );
      setTransferring(null);
    } catch (e) {
      toast(e?.data?.message || "Failed to transfer student(s)", "failed");
    }
  };

  const handleConfirmRemove = async () => {
    try {
      await removeStudent({
        schoolId,
        classId: currentClass._id,
        studentId: removing._id,
      }).unwrap();

      toast("Student removed successfully");
      setRemoving(null);
    } catch (e) {
      toast(e?.data?.message || "Failed to remove student", "failed");
    }
  };

  const errorMessage =
    error?.status === 403
      ? "Your account isn't linked to this school, so its classes can't be shown."
      : error?.data?.message || "Check your connection and try again.";

  const renderBody = () => {
    if (isLoading) {
      return (
        <Loader
          size={90}
          label="Loading class…"
          style={{ paddingVertical: 60 }}
        />
      );
    }

    if (isError) {
      return (
        <Card style={styles.errorCard}>
          <View style={styles.errorRow}>
            <View style={styles.errorIcon}>
              <Ionicons name="cloud-offline" size={22} color={T.coralDark} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="black" size={15} style={{ color: T.ink }}>
                Couldn't load this class
              </AppText>
              <AppText
                fontWeight="medium"
                size={12}
                style={{ color: T.sub, marginTop: 2 }}
              >
                {errorMessage}
              </AppText>
            </View>
          </View>
          <JambButton
            title="Try again"
            icon="refresh"
            small
            onPress={refetch}
            style={{ marginTop: 12, alignSelf: "flex-start" }}
          />
        </Card>
      );
    }

    if (!currentClass) {
      return (
        <EmptyState
          icon="school-outline"
          title="Class not found"
          body="This class may have been moved or removed. Pull down to refresh."
        />
      );
    }

    return (
      <>
        <ClassHero
          level={classLevel || currentClass.level}
          tint={tint}
          students={students.length}
          teachers={teachers.length}
        />

        <Animated.View entering={enter(1)} layout={LAYOUT} style={styles.tabs}>
          <Tab
            label="Students"
            count={students.length}
            active={activeTab === "students"}
            tint={tint}
            onPress={() => setActiveTab("students")}
          />
          <View style={{ width: 8 }} />
          <Tab
            label="Teachers"
            count={teachers.length}
            active={activeTab === "teachers"}
            tint={tint}
            onPress={() => setActiveTab("teachers")}
          />
        </Animated.View>

        {activeTab === "students" && students.length > 0 && (
          <Animated.View
            entering={enter(2)}
            layout={LAYOUT}
            style={styles.searchBar}
          >
            <Ionicons name="search" size={18} color={T.faint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students…"
              placeholderTextColor={T.faint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <JambPressable
                onPress={() => setSearchQuery("")}
                scaleTo={0.9}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={19} color={T.faint} />
              </JambPressable>
            )}
          </Animated.View>
        )}

        <View style={{ marginTop: 6 }}>
          {activeTab === "students" ? (
            filteredStudents.length > 0 ? (
              filteredStudents.map((s, i) => (
                <StudentCard
                  key={s._id}
                  student={s}
                  index={i}
                  onTransfer={setTransferring}
                  onRemove={setRemoving}
                />
              ))
            ) : (
              <EmptyState
                icon="people-outline"
                title={searchQuery ? "No students found" : "No students yet"}
                body={
                  searchQuery
                    ? "Try searching with a different keyword."
                    : "Students you add to this class will show up here."
                }
              />
            )
          ) : teachers.length > 0 ? (
            teachers.map((t, i) => (
              <TeacherCard key={t._id} teacher={t} index={i} tint={tint} />
            ))
          ) : (
            <EmptyState
              icon="person-outline"
              title="No teachers yet"
              body="Assign teachers to this class and they'll appear here."
            />
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <NavBack jamb color={T.ink} />
        <View style={{ flex: 1 }}>
          <AppText
            fontWeight="black"
            size={24}
            numberOfLines={1}
            style={{ color: T.ink }}
          >
            {title}
          </AppText>
          <AppText
            fontWeight="medium"
            size={12.5}
            numberOfLines={1}
            style={{ color: T.sub }}
          >
            {hasAlias
              ? `${String(classLevel || "").toUpperCase()} · Students and teachers`
              : "Students and teachers"}
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: PAD_BOTTOM }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={T.green}
            colors={[T.green]}
          />
        }
      >
        <View
          style={{
            width: Math.min(width, 700),
            alignSelf: "center",
            paddingHorizontal: 16,
          }}
        >
          {renderBody()}
        </View>
      </ScrollView>

      {transferring && (
        <TransferModal
          // remount per student so selection state always starts clean
          key={transferring._id}
          student={transferring}
          studentCount={students.length}
          classes={transferTargets}
          currentLevel={classLevel}
          onClose={() => setTransferring(null)}
          onConfirm={handleConfirmTransfer}
        />
      )}
      {removing && (
        <RemoveModal
          student={removing}
          onClose={() => setRemoving(null)}
          onConfirm={handleConfirmRemove}
        />
      )}

      {(removeBusy || transferBusy) && (
        <JambLoadingOverlay
          label={transferBusy ? "Transferring…" : "Removing student…"}
        />
      )}

      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default ClassDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  scroll: { paddingTop: 4 },

  // hero
  heroWrap: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 26,
    backgroundColor: T.boardDark,
    paddingBottom: 5,
  },
  heroClip: {
    borderRadius: 26,
    backgroundColor: T.board,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  heroFrame: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,248,231,0.22)",
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroDivider: {
    width: 1.5,
    alignSelf: "stretch",
    marginHorizontal: 14,
    marginVertical: 4,
    backgroundColor: "rgba(255,248,231,0.22)",
  },
  levelBadge: {
    width: 58,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  statTile: { flex: 1, flexDirection: "row", alignItems: "center" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,248,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { color: T.chalk, lineHeight: 26 },
  statLabel: { color: T.chalkSoft, marginTop: -1 },

  // tabs + search
  tabs: { flexDirection: "row", marginBottom: 12 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    backgroundColor: T.card,
  },
  tabCount: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "sf-regular",
    color: T.ink,
  },

  // people
  personCard: { padding: 12 },
  personRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // states
  errorCard: {
    backgroundColor: T.coralSoft,
    borderColor: T.coralLine,
    marginTop: 6,
  },
  errorRow: { flexDirection: "row", alignItems: "center" },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyCard: { alignItems: "center", paddingVertical: 30 },

  // modals
  overlay: { flex: 1, backgroundColor: "rgba(15,47,39,0.55)" },
  kav: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  sheet: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: T.card,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 18,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.paper,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: T.line,
    padding: 10,
    marginBottom: 12,
  },
  allRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: T.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: T.lineDark,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: T.ink, marginBottom: 8 },
  options: { flexDirection: "row", flexWrap: "wrap" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    backgroundColor: "#fff",
  },
  noOptions: { alignItems: "center", paddingVertical: 24 },
  actions: { flexDirection: "row", marginTop: 18 },

  warnIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: T.coralSoft,
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  centerTitle: { color: T.ink, textAlign: "center", marginTop: 14 },
  centerBody: {
    color: T.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
});
