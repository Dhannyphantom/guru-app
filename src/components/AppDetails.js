import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

import AppText from "./AppText";
import colors from "../helpers/colors";
import Avatar from "./Avatar";

import { dummySubjects, subjectCategories } from "../helpers/dataStore";
import { BlurView } from "expo-blur";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import AnimatedPressable from "./AnimatedPressable";
import { formatPoints, getImageObj } from "../helpers/helperFunctions";
import WebLayout from "./WebLayout";
import { useRouter } from "expo-router";
import LottieAnimator from "./LottieAnimator";

const { width, height } = Dimensions.get("screen");

const BoltIcon = ({ size = 60, style }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 100,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      <FontAwesome6 name="bolt-lightning" size={size / 2} color={"#fff"} />
    </View>
  );
};

export const ProgressBar = ({
  value = 10,
  max = 40,
  hideProgressText = false,
  barHeight = 25,
  tint = colors.primary,
  style,
}) => {
  let barWidth = "99%";
  const percent = (value / max) * 100;
  barWidth = `${percent}%`;

  return (
    <View style={[styles.progressContainer, style]}>
      {/* <LottieAnimator
        autoPlay={false}
        name="progress"
        style={styles.progress}
      /> */}
      <View style={[styles.progressBarContainer, { height: barHeight }]}>
        <View
          style={[
            styles.progressBar,
            { backgroundColor: tint, width: barWidth },
          ]}
        />
      </View>
      {!hideProgressText && (
        <View style={styles.progressMain}>
          <AppText
            size={"xxsmall"}
            fontWeight="medium"
            style={{ color: colors.medium, marginLeft: 8 }}
          >
            Progress
          </AppText>
          <AppText fontWeight="semibold" size={"xxsmall"}>
            {value}/{max}
          </AppText>
        </View>
      )}
    </View>
  );
};

export const DailyTask = ({ stats }) => {
  const user = useSelector(selectUser);

  const lottieRef = useRef();

  useEffect(() => {
    if (user?.streak > 0) {
      lottieRef?.current?.play(0, 55);
    } else {
      lottieRef?.current?.play(0, 1);
    }
  }, [user]);

  return (
    <BlurView style={styles.container}>
      <BlurView intensity={65} style={styles.box}>
        <LottieAnimator
          visible
          loop={false}
          animRef={lottieRef}
          autoPlay={false}
          name="streak"
          size={120}
        />
        {/* <FontAwesome6
          name="fire"
          size={100}
          color={user?.streak > 0 ? colors.heartDark : colors.lighter}
        /> */}
        <AppText
          fontWeight="black"
          size={"xlarge"}
          style={{ marginTop: 15, color: colors.medium }}
        >
          Streaks: {user?.streak || 0}
        </AppText>
      </BlurView>
      <View
        style={{
          flex: 1,
          marginRight: 8,
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 15,
          }}
        >
          <View>
            <AppText
              style={{ marginBottom: 10, color: colors.medium }}
              fontWeight="black"
              size={"xxlarge"}
            >
              Daily Task
            </AppText>
            <AppText fontWeight="light">
              {Math.max(stats?.daily?.questionsRemaining, 0)} questions left
            </AppText>
          </View>
          <View style={{ alignItems: "center" }}>
            <Avatar
              source={user?.avatar?.image}
              data={{ user }}
              border={{ width: 3, color: colors.light }}
              size={60}
            />
            <AppText
              fontWeight="heavy"
              style={{ marginTop: 4, color: colors.medium }}
              size={"xsmall"}
            >
              {formatPoints(user?.points || 0)}
            </AppText>
          </View>
        </View>
        <ProgressBar
          barHeight={20}
          value={Math.min(stats?.daily?.questionsAnswered, 100)}
          max={100}
        />
      </View>
    </BlurView>
  );
};

