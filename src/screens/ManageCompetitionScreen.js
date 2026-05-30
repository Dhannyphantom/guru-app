/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
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

// ─── Constants ────────────────────────────────────────────────────────────────

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

/** A blank custom question with 4 empty answer slots (one marked correct by default). */
const blankQuestion = () => ({
  _id: String(Date.now()) + Math.random().toString(36).slice(2),
  question: "",
  answers: [
    { name: "", correct: true },
    { name: "", correct: false },
    { name: "", correct: false },
    { name: "", correct: false },
  ],
  explanation: "",
  point: 5,
  timer: 40,
});

/** A blank custom subject. */
const blankCustomSubject = () => ({
  _id: String(Date.now()) + Math.random().toString(36).slice(2),
  name: "",
  questionsCount: 10,
  timePerQuestion: 40,
  questions: [blankQuestion()],
});

// ─── Date/time helpers ────────────────────────────────────────────────────────

/**
 * Returns the first Saturday of the given month/year as a Date at 00:00 local time.
 * Mirrors the backend getFirstSaturday logic exactly.
 */
const firstSaturdayOf = (year, month) => {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0=Sun … 6=Sat
  const dayOfMonth = dayOfWeek === 6 ? 1 : 1 + ((6 - dayOfWeek + 7) % 7);
  const sat = new Date(year, month - 1, dayOfMonth);
  sat.setHours(0, 0, 0, 0);
  return sat;
};

/**
 * Compute the default startTime / endTime strings for a given month/year.
 * Returns objects with { startTime, endTime } as "YYYY-MM-DD HH:MM" strings.
 */
const buildDefaultTimes = (year, month) => {
  const start = firstSaturdayOf(year, month);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(end),
  };
};

/** Format a Date as "YYYY-MM-DD HH:MM" for display in a TextInput. */
const toDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

/**
 * Parse "YYYY-MM-DD HH:MM" back to a Date.
 * Returns null if the string is malformed or produces an invalid date.
 */
