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
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/jamb/JambText";
import PopMessage from "../components/PopMessage";
import { NavBack } from "../components/AppIcons";
import JambLoadingOverlay from "../components/jamb/JambLoadingOverlay";
import { T, TINTS } from "../components/jamb/JambTheme";
import { LAYOUT, enter, popIn } from "../components/jamb/JambMotion";
import {
  AnimatedBar,
  Card,
  Chip,
  JambButton,
  JambPressable,
  Loader,
  Note,
  useCountUp,
} from "../components/jamb/JambUI";
import { PAD_BOTTOM } from "../helpers/dataStore";
import {
  selectSchool,
  useFetchSchoolClassesQuery,
  useShiftClassesMutation,
  useUpdateClassMutation,
} from "../context/schoolSlice";

const LEVEL_ORDER = ["jss 1", "jss 2", "jss 3", "sss 1", "sss 2", "sss 3"];
const rank = (level) => {
  const i = LEVEL_ORDER.indexOf(String(level || "").toLowerCase());
  return i === -1 ? 99 : i;
};

// ─── Hero: chalkboard with the three school-wide counts ─────────────────────

const StatTile = ({ icon, label, value, delay }) => {
  const shown = useCountUp(value, 900, delay);
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={T.chalk} />
      </View>
      <AppText fontWeight="black" size={26} style={styles.statValue}>
        {shown}
      </AppText>
      <AppText fontWeight="semibold" size={11} style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
};

const ClassroomHero = ({ classes, students, teachers }) => (
  <Animated.View entering={enter(0)} layout={LAYOUT} style={styles.heroWrap}>
    <View style={styles.heroClip}>
      <View pointerEvents="none" style={styles.heroFrame} />
      <AppText fontWeight="black" size={20} style={styles.heroTitle}>
        Your school at a glance
      </AppText>
      <View style={styles.statRow}>
        <StatTile icon="school" label="Classes" value={classes} delay={150} />
        <StatTile icon="people" label="Students" value={students} delay={250} />
        <StatTile icon="person" label="Teachers" value={teachers} delay={350} />
      </View>
    </View>
  </Animated.View>
);

// ─── One class ──────────────────────────────────────────────────────────────

const ClassCard = ({ item, index, tint, totalStudents, onOpen, onEdit }) => {
  const students = item.students?.length || 0;
  const teachers = item.teachers?.length || 0;
  const [stage, num] = String(item.level || "")
    .toUpperCase()
    .split(" ");
  const share = totalStudents ? (students / totalStudents) * 100 : 0;

  return (
    <Card index={index} base={120} style={styles.classCard}>
      <JambPressable
        onPress={() => onOpen(item)}
        scaleTo={0.985}
        contentStyle={styles.classRow}
      >
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

        <View style={{ flex: 1 }}>
          <AppText
            fontWeight="black"
            size={16}
            numberOfLines={1}
            style={{ color: T.ink }}
          >
            {item.alias || String(item.level).toUpperCase()}
          </AppText>
          <AppText
            fontWeight="medium"
            size={11.5}
            numberOfLines={1}
            style={{ color: T.sub, marginTop: 1 }}
          >
            {item.alias
              ? String(item.level).toUpperCase()
              : "Tap the pencil to add a class name"}
          </AppText>

          <View style={styles.chipRow}>
            <Chip
              icon="people"
              label={`${students} student${students === 1 ? "" : "s"}`}
              color={T.blueDark}
              bg={T.blueSoft}
            />
            <Chip
              icon="person"
              label={`${teachers} teacher${teachers === 1 ? "" : "s"}`}
              color={T.yellowInk}
              bg={T.yellowSoft}
              style={{ marginLeft: 6 }}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <AnimatedBar
              percent={share}
              color={tint.bar}
              height={8}
              delay={250 + index * 80}
            />
          </View>
        </View>

        <JambPressable
          onPress={() => onEdit(item)}
          scaleTo={0.9}
          style={{ marginLeft: 10, alignSelf: "flex-start" }}
          contentStyle={styles.editBtn}
          hitSlop={8}
        >
          <Ionicons name="pencil" size={16} color={T.greenDark} />
        </JambPressable>
      </JambPressable>
    </Card>
  );
};

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

