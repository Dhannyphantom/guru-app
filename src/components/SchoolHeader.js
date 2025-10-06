import { Dimensions, ImageBackground, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";

const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

import schoolBg from "../../assets/images/school_yard.jpg";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../helpers/colors";

const { width, height } = Dimensions.get("screen");

const HEADER_HEIGHT = height * 0.32;
const HEADER_HEIGHT_SMALL = height * 0.16;

const SchoolHeader = ({ data, scrollY }) => {
  const Rstyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY?.value,
        [0, 200],
        [HEADER_HEIGHT, HEADER_HEIGHT_SMALL],
        Extrapolation.CLAMP
      ),
    };
  });
  const locRStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY?.value,
            [0, 200],
            [0, -20],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            scrollY?.value,
            [0, 200],
            [1, 0.7],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const animatedProps = useAnimatedProps(() => {
    return {
      size: interpolate(
        scrollY?.value,
        [0, 200],
        [30, 20],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.header, Rstyle]}>
      <AnimatedImageBackground
        blurRadius={5}
        style={styles.headerImg}
        source={schoolBg}
      >
        {data?.name && (
          <AppText
            style={styles.headerTxt}
            animated
            animatedProps={animatedProps}
            fontWeight="black"
            size={30}
          >
            {data?.name}
          </AppText>
        )}
        {data?.lga && (
          <Animated.View style={[styles.location, locRStyle]}>
            <Ionicons name="location" size={18} color={colors.white} />
            <AppText
              style={{ ...styles.headerTxt, ...styles.locationTxt }}
              animated
              animatedProps={animatedProps}
              numberOfLines={1}
              ellipsizeMode="tail"
              fontWeight="black"
              size={"xlarge"}
            >
              {data?.lga}, {data?.state} State
            </AppText>
          </Animated.View>
        )}
        <LinearGradient
          style={styles.headerGradient}
          locations={[0, 1]}
          colors={["rgba(255,255,255,0)", colors.unchange]}
        />
      </AnimatedImageBackground>
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
    height: height * 0.32,
    // height: height * 0.3,
    // justifyContent: "center",
    // alignItems: "center",
  },
  headerGradient: {
    position: "absolute",
    bottom: 0,
    height: "50%",
    width,
  },
  headerTxt: {
    width: "80%",
    textAlign: "center",
    color: colors.white,
    textShadowColor: "rgba(0,0,0,0.8)",
    // textShadowColor: colors.medium,
    textTransform: "capitalize",
    textShadowOffset: {
      width: 1,
      height: 2,
    },
    textShadowRadius: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    // width: "80%",
    maxWidth: "80%",
    alignSelf: "center",
    marginTop: 20,
  },
  locationTxt: {
    width: null,
    marginLeft: 5,
    textAlign: "center",
    color: colors.white,
    textShadowRadius: 5,
    textShadowColor: "rgba(0,0,0,0.8)",
  },
});
