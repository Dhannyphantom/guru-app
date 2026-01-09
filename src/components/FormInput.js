import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  LinearTransition,
  SlideInDown,
  SlideInUp,
} from "react-native-reanimated";

import colors from "../helpers/colors";
import AppText from "./AppText";
import { calenderMonths, PAD_BOTTOM } from "../helpers/dataStore";
import SearchBar from "./SearchBar";
import { capFirstLetter } from "../helpers/helperFunctions";
import { BlurView } from "expo-blur";
import AppButton from "./AppButton";
// import { useLazyFetchBanksQuery } from "../context/usersSlice";
import LottieAnimator from "./LottieAnimator";
import { nanoid } from "@reduxjs/toolkit";

import AnimatedPressable from "./AnimatedPressable";
import PopUpModal from "./PopUpModal";
import ListEmpty from "./ListEmpty";

const { width, height } = Dimensions.get("screen");
const RENDER_NUMBER = 15;
const yearsList = Array(25)
  .fill(0)
  .map((_num, idx) => {
    const currentYear = new Date().getFullYear();
    const stopYear = currentYear - 5;
    return stopYear - idx;
  });
const fututeYearsList = Array(2)
  .fill(0)
  .map((_num, idx) => {
    const currentYear = new Date().getFullYear();
    return currentYear + idx;
  });
const yearsListOffest = (yearsList.length * 20) / 2;
const disabledDrops = ["lga"];

