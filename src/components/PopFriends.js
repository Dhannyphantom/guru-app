import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import PopUpModal from "./PopUpModal";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";
import SearchBar from "./SearchBar";
import { dummyLeaderboards } from "../helpers/dataStore";
import FriendCard from "./FriendCard";

// FILES
import contactImg from "../../assets/images/abc.png";
import friendsImg from "../../assets/images/online-learning.png";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { selectUser, useFindMoreFriendsQuery } from "../context/usersSlice";
import WebLayout from "./WebLayout";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import LottieAnimator from "./LottieAnimator";

const { width, height } = Dimensions.get("screen");

const ActionItem = ({ image, onPress, title, message }) => {
  return (
    <Pressable onPress={onPress} style={styles.actionItem}>
      <View style={styles.actionImgView}>
        <Image source={image} style={styles.actionImage} />
      </View>
      <WebLayout
        style={{
          flexDirection: "row",
          paddingBottom: 15,
          width: "80%",
          alignItems: "center",
        }}
      >
        <View style={styles.actionTxtView}>
          <AppText style={styles.actionTitle} fontWeight="bold" size={"large"}>
            {title}
          </AppText>
          <AppText style={styles.actionMsg}>{message}</AppText>
        </View>
        <View style={styles.actionNav}>
          <Ionicons name="chevron-forward" size={25} color={colors.medium} />
        </View>
      </WebLayout>
    </Pressable>
  );
};

const FindFriendsModal = ({ closeModal }) => {
  const user = useSelector(selectUser);
  const router = useRouter();

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // Fetch friends with pagination
  const { data: friends, isFetching } = useFindMoreFriendsQuery({
    limit: LIMIT,
    offset,
  });

  const isPro = user?.accountType === "professional";

  const handleNav = (screen) => {
    closeModal();
    router.push(screen);
  };

  // Load more function
  const handleLoadMore = useCallback(() => {
    // Don't load if already fetching or no more data
    if (isFetching || !hasMore) return;

    const pagination = friends?.data?.pagination;

    // Check if there's more data to load
    if (pagination?.hasMore) {
      setOffset((prevOffset) => prevOffset + LIMIT);
    } else {
      setHasMore(false);
    }
  }, [isFetching, hasMore, friends]);

  // Refresh function (pull to refresh)
  const handleRefresh = useCallback(() => {
    setOffset(0);
    setHasMore(true);
  }, []);

  // Footer component
  const renderFooter = () => {
    if (!isFetching) return null;

    return (
      <View style={styles.footerLoader}>
        <LottieAnimator visible />
        <AppText style={styles.loadingText}>Loading more...</AppText>
      </View>
    );
  };

  // Empty component
  const renderEmpty = () => {
    if (isFetching && offset === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LottieAnimator visible absolute wTransparent />
          {/* <ActivityIndicator size="large" color="#007AFF" /> */}
          {/* <AppText style={styles.emptyText}>Finding friends...</AppText> */}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <AppText style={styles.emptyText}>No suggestions available</AppText>
      </View>
    );
  };

  return (
    <View style={styles.friendsModal}>
      <WebLayout
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-around",
          width: "100%",
        }}
      >
        <WebLayout style={{ width: "35%", alignSelf: "flex-start" }}>
          <SearchBar placeholder="Search name, username or email" />
          <View style={styles.action}>
            <ActionItem
              title={"Search Contact"}
              message={"Find friends by phone number"}
              onPress={() => !isPro && handleNav("/contact")}
              image={contactImg}
            />
            <View style={styles.separator} />
            <ActionItem
              title={"Invite Friends"}
              message={"Play together with your friends now"}
              onPress={() => !isPro && handleNav("/invite")}
              image={friendsImg}
            />
          </View>
        </WebLayout>

        <WebLayout style={{ width: "45%", alignSelf: null }}>
          <AppText fontWeight="bold" size={"large"} style={styles.headerTxt}>
            Students you may know
            {friends?.data?.pagination?.total && (
              <AppText style={styles.countText}>
                {" "}
                ({friends.data.pagination.total})
              </AppText>
            )}
          </AppText>

          <WebLayout scroll={false}>
            <View style={styles.list}>
              <FlatList
                data={friends?.data?.suggestions ?? []}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 55 }}
                renderItem={({ item }) => <FriendCard data={item} />}
                // Infinite scroll props
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5} // Trigger when 50% from bottom
                // Loading indicators
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                // Pull to refresh
                refreshing={isFetching && offset === 0}
                onRefresh={handleRefresh}
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={10}
              />
            </View>
          </WebLayout>
        </WebLayout>
      </WebLayout>
    </View>
  );
};

const PopFriends = ({ visible, setter }) => {
  return (
    <PopUpModal
      visible={visible}
      setVisible={(bool) => setter(bool)}
      mainStyle={styles.main}
      title={"My Friends"}
      Component={({ closeModal }) => (
        <FindFriendsModal closeModal={closeModal} />
      )}
    />
  );
};

export default PopFriends;

const styles = StyleSheet.create({
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#999",
    fontSize: 16,
  },
  countText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "normal",
  },
  action: {
    width: Platform.OS === "web" ? "100%" : width * 0.8,
    backgroundColor: colors.white,
    borderRadius: 35,
    alignSelf: "center",
    // elevation: 8,
    marginBottom: 15,
    // paddingLeft: 8,
    paddingVertical: 4,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  actionNav: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 15,
    opacity: 0.4,
  },
  actionItem: {
    flexDirection: Platform.OS == "web" ? "column" : "row",
    alignItems: "center",
    paddingLeft: 8,
  },
  actionImgView: {
    // width: width * 0.2,
    // height: width * 0.2,
    width: Platform.OS == "web" ? 100 : width * 0.2,
    height: Platform.OS == "web" ? 100 : width * 0.2,
    justifyContent: "center",
    alignItems: "center",
  },
  actionImage: {
    width: "60%",
    height: "60%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  friendsModal: {
    flex: 1,
    borderTopStartRadius: 25,
    borderTopEndRadius: 25,
    // backgroundColor: "red",
    // height: height * 0.4,
    // alignSelf: "flex-end",
    maxHeight: height * 0.9,
  },
  headerTxt: {
    marginBottom: 15,
    marginLeft: 15,
  },
  list: {
    flex: 1,
    width: Platform.OS === "web" ? 500 : width,
  },
  main: {
    // borderTopStartRadius: 25,
    // borderTopEndRadius: 25,
    // elevation: 15,
  },
  rowWide: {
    // width: Platform.OS == "web" ? "40%" : null,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  separator: {
    height: 2,
    width: "100%",
    backgroundColor: colors.extraLight,
  },
});