const EditClassModal = ({ classData, onClose, onSave }) => {
  const [alias, setAlias] = useState(classData?.alias || "");

  return (
    <ModalShell onClose={onClose}>
      <View style={styles.sheetHead}>
        <AppText fontWeight="black" size={18} style={{ color: T.ink }}>
          Edit class
        </AppText>
        <JambPressable onPress={onClose} contentStyle={styles.closeBtn}>
          <Ionicons name="close" size={18} color={T.sub} />
        </JambPressable>
      </View>

      <AppText fontWeight="bold" size={12.5} style={styles.label}>
        Class level
      </AppText>
      <Chip
        icon="lock-closed"
        label={String(classData?.level || "").toUpperCase()}
        color={T.sub}
        bg={T.lockedBg}
      />

      <AppText
        fontWeight="bold"
        size={12.5}
        style={[styles.label, { marginTop: 16 }]}
      >
        Class name (e.g. The Elites, SS2 Gold)
      </AppText>
      <TextInput
        style={styles.input}
        placeholder="Give this class a name"
        placeholderTextColor={T.faint}
        value={alias}
        onChangeText={setAlias}
        maxLength={50}
        autoFocus
      />
      <AppText fontWeight="medium" size={11} style={styles.count}>
        {alias.length}/50
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
        <JambButton
          title="Save"
          icon="checkmark"
          small
          onPress={() =>
            onSave({
              classId: classData?._id,
              alias: alias.trim(),
              level: String(classData?.level || "").toUpperCase(),
            })
          }
          style={{ flex: 1 }}
        />
      </View>
    </ModalShell>
  );
};

const UpgradeModal = ({ onClose, onConfirm }) => (
  <ModalShell onClose={onClose}>
    <View style={styles.warnIcon}>
      <Ionicons name="trending-up" size={34} color={T.yellowInk} />
    </View>
    <AppText fontWeight="black" size={20} style={styles.upTitle}>
      Move every class up a level?
    </AppText>
    <AppText fontWeight="medium" size={13.5} style={styles.upBody}>
      Students in each class move to the next level (JSS 1 → JSS 2 → JSS 3 → SSS
      1 …). Do this once a year, after the academic session ends.
    </AppText>

    <View style={styles.warnBox}>
      <Ionicons name="alert-circle" size={20} color={T.coralDark} />
      <AppText fontWeight="semibold" size={12} style={styles.warnText}>
        This cannot be undone. Students in SSS 3 graduate and lose access to
        Guru, but stay on your school's alumni list.
      </AppText>
    </View>

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
        title="Upgrade"
        variant="yellow"
        icon="trending-up"
        small
        onPress={onConfirm}
        style={{ flex: 1 }}
      />
    </View>
  </ModalShell>
);

// ─── Screen ─────────────────────────────────────────────────────────────────

const ClassroomScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [popper, setPopper] = useState({ vis: false });

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const school = useSelector(selectSchool);
  const schoolId = school?._id;

  const { data, isLoading, isError, error, refetch } =
    useFetchSchoolClassesQuery(schoolId, { skip: !schoolId });
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation();
  const [shiftClasses, { isLoading: shifting }] = useShiftClassesMutation();

  const classes = useMemo(
    () =>
      [...(data?.data?.classes || [])].sort(
        (a, b) => rank(a?.level) - rank(b?.level),
      ),
    [data],
  );

  const totals = useMemo(
    () => ({
      students: classes.reduce((s, c) => s + (c.students?.length || 0), 0),
      teachers: classes.reduce((s, c) => s + (c.teachers?.length || 0), 0),
    }),
    [classes],
  );

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

  const openClass = (c) =>
    router.push({
      pathname: "/school/class_detail",
      params: {
        classId: c._id,
        className: c.alias || String(c.level).toUpperCase(),
        classLevel: c.level,
      },
    });

  const saveEdit = async (payload) => {
    try {
      const res = await updateClass({ schoolId, ...payload }).unwrap();
      if (res.success) {
        setEditing(null);
        toast("Class updated");
      }
    } catch (e) {
      toast(e?.data?.message || "Could not update the class", "failed");
    }
  };

  const confirmUpgrade = async () => {
    try {
      const res = await shiftClasses({ schoolId, action: "upgrade" }).unwrap();
      if (res.success) {
        setUpgradeOpen(false);
        toast("All classes moved up a level");
      }
    } catch (e) {
      toast(e?.data?.message || "Could not upgrade the classes", "failed");
    }
  };

  const errorMessage =
    error?.status === 403
      ? "Your account isn't linked to this school, so its classes can't be shown."
      : error?.data?.message || "Check your connection and try again.";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <NavBack color={T.ink} style={{ paddingRight: 10 }} />
        <View style={{ flex: 1 }}>
          <AppText fontWeight="black" size={24} style={{ color: T.ink }}>
            Classrooms
          </AppText>
          <AppText fontWeight="medium" size={12.5} style={{ color: T.sub }}>
            Manage your school's classes
          </AppText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
          {isLoading ? (
            <Loader
              size={90}
              label="Loading classes…"
              style={{ paddingVertical: 60 }}
            />
          ) : isError ? (
            <Card style={styles.errorCard}>
              <View style={styles.errorRow}>
                <View style={styles.errorIcon}>
                  <Ionicons
                    name="cloud-offline"
                    size={22}
                    color={T.coralDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    fontWeight="black"
                    size={15}
                    style={{ color: T.ink }}
                  >
                    Couldn't load your classes
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
          ) : (
            <>
              <ClassroomHero
                classes={classes.length}
                students={totals.students}
                teachers={totals.teachers}
              />

              {classes.length > 0 && (
                <Note
                  icon="trending-up"
                  title="End of session?"
                  index={1}
                  base={60}
                  onPress={() => setUpgradeOpen(true)}
                  right={
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={T.yellowInk}
                      style={{ alignSelf: "center" }}
                    />
                  }
                >
                  <AppText
                    fontWeight="medium"
                    size={12}
                    style={{ color: "#4A4020", marginTop: 2 }}
                  >
                    Move every class up a level for the new academic year.
                  </AppText>
                </Note>
              )}

              {classes.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  {classes.map((c, i) => (
                    <ClassCard
                      key={c._id}
                      item={c}
                      index={i}
                      tint={TINTS[i % TINTS.length]}
                      totalStudents={totals.students}
                      onOpen={openClass}
                      onEdit={setEditing}
                    />
                  ))}
                </View>
              ) : (
                <Card index={1} style={styles.emptyCard}>
                  <Ionicons
                    name="school-outline"
                    size={44}
                    color={T.lineDark}
                  />
                  <AppText
                    fontWeight="black"
                    size={16}
                    style={{ color: T.ink, marginTop: 8 }}
                  >
                    No classes yet
                  </AppText>
                  <AppText
                    fontWeight="medium"
                    size={12}
                    style={{ color: T.sub, marginTop: 2, textAlign: "center" }}
                  >
                    Pull down to refresh. Classes appear here once your school
                    is set up.
                  </AppText>
                </Card>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {editing && (
        <EditClassModal
          key={editing._id}
          classData={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
      {upgradeOpen && (
        <UpgradeModal
          onClose={() => setUpgradeOpen(false)}
          onConfirm={confirmUpgrade}
        />
      )}

      {(updating || shifting) && (
        <JambLoadingOverlay
          label={shifting ? "Moving classes up…" : "Saving class…"}
        />
      )}

      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default ClassroomScreen;

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
    paddingVertical: 18,
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
  heroTitle: { color: T.chalk, marginBottom: 12 },
  statRow: { flexDirection: "row" },
  statTile: { flex: 1, alignItems: "flex-start" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,248,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { color: T.chalk, marginTop: 8 },
  statLabel: { color: T.chalkSoft, marginTop: -2 },

  // class card
  classCard: { padding: 12 },
  classRow: { flexDirection: "row", alignItems: "center" },
  levelBadge: {
    width: 58,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chipRow: { flexDirection: "row", marginTop: 8 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: T.greenSoft,
    borderWidth: 2,
    borderColor: T.greenLine,
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
  label: { color: T.ink, marginBottom: 8 },
  input: {
    backgroundColor: T.paper,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: T.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "sf-regular",
    color: T.ink,
  },
  count: { textAlign: "right", color: T.faint, marginTop: 4 },
  actions: { flexDirection: "row", marginTop: 18 },

  warnIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  upTitle: { color: T.ink, textAlign: "center", marginTop: 14 },
  upBody: { color: T.sub, textAlign: "center", marginTop: 6, lineHeight: 20 },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: T.coralSoft,
    borderWidth: 2,
    borderColor: T.coralLine,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  warnText: { flex: 1, color: T.coralDark, marginLeft: 8, lineHeight: 17 },
});
