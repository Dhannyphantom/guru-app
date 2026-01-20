/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  SlideInUp,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

// Import your actual components
import AppText from "../components/AppText";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
// import { useSelector } from "react-redux";
import {
  // selectUser,
  useFetchAllTicketsAdminQuery,
  // useAssignTicketMutation,
  // useUpdateTicketStatusMutation,
  // useUpdateTicketPriorityMutation,
  useFetchSupportStatsQuery,
} from "../context/usersSlice";
import Avatar from "../components/Avatar";
import { useRouter } from "expo-router";
import { NavBack } from "../components/AppIcons";
import LottieAnimator from "../components/LottieAnimator";

// Active Ticket Card Component for Admin
const AdminActiveTicketCard = ({ ticket, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  const lastMessage = ticket.messages?.[ticket.messages.length - 1] || {};
  const unreadCount =
    ticket.messages?.filter(
      (msg) => msg.sender === "user" && msg.status !== "read",
    ).length || 0;

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "#4CAF50";
      case "in_progress":
        return "#2196F3";
      case "waiting_user":
        return "#FF9800";
      default:
        return colors.medium;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#F44336";
      case "high":
        return "#FF9800";
      case "medium":
        return "#2196F3";
      case "low":
        return "#4CAF50";
      default:
        return colors.medium;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "open":
        return "Open";
      case "in_progress":
        return "In Progress";
      case "waiting_user":
        return "Waiting for User";
      default:
        return status;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.activeTicketCard}
        >
          <View style={styles.ticketHeader}>
            <View
              style={[
                styles.ticketIcon,
                {
                  backgroundColor:
                    (ticket.categoryColor || colors.primary) + "20",
                },
              ]}
            >
              <Ionicons
                name={ticket.categoryIcon || "help-circle"}
                size={24}
                color={ticket.categoryColor || colors.primary}
              />
            </View>
            <View style={styles.ticketContent}>
              <View style={styles.ticketTitleRow}>
                <AppText fontWeight="bold" size="regular" style={{ flex: 1 }}>
                  {ticket.categoryTitle || "Support Ticket"}
                </AppText>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <AppText
                      size="xxsmall"
                      fontWeight="bold"
                      style={{ color: colors.white }}
                    >
                      {unreadCount}
                    </AppText>
                  </View>
                )}
              </View>

              {/* User Info */}
              <View style={styles.userInfoRow}>
                <Avatar size={24} source={ticket.user?.avatar?.image} />
                <AppText
                  size="xsmall"
                  style={{ color: colors.medium, marginLeft: 6 }}
                >
                  {ticket.user?.firstName} {ticket.user?.lastName}
                </AppText>
              </View>

              {/* Status and Priority Row */}
              <View style={styles.statusPriorityRow}>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(ticket.status) },
                    ]}
                  />
                  <AppText size="xsmall" style={{ color: colors.medium }}>
                    {getStatusText(ticket.status)}
                  </AppText>
                </View>

                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: getPriorityColor(ticket.priority) + "20",
                    },
                  ]}
                >
                  <AppText
                    size="xxsmall"
                    fontWeight="semibold"
                    style={{ color: getPriorityColor(ticket.priority) }}
                  >
                    {ticket.priority?.toUpperCase()}
                  </AppText>
                </View>
              </View>

              {ticket.subject && (
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 4 }}
                  numberOfLines={1}
                >
                  {ticket.subject}
                </AppText>
              )}

              {lastMessage.text && (
                <View style={styles.lastMessageContainer}>
                  <AppText
                    size="xsmall"
                    style={{ color: colors.medium, flex: 1 }}
                    numberOfLines={2}
                  >
                    {lastMessage.sender === "support" ? "You: " : "User: "}
                    {lastMessage.text}
                  </AppText>
                </View>
              )}

              <AppText
                size="xxsmall"
                style={{ color: colors.medium, marginTop: 4 }}
              >
                {new Date(ticket.lastMessageAt).toLocaleString()}
              </AppText>

              {/* Assigned To */}
              {ticket.assignedTo && (
                <View style={styles.assignedRow}>
                  <Ionicons name="person" size={12} color={colors.medium} />
                  <AppText
                    size="xxsmall"
                    style={{ color: colors.medium, marginLeft: 4 }}
                  >
                    Assigned to: {ticket.assignedTo.firstName}{" "}
                    {ticket.assignedTo.lastName}
                  </AppText>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.light} />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// History Ticket Card Component (same as user version)
const AdminHistoryTicketCard = ({ ticket, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.historyTicketCard}
        >
          <View style={styles.historyTicketHeader}>
            <View
              style={[
                styles.historyTicketIcon,
                {
                  backgroundColor:
                    (ticket.categoryColor || colors.primary) + "15",
                },
              ]}
            >
              <Ionicons
                name={ticket.categoryIcon || "help-circle"}
                size={20}
                color={ticket.categoryColor || colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="semibold" size="regular">
                {ticket.categoryTitle || "Support Ticket"}
              </AppText>
              <View style={styles.userInfoRow}>
                <Avatar size={20} source={ticket.user?.avatar?.image} />
                <AppText
                  size="xxsmall"
                  style={{ color: colors.medium, marginLeft: 6 }}
                >
                  {ticket.user?.firstName} {ticket.user?.lastName}
                </AppText>
              </View>
              <AppText
                size="xsmall"
                style={{ color: colors.medium, marginTop: 2 }}
              >
                {new Date(ticket.createdAt).toLocaleDateString()}
              </AppText>
            </View>
            <View style={styles.resolvedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.green}
              />
              <AppText
                size="xxsmall"
                fontWeight="semibold"
                style={{ color: colors.green, marginLeft: 4 }}
              >
                {ticket.status === "resolved" ? "Resolved" : "Closed"}
              </AppText>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Filter Modal Component
const FilterModal = ({ visible, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState(currentFilters);

  const statusOptions = ["open", "in_progress", "waiting_user"];
  const priorityOptions = ["low", "medium", "high", "urgent"];
  const categoryOptions = [
    "technical",
    "payment",
    "account",
    "points",
    "quiz",
    "school",
    "general",
    "other",
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.modalOverlay}
      >
        <Animated.View
          entering={SlideInDown.springify().damping(90)}
          exiting={SlideOutDown.springify()}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <AppText fontWeight="bold" size="large">
              Filter Tickets
            </AppText>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.medium} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <AppText
              fontWeight="semibold"
              size="regular"
              style={styles.filterLabel}
            >
              Status
            </AppText>
            <View style={styles.filterOptions}>
              {statusOptions.map((status) => (
                <Pressable
                  key={status}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      status: prev.status === status ? "" : status,
                    }))
                  }
                  style={[
                    styles.filterOption,
                    filters.status === status && styles.filterOptionActive,
                  ]}
                >
                  <AppText
                    size="small"
                    fontWeight={filters.status === status ? "bold" : "regular"}
                    style={{
                      color:
                        filters.status === status
                          ? colors.primary
                          : colors.medium,
                    }}
                  >
                    {status.replace("_", " ").toUpperCase()}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* Priority Filter */}
            <AppText
              fontWeight="semibold"
              size="regular"
              style={styles.filterLabel}
            >
              Priority
            </AppText>
            <View style={styles.filterOptions}>
              {priorityOptions.map((priority) => (
                <Pressable
                  key={priority}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      priority: prev.priority === priority ? "" : priority,
                    }))
                  }
                  style={[
                    styles.filterOption,
                    filters.priority === priority && styles.filterOptionActive,
                  ]}
                >
                  <AppText
                    size="small"
                    fontWeight={
                      filters.priority === priority ? "bold" : "regular"
                    }
                    style={{
                      color:
                        filters.priority === priority
                          ? colors.primary
                          : colors.medium,
                    }}
                  >
                    {priority.toUpperCase()}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* Category Filter */}
            <AppText
              fontWeight="semibold"
              size="regular"
              style={styles.filterLabel}
            >
              Category
            </AppText>
            <View style={styles.filterOptions}>
              {categoryOptions.map((category) => (
                <Pressable
                  key={category}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      category: prev.category === category ? "" : category,
                    }))
                  }
                  style={[
                    styles.filterOption,
                    filters.category === category && styles.filterOptionActive,
                  ]}
                >
                  <AppText
                    size="small"
                    fontWeight={
                      filters.category === category ? "bold" : "regular"
                    }
                    style={{
                      color:
                        filters.category === category
                          ? colors.primary
                          : colors.medium,
                    }}
                  >
                    {category.toUpperCase()}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <AppButton
              title="Clear Filters"
              onPress={() =>
                setFilters({ status: "", priority: "", category: "" })
              }
              contStyle={{ flex: 1, marginRight: 10 }}
              backgroundColor={colors.light}
              textColor={colors.medium}
            />
            <AppButton
              title="Apply"
              onPress={() => {
                onApply(filters);
                onClose();
              }}
              contStyle={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Stats Card Component
const StatsCard = ({ icon, label, value, color }) => {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText size="xxsmall" style={{ color: colors.medium }}>
          {label}
        </AppText>
        <AppText fontWeight="bold" size="xlarge">
          {value}
        </AppText>
      </View>
    </View>
  );
};