const parseDateTimeLocal = (str) => {
  if (!str || str.trim().length < 16) return null;
  const [datePart, timePart] = str.trim().split(" ");
  if (!datePart || !timePart) return null;
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  if ([y, mo, d, h, mi].some(isNaN)) return null;
  const dt = new Date(y, mo - 1, d, h, mi);
  return isNaN(dt.getTime()) ? null : dt;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * SubjectConfigRow
 * DB-backed subject config with:
 *  - topic multi-select (chips)
 *  - questionsCount field
 *  - timePerQuestion field
 */
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

  const isTopicSelected = (topicId) => (config.topics || []).includes(topicId);

  return (
    <View style={styles.subjectCard}>
      <View style={styles.subjectCardHeader}>
        <AppText fontWeight="bold">{subjectData?.name || "Subject"}</AppText>
        <Pressable onPress={onRemove}>
          <Ionicons name="trash-outline" size={20} color={colors.heart} />
        </Pressable>
      </View>

      {/* Topic multi-select */}
      {availableTopics.length > 0 ? (
        <>
          <AppText size="xsmall" style={styles.fieldLabel}>
            Topics{" "}
            <AppText size="xsmall" style={{ color: colors.medium }}>
              (leave all unselected = any topic)
            </AppText>
          </AppText>
          <View style={styles.topicChips}>
            {availableTopics.map((t) => {
              const selected = isTopicSelected(t._id);
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
          {(config.topics || []).length > 0 && (
            <Pressable
              onPress={() => onChange({ ...config, topics: [] })}
              style={{ alignSelf: "flex-start", marginBottom: 6 }}
            >
              <AppText size="xxsmall" style={{ color: colors.heart }}>
                Clear topic filter
              </AppText>
            </Pressable>
          )}
        </>
      ) : (
        <AppText
          size="xsmall"
          style={[styles.fieldLabel, { color: colors.medium }]}
        >
          No topics found for this subject — all questions will be included
        </AppText>
      )}

      <AppText size="xsmall" style={styles.fieldLabel}>
        Questions to serve
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
    </View>
  );
};

// ─── Prize editor ─────────────────────────────────────────────────────────────

const PrizeEditor = ({ place, ordinal, prize, onChange }) => {
  const isCash = prize?.type === "cash";
  return (
    <View style={styles.prizeEditorCard}>
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

      <AppText size="xsmall" style={styles.fieldLabel}>
        Prize Title
      </AppText>
      <TextInput
        style={styles.input}
        placeholder="e.g. Champion"
        value={prize?.title || ""}
        onChangeText={(v) => onChange({ ...prize, title: v })}
      />

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

// ─── Custom question editor ───────────────────────────────────────────────────

const CustomQuestionEditor = ({ question, index, onChange, onRemove }) => {
  const setCorrect = (answerIdx) => {
    onChange({
      ...question,
      answers: question.answers.map((a, i) => ({
        ...a,
        correct: i === answerIdx,
      })),
    });
  };

  const setAnswerText = (answerIdx, text) => {
    onChange({
      ...question,
      answers: question.answers.map((a, i) =>
        i === answerIdx ? { ...a, name: text } : a,
      ),
    });
  };

  return (
    <View style={styles.customQCard}>
      {/* Header */}
      <View style={styles.customQHeader}>
        <View style={styles.customQBadge}>
          <AppText
            fontWeight="black"
            size="xsmall"
            style={{ color: colors.white }}
          >
            Q{index + 1}
          </AppText>
        </View>
        <Pressable onPress={onRemove} style={{ marginLeft: "auto" }}>
          <Ionicons name="close-circle" size={20} color={colors.heart} />
        </Pressable>
      </View>

      {/* Question text */}
      <AppText size="xsmall" style={styles.fieldLabel}>
        Question
      </AppText>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={3}
        placeholder="Type the question here..."
        placeholderTextColor={colors.medium}
        value={question.question}
        onChangeText={(v) => onChange({ ...question, question: v })}
      />

      {/* Answer options */}
      <AppText size="xsmall" style={[styles.fieldLabel, { marginTop: 8 }]}>
        Answer Options{" "}
        <AppText size="xsmall" style={{ color: colors.medium }}>
          (tap radio to mark correct)
        </AppText>
      </AppText>
      {question.answers.map((ans, aIdx) => (
        <View key={aIdx} style={styles.answerRow}>
          <Pressable
            style={[styles.radioOuter, ans.correct && styles.radioOuterActive]}
            onPress={() => setCorrect(aIdx)}
          >
            {ans.correct && <View style={styles.radioInner} />}
          </Pressable>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            placeholder={`Option ${String.fromCharCode(65 + aIdx)}`}
            placeholderTextColor={colors.medium}
            value={ans.name}
            onChangeText={(v) => setAnswerText(aIdx, v)}
          />
        </View>
      ))}

      {/* Explanation */}
      <AppText size="xsmall" style={[styles.fieldLabel, { marginTop: 8 }]}>
        Explanation (optional)
      </AppText>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={2}
        placeholder="Why is that the correct answer?"
        placeholderTextColor={colors.medium}
        value={question.explanation}
        onChangeText={(v) => onChange({ ...question, explanation: v })}
      />

      {/* Timer override */}
      <AppText size="xsmall" style={styles.fieldLabel}>
        Seconds for this question
      </AppText>
      <TextInput
        style={[styles.input, { width: 80 }]}
        keyboardType="number-pad"
        value={String(question.timer || 40)}
        onChangeText={(v) =>
          onChange({ ...question, timer: parseInt(v, 10) || 40 })
        }
      />
    </View>
  );
};

// ─── Custom subject editor ────────────────────────────────────────────────────

const CustomSubjectEditor = ({ subject, subjectIndex, onChange, onRemove }) => {
  const updateQuestion = (qIdx, updated) => {
    const next = [...subject.questions];
    next[qIdx] = updated;
    onChange({ ...subject, questions: next });
  };

  const removeQuestion = (qIdx) => {
    onChange({
      ...subject,
      questions: subject.questions.filter((_, i) => i !== qIdx),
    });
  };

  const addQuestion = () => {
    onChange({
      ...subject,
      questions: [...subject.questions, blankQuestion()],
    });
  };

  const questionCountWarning =
    subject.questions.length < subject.questionsCount
      ? `⚠️ ${subject.questionsCount - subject.questions.length} more question(s) needed`
      : null;

  return (
    <View style={styles.customSubjectCard}>
      {/* Subject header */}
      <View style={styles.subjectCardHeader}>
        <View style={styles.customSubjectTag}>
          <AppText
            size="xxsmall"
            fontWeight="bold"
            style={{ color: colors.white }}
          >
            CUSTOM
          </AppText>
        </View>
        <TextInput
          style={[styles.input, { flex: 1, marginHorizontal: 8 }]}
          placeholder="Subject name (e.g. General Studies)"
          placeholderTextColor={colors.medium}
          value={subject.name}
          onChangeText={(v) => onChange({ ...subject, name: v })}
        />
        <Pressable onPress={onRemove}>
          <Ionicons name="trash-outline" size={20} color={colors.heart} />
        </Pressable>
      </View>

      {/* Config */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <AppText size="xsmall" style={styles.fieldLabel}>
            Questions to serve
          </AppText>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(subject.questionsCount || 10)}
            onChangeText={(v) =>
              onChange({ ...subject, questionsCount: parseInt(v, 10) || 1 })
            }
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <AppText size="xsmall" style={styles.fieldLabel}>
            Secs per question
          </AppText>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={String(subject.timePerQuestion || 40)}
            onChangeText={(v) =>
              onChange({ ...subject, timePerQuestion: parseInt(v, 10) || 40 })
            }
          />
        </View>
      </View>

      {questionCountWarning && (
        <AppText
          size="xsmall"
          style={{ color: colors.warning, marginBottom: 6 }}
        >
          {questionCountWarning}
        </AppText>
      )}

      {/* Question list */}
      <AppText
        fontWeight="bold"
        size="small"
        style={[styles.sectionHeader, { marginTop: 8 }]}
      >
        Questions ({subject.questions.length})
      </AppText>

      {subject.questions.map((q, qIdx) => (
        <CustomQuestionEditor
          key={q._id || qIdx}
          question={q}
          index={qIdx}
          onChange={(updated) => updateQuestion(qIdx, updated)}
          onRemove={() => removeQuestion(qIdx)}
        />
      ))}

      <Pressable style={styles.addQuestionBtn} onPress={addQuestion}>
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <AppText
          fontWeight="bold"
          size="small"
          style={{ color: colors.primary, marginLeft: 6 }}
        >
          Add Question
        </AppText>
      </Pressable>
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
  const [popper, setPopper] = useState({ vis: false });
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Tracks whether the manager has manually edited the time fields so we
  // don't clobber their changes when they switch month/year chips.
  const timesManuallyEdited = useRef(false);

  const now = new Date();

  const [form, setForm] = useState(() => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return {
      month: m,
      year: y,
      title: "Monthly Guru Quiz Tournament",
      rules:
        "Competition runs for 24 hours on the first Saturday of the month. One attempt per student. Highest score wins; ties broken by fastest completion time.",
      ...buildDefaultTimes(y, m),
      subjects: [],
      customSubjects: [],
      prizes: defaultPrizes(),
    };
  });

  useEffect(() => {
    if (!isManager) router.back();
  }, [isManager]);

  // Recompute default times whenever month or year changes,
  // but only if the manager hasn't manually edited them.
  useEffect(() => {
    if (timesManuallyEdited.current) return;
    const defaults = buildDefaultTimes(form.year, form.month);
    setForm((prev) => ({ ...prev, ...defaults }));
  }, [form.month, form.year]);

  const competitions = listData?.data || [];

  const loadCompetition = (comp) => {
    // Mark as manually edited so the month/year effect doesn't overwrite
    // the stored times after load.
    timesManuallyEdited.current = true;
    setSelectedId(comp._id);
    setForm({
      month: comp.month,
      year: comp.year,
      title: comp.title,
      rules: comp.rules || "",
      startTime: comp.startTime
        ? toDateTimeLocal(new Date(comp.startTime))
        : buildDefaultTimes(comp.year, comp.month).startTime,
      endTime: comp.endTime
        ? toDateTimeLocal(new Date(comp.endTime))
        : buildDefaultTimes(comp.year, comp.month).endTime,
      subjects: comp.subjects.map((s) => ({
        subject: s.subject?._id || s.subject,
        topics: (s.topics || []).map((t) =>
          typeof t === "object" ? t._id : t,
        ),
        questionsCount: s.questionsCount,
        timePerQuestion: s.timePerQuestion || 40,
      })),
      customSubjects: (comp.customSubjects || []).map((cs) => ({
        ...cs,
        questions: (cs.questions || []).map((q) => ({
          ...q,
          _id:
            q._id || String(Date.now()) + Math.random().toString(36).slice(2),
        })),
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

  const resetToFirstSaturday = () => {
    timesManuallyEdited.current = false;
    const defaults = buildDefaultTimes(form.year, form.month);
    setForm((prev) => ({ ...prev, ...defaults }));
  };

  const addDbSubject = (subjectId) => {
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

  const addCustomSubject = () => {
    setForm({
      ...form,
      customSubjects: [...form.customSubjects, blankCustomSubject()],
    });
  };

  /** Validate before save — returns an error string or null. */
  const validate = () => {
    for (const cs of form.customSubjects) {
      if (!cs.name.trim()) return "Each custom subject must have a name";
      if (cs.questions.length === 0)
        return `Custom subject "${cs.name}" has no questions`;
      for (let qIdx = 0; qIdx < cs.questions.length; qIdx++) {
        const q = cs.questions[qIdx];
        if (!q.question.trim())
          return `Custom subject "${cs.name}" — Q${qIdx + 1} has no question text`;
        const filled = q.answers.filter((a) => a.name.trim());
        if (filled.length < 2)
          return `Custom subject "${cs.name}" — Q${qIdx + 1} needs at least 2 answer options`;
        const hasCorrect = q.answers.some((a) => a.correct && a.name.trim());
        if (!hasCorrect)
          return `Custom subject "${cs.name}" — Q${qIdx + 1} must have a correct answer`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    // Validate datetime strings
    const startDate = parseDateTimeLocal(form.startTime);
    const endDate = parseDateTimeLocal(form.endTime);

    if (!startDate || !endDate) {
      setPopper({
        vis: true,
        type: "failed",
        msg: "Invalid start or end time — use the format YYYY-MM-DD HH:MM",
      });
      return;
    }

    if (endDate <= startDate) {
      setPopper({
        vis: true,
        type: "failed",
        msg: "End time must be after start time",
      });
      return;
    }

    const err = validate();
    if (err) {
      setPopper({ vis: true, type: "failed", msg: err });
      return;
    }

    const payload = {
      ...form,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };

    try {
      if (selectedId) {
        await updateCompetition({ id: selectedId, ...payload }).unwrap();
        setPopper({ vis: true, type: "success", msg: "Competition updated" });
      } else {
        const res = await createCompetition(payload).unwrap();
        setSelectedId(res.data?._id);
        setPopper({ vis: true, type: "success", msg: "Draft created" });
      }
      refetchList();
    } catch (e) {
      setPopper({
        vis: true,
        type: "failed",
        msg: e?.data?.message || "Save failed",
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
    } catch (e) {
      setPopper({
        vis: true,
        type: "failed",
        msg: e?.data?.message || "Publish failed",
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
    } catch (e) {
      setPopper({
        vis: true,
        type: "failed",
        msg: e?.data?.message || "Failed to publish results",
      });
    }
  };

  const usedSubjectIds = form.subjects.map((s) => s.subject?._id || s.subject);
  const availableSubjects = (subjectsData?.data || []).filter(
    (s) => !usedSubjectIds.includes(s._id),
  );

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
                  timesManuallyEdited.current = false;
                  setSelectedId(null);
                  const y = now.getFullYear();
                  const m = now.getMonth() + 1;
                  setForm({
                    month: m,
                    year: y,
                    title: "Monthly Guru Quiz Tournament",
                    rules: form.rules,
                    ...buildDefaultTimes(y, m),
                    subjects: [],
                    customSubjects: [],
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

          {/* Title */}
          <AppText size="xsmall" style={styles.fieldLabel}>
            Title
          </AppText>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />

          {/* Month chips */}
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

          {/* Year */}
          <AppText size="xsmall" style={styles.fieldLabel}>
            Year
          </AppText>
          <TextInput
            style={[styles.input, { width: 100 }]}
            keyboardType="number-pad"
            value={String(form.year)}
            onChangeText={(v) =>
              setForm({ ...form, year: parseInt(v, 10) || now.getFullYear() })
            }
          />

          {/* ── Competition Window ── */}
          <View style={[styles.sectionHeaderRow, styles.windowSectionHeader]}>
            <View style={styles.windowSectionTitleRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <AppText fontWeight="bold" style={styles.sectionHeader}>
                Competition Window
              </AppText>
            </View>
            <AppText
              size="xsmall"
              style={{ color: colors.medium, marginTop: 2 }}
            >
              Auto-set to the first Saturday of the selected month
            </AppText>
          </View>

          <AppText size="xsmall" style={styles.fieldLabel}>
            Start (YYYY-MM-DD HH:MM)
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="2025-06-07 00:00"
            placeholderTextColor={colors.medium}
            value={form.startTime}
            onChangeText={(v) => {
              timesManuallyEdited.current = true;
              setForm({ ...form, startTime: v });
            }}
          />

          <AppText size="xsmall" style={styles.fieldLabel}>
            End (YYYY-MM-DD HH:MM)
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="2025-06-08 00:00"
            placeholderTextColor={colors.medium}
            value={form.endTime}
            onChangeText={(v) => {
              timesManuallyEdited.current = true;
              setForm({ ...form, endTime: v });
            }}
          />

          <Pressable
            onPress={resetToFirstSaturday}
            style={styles.resetTimesBtn}
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <AppText size="xsmall" style={{ color: colors.primary }}>
              Reset to first Saturday
            </AppText>
          </Pressable>

          {/* Rules */}
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

          {/* ── DB Subjects ── */}
          <View style={styles.sectionHeaderRow}>
            <AppText fontWeight="bold" style={styles.sectionHeader}>
              DB Subjects & Questions
            </AppText>
            <AppText size="xsmall" style={{ color: colors.medium }}>
              Questions fetched from database
            </AppText>
          </View>

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
              onRemove={() =>
                setForm({
                  ...form,
                  subjects: form.subjects.filter((_, i) => i !== idx),
                })
              }
            />
          ))}

          {showSubjectPicker ? (
            <View style={styles.pickerBox}>
              {availableSubjects.length === 0 ? (
                <AppText
                  size="small"
                  style={{ color: colors.medium, padding: 8 }}
                >
                  All subjects already added
                </AppText>
              ) : (
                availableSubjects.map((s) => (
                  <Pressable
                    key={s._id}
                    style={styles.pickerItem}
                    onPress={() => addDbSubject(s._id)}
                  >
                    <AppText
                      fontWeight="medium"
                      style={{
                        textTransform: "capitalize",
                        color: colors.medium,
                      }}
                    >
                      {s.name}
                    </AppText>
                    <AppText
                      size="xsmall"
                      style={{
                        color: colors.medium,
                      }}
                    >
                      {s.topics?.length || 0} topics
                    </AppText>
                  </Pressable>
                ))
              )}
              <Pressable
                onPress={() => setShowSubjectPicker(false)}
                style={{ marginTop: 8 }}
              >
                <AppText style={{ color: colors.heart }}>Cancel</AppText>
              </Pressable>
            </View>
          ) : (
            <AppButton
              title="Add DB Subject"
              type="white"
              onPress={() => setShowSubjectPicker(true)}
              contStyle={{ marginBottom: 16 }}
            />
          )}

          {/* ── Custom Subjects ── */}
          <View style={styles.sectionHeaderRow}>
            <AppText fontWeight="bold" style={styles.sectionHeader}>
              Custom Subjects & Questions
            </AppText>
            <AppText size="xsmall" style={{ color: colors.medium }}>
              Not saved to the question bank
            </AppText>
          </View>

          {form.customSubjects.length === 0 && (
            <View style={styles.emptyCustomBox}>
              <Ionicons name="flask-outline" size={24} color={colors.medium} />
              <AppText
                size="small"
                style={{
                  color: colors.medium,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                No custom subjects yet.{"\n"}Add one to include
                competition-exclusive questions.
              </AppText>
            </View>
          )}

          {form.customSubjects.map((cs, idx) => (
            <CustomSubjectEditor
              key={cs._id || idx}
              subject={cs}
              subjectIndex={idx}
              onChange={(updated) => {
                const next = [...form.customSubjects];
                next[idx] = updated;
                setForm({ ...form, customSubjects: next });
              }}
              onRemove={() =>
                setForm({
                  ...form,
                  customSubjects: form.customSubjects.filter(
                    (_, i) => i !== idx,
                  ),
                })
              }
            />
          ))}

          <AppButton
            title="Add Custom Subject"
            type="white"
            onPress={addCustomSubject}
            contStyle={{ marginBottom: 16 }}
          />

          {/* ── Prizes ── */}
          <AppText fontWeight="bold" style={styles.sectionHeader}>
            Prizes
          </AppText>

          {[
            { place: "first", ordinal: "1st" },
            { place: "second", ordinal: "2nd" },
            { place: "third", ordinal: "3rd" },
          ].map(({ place, ordinal }) => (
            <PrizeEditor
              key={place}
              place={place}
              ordinal={ordinal}
              prize={form.prizes[place]}
              onChange={(updated) =>
                setForm({
                  ...form,
                  prizes: { ...form.prizes, [place]: updated },
                })
              }
            />
          ))}

          {/* ── Actions ── */}
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
                contStyle={{ marginLeft: 10 }}
              />
            )}
          </View>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.unchange },
  body: { flex: 1, flexDirection: "row" },

  // List panel
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
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14 },

  // Form panel
  formPanel: { flex: 1, padding: 16 },
  fieldLabel: { color: colors.medium, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.lighter,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.white,
    fontSize: 14,
    fontFamily: "sf-medium",
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },
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

  sectionHeaderRow: { marginTop: 16, marginBottom: 4 },
  sectionHeader: { color: colors.medium, marginBottom: 4 },

  // Competition window section
  windowSectionHeader: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  windowSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resetTimesBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  // DB subject card
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  topicChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 4,
  },

  // Subject picker dropdown
  pickerBox: {
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lighter,
  },
  pickerItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lighter,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Custom subject
  customSubjectCard: {
    backgroundColor: colors.light,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + "55",
  },
  customSubjectTag: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emptyCustomBox: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.light,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lighter,
    borderStyle: "dashed",
  },

  // Custom question card
  customQCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.lighter,
  },
  customQHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  customQBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  // Answer row
  answerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.lighter,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  addQuestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
  },

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
  typeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
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
  amountRow: { flexDirection: "row", gap: 8 },
  currencyInput: { width: 60, textAlign: "center" },

  // Bottom actions
  actions: { flexDirection: "row", marginTop: 20 },
  publishResultsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    flexWrap: "wrap",
  },
  publishedBox: { backgroundColor: "rgba(74,222,128,0.12)" },
});
