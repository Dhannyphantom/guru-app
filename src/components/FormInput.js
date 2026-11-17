import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormikContext } from "formik";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  LinearTransition,
  ZoomIn,
  ZoomOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import colors from "../helpers/colors";
import AppText from "./AppText";
import { calenderMonths } from "../helpers/dataStore";
import { capFirstLetter } from "../helpers/helperFunctions";
import { scaleFont } from "../helpers/scaleFont";
import LottieAnimator from "./LottieAnimator";
import PopUpModal from "./PopUpModal";

const SEARCH_THRESHOLD = 7;
const ITEM_H = 48;
const WHEEL_ROWS = 5;
const LOCKED_UNTIL_STATE = ["lga"];
const FIELD_H = 64;

const thisYear = new Date().getFullYear();
const pastYears = Array.from({ length: 25 }, (_, i) => thisYear - 5 - i);
const upcomingYears = [thisYear, thisYear + 1];

const tint = (alpha) =>
  `${colors.primary}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

// Resolved on the JS thread: worklets cannot call these functions.
const LABEL_REST = scaleFont(14);
const LABEL_LIFTED = scaleFont(11);

const sameId = (a, b) => String(a) === String(b);

const useFieldWidth = () => {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" ? "100%" : width * 0.9;
};

/* ------------------------------------------------------------------ */
/* Field shell: floating label, focus ring, error state                */
/* ------------------------------------------------------------------ */

const Field = ({
  label,
  prompt,
  lifted = false,
  focused = false,
  error = false,
  nudge = 0,
  dimmed = false,
  leading,
  trailing,
  onPress,
  style,
  children,
  ...rest
}) => {
  const fieldWidth = useFieldWidth();
  const focus = useSharedValue(0);
  const invalid = useSharedValue(0);
  const lift = useSharedValue(lifted ? 1 : 0);
  const shiftX = useSharedValue(0);
  const press = useSharedValue(0);

  const shake = () => {
    shiftX.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withRepeat(withTiming(6, { duration: 80 }), 4, true),
      withTiming(0, { duration: 50 }),
    );
  };

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused]);

  useEffect(() => {
    lift.value = withTiming(lifted ? 1 : 0, { duration: 160 });
  }, [lifted]);

  useEffect(() => {
    invalid.value = withTiming(error ? 1 : 0, { duration: 180 });
    if (error) shake();
  }, [error]);

  useEffect(() => {
    if (nudge) shake();
  }, [nudge]);

  const shell = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [colors.light, colors.white],
    ),
    borderColor: interpolateColor(
      invalid.value,
      [0, 1],
      [
        interpolateColor(focus.value, [0, 1], [colors.lightly, colors.primary]),
        colors.heartDark,
      ],
    ),
    borderBottomColor: interpolateColor(
      invalid.value,
      [0, 1],
      [
        interpolateColor(
          focus.value,
          [0, 1],
          [colors.lightly, colors.primaryDeep],
        ),
        colors.heartDark,
      ],
    ),
    transform: [{ translateX: shiftX.value }, { translateY: press.value * 3 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(lift.value, [0, 1], [21, 9]),
    fontSize: interpolate(lift.value, [0, 1], [LABEL_REST, LABEL_LIFTED]),
    color: interpolateColor(
      invalid.value,
      [0, 1],
      [
        interpolateColor(
          focus.value,
          [0, 1],
          [colors.medium, colors.primaryDeep],
        ),
        colors.heartDark,
      ],
    ),
  }));

  const text = lifted ? (label ?? prompt) : (prompt ?? label);

  return (
    <Animated.View
      {...rest}
      style={[
        styles.field,
        { width: fieldWidth },
        dimmed && styles.dimmed,
        shell,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 70 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, {
            damping: 18,
            stiffness: 380,
            mass: 0.8,
          });
        }}
        accessible={Boolean(onPress)}
        style={styles.fieldRow}
      >
        {leading}
        <View style={styles.fieldBody}>
          {Boolean(text) && (
            <Animated.Text
              pointerEvents="none"
              numberOfLines={1}
              style={[styles.label, labelStyle]}
            >
              {text}
            </Animated.Text>
          )}
          {children}
        </View>
        {trailing}
      </Pressable>
    </Animated.View>
  );
};

const FieldError = ({ text }) => (
  <Animated.View entering={FadeInDown.duration(180)} style={styles.errorRow}>
    <Ionicons name="alert-circle" size={15} color={colors.heartDark} />
    <AppText style={styles.errorText} size={12} fontWeight="medium">
      {text}
    </AppText>
  </Animated.View>
);

/** Chunky button with a darker lip that sinks when pressed. */
const SheetButton = ({ title, onPress, icon = "checkmark" }) => {
  const sink = useSharedValue(0);
  const face = useAnimatedStyle(() => ({
    transform: [{ translateY: sink.value * 4 }],
  }));

  return (
    <View style={styles.sheetBtnWrap}>
      <View style={styles.sheetBtnLip} />
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          sink.value = withTiming(1, { duration: 70 });
        }}
        onPressOut={() => {
          sink.value = withSpring(0, {
            damping: 20,
            stiffness: 380,
            mass: 0.8,
          });
        }}
      >
        <Animated.View style={[styles.sheetBtnFace, face]}>
          <AppText fontWeight="heavy" size={15} style={styles.sheetBtnText}>
            {title}
          </AppText>
          {Boolean(icon) && <Ionicons name={icon} size={18} color="#fff" />}
        </Animated.View>
      </Pressable>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Dropdown                                                            */
/* ------------------------------------------------------------------ */

const Tags = ({ data, removeTag }) => {
  const fieldWidth = useFieldWidth();
  if (!data?.length) return null;

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(24).stiffness(220)}
      style={[styles.tags, { width: fieldWidth }]}
    >
      {data.map((item) => (
        <Animated.View
          key={String(item._id ?? item.name)}
          entering={ZoomIn.springify().damping(16)}
          exiting={ZoomOut.duration(140)}
          layout={LinearTransition}
          style={styles.tag}
        >
          <AppText fontWeight="bold" size={12.5} style={styles.tagText}>
            {item.name}
          </AppText>
          <Pressable
            hitSlop={8}
            onPress={() => removeTag(item)}
            accessibilityLabel={`Remove ${item.name}`}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.primaryDeep}
            />
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const OptionRow = ({ item, selected, multiple, hideText, extras, onPress }) => (
  <Pressable
    onPress={() => onPress(item)}
    accessibilityRole={multiple ? "checkbox" : "button"}
    accessibilityState={{ selected, checked: selected }}
    style={({ pressed }) => [
      styles.option,
      selected && styles.optionOn,
      pressed && !selected && styles.optionPressed,
    ]}
  >
    <View style={{ flex: 1 }}>
      {!hideText && (
        <AppText
          fontWeight={selected ? "bold" : "medium"}
          style={selected && { color: colors.primaryDeep }}
        >
          {capFirstLetter(item.name)}
        </AppText>
      )}
      {extras?.map((extra) => (
        <AppText key={extra?.name} {...extra}>
          {item[extra?.name]}
        </AppText>
      ))}
    </View>

    {selected ? (
      <Animated.View
        entering={ZoomIn.springify().damping(14)}
        style={styles.tickOn}
      >
        <Ionicons name="checkmark" size={15} color="#fff" />
      </Animated.View>
    ) : (
      multiple && <View style={styles.tickOff} />
    )}
  </Pressable>
);

const OptionList = ({
  data,
  headerText,
  multiple,
  hideText,
  extras,
  isSelected,
  selectedCount,
  onPick,
  onClear,
  onDone,
}) => {
  const [query, setQuery] = useState("");
  const listRef = useRef(null);
  const showSearch = data.length > SEARCH_THRESHOLD;

  const needle = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      needle
        ? data.filter((d) =>
            String(d?.name ?? "")
              .toLowerCase()
              .includes(needle),
          )
        : data,
    [data, needle],
  );

  useEffect(() => {
    if (multiple) return;
    const at = data.findIndex(isSelected);
    if (at < 4) return;
    const t = setTimeout(
      () =>
        listRef.current?.scrollToIndex({
          index: at,
          viewPosition: 0.35,
          animated: false,
        }),
      80,
    );
    return () => clearTimeout(t);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <OptionRow
        item={item}
        selected={isSelected(item)}
        multiple={multiple}
        hideText={hideText}
        extras={extras}
        onPress={onPick}
      />
    ),
    [isSelected, multiple, hideText, extras, onPick],
  );

  return (
    <View style={styles.sheetBody}>
      {showSearch && (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.medium} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${headerText ?? "options"}`}
            placeholderTextColor={colors.medium}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={10} onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.medium} />
            </Pressable>
          )}
        </View>
      )}

      {multiple && (
        <View style={styles.countRow}>
          <AppText
            fontWeight="bold"
            size={12.5}
            style={{ color: colors.medium }}
          >
            {selectedCount ? `${selectedCount} selected` : "Tap to select"}
          </AppText>
          {selectedCount > 0 && (
            <Pressable hitSlop={10} onPress={onClear}>
              <AppText
                fontWeight="bold"
                size={12.5}
                style={{ color: colors.warningDark }}
              >
                Clear all
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        ref={listRef}
        data={list}
        renderItem={renderItem}
        extraData={selectedCount}
        keyExtractor={(item, idx) =>
          String(item._id ?? item.code ?? item.name ?? idx)
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={7}
        onScrollToIndexFailed={(info) =>
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          })
        }
        style={styles.optionList}
        contentContainerStyle={styles.optionListContent}
        ListEmptyComponent={
          <Animated.View entering={FadeInDown} style={styles.empty}>
            <Ionicons
              name={needle ? "search-outline" : "file-tray-outline"}
              size={34}
              color={colors.lightly}
            />
            <AppText style={styles.emptyText} fontWeight="medium">
              {needle ? `Nothing matches "${query.trim()}"` : "No data yet"}
            </AppText>
          </Animated.View>
        }
      />

      {multiple && (
        <View style={styles.sheetFooter}>
          <SheetButton
            title={selectedCount ? `Done (${selectedCount})` : "Done"}
            onPress={onDone}
          />
        </View>
      )}
    </View>
  );
};

const optionMatches = (item, current) => {
  if (current == null || current === "") return false;
  if (typeof current === "object") {
    if (current._id != null) return sameId(current._id, item._id);
    if (current.code != null) return current.code === item.code;
    return current.name === item.name;
  }
  return current === (item.value ?? item.name);
};

const DropdownInput = ({
  name,
  data = [],
  multiple,
  getId = true,
  fetcher,
  headerText,
  disabled,
  isLoading,
  items = [],
  hideText,
  placeholder,
  useDefaultModalHeight,
  maxModalHeight,
  onValueSelected,
  error = false,
  style,
  ...otherProps
}) => {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const { setFieldValue, setFieldTouched, values } = useFormikContext();

  const current = values[name];
  const picked = multiple && Array.isArray(current) ? current : [];
  const locked =
    disabled || (LOCKED_UNTIL_STATE.includes(name) && !values.state);

  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  useEffect(() => {
    if (fetcher && typeof fetcher === "object" && fetcher.state) {
      fetcher.func?.();
    }
  }, [fetcher?.state]);

  const toggleMany = useCallback(
    (item) => {
      const exists = picked.some((p) => sameId(p._id, item._id));
      const next = exists
        ? picked.filter((p) => !sameId(p._id, item._id))
        : [...picked, { name: item.name, _id: item._id }];
      onValueSelected?.(next);
      setFieldValue(name, next);
    },
    [picked, name, onValueSelected, setFieldValue],
  );

  const clearMany = () => {
    onValueSelected?.([]);
    setFieldValue(name, []);
  };

  const pickOne = useCallback(
    (item) => {
      let value = getId ? item : (item?.value ?? item?.name);
      if (name === "bank") value = { code: item.code, name: item.name };
      setFieldValue(name, value);
      onValueSelected?.(value);
      setOpen(false);
    },
    [getId, name, onValueSelected, setFieldValue],
  );

  const closeSheet = () => {
    setOpen(false);
    setFieldTouched(name, true, false);
  };

  const isSelected = useCallback(
    (item) =>
      multiple
        ? picked.some((p) => sameId(p._id, item._id))
        : optionMatches(item, current),
    [multiple, picked, current],
  );

  let display = "";
  if (multiple) {
    display = picked.map((p) => p.name).join(", ");
  } else if (current) {
    if (typeof current === "object") display = current.name ?? "";
    else {
      const hit = data.find((d) => (d.value ?? d.name) === current);
      display = hit?.name ?? String(current);
    }
  }

  const label = headerText ?? placeholder;
  const tall =
    useDefaultModalHeight === undefined
      ? data.length > SEARCH_THRESHOLD
      : !useDefaultModalHeight;

  const openSheet = () => {
    if (locked) {
      setNudge((n) => n + 1);
      return;
    }
    Keyboard.dismiss();
    setOpen(true);
  };

  return (
    <>
      <Field
        label={label}
        prompt={placeholder ?? label}
        lifted={Boolean(display) || open}
        focused={open}
        error={error}
        nudge={nudge}
        dimmed={Boolean(locked)}
        onPress={openSheet}
        style={style}
        trailing={
          <View style={styles.trailing}>
            {multiple && picked.length > 0 && (
              <Animated.View
                key={picked.length}
                entering={ZoomIn.springify().damping(14)}
                style={styles.countBadge}
              >
                <AppText
                  fontWeight="heavy"
                  size={11.5}
                  style={{ color: "#fff" }}
                >
                  {picked.length}
                </AppText>
              </Animated.View>
            )}
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={18} color={colors.medium} />
            </Animated.View>
          </View>
        }
        {...otherProps}
      >
        <AppText numberOfLines={1} fontWeight="medium" style={styles.value}>
          {display ? capFirstLetter(display) : " "}
        </AppText>
        <LottieAnimator
          visible={Boolean(isLoading)}
          absolute
          size={50}
          contStyle={{ alignItems: "flex-end" }}
          wTransparent
        />
      </Field>

      <PopUpModal
        title={headerText ?? placeholder}
        useDefaultHeight={!tall}
        mainStyle={maxModalHeight ? { maxHeight: maxModalHeight } : undefined}
        visible={open}
        setVisible={(next) => (next ? setOpen(true) : closeSheet())}
      >
        {({ closeModal }) => (
          <OptionList
            data={data}
            headerText={headerText}
            multiple={multiple}
            hideText={hideText}
            extras={items}
            isSelected={isSelected}
            selectedCount={picked.length}
            onPick={multiple ? toggleMany : pickOne}
            onClear={clearMany}
            onDone={closeModal}
          />
        )}
      </PopUpModal>

      {multiple && <Tags data={picked} removeTag={toggleMany} />}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Date picker (scroll wheels)                                         */
/* ------------------------------------------------------------------ */

const toParts = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
};

const formatParts = (p) =>
  `${p.day} ${calenderMonths[p.month].name}, ${p.year}`;

const daysIn = (year, month) => new Date(Number(year), month + 1, 0).getDate();

// Rows are plain and memoised: nothing runs per scroll frame, so the wheels
// stay on the native scroll thread and only update once a spin settles.
const WheelRow = memo(({ index, label, selected, onPick }) => (
  <Pressable onPress={() => onPick(index)} style={styles.wheelRow}>
    <AppText
      fontWeight={selected ? "heavy" : "medium"}
      size={selected ? 19 : 16}
      style={{ color: selected ? colors.primaryDeep : colors.medium }}
    >
      {label}
    </AppText>
  </Pressable>
));

const Wheel = ({ items, value, onChange, grow = 1 }) => {
  const scroller = useRef(null);
  const placed = useRef(false);

  const index = Math.max(
    0,
    items.findIndex((it) => sameId(it.value, value)),
  );
  const settled = useRef(index);
  const latest = useRef({ items, onChange });
  latest.current = { items, onChange };

  const settle = useCallback((offsetY) => {
    const { items: list, onChange: emit } = latest.current;
    const next = Math.min(
      Math.max(Math.round(offsetY / ITEM_H), 0),
      list.length - 1,
    );
    if (next === settled.current) return;
    settled.current = next;
    emit(list[next].value);
  }, []);

  const pick = useCallback(
    (i) => {
      scroller.current?.scrollTo({ y: i * ITEM_H, animated: true });
      settle(i * ITEM_H);
    },
    [settle],
  );

  useEffect(() => {
    if (index === settled.current) return;
    settled.current = index;
    scroller.current?.scrollTo({ y: index * ITEM_H, animated: true });
  }, [index]);

  const edge = ITEM_H * ((WHEEL_ROWS - 1) / 2);

  return (
    <View style={{ flex: grow, height: ITEM_H * WHEEL_ROWS }}>
      <ScrollView
        ref={scroller}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingVertical: edge }}
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          scroller.current?.scrollTo({ y: index * ITEM_H, animated: false });
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (Platform.OS === "android") return;
          const v = e.nativeEvent.velocity;
          if (!v || Math.abs(v.y) < 0.1) settle(e.nativeEvent.contentOffset.y);
        }}
      >
        {items.map((it, i) => (
          <WheelRow
            key={String(it.value)}
            index={i}
            label={it.label}
            selected={i === index}
            onPick={pick}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const DatePicker = ({ initial, years, onConfirm }) => {
  const [parts, setParts] = useState(initial);

  const dim = daysIn(parts.year, parts.month);
  const day = Math.min(parts.day, dim);

  const dayItems = useMemo(
    () =>
      Array.from({ length: dim }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
    [dim],
  );
  const monthItems = useMemo(
    () => calenderMonths.map((m, i) => ({ value: i, label: m.name })),
    [],
  );
  const yearItems = useMemo(
    () => years.map((y) => ({ value: y, label: String(y) })),
    [years],
  );

  const setDay = useCallback((v) => setParts((p) => ({ ...p, day: v })), []);
  const setMonth = useCallback(
    (v) => setParts((p) => ({ ...p, month: v })),
    [],
  );
  const setYear = useCallback((v) => setParts((p) => ({ ...p, year: v })), []);

  const today = toParts(new Date());
  const canJumpToday = years.some((y) => sameId(y, today.year));

  return (
    <View style={styles.pickerBody}>
      <View style={styles.previewRow}>
        <AppText
          fontWeight="heavy"
          size={24}
          style={{ color: colors.primaryDeep }}
        >
          {formatParts({ ...parts, day })}
        </AppText>
        {canJumpToday && (
          <Pressable
            onPress={() => setParts(today)}
            style={({ pressed }) => [
              styles.todayChip,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={colors.primaryDeep}
            />
            <AppText
              fontWeight="bold"
              size={12}
              style={{ color: colors.primaryDeep }}
            >
              Today
            </AppText>
          </Pressable>
        )}
      </View>

      <View style={styles.wheels}>
        <View pointerEvents="none" style={styles.band} />
        <Wheel items={dayItems} value={day} onChange={setDay} grow={1} />
        <Wheel
          items={monthItems}
          value={parts.month}
          onChange={setMonth}
          grow={2}
        />
        <Wheel
          items={yearItems}
          value={parts.year}
          onChange={setYear}
          grow={1.3}
        />
        <View pointerEvents="none" style={[styles.fade, styles.fadeTop]} />
        <View pointerEvents="none" style={[styles.fade, styles.fadeBottom]} />
      </View>

      <SheetButton
        title="Confirm date"
        onPress={() =>
          onConfirm(new Date(Number(parts.year), parts.month, day, 8))
        }
      />
    </View>
  );
};

const DateModal = ({
  name,
  futureYear,
  range = [],
  placeholder,
  headerText,
  error = false,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const { values, setFieldValue, setFieldTouched } = useFormikContext();

  const years =
    range && Boolean(range[0]) ? range : futureYear ? upcomingYears : pastYears;

  const chosen = toParts(values[name]);
  const label = headerText ?? placeholder;

  const startAt = () => {
    if (chosen) return chosen;
    const t = toParts(new Date());
    const fits = years.some((y) => sameId(y, t.year));
    return { ...t, year: fits ? t.year : years[0] };
  };

  const confirm = (date) => {
    setFieldValue(name, date);
    setFieldTouched(name, true, false);
    setOpen(false);
  };

  return (
    <>
      <Field
        label={label}
        prompt={placeholder ?? label}
        lifted={Boolean(chosen) || open}
        focused={open}
        error={error}
        style={style}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        trailing={
          <Ionicons name="calendar-outline" size={19} color={colors.medium} />
        }
      >
        <AppText numberOfLines={1} fontWeight="medium" style={styles.value}>
          {chosen ? formatParts(chosen) : " "}
        </AppText>
      </Field>

      <PopUpModal
        title={label}
        subtitle="Scroll each column to set the date"
        useDefaultHeight
        visible={open}
        setVisible={setOpen}
      >
        <DatePicker initial={startAt()} years={years} onConfirm={confirm} />
      </PopUpModal>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Text input                                                          */
/* ------------------------------------------------------------------ */

const FormInput = ({
  placeholder,
  isLoading,
  disabled,
  headerText,
  LeftComponent,
  secureTextEntry,
  style,
  error = false,
  valid = false,
  onFocus,
  onBlur,
  ...otherProps
}) => {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const hasText = String(otherProps.value ?? "").length > 0;
  const canClear =
    focused &&
    hasText &&
    !secureTextEntry &&
    !disabled &&
    otherProps.onChangeText;
  const label = headerText ?? placeholder;

  const trailing = (isLoading || canClear || secureTextEntry || valid) && (
    <View style={styles.trailing}>
      {isLoading && (
        <LottieAnimator visible={isLoading} style={{ width: 55, height: 60 }} />
      )}

      {canClear && (
        <Animated.View
          entering={ZoomIn.duration(140)}
          exiting={ZoomOut.duration(100)}
        >
          <Pressable
            hitSlop={10}
            onPress={() => {
              otherProps.onChangeText("");
              inputRef.current?.focus();
            }}
            accessibilityLabel="Clear text"
          >
            <Ionicons name="close-circle" size={18} color={colors.medium} />
          </Pressable>
        </Animated.View>
      )}

      {secureTextEntry && (
        <Pressable
          hitSlop={10}
          onPress={() => setHidden((h) => !h)}
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
        >
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={hidden ? colors.medium : colors.primary}
          />
        </Pressable>
      )}

      {valid && !focused && !secureTextEntry && !isLoading && (
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.primaryDeep}
          />
        </Animated.View>
      )}
    </View>
  );

  return (
    <Field
      label={label}
      prompt={placeholder ?? label}
      lifted={focused || hasText}
      focused={focused}
      error={error}
      dimmed={Boolean(disabled)}
      onPress={() => inputRef.current?.focus()}
      leading={
        LeftComponent ? (
          <View style={styles.leading}>
            <LeftComponent />
          </View>
        ) : null
      }
      trailing={trailing || null}
      style={style}
    >
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder=""
        secureTextEntry={hidden}
        editable={!disabled}
        selectionColor={colors.primary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...otherProps}
      />
    </Field>
  );
};

/* ------------------------------------------------------------------ */
/* Formik wrapper                                                      */
/* ------------------------------------------------------------------ */

export const FormikInput = ({
  name,
  placeholder,
  headerText,
  isLoading,
  disabled,
  getId,
  rangeYrs,
  keyboardType,
  LeftComponent,
  data,
  hideText,
  fetcher,
  multiple,
  items = [],
  onValueSelected,
  style,
  type = "input",
  futureYear,
  showErr = true,
  ...otherProps
}) => {
  const { setFieldTouched, handleChange, values, touched, errors } =
    useFormikContext();

  const rawError = errors[name];
  const errorText =
    rawError && typeof rawError === "object"
      ? Object.values(rawError).join("\n")
      : rawError;

  const hasError = Boolean(touched[name] && rawError);
  const hasValue = String(values[name] ?? "").length > 0;

  return (
    <>
      {type === "input" && (
        <FormInput
          onBlur={() => setFieldTouched(name)}
          onChangeText={handleChange(name)}
          disabled={disabled}
          LeftComponent={LeftComponent}
          style={style}
          isLoading={isLoading}
          error={hasError}
          valid={Boolean(touched[name] && !rawError && hasValue)}
          keyboardType={name === "email" ? "email-address" : keyboardType}
          onChange={() => setFieldTouched(name, true, true)}
          value={values[name]}
          headerText={headerText}
          placeholder={placeholder}
          {...otherProps}
        />
      )}

      {type === "dropdown" && (
        <DropdownInput
          name={name}
          multiple={multiple}
          disabled={disabled}
          isLoading={isLoading}
          fetcher={fetcher}
          data={data}
          items={items}
          headerText={headerText}
          hideText={hideText}
          onValueSelected={onValueSelected}
          getId={getId}
          placeholder={placeholder}
          error={hasError}
          style={style}
          {...otherProps}
        />
      )}

      {type === "date" && (
        <DateModal
          name={name}
          futureYear={futureYear}
          range={rangeYrs}
          placeholder={placeholder}
          headerText={headerText}
          error={hasError}
          style={style}
        />
      )}

      {hasError && showErr && <FieldError text={errorText} />}
    </>
  );
};

export default FormInput;

const styles = StyleSheet.create({
  field: {
    minHeight: FIELD_H,
    alignSelf: "center",
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  dimmed: {
    opacity: 0.5,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: FIELD_H - 7,
    paddingHorizontal: 16,
    columnGap: 12,
  },
  fieldBody: {
    flex: 1,
    justifyContent: "center",
    minHeight: FIELD_H - 7,
  },
  label: {
    position: "absolute",
    left: 0,
    right: 0,
    fontFamily: "sf-medium",
  },
  leading: {
    justifyContent: "center",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
  },
  value: {
    paddingTop: 20,
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    fontFamily: "sf-medium",
    fontSize: scaleFont(14),
    color: "black",
    paddingTop: 20,
    paddingBottom: 6,
    paddingHorizontal: 0,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 5,
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 24,
  },
  errorText: {
    color: colors.heartDark,
    textAlign: "center",
    flexShrink: 1,
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "center",
    columnGap: 8,
    rowGap: 8,
    marginTop: -4,
    marginBottom: 16,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    paddingVertical: 7,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: tint(0.1),
  },
  tagText: {
    color: colors.primaryDeep,
  },

  sheetBody: {
    flexShrink: 1,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    height: 50,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.light,
  },
  searchInput: {
    flex: 1,
    fontFamily: "sf-medium",
    fontSize: scaleFont(14),
    color: "black",
    paddingVertical: 0,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  optionList: {
    flexShrink: 1,
  },
  optionListContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    rowGap: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  optionOn: {
    backgroundColor: tint(0.1),
  },
  optionPressed: {
    backgroundColor: colors.light,
  },
  tickOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  tickOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 2,
    borderColor: colors.lightly,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    rowGap: 10,
  },
  emptyText: {
    color: colors.medium,
  },
  sheetFooter: {
    paddingTop: 10,
  },

  sheetBtnWrap: {
    paddingBottom: 4,
    marginHorizontal: 20,
  },
  sheetBtnLip: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: colors.primaryDeep,
  },
  sheetBtnFace: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    backgroundColor: colors.primary,
  },
  sheetBtnText: {
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  pickerBody: {
    paddingBottom: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingBottom: 8,
    minHeight: 48,
  },
  todayChip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: tint(0.1),
  },
  wheels: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_H * ((WHEEL_ROWS - 1) / 2),
    height: ITEM_H,
    borderRadius: 16,
    backgroundColor: tint(0.1),
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_H * 1.6,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  wheelRow: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
});
