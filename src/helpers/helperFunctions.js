import * as ImagePicker from "expo-image-picker";
import { calenderMonths, appData } from "./dataStore";
import AppText from "../components/AppText";
import { baseUrl } from "../context/apiSlice";
import { Platform } from "react-native";
import { nanoid } from "@reduxjs/toolkit";
import { io } from "socket.io-client";

export const socket = io(baseUrl, {
  transports: ["websocket"],
  autoConnect: false,
});

export const DAY_MILLI = 1000 * 60 * 60 * 24;
const { GT_VALUE } = appData;

export const capFirstLetter = (str) => {
  if (!str || typeof str !== "string") return null;
  return str[0].toUpperCase() + str.slice(1);
};

export const capCapitalize = (str) => {
  let capitalized = capFirstLetter(str);
  for (let i = 0; i < str.length; i++) {
    const letter = capitalized[i];
    if (letter === " " && capitalized[i + 1]) {
      capitalized =
        capitalized.slice(0, i + 1) +
        capitalized[i + 1].toUpperCase() +
        capitalized.slice(i + 2);
    }
  }
  return capitalized;
};

export const getName = (user) => {
  return `${user?.preffix ? user.preffix + " " : ""}${user?.firstName ?? ""} ${
    user?.lastName ?? ""
  }`;
};

export const getFullName = (user, usernameFallback) => {
  if (user?.firstName && user?.lastName) {
    return `${user?.firstName} ${user?.lastName}`;
  } else if (usernameFallback) {
    return user?.username;
  } else {
    return null;
  }
};

export const getUserProfile = (user) => ({
  _id: user?._id,
  username: user?.username,
  firstName: user?.firstName,
  lastName: user?.lastName,
  avatar: user?.avatar,
});

export const launchGallery = async (
  aspect = [4, 4],
  multiple = false,
  allowsEditing = true,
) => {
  const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

  if (permission.granted) {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing,
      aspect,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: multiple,
      legacy: false,
    });

    if (result.canceled) {
      return { error: "Operation was canceled" };
    } else {
      if (multiple) {
        return { assets: result.assets };
      } else {
        return { asset: result.assets[0] };
      }
    }
  } else {
    const reqPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (reqPermission.granted) {
      const data = await launchGallery();
      return data;
    } else {
      return { error: "Please grant permission to access photo library" };
    }
  }
};

export const dateFormatter = (date, type, xtraData) => {
  if (!date) return null;
  const dateTime = new Date(date);
  const currentTimer = new Date();

  const tHr = dateTime.getHours();
  const tMin = dateTime.getMinutes();
  const tMonth = dateTime.getMonth();
  const tDay = dateTime.getDate();
  const tYear = dateTime.getFullYear();
  //
  // const currHr = currentTimer.getHours();
  // const currMin = currentTimer.getMinutes();
  const currMonth = currentTimer.getMonth();
  const currDay = currentTimer.getDate();
  const currYear = currentTimer.getFullYear();

  let returnVal, hr, min, post;
  switch (type) {
    case "fullDate":
      returnVal = `${
        calenderMonths[dateTime.getMonth()].name
      } ${dateTime.getDate()}, ${dateTime.getFullYear()}`;
      break;

    case "future":
      const diff = (dateTime - currentTimer) / 1000;
      const tomorrowChecker =
        currYear === tYear && currMonth === tMonth && tDay - currDay == 1;
      const todayChecker =
        currYear === tYear && currMonth === tMonth && tDay - currDay == 0;

      if (tHr > 12) {
        hr = tHr % 12;
        post = "PM";
      } else if (tHr === 0) {
        hr = 12;
        post = "PM";
      } else {
        hr = tHr;
        post = "AM";
      }

      if (tMin < 10) {
        min = `0${tMin}`;
      } else {
        min = tMin;
      }

      if (todayChecker) {
        return `today by ${hr}:${min} ${post}`;
      } else if (tomorrowChecker) {
        return `tomorrow by ${hr}:${min} ${post}`;
      } else if (diff > 86400) {
        return `in ${Math.round(diff / 86400)} days`;
      } else if (diff < 0) {
        return null;
      }
      break;

    case "sub":
      let currDate;
      if (xtraData) {
        currDate = new Date(xtraData.current);
      }
      const total = Math.floor((dateTime - currDate) / DAY_MILLI);
      const remainder = dateTime - currentTimer;
      const sub = Math.max(0, Math.floor(remainder / DAY_MILLI));
      return {
        sub,
        total,
        terms: Math.ceil(total / 90),
      };
      break;
    case "feed":
      const timer = currentTimer - dateTime;
      //
      if (timer > 172800000) {
        returnVal = `${
          calenderMonths[dateTime.getMonth()].name
        } ${dateTime.getDate()}, ${dateTime.getFullYear()}`;
      } else if (timer > 86400000) {
        const diff = Math.floor(timer / 86400000);
        return diff > 1 ? `${diff} days ago` : "Yesterday";
      } else if (timer > 3600000) {
        const diff = Math.floor(timer / 3600000);
        return diff > 19
          ? "Yesterday"
          : `${diff} hour${diff > 1 ? "s" : ""} ago`;
      } else if (timer > 60000) {
        const diff = Math.floor(timer / 60000);
        return `${diff} minute${diff > 1 ? "s" : ""} ago`;
      } else {
        return `Just now`;
      }

      break;
  }

  return returnVal;
};

