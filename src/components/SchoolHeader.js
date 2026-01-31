import { Dimensions, ImageBackground, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import schoolBg from "../../assets/images/school_yard.jpg";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../helpers/colors";

const { width, height } = Dimensions.get("screen");

const HEADER_HEIGHT = height * 0.32;
const HEADER_HEIGHT_SMALL = height * 0.16;

const SchoolHeader = ({ data, scrollY }) => {
  const Rstyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, HEADER_HEIGHT_SMALL / HEADER_HEIGHT],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scaleY: scale }],
    };
  });

  const locRStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY?.value,
            [0, 200],
            [0, -40],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollY?.value,
            [0, 200],
            [1, 0.7],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const textScale = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [0, 200],
          [1, 0.75],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.header, Rstyle]}>
      <ImageBackground
        blurRadius={5}
        style={styles.headerImg}
        source={schoolBg}
      >
        {data?.name && (
          <Animated.View style={[{ width, alignItems: "center" }, textScale]}>
            <AppText size={30} style={styles.headerTxt} fontWeight="black">
              {data.name}
            </AppText>
          </Animated.View>
        )}
        {data?.lga && (
          <Animated.View style={[styles.location, locRStyle]}>
            <Animated.View
              style={[
                {
                  width,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 2,
                },
                textScale,
              ]}
            >
              <Ionicons name="location" size={18} color={colors.white} />
              <AppText
                style={{ ...styles.headerTxt, width: null }}
                animated
                // animatedProps={animatedProps}
                numberOfLines={1}
                ellipsizeMode="tail"
                fontWeight="black"
                size={"xlarge"}
              >
                {data?.lga}, {data?.state} State
              </AppText>
            </Animated.View>
          </Animated.View>
        )}
        <LinearGradient
          style={styles.headerGradient}
          locations={[0, 1]}
          colors={["rgba(255,255,255,0)", colors.unchange]}
        />
      </ImageBackground>
    </Animated.View>
  );
};

export default SchoolHeader;

const styles = StyleSheet.create({
  headerImg: {
    height: "100%",
    width,
    // height: height * 0.3,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    width,
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    bottom: 0,
    height: "50%",
    width,
  },
  headerTxt: {
    width: "85%",
    textAlign: "center",
    color: colors.white,
    textShadowColor: "rgba(0,0,0,0.8)",
    // textShadowColor: colors.medium,
    textTransform: "capitalize",
    textShadowOffset: {
      width: 1,
      height: 2,
    },
    textShadowRadius: 1,
  },
  location: {
    // backgroundColor: "red",
    // flexDirection: "row",
    alignItems: "center",
    // width: "80%",
    // maxWidth: "80%",
    alignSelf: "center",
    marginTop: 20,
  },
  locationTxt: {
    // width: null,
    // marginLeft: 5,
    // textAlign: "center",
    // color: colors.white,
    // textShadowRadius: 2,
    // textShadowColor: "rgba(0,0,0,0.8)",
  },
});