// Main Support Pro Screen
const SupportProScreen = () => {
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'history'
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  // const user = useSelector(selectUser);

  // Fetch tickets with filters
  const {
    data: ticketsData,
    isLoading,
    refetch,
  } = useFetchAllTicketsAdminQuery({
    status: activeTab === "active" ? filters.status : "",
    priority: filters.priority,
    category: filters.category,
    search: searchQuery,
  });

  const { data: statsData } = useFetchSupportStatsQuery();

  const activeTickets =
    ticketsData?.data?.tickets?.filter((tick) =>
      ["open", "in_progress", "waiting_user"].includes(tick?.status),
    ) || [];

  const historyTickets =
    ticketsData?.data?.tickets?.filter((tick) =>
      ["resolved", "closed"].includes(tick?.status),
    ) || [];

  const handleTicketPress = (ticket) => {
    router.push({
      pathname: "/main/support/chat",
      params: {
        ticketId: ticket._id,
        category: ticket.category || "general",
        categoryTitle: ticket.categoryTitle,
        categoryDescription: ticket.categoryDescription,
        categoryIcon: ticket.categoryIcon,
        categoryColor: ticket.categoryColor,
        // userId: ticket.user?._id,
        // userName: `${ticket.user?.firstName} ${ticket.user?.lastName}`,
        // userAvatar: ticket.user?.avatar?.image,
        type: "pro",
      },
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== "",
  ).length;

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <NavBack color="black" />
        <View>
          <AppText fontWeight="bold" size="xxlarge" style={{ marginTop: 10 }}>
            Support Management
          </AppText>
          <AppText
            size="regular"
            style={{ color: colors.medium, marginTop: 4 }}
          >
            Manage and respond to user support tickets
          </AppText>
        </View>
      </View>

      {/* Stats Section */}
      {statsData?.data && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsSection}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <StatsCard
            icon="mail-open"
            label="Open Tickets"
            value={
              statsData.data.statusCounts?.find((s) => s._id === "open")
                ?.count || 0
            }
            color="#4CAF50"
          />
          <StatsCard
            icon="time"
            label="In Progress"
            value={
              statsData.data.statusCounts?.find((s) => s._id === "in_progress")
                ?.count || 0
            }
            color="#2196F3"
          />
          <StatsCard
            icon="checkmark-circle"
            label="Resolved"
            value={
              statsData.data.statusCounts?.find((s) => s._id === "resolved")
                ?.count || 0
            }
            color="#4CAF50"
          />
          <StatsCard
            icon="star"
            label="Avg Rating"
            value={statsData.data.averageRating?.toFixed(1) || "N/A"}
            color="#FF9800"
          />
        </ScrollView>
      )}

      {/* Search and Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.medium} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user or subject..."
            placeholderTextColor={colors.medium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.medium} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowFilterModal(true)}
          style={styles.filterButton}
        >
          <Ionicons name="filter" size={20} color={colors.primary} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <AppText
                size="xxsmall"
                fontWeight="bold"
                style={{ color: colors.white }}
              >
                {activeFilterCount}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <AppText
            fontWeight={activeTab === "active" ? "bold" : "medium"}
            size="regular"
            style={{
              color: activeTab === "active" ? colors.primary : colors.medium,
            }}
          >
            Active
          </AppText>
          {activeTickets.length > 0 && (
            <View style={styles.tabBadge}>
              <AppText
                size="xxsmall"
                fontWeight="bold"
                style={{ color: colors.white }}
              >
                {activeTickets.length}
              </AppText>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <AppText
            fontWeight={activeTab === "history" ? "bold" : "medium"}
            size="regular"
            style={{
              color: activeTab === "history" ? colors.primary : colors.medium,
            }}
          >
            History
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === "active" ? (
          <View style={styles.section}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <LottieAnimator visible />
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 10 }}
                >
                  Loading tickets...
                </AppText>
              </View>
            ) : activeTickets.length > 0 ? (
              <>
                <AppText
                  fontWeight="bold"
                  size="large"
                  style={styles.sectionTitle}
                >
                  Active Tickets ({activeTickets.length})
                </AppText>
                {activeTickets.map((ticket, index) => (
                  <AdminActiveTicketCard
                    key={ticket._id}
                    ticket={ticket}
                    index={index}
                    onPress={() => handleTicketPress(ticket)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={64}
                  color={colors.light}
                />
                <AppText
                  fontWeight="semibold"
                  size="large"
                  style={{ marginTop: 16, color: colors.medium }}
                >
                  All Clear!
                </AppText>
                <AppText
                  size="small"
                  style={{
                    color: colors.light,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No active support tickets at the moment
                </AppText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <LottieAnimator visible />
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 10 }}
                >
                  Loading history...
                </AppText>
              </View>
            ) : historyTickets.length > 0 ? (
              <>
                <AppText
                  fontWeight="bold"
                  size="large"
                  style={styles.sectionTitle}
                >
                  Resolved Tickets ({historyTickets.length})
                </AppText>
                {historyTickets.map((ticket, index) => (
                  <AdminHistoryTicketCard
                    key={ticket._id}
                    ticket={ticket}
                    index={index}
                    onPress={() => handleTicketPress(ticket)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="file-tray-outline"
                  size={64}
                  color={colors.light}
                />
                <AppText
                  fontWeight="semibold"
                  size="large"
                  style={{ marginTop: 16, color: colors.medium }}
                >
                  No History Yet
                </AppText>
                <AppText
                  size="small"
                  style={{
                    color: colors.light,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Resolved tickets will appear here
                </AppText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  statsSection: {
    marginVertical: 15,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 160,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: "sf-regular",
    color: colors.black,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  activeTicketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ticketContent: {
    flex: 1,
  },
  ticketTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusPriorityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  lastMessageContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  historyTicketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  historyTicketHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyTicketIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterLabel: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
});

export default SupportProScreen;