export const generateRandoms = (num, range) => {
  const checks = new Set();
  return Array(num)
    .fill(1)
    .map(() => {
      let randInt = Math.floor(Math.random() * (range + 1));

      while (checks.has(randInt)) {
        randInt = Math.floor(Math.random() * (range + 1));
      }
      // checks.add(randInt);

      checks.add(randInt);
      return randInt;
    });
};

export const formatContact = (str) => {
  let formatted;
  if (str.startsWith("+234")) {
    formatted = "0".concat(str.slice(5));
    return formatted;
  } else {
    return str;
  }
};

export const getImageObj = (source) => {
  const sourceObj = { ...source };
  if (source?.uri?.includes(":3700/uploads")) {
    sourceObj.uri = `${baseUrl}${source?.uri?.split(":3700")[1]}`;
  }
  return sourceObj;
};

export const hasCompletedProfile = (user) => {
  if (
    !user?.email ||
    !user?.address ||
    !user?.birthday ||
    !user?.contact ||
    !user?.country ||
    !user?.firstName ||
    !user?.lastName ||
    !user?.gender ||
    !user?.state ||
    !Boolean(user?.avatar?.image?.hasOwnProperty("uri"))
  ) {
    return {
      bool: false,
      pop: {
        vis: true,
        msg: "Please complete your profile details",
        type: "failed",
        timer: 1500,
      },
    };
  } else {
    return {
      bool: true,
      pop: null,
    };
  }
};

export const parseStr = (str) => {
  const regex = /<b>(.*?)<\/b>/g;
  let parts = [],
    lastIndex = 0,
    match;

  while ((match = regex.exec(str) !== null)) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    parts.push(<AppText key={match.index}>{match[1]}</AppText>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }
  return parts;
};

export const getCurrencyAmount = (number) => {
  if (typeof number == "number") {
    return `₦${Number(number).toLocaleString()}`.replace(",", ".");
  } else {
    return null;
  }
};

export const formatPoints = (number) => {
  // if (number && typeof number == "number") {
  return `${Number(number).toFixed(1)} GT`;
  // return `${Number(number).toLocaleString()} TK`;
  // } else {
  //   return null;
  // }
};

export const calculatePointsAmount = (value) => {
  // reverse is false, value = "points"
  // reverse is true, value = "amount"
  // N1 = 1000 GT;
  // x = points;

  const amount = (value / GT_VALUE).toPrecision(2);
  const pointsVal = Math.floor(value * GT_VALUE);
  return {
    amount,
    format: getCurrencyAmount(Number(amount)),
    point: pointsVal,
    pointFormat: formatPoints(pointsVal),
  };
};

export const getErrMsg = (errData) => {
  if (typeof errData === "object") {
    return Object.values(errData)
      .map((item) => {
        if (typeof item == "object") {
          return Object.values(item).join(", ");
        } else {
          return item;
        }
      })
      .join(", ");
  } else if (typeof errData === "string") {
    return errData;
  }
};

// helpers/addInstanceActions.js
// Uses getErrMsg from your helperFunctions module.
// Keep your existing import of getErrMsg where you wire this up.

