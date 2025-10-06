import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import {
  getImageObj,
  getPickerName,
  launchGallery,
} from "../helpers/helperFunctions";
import colors from "../helpers/colors";
import { useFormikContext } from "formik";

const { width, height } = Dimensions.get("screen");

const CoverImage = ({ style, placeholderImage, onPick }) => {
  const [image, setImage] = useState(placeholderImage);

  const noImage =
    Boolean(!image) || Boolean(image && Object.keys(image).length == 0);

  const pickImage = async () => {
    const { asset } = await launchGallery([4, 4], false, false);

    if (asset) {
      setImage(asset);
      onPick &&
        onPick({
          uri: asset.uri,
          height: asset.height,
          width: asset.width,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          assetId: getPickerName(asset.uri),
        });
    }
  };

  const imgSrc = getImageObj(image);

  useEffect(() => {
    setImage(placeholderImage);
  }, [placeholderImage]);

  return (
    <Pressable onPress={pickImage} style={[styles.cover, style]}>
      {noImage && (
        <>
          <Ionicons
            name="image"
            size={Platform.OS === "web" ? 80 : width * 0.2}
            color={colors.primary}
          />
          <AppText fontWeight="bold" size={"large"} style={styles.coverTxt}>
            Add Cover Image
          </AppText>
        </>
      )}
      {!noImage && (
        <>
          <Image
            style={styles.coverImage}
            resizeMode="contain"
            source={imgSrc}
          />
          <View style={styles.coverIcon}>
            <Ionicons
              name="images-outline"
              size={16}
              color={colors.primaryDeeper}
            />
          </View>
        </>
      )}
    </Pressable>
  );
};

export const FormikCover = ({
  style,
  value,
  showErr = true,
  onImageUpdate,
  name,
  ...otherProps
}) => {
  const { errors, touched, setFieldValue } = useFormikContext();

  let errTxt = "";
  if (typeof errors[name] == "object") {
    Object.entries(errors[name]).map(([key, val]) => {
      errTxt = errTxt.concat(val + "\n");
    });
  } else {
    errTxt = errors[name];
  }

  const handleImage = (asset) => {
    setFieldValue(name, asset);
    onImageUpdate?.(asset);
  };

  return (
    <View {...otherProps}>
      <CoverImage
        style={{ ...style, marginBottom: 6 }}
        placeholderImage={value}
        onPick={handleImage}
      />
      {touched[name] && errors[name] && showErr && (
        <AppText style={styles.error}>{errTxt}</AppText>
      )}
    </View>
  );
};

export default CoverImage;

const styles = StyleSheet.create({
  cover: {
    width: Platform.OS === "web" ? "90%" : width * 0.9,
    height: height * 0.3,
    backgroundColor: colors.unchange,
    alignSelf: "center",
    borderRadius: 25,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    elevation: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  coverTxt: {
    textAlign: "center",
    marginTop: 15,
    color: colors.primaryDeep,
  },
  coverImage: {
    width: "85%",
    height: "85%",
  },
  coverIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 100,
  },
  error: {
    color: colors.heartDark,
    marginTop: 2,
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
