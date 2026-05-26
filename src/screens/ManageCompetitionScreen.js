/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";
import AppButton from "../components/AppButton";
import PopMessage from "../components/PopMessage";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import { selectUser } from "../context/usersSlice";
import {
  useCreateCompetitionMutation,
  useFetchCompetitionSubjectsTopicsQuery,
  useFetchCompetitionsListQuery,
  usePublishCompetitionMutation,
  usePublishResultsMutation,
  useUpdateCompetitionMutation,
} from "../context/competitionSlice";

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const PRIZE_TYPES = ["points", "cash"];

const defaultPrizes = () => ({
  first: {
    title: "Champion",
    type: "points",
    reward: 500,
    currency: null,
    description: null,
  },
  second: {
    title: "Runner-up",
    type: "points",
    reward: 300,
    currency: null,
    description: null,
  },
  third: {
    title: "Third Place",
    type: "points",
    reward: 150,
    currency: null,
    description: null,
  },
});

// ─── Subject config row ───────────────────────────────────────────────────────

const SubjectConfigRow = ({ config, subjectsData, onChange, onRemove }) => {
  const subjectData = subjectsData?.find(
    (s) => s._id === config.subject || s._id === config.subject?._id,
  );
  const availableTopics = subjectData?.topics || [];

  const toggleTopic = (topicId) => {
    const current = config.topics || [];
    const exists = current.includes(topicId);
    onChange({
      ...config,
      topics: exists
        ? current.filter((t) => t !== topicId)
        : [...current, topicId],
    });
  };

  return (
    <View style={styles.subjectCard}>
      <View style={styles.subjectCardHeader}>
        <AppText fontWeight="bold">{subjectData?.name || "Subject"}</AppText>
        <Pressable onPress={onRemove}>
          <Ionicons name="trash-outline" size={20} color={colors.heart} />
        </Pressable>
      </View>

      <AppText size="xsmall" style={styles.fieldLabel}>
        Questions for this subject
      </AppText>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(config.questionsCount || 10)}
        onChangeText={(v) =>
          onChange({ ...config, questionsCount: parseInt(v, 10) || 5 })
        }
      />

      <AppText size="xsmall" style={styles.fieldLabel}>
        Seconds per question
      </AppText>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(config.timePerQuestion || 40)}
        onChangeText={(v) =>
          onChange({ ...config, timePerQuestion: parseInt(v, 10) || 40 })
        }
      />

      {availableTopics.length > 0 && (
        <>
          <AppText size="xsmall" style={[styles.fieldLabel, { marginTop: 8 }]}>
            Topics (leave empty = all topics)
          </AppText>
          <View style={styles.topicChips}>
            {availableTopics.map((t) => {
              const selected = (config.topics || []).includes(t._id);
              return (
                <Pressable
                  key={t._id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleTopic(t._id)}
                >
                  <AppText
                    size="xxsmall"
                    fontWeight="bold"
                    style={{ color: selected ? colors.white : colors.medium }}
                  >
                    {t.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

// ─── Prize row editor ─────────────────────────────────────────────────────────

const PrizeEditor = ({ place, ordinal, prize, onChange }) => {
  const isCash = prize?.type === "cash";

  return (
    <View style={styles.prizeEditorCard}>
      {/* Header */}
      <View style={styles.prizeEditorHeader}>
        <View
          style={[styles.prizeOrdinalBadge, isCash && styles.prizeOrdinalCash]}
        >
          <AppText
            fontWeight="black"
            size="xsmall"
            style={{ color: "#1a1a2e" }}
          >
            {ordinal}
          </AppText>
        </View>
        <AppText fontWeight="bold">
          {place.charAt(0).toUpperCase() + place.slice(1)} Place
        </AppText>
      </View>

      {/* Title */}
      <AppText size="xsmall" style={styles.fieldLabel}>
        Prize Title
      </AppText>
      <TextInput
        style={styles.input}
        placeholder="e.g. Champion"
        value={prize?.title || ""}
        onChangeText={(v) => onChange({ ...prize, title: v })}
      />

      {/* Type toggle */}
      <AppText size="xsmall" style={styles.fieldLabel}>
        Prize Type
      </AppText>
      <View style={styles.typeToggleRow}>
        {PRIZE_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[
              styles.typeToggleBtn,
              prize?.type === t && styles.typeToggleBtnActive,
            ]}
            onPress={() =>
              onChange({
                ...prize,
                type: t,
                currency: t === "points" ? null : prize?.currency || "NGN",
              })
            }
          >
            <AppText
              size="xsmall"
              fontWeight="bold"
              style={{
                color: prize?.type === t ? colors.white : colors.medium,
              }}
            >
              {t === "points" ? "🏆 GT Points" : "💵 Cash"}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Amount */}
      <AppText size="xsmall" style={styles.fieldLabel}>
        {isCash ? "Cash Amount" : "GT Points"}
      </AppText>
      <View style={styles.amountRow}>
        {isCash && (
          <TextInput
            style={[styles.input, styles.currencyInput]}
            placeholder="NGN"
            value={prize?.currency || "NGN"}
            onChangeText={(v) =>
              onChange({ ...prize, currency: v.toUpperCase() })
            }
            autoCapitalize="characters"
            maxLength={4}
          />
        )}
        <TextInput
          style={[styles.input, { flex: 1 }]}
          keyboardType="number-pad"
          placeholder={isCash ? "5000" : "500"}
          value={String(prize?.reward || 0)}
          onChangeText={(v) =>
            onChange({ ...prize, reward: parseInt(v, 10) || 0 })
          }
        />
      </View>

      {/* Description (optional, only shown for cash) */}
      {isCash && (
        <>
          <AppText size="xsmall" style={styles.fieldLabel}>
            Payout Note (optional)
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paid via bank transfer within 7 days"
            value={prize?.description || ""}
            onChangeText={(v) => onChange({ ...prize, description: v })}
          />
        </>
      )}
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const ManageCompetitionScreen = () => {
  const user = useSelector(selectUser);
  const router = useRouter();
  const isManager = user?.accountType === "manager";

  const { data: listData, refetch: refetchList } =
    useFetchCompetitionsListQuery(undefined, { skip: !isManager });
  const { data: subjectsData } = useFetchCompetitionSubjectsTopicsQuery(
    undefined,
    { skip: !isManager },
  );

  const [createCompetition, { isLoading: creating }] =
    useCreateCompetitionMutation();
  const [updateCompetition, { isLoading: updating }] =
    useUpdateCompetitionMutation();
  const [publishCompetition, { isLoading: publishing }] =
    usePublishCompetitionMutation();
  const [publishResults, { isLoading: publishingResults }] =
    usePublishResultsMutation();

  const [selectedId, setSelectedId] = useState(null);
  const [selectedComp, setSelectedComp] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    title: "Monthly Guru Quiz Tournament",
    rules:
      "Competition runs for 24 hours on the first Saturday of the month. One attempt per student. Highest score wins; ties broken by fastest completion time.",
    subjects: [],
    prizes: defaultPrizes(),
  });

  useEffect(() => {
    if (!isManager) router.back();
  }, [isManager]);

  const competitions = listData?.data || [];

  const loadCompetition = (comp) => {
    setSelectedId(comp._id);
    setSelectedComp(comp);
    setForm({
      month: comp.month,
      year: comp.year,
      title: comp.title,
      rules: comp.rules || "",
      subjects: comp.subjects.map((s) => ({
        subject: s.subject?._id || s.subject,
        topics: (s.topics || []).map((t) => t?._id || t),
        questionsCount: s.questionsCount,
        timePerQuestion: s.timePerQuestion || 40,
      })),
      prizes: comp.prizes
        ? {
            first: { ...defaultPrizes().first, ...comp.prizes.first },
            second: { ...defaultPrizes().second, ...comp.prizes.second },
            third: { ...defaultPrizes().third, ...comp.prizes.third },
          }
        : defaultPrizes(),
    });
  };

  const addSubject = (subjectId) => {
    if (
      form.subjects.some((s) => (s.subject?._id || s.subject) === subjectId)
    ) {
      setPopper({ vis: true, type: "failed", msg: "Subject already added" });
      return;
    }
    setForm({
      ...form,
      subjects: [
        ...form.subjects,
        {
          subject: subjectId,
          topics: [],
          questionsCount: 10,
          timePerQuestion: 40,
        },
      ],
    });
    setShowSubjectPicker(false);
  };

  const handleSave = async () => {
    try {
      if (selectedId) {
        await updateCompetition({ id: selectedId, ...form }).unwrap();
        setPopper({ vis: true, type: "success", msg: "Competition updated" });
      } else {
        const res = await createCompetition(form).unwrap();
        setSelectedId(res.data?._id);
        setSelectedComp(res.data);
        setPopper({ vis: true, type: "success", msg: "Draft created" });
      }
      refetchList();
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        msg: err?.data?.message || "Save failed",
      });
    }
  };

  const handlePublish = async () => {
    if (!selectedId) {
      setPopper({
        vis: true,
        type: "failed",
        msg: "Save the competition first",
      });
      return;
    }
    try {
      await publishCompetition(selectedId).unwrap();
      setPopper({
        vis: true,
        type: "success",
        msg: "Competition is now live!",
      });
      refetchList();
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        msg: err?.data?.message || "Publish failed",
      });
    }
  };

  const handlePublishResults = async () => {
    if (!selectedId) return;
    try {
      await publishResults(selectedId).unwrap();
      setPopper({
        vis: true,
        type: "success",
        msg: "Results published — participants can now view their scores!",
      });
      refetchList();
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        msg: err?.data?.message || "Failed to publish results",
      });
    }
  };

  const usedSubjectIds = form.subjects.map((s) => s.subject?._id || s.subject);
  const availableSubjects = (subjectsData?.data || []).filter(
    (s) => !usedSubjectIds.includes(s._id),
  );

  // Derive button visibility from selectedComp (fresh from list)
  const compFromList = competitions.find((c) => c._id === selectedId);
  const canPublish = selectedId && compFromList?.status === "draft";
  const canPublishResults =
    selectedId &&
    (compFromList?.status === "finished" ||
      (compFromList?.status === "active" &&
        new Date() >= new Date(compFromList?.endTime))) &&
    !compFromList?.resultsPublished;

  return (
    <View style={styles.container}>
      <AppHeader title="Monthly Quiz Competition" />

      <View style={styles.body}>
        {/* ── Left panel: competition list ── */}
        <View style={styles.listPanel}>
          <AppText fontWeight="bold" size="small" style={styles.panelTitle}>
            Competitions
          </AppText>
          <FlatList
            data={competitions}
            keyExtractor={(item) => item._id}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <AppText
                size="small"
                style={{ color: colors.medium, padding: 12 }}
              >
                No competitions yet
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.listItem,
                  selectedId === item._id && styles.listItemActive,
                ]}
                onPress={() => loadCompetition(item)}
              >
                <AppText fontWeight="bold" size="small">
                  {MONTHS[item.month - 1]?.label} {item.year}
                </AppText>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        item.status === "active"
                          ? colors.primaryLight
                          : item.status === "finished"
                          ? colors.lighter
                          : colors.warningLight,
                    },
                  ]}
                >
                  <AppText size="xxsmall" fontWeight="bold">
                    {item.status}
                  </AppText>
                </View>
                {/* Results published indicator */}
                {item.resultsPublished && (
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.primaryLight, marginTop: 2 },
                    ]}
                  >
                    <AppText
                      size="xxsmall"
                      fontWeight="bold"
                      style={{ color: colors.primary }}
                    >
                      results live
                    </AppText>
                  </View>
                )}
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable
                style={styles.newBtn}
                onPress={() => {
                  setSelectedId(null);
                  setSelectedComp(null);
                  setForm({
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    title: "Monthly Guru Quiz Tournament",
                    rules: form.rules,
                    subjects: [],
                    prizes: defaultPrizes(),
                  });
                }}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <AppText fontWeight="bold" style={{ color: colors.primary }}>
                  New Draft
                </AppText>
              </Pressable>
            }
          />
        </View>

        {/* ── Right panel: form ── */}
        <ScrollView
          style={styles.formPanel}
          showsVerticalScrollIndicator={false}
        >
          <AppText fontWeight="black" size="large" style={{ marginBottom: 12 }}>
            {selectedId ? "Edit Competition" : "Create Competition"}
          </AppText>

          <AppText size="xsmall" style={styles.fieldLabel}>
            Title
          </AppText>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size="xsmall" style={styles.fieldLabel}>
                Month
              </AppText>
              <View style={styles.pickerRow}>
                {MONTHS.map((m) => (
                  <Pressable
                    key={m.value}
                    style={[
                      styles.monthChip,
                      form.month === m.value && styles.chipSelected,
                    ]}
                    onPress={() => setForm({ ...form, month: m.value })}
                  >
                    <AppText
                      size="xxsmall"
                      style={{
                        color:
                          form.month === m.value ? colors.white : colors.medium,
                      }}
                    >
                      {m.label.slice(0, 3)}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <AppText size="xsmall" style={styles.fieldLabel}>
            Year
          </AppText>
          <TextInput
            style={[styles.input, { width: 100 }]}
            keyboardType="number-pad"
            value={String(form.year)}
            onChangeText={(v) => setForm({ ...form, year: parseInt(v, 10) })}
          />

          <AppText size="xsmall" style={styles.fieldLabel}>
            Rules
          </AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={form.rules}
            onChangeText={(v) => setForm({ ...form, rules: v })}
          />

          {/* Subjects */}
          <AppText fontWeight="bold" style={styles.sectionHeader}>
            Subjects & Questions
          </AppText>

          {form.subjects.map((cfg, idx) => (
            <SubjectConfigRow
              key={cfg.subject?._id || cfg.subject || idx}
              config={cfg}
              subjectsData={subjectsData?.data}
              onChange={(updated) => {
                const next = [...form.subjects];
                next[idx] = updated;
                setForm({ ...form, subjects: next });
              }}
              onRemove={() => {
                setForm({
                  ...form,
                  subjects: form.subjects.filter((_, i) => i !== idx),
                });
              }}
            />
          ))}

          {showSubjectPicker ? (
            <View style={styles.pickerBox}>
              {availableSubjects.map((s) => (
                <Pressable
                  key={s._id}
                  style={styles.pickerItem}
                  onPress={() => addSubject(s._id)}
                >
                  <AppText>{s.name}</AppText>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowSubjectPicker(false)}>
                <AppText style={{ color: colors.heart }}>Cancel</AppText>
              </Pressable>
            </View>
          ) : (
            <AppButton
              title="Add Subject"
              type="white"
              onPress={() => setShowSubjectPicker(true)}
              contStyle={{ marginBottom: 16 }}
            />
          )}

          {/* Prizes */}
          <AppText fontWeight="bold" style={styles.sectionHeader}>
            Prizes
          </AppText>

          {[
            { place: "first", ordinal: "1st", medal: "#FFD700" },
            { place: "second", ordinal: "2nd", medal: "#C0C0C0" },
            { place: "third", ordinal: "3rd", medal: "#CD7F32" },
          ].map(({ place, ordinal, medal }) => (
            <PrizeEditor
              key={place}
              place={place}
              ordinal={ordinal}
              medal={medal}
              prize={form.prizes[place]}
              onChange={(updated) =>
                setForm({
                  ...form,
                  prizes: { ...form.prizes, [place]: updated },
                })
              }
            />
          ))}

          {/* Action buttons */}
          <View style={styles.actions}>
            <AppButton
              title={selectedId ? "Save Changes" : "Create Draft"}
              onPress={handleSave}
              contStyle={{ flex: 1 }}
            />
            {canPublish && (
              <AppButton
                title="Go Live"
                type="accent"
                onPress={handlePublish}
                contStyle={{ flex: 1, marginLeft: 10 }}
              />
            )}
          </View>

          {/* Publish Results — separate from Go Live */}
          {canPublishResults && (
            <View style={styles.publishResultsBox}>
              <Ionicons name="ribbon" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText fontWeight="bold">Ready to release results?</AppText>
                <AppText
                  size="xsmall"
                  style={{ color: colors.medium, marginTop: 2 }}
                >
                  Participants will see their scores, rank, and the leaderboard.
                  This cannot be undone.
                </AppText>
              </View>
              <AppButton
                title="Publish Results"
                onPress={handlePublishResults}
                contStyle={{ marginTop: 0 }}
              />
            </View>
          )}

          {/* Already published notice */}
          {compFromList?.resultsPublished && (
            <View style={[styles.publishResultsBox, styles.publishedBox]}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.green}
              />
              <AppText
                fontWeight="bold"
                style={{ marginLeft: 10, color: colors.green }}
              >
                Results are live — participants can see their scores
              </AppText>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <PopMessage popData={popper} setPopData={setPopper} />
      <LottieAnimator
        visible={creating || updating || publishing || publishingResults}
        absolute
      />
    </View>
  );
};

export default ManageCompetitionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.unchange },
  body: { flex: 1, flexDirection: "row" },
  listPanel: {
    width: 140,
    borderRightWidth: 1,
    borderRightColor: colors.lighter,
    backgroundColor: colors.light,
  },
  panelTitle: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lighter,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lighter,
  },
  listItemActive: { backgroundColor: colors.primaryLight },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 14,
  },
  formPanel: { flex: 1, padding: 16 },
  fieldLabel: {
    color: colors.medium,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lighter,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.white,
    fontSize: 14,
    fontFamily: "sf-medium",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  monthChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lighter,
    backgroundColor: colors.white,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lighter,
    marginRight: 6,
    marginBottom: 6,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.medium,
  },
  subjectCard: {
    backgroundColor: colors.light,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lighter,
  },
  subjectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  topicChips: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  pickerBox: {
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lighter,
  },
  actions: { flexDirection: "row", marginTop: 20 },

  // Prize editor
  prizeEditorCard: {
    backgroundColor: colors.light,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lighter,
  },
  prizeEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  prizeOrdinalBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  prizeOrdinalCash: { backgroundColor: "#4ADE80" },
  typeToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lighter,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  typeToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amountRow: {
    flexDirection: "row",
    gap: 8,
  },
  currencyInput: {
    width: 60,
    textAlign: "center",
  },

  // Publish results banner
  publishResultsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 0,
    flexWrap: "wrap",
  },
  publishedBox: {
    backgroundColor: "rgba(74,222,128,0.12)",
  },
});