export const addInstanceActions = ({
  setBools,
  bools,
  setInstances,
  instances,
  activeIndex,
  setActiveIndex,
  formInitials,
  cacheInitials = [],
}) => {
  const instanceArr = Object.keys(instances);
  const currentItem = Object.values(instances);
  const isLast = activeIndex === instanceArr.length - 1;
  const canDelete = instanceArr.length > 1;

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));

  const addNewInstance = (formValues, setFormValues, formErrors) => {
    setBools((b) => ({ ...b, errMsg: null }));

    // 1) Validate form errors
    if (Object.keys(formErrors || {}).length > 0) {
      setBools((b) => ({
        ...b,
        showErr: true,
        errMsg: getErrMsg(formErrors),
      }));
      return;
    }

    // 2) Validate question: at least one correct answer
    if (Array.isArray(formValues?.answers)) {
      const noneCorrect = formValues.answers.every((a) => !a?.correct);
      if (noneCorrect) {
        setBools((b) => ({
          ...b,
          errMsg: "This question requires a correct answer",
        }));
        return;
      }
    }

    // 3) Create a clean blank template for the next form
    const freshBlank = deepClone(formInitials);

    // Preserve only the cached keys across instances (subject/topic/categories, etc.)
    cacheInitials.forEach((key) => {
      if (key in formValues) freshBlank[key] = formValues[key];
    });

    // 4) Save the current form into instances
    const updated = { ...instances, [activeIndex]: deepClone(formValues) };

    if (isLast) {
      // Append a new blank form at the end
      updated[activeIndex + 1] = freshBlank;
      setInstances(updated);
      setActiveIndex(activeIndex + 1);
      setFormValues(freshBlank);
    } else {
      // Jump to the last existing instance
      setInstances(updated);
      const lastIdx = Object.keys(updated).length - 1;
      setActiveIndex(lastIdx);
      setFormValues(updated[lastIdx]);
    }
  };

  const updateActiveIndex = (newIdx, setFormValues) => {
    const idx = typeof newIdx?.idx === "number" ? newIdx.idx : newIdx;
    setFormValues(currentItem[idx]);
    setActiveIndex(idx);
  };

  const handleForm = (formValues) => {
    // Stage current active form
    const staged = { ...instances, [activeIndex]: formValues };
    const array = Object.values(staged);

    // Validate each staged question
    for (let i = 0; i < array.length; i++) {
      const q = array[i];
      if (Array.isArray(q?.answers)) {
        const noneCorrect = q.answers.every((a) => !a?.correct);
        if (noneCorrect) {
          setBools((b) => ({
            ...b,
            errMsg: `Question ${i + 1} requires a correct answer`,
          }));
          return null;
        }
      }
    }

    // Save staged state (keeps UI in sync)
    setInstances(staged);
    return array;
  };

  const onSave = (values, setValues, formErrors) => {
    if (Object.keys(formErrors || {}).length > 0) {
      setBools((b) => ({ ...b, showErr: true, canSave: true }));
      return;
    }
    setInstances((prev) => ({ ...prev, [activeIndex]: values }));
    setBools((b) => ({ ...b, canSave: false }));
  };

  const onDelete = (setFormValues) => {
    if (!canDelete) return;

    const updated = { ...instances };
    delete updated[activeIndex];

    // Reindex to keep keys compact (optional but tidy)
    const compact = {};
    Object.values(updated).forEach((val, i) => {
      compact[i] = val;
    });

    const newActive = Math.max(0, activeIndex - 1);
    setInstances(compact);
    setActiveIndex(newActive);
    setFormValues(compact[newActive]);
  };

  return {
    addNewInstance,
    updateActiveIndex,
    handleForm,
    onSave,
    onDelete,
    isLast,
    canDelete,
    currentItem,
    instanceArr,
  };
};

export const getPickerName = (pickerUri) => {
  return Platform.OS === "web"
    ? pickerUri
    : pickerUri?.split("ImagePicker/")[1];
};

export const getFormData = (data, bucket, isArray) => {
  const formData = new FormData();
  if (isArray) {
    const hasURI = Boolean(
      data?.find(
        (objj) => objj?.hasOwnProperty("image") && Boolean(objj?.image?.uri),
      ),
    );
    formData.append(
      "data",
      JSON.stringify({
        data,
        media: hasURI,
        bucket,
      }),
    );

    data.forEach(async (item) => {
      if (Boolean(item?.image?.uri)) {
        const fileObj = {
          uri: item?.image?.uri,
          name: getPickerName(item?.image?.uri),
          type: item?.image?.mimeType || "image/png",
        };
        formData.append("media_file", fileObj);
      }
    });
  } else {
    const hasURI = Boolean(data?.image?.uri);
    formData.append(
      "data",
      JSON.stringify({
        ...data,
        media: hasURI,
        bucket,
      }),
    );
    formData.append("media_file", {
      uri: data?.image?.uri,
      name: getPickerName(data?.image?.uri),
      type: data.image.mimeType || "image/png",
    });
  }

  return formData;
};