export const DetailHeader = ({
  title = "Subjects",
  hideRightView = false,
  onPress,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 20,
        marginBottom: 15,
      }}
    >
      <AppText fontWeight="heavy" size={"xlarge"}>
        {title}
      </AppText>
      {!hideRightView && (
        <Pressable style={{ padding: 10 }} onPress={onPress}>
          <AppText style={{ color: colors.primary, marginRight: 6 }}>
            See all
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

export const SubjectItem = ({ data, loading, isEdit }) => {
  const router = useRouter();

  let imgSrc = getImageObj(data?.image);

  imgSrc = Boolean(imgSrc?.uri) ? imgSrc : data?.image;

  const handleNav = () => {
    if (isEdit) {
      router.push({
        pathname: "/create",
        params: { name: "subjects", type: "edit", data: JSON.stringify(data) },
      });
    } else {
      router.push({
        pathname: "/topics",
        params: { name: data?.name, _id: data?._id },
      });
    }
  };

  return (
    <Pressable onPress={handleNav} style={styles.subj}>
      {!loading ? (
        <>
          <View style={styles.subjImgView}>
            <Image
              resizeMode="contain"
              source={imgSrc}
              style={{ width: "60%", height: "60%" }}
            />
          </View>
          <View style={{ marginTop: 10 }}>
            <AppText
              style={{ marginBottom: 10, textTransform: "capitalize" }}
              fontWeight="bold"
              size={"xlarge"}
            >
              {data.name}
            </AppText>
            <AppText fontWeight="medium" size={"small"}>
              {data.numberOfQuestions} question
              {data?.numberOfQuestions > 1 ? "s" : ""}
            </AppText>
            <AppText
              fontWeight={"light"}
              style={{ marginTop: 4 }}
              size={"xsmall"}
            >
              {data?.topicCount} topic{data?.topicCount > 1 ? "s" : ""}
            </AppText>
          </View>
          <View style={styles.row}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <AppText style={{ color: colors.primary, marginLeft: 3 }}>
              {data.questionsAnswered}
            </AppText>
          </View>
          <BoltIcon
            size={35}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
            }}
          />
        </>
      ) : (
        <View
          style={{
            height: width / 1.8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LottieAnimator visible />
        </View>
      )}
    </Pressable>
  );
};

export const Subjects = ({
  noHeader = false,
  title,
  data = [],
  loading,
  contentContainerStyle,
}) => {
  const renderDetails = ({ item, index }) => {
    return <SubjectItem data={item} loading={loading} />;
  };

  return (
    <View style={{ flex: 1 }}>
      {!noHeader && <DetailHeader title={title} />}
      <FlatList
        numColumns={Platform.OS === "web" ? 4 : 2}
        data={loading ? dummySubjects : data}
        keyExtractor={(item) => item._id}
        contentContainerStyle={contentContainerStyle}
        renderItem={renderDetails}
      />
    </View>
  );
};
//  onPress={() => router.push("SubjectList", { item })}

export const SubjectCategory = ({ data = [], loading }) => {
  const router = useRouter();
  const renderCategories = ({ item }) => {
    return (
      <AnimatedPressable
        onPress={() =>
          router.push({
            params: { name: item?.name, _id: item?._id },
            pathname: "/subjects",
          })
        }
        style={{
          width: Platform.OS === "web" ? 200 : width * 0.33,
          alignItems: "center",
          marginBottom: 15,
          marginRight: 15,
        }}
      >
        <View
          style={{
            backgroundColor: colors.unchange,
            // padding: 20,
            borderRadius: 12,
            marginBottom: 6,
            width: Platform.OS === "web" ? 200 : width * 0.3,
            height: Platform.OS === "web" ? 200 : width * 0.3,

            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {!loading ? (
            <Image
              source={item.image}
              style={{ width: "55%", height: "55%" }}
            />
          ) : (
            <LottieAnimator visible />
          )}
        </View>
        {!loading && (
          <AppText
            style={{ maxWidth: "80%", lineHeight: 25 }}
            fontWeight="medium"
          >
            {item.name}
          </AppText>
        )}
      </AnimatedPressable>
    );
  };

  return (
    <View>
      <WebLayout>
        <DetailHeader title="Categories" hideRightView />
        <FlatList
          data={loading ? subjectCategories : data}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._id}
          renderItem={renderCategories}
        />
      </WebLayout>
    </View>
  );
};

export const Authors = ({ data = [] }) => {
  const renderAuthors = ({ item }) => {
    const user = item?.user;
    return (
      <View style={{ marginHorizontal: 15 }}>
        <Avatar
          size={width * 0.3}
          source={user?.avatar?.image}
          data={item}
          border={{ width: 4, color: colors.lightly }}
          name={`${user.preffix} ${user.firstName} ${user.lastName}`}
          textStyle={{ textTransform: "capitalize" }}
        />
      </View>
    );
  };

  return (
    <View>
      <AppText
        style={{ marginBottom: 15, marginLeft: 15 }}
        size={"xlarge"}
        fontWeight="bold"
      >
        Teachers
      </AppText>
      <View
        style={{
          backgroundColor: colors.white,
          padding: 12,
          paddingTop: 20,
          borderRadius: 20,
        }}
      >
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderAuthors}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: Platform.OS == "web" ? "45%" : width * 0.95,
    height: height * 0.23,
    maxWidth: Platform.OS == "web" ? 700 : null,
    backgroundColor: "transparent",
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    padding: 6,
    marginBottom: 25,
  },
  box: {
    width: Platform.OS == "web" ? "35%" : width * 0.35,
    height: "100%",
    backgroundColor: "transparent",
    alignSelf: "center",
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
    marginRight: 15,
    alignItems: "center",
  },
  subj: {
    width: Platform.OS == "web" ? 300 : width * 0.45,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 10,
    marginBottom: 15,
    // marginRight: index % 2 == 0 ? width * 0.02 : 0,
  },
  subjImgView: {
    height: Platform.OS == "web" ? 200 : width * 0.4,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    backgroundColor: colors.unchange,
  },
  progress: {
    height: 40,
    width: "100%",
  },
  progressBarContainer: {
    width: "100%",
    backgroundColor: colors.extraLight,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  progressMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    alignItems: "center",
  },
  progressBar: {
    height: "100%",
    borderRadius: 100,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  row: { flexDirection: "row", alignItems: "center", marginTop: 20 },
});