const Tags = ({ data, removeTag }) => {
  // data = [{name: "", _id}]
  return (
    <View
      // entering={FadeInDown}
      // exiting={FadeInUp}
      layout={LinearTransition}
      style={styles.tag}
    >
      {data?.map((item) => (
        <View key={nanoid()} style={styles.tagItem}>
          <Pressable onPress={() => removeTag(item)} style={styles.tagIcon}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.warningDark}
            />
          </Pressable>
          <AppText style={styles.tagText} fontWeight="bold">
            {item?.name}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const DropComponent = ({
  name,
  renderList,
  multiple,
  getId,
  setActive,
  active,
  data,
  updateMultipleList,
  closeModal,
  onValueSelected,
  headerText,
}) => {
  const [search, setSearch] = useState({ data: renderList });

  const { setFieldValue } = useFormikContext();
  const showSearch = data?.length > RENDER_NUMBER;

  const handleDropSelect = (dropData) => {
    if (multiple) {
      updateMultipleList(dropData);
    } else {
      setActive({
        ...active,
        placeholder: dropData.name,
      });
      setSearch({ data });
      let setData = getId ? dropData : dropData?.value ?? dropData?.name;
      if (name === "bank")
        setData = { code: dropData.code, name: dropData.name };
      setFieldValue(name, setData);
      onValueSelected?.(setData);
      closeModal && closeModal();
    }
    // setSearch({ data: null });
  };

  const handleSearchCallback = (searchVal) => {
    const newList = data.filter((list) =>
      list?.name?.toLowerCase()?.includes(searchVal?.toLowerCase())
    );

    setSearch({ ...search, data: newList });
  };

  return (
    <View style={[styles.dropdown]}>
      {showSearch && (
        <View style={{ marginTop: 10, flex: Platform.OS === "web" ? 1 : 0 }}>
          <SearchBar
            placeholder={`Search your ${headerText}...`}
            onChangeCallback={handleSearchCallback}
          />
        </View>
      )}
      <ListEmpty
        message="No data"
        style={styles.empty}
        vis={!Boolean(renderList[0])}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {search?.data?.slice(0, RENDER_NUMBER).map((data, idx) => {
            return (
              <Pressable
                onPress={() => handleDropSelect(data)}
                key={data._id ?? nanoid()}
              >
                <View style={styles.dropItem}>
                  <AppText fontWeight="medium">
                    {" "}
                    {capFirstLetter(data.name)}{" "}
                  </AppText>
                  {multiple && data?.selected && (
                    <View>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primaryDeep}
                      />
                    </View>
                  )}
                </View>
                {idx + 1 !==
                  Math.min(
                    search?.data?.length || renderList.length,
                    RENDER_NUMBER
                  ) && <View style={styles.separator} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
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
  placeholder,
  useDefaultModalHeight,
  maxModalHeight,
  onValueSelected,
  ...otherProps
}) => {
  const [active, setActive] = useState({
    placeholder,
    modal: false,
  });
  const { setFieldValue, values } = useFormikContext();
  const hasChangedValue = active.placeholder !== placeholder;

  const dropLists = data;
  const selectedLists = values[name];
  const showFormValue = Boolean(selectedLists);

  let multipleLists = [];
  if (multiple) {
    multipleLists = dropLists?.map((dropItem) => {
      const checker = selectedLists?.find((item) => item._id == dropItem._id);
      if (checker) {
        return {
          ...dropItem,
          selected: true,
        };
      } else {
        return {
          ...dropItem,
          selected: false,
        };
      }
    });
  }
  const renderList = multiple ? multipleLists : dropLists;

  const disabledDropPress =
    disabled || (disabledDrops.includes(name) && !values["state"]);

  const handleShowDropLists = () => {
    setActive({ ...active, modal: true });
  };

  const updateMultipleList = (data) => {
    const newList = [].concat(selectedLists);

    const checkIdx = newList.findIndex((item) => item._id == data._id);
    if (checkIdx >= 0) {
      const filtered = newList.filter((item) => item._id != data._id);
      onValueSelected?.(filtered);
      setFieldValue(name, filtered);
    } else {
      newList.push({ name: data.name, _id: data._id });
      onValueSelected?.(newList);
      setFieldValue(name, newList);
    }
  };

  const callFetcher = async () => {
    if (fetcher && typeof fetcher == "object" && Boolean(fetcher?.state)) {
      await fetcher?.func();
    }
  };

  useEffect(() => {
    callFetcher();
  }, [fetcher?.state]);

  return (
    <>
      <View style={styles.dropdownContainer} {...otherProps}>
        <Pressable
          disabled={disabledDropPress}
          onPress={handleShowDropLists}
          style={styles.dropdownHeader}
        >
          <AppText
            style={{ color: hasChangedValue ? colors.black : colors.medium }}
            fontWeight="medium"
          >
            {showFormValue && selectedLists?.name
              ? capFirstLetter(selectedLists?.name)
              : placeholder}
            {/* {showFormValue && selectedLists?.name
              ? capFirstLetter(selectedLists?.name)
              : multiple
              ? placeholder
              : capFirstLetter(active.placeholder)} */}
          </AppText>

          <Ionicons name="chevron-down" size={15} color={colors.medium} />
          <LottieAnimator
            visible={Boolean(isLoading)}
            absolute
            size={50}
            contStyle={{ alignItems: "flex-end" }}
            style={styles.loading}
            wTransparent
          />
        </Pressable>
        {/* {console.log({ renderList })} */}
        <PopUpModal
          useDefaultHeight={useDefaultModalHeight}
          mainStyle={{ maxHeight: maxModalHeight ?? null }}
          Component={({ closeModal }) => (
            <DropComponent
              multiple={multiple}
              data={data}
              name={name}
              renderList={renderList}
              headerText={headerText}
              active={active}
              onValueSelected={onValueSelected}
              closeModal={closeModal}
              getId={getId}
              setActive={setActive}
              updateMultipleList={updateMultipleList}
            />
          )}
          visible={active.modal}
          setVisible={(bool) => setActive({ ...active, modal: bool })}
        />
      </View>

      {multiple && <Tags data={selectedLists} removeTag={updateMultipleList} />}
    </>
  );
};

const AppSideUpModal = ({ visible, setter, title = "", ContentComponent }) => {
  const handleCloseModal = () => {
    setter && setter();
  };
  return (
    <Modal
      visible={visible}
      statusBarTranslucent
      transparent
      onRequestClose={handleCloseModal}
    >
      <BlurView
        style={styles.slideModal}
        intensity={20}
        experimentalBlurMethod="dimezisBlurView"
      >
        <Animated.View
          entering={SlideInDown.springify()}
          // exiting={SlideOutDown.springify().damping(20)}
          style={styles.slideModalContent}
        >
          <AppText
            fontWeight="heavy"
            size={"xlarge"}
            style={styles.slideModalTitle}
          >
            {""}
            {title}{" "}
          </AppText>
          {ContentComponent && <ContentComponent />}
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const DayMonthYearSelector = ({ setter, range = [], futureYear, name }) => {
  const { setFieldValue } = useFormikContext();

  const [selected, setSelected] = useState({
    day: 1,
    month: "January",
    year: null,
  });

  const monthIdx = calenderMonths.findIndex(
    (obj) => obj.name == selected.month
  );
  const daysList = Array(calenderMonths[monthIdx].days)
    .fill(0)
    .map((num, idx) => idx + 1);

  const yearsData = range ? range : futureYear ? fututeYearsList : yearsList;

  const handleSelectDate = () => {
    if (!selected.year || !selected.month || !selected.day) return;
    const dateTime = new Date(selected.year, monthIdx, selected.day, 8);
    const dateFormat = `${selected.day} ${selected.month}, ${selected.year}`;
    setFieldValue(name, dateTime);
    setter && setter({ modal: false, placeholder: dateFormat });
  };

  return (
    <View style={{ height: height * 0.6 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          height: "80%",
        }}
      >
        <View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {daysList.map((dayValue, idx) => {
              const isSelected = selected.day === dayValue;
              return (
                <TouchableOpacity
                  onPress={() => setSelected({ ...selected, day: dayValue })}
                  key={idx.toString()}
                  style={{ padding: 8 }}
                >
                  <AppText
                    style={{
                      color: isSelected ? colors.accent : colors.medium,
                    }}
                    fontWeight={isSelected ? "heavy" : "semibold"}
                    size={isSelected ? "xlarge" : "medium"}
                  >
                    {" "}
                    {dayValue}{" "}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {calenderMonths.map((month, idx) => {
              const isSelected = selected.month === month.name;
              return (
                <TouchableOpacity
                  onPress={() =>
                    setSelected({ ...selected, month: month.name })
                  }
                  key={idx.toString()}
                  style={{ padding: 8 }}
                >
                  <AppText
                    style={{
                      color: isSelected ? colors.accent : colors.medium,
                    }}
                    fontWeight={isSelected ? "heavy" : "semibold"}
                    size={isSelected ? "xlarge" : "medium"}
                  >
                    {" "}
                    {month.name}{" "}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentOffset={{ x: 0, y: yearsListOffest }}
          >
            {yearsData.map((yearValue, idx) => {
              const isSelected = selected.year === yearValue;
              return (
                <TouchableOpacity
                  onPress={() => setSelected({ ...selected, year: yearValue })}
                  key={idx.toString()}
                  style={{ padding: 8 }}
                >
                  <AppText
                    style={{
                      color: isSelected ? colors.accent : colors.medium,
                    }}
                    fontWeight={isSelected ? "heavy" : "semibold"}
                    size={isSelected ? "xlarge" : "medium"}
                  >
                    {" "}
                    {yearValue}{" "}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: "space-evenly",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <AppButton title={"Select"} onPress={handleSelectDate} />
        <AppButton
          title={"Close"}
          type="warn"
          onPress={() => setter({ modal: false })}
        />
      </View>
    </View>
  );
};

const DateModal = ({ name, futureYear, range = [], placeholder }) => {
  const [active, setActive] = useState({ placeholder, modal: false });
  const handleModalAction = () => {
    setActive({ ...active, modal: true });
  };

  const hasChangedValue = active.placeholder !== placeholder;

  return (
    <View style={styles.dropdownContainer}>
      <Pressable onPress={handleModalAction} style={styles.dropdownHeader}>
        <AppText
          style={{ color: hasChangedValue ? colors.black : colors.medium }}
        >
          {" "}
          {capFirstLetter(active.placeholder)}{" "}
        </AppText>
        <Ionicons name="chevron-down" size={15} color={colors.medium} />
      </Pressable>
      <AppSideUpModal
        visible={active.modal}
        setter={() => setActive({ ...active, modal: false })}
        title={placeholder}
        ContentComponent={() => (
          <DayMonthYearSelector
            setter={(obj) => setActive({ ...active, ...obj })}
            name={name}
            placeholder={placeholder}
            futureYear={futureYear}
            range={range}
          />
        )}
      />
    </View>
  );
};

const FormHeader = ({ text }) => {
  return (
    <AppText style={styles.headerText} fontWeight="bold">
      {text}
    </AppText>
  );
};

export const FormikInput = ({
  name,
  placeholder,
  headerText,
  isLoading,
  disabled,
  getId,
  rangeYrs,
  keyboardType,
  data,
  fetcher,
  multiple,
  onValueSelected,
  style,
  type = "input",
  futureYear,
  showErr = true,
  ...otherProps
}) => {
  const { setFieldTouched, handleChange, values, touched, errors } =
    useFormikContext();

  let errTxt = "";
  if (typeof errors[name] == "object") {
    Object.entries(errors[name]).map(([key, val]) => {
      errTxt = errTxt.concat(val + "\n");
    });
  } else {
    errTxt = errors[name];
  }

  return (
    <>
      {headerText && <FormHeader text={headerText} />}
      {type === "input" && (
        <FormInput
          onBlur={() => setFieldTouched(name)}
          onChangeText={handleChange(name)}
          disabled={disabled}
          style={style}
          isLoading={isLoading}
          keyboardType={name === "email" ? "email-address" : keyboardType}
          onChange={() => {
            setFieldTouched(name, true, true);
          }}
          value={values[name]}
          placeholder={placeholder}
          {...otherProps}
        />
      )}
      {type === "dropdown" && (
        // <View />
        <DropdownInput
          name={name}
          multiple={multiple}
          disabled={disabled}
          isLoading={isLoading}
          fetcher={fetcher}
          data={data}
          headerText={headerText}
          onValueSelected={onValueSelected}
          getId={getId}
          placeholder={placeholder}
          {...otherProps}
        />
      )}
      {type === "date" && (
        <DateModal
          name={name}
          futureYear={futureYear}
          range={rangeYrs}
          placeholder={placeholder}
        />
      )}
      {touched[name] && errors[name] && showErr && (
        <AppText style={styles.error}>{errTxt}</AppText>
      )}
    </>
  );
};

const FormInput = ({
  placeholder = "",
  isLoading,
  disabled,
  headerText,
  secureTextEntry,
  style,
  ...otherProps
}) => {
  const [visible, setVisible] = useState(secureTextEntry);
  return (
    <>
      {headerText && <FormHeader text={headerText} />}

      <View style={[styles.container, style]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.medium}
          secureTextEntry={visible}
          editable={!disabled}
          // keyboardType="web-search"
          {...otherProps}
        />
        {secureTextEntry && (
          <AnimatedPressable
            onPress={() => setVisible(!visible)}
            style={styles.eye}
          >
            <Ionicons
              name={visible ? "eye-off" : "eye"}
              size={20}
              color={visible ? colors.medium : colors.primary}
            />
          </AnimatedPressable>
        )}
        {isLoading && (
          <LottieAnimator
            visible={isLoading}
            style={{ width: 55, height: 60 }}
          />
        )}
      </View>
    </>
  );
};

export default FormInput;

const styles = StyleSheet.create({
  container: {
    width: Platform.OS == "web" ? "100%" : width * 0.9,
    backgroundColor: colors.light,
    height: 60,
    marginBottom: 10,
    borderRadius: 8,
    alignSelf: "center",
    paddingHorizontal: 15,
    flexDirection: "row",
  },
  dropdown: {
    width: Platform.OS === "web" ? "100%" : null,
    overflow: "hidden",
  },
  dropdownContainer: {
    backgroundColor: colors.light,
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
    width: Platform.OS == "web" ? "100%" : width * 0.9,
    alignSelf: "center",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
    paddingVertical: 10,
  },
  dropItem: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: "space-between",
  },
  eye: {
    justifyContent: "center",
    paddingLeft: 15,
    paddingRight: 5,
  },
  error: {
    color: colors.heartDark,
    marginTop: 2,
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  empty: {
    flex: null,
    width: "100%",
    height: "100%",
    // justifyContent: "center",
    // alignItems: "center",
  },
  headerText: {
    marginLeft: 8,
    marginBottom: 4,
    color: colors.medium,
    alignSelf: "flex-start",
  },

  input: {
    flex: 1,
    fontFamily: "sf-medium",
    fontSize: 17,
    outlineStyle: "none",
    color: "black",
  },
  loading: {},
  separator: {
    width: "90%",
    height: 2,
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: colors.lightly,
  },
  slideModal: {
    flex: 1,
    // backgroundColor: "transparent",
    justifyContent: "flex-end",
    // elevation: 15,
    // alignItems: "center",
  },
  slideModalContent: {
    minHeight: height * 0.2,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    backgroundColor: colors.lightly,
  },
  slideModalTitle: {
    textAlign: "center",
    marginVertical: 15,
  },
  tag: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  tagItem: {
    paddingRight: 15,
    // paddingLeft: 10,
    paddingVertical: 10,
    backgroundColor: colors.unchange,
    elevation: 2,
    marginRight: 15,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tagText: {
    // marginLeft: 5,
  },
  tagIcon: {
    paddingLeft: 10,
    paddingRight: 5,
  },
});
