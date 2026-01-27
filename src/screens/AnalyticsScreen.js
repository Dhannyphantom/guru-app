/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
// import { BlurView } from "expo-blur";
import {
  Ionicons,
  // MaterialCommunityIcons,
  // FontAwesome5,
  // Feather,
} from "@expo/vector-icons";

// Import your colors
import colors, { successGradient } from "../helpers/colors";
import { useFetchAnalyticsQuery } from "../context/instanceSlice";
import AppText from "../components/AppText";
import { StatusBar } from "expo-status-bar";
import LottieAnimator from "../components/LottieAnimator";

const { width } = Dimensions.get("window");

const AnalyticsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data, isLoading: loading, refetch } = useFetchAnalyticsQuery();

  const scrollY = useSharedValue(0);
  const analytics = data?.analytics || null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.8],
        Extrapolate.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, 100],
            [0, -10],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

  if (loading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.primaryLight + 60, colors.primaryLighter + 60]}
          style={StyleSheet.absoluteFillObject}
        />
        <LottieAnimator visible />
        <AppText style={styles.loadingText}>Loading Analytics...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={[colors.primaryDeep, colors.primary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <AppText style={styles.headerTitle} fontWeight="bold">
                Analytics
              </AppText>
              <AppText style={styles.headerSubtitle}>
                Real-time insights & metrics
              </AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <TouchableOpacity style={styles.refreshButton}>
                <Ionicons name="refresh" size={24} color={colors.white} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Tab Navigator */}
      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={styles.tabContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TabButton
            label="Overview"
            icon="grid"
            active={selectedTab === "overview"}
            onPress={() => setSelectedTab("overview")}
          />
          <TabButton
            label="Users"
            icon="people"
            active={selectedTab === "users"}
            onPress={() => setSelectedTab("users")}
          />
          <TabButton
            label="Schools"
            icon="school"
            active={selectedTab === "schools"}
            onPress={() => setSelectedTab("schools")}
          />
          <TabButton
            label="Content"
            icon="book"
            active={selectedTab === "content"}
            onPress={() => setSelectedTab("content")}
          />
          <TabButton
            label="Quizzes"
            icon="game-controller"
            active={selectedTab === "quizzes"}
            onPress={() => setSelectedTab("quizzes")}
          />
          <TabButton
            label="Financial"
            icon="cash"
            active={selectedTab === "financial"}
            onPress={() => setSelectedTab("financial")}
          />
        </ScrollView>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === "overview" && <OverviewTab analytics={analytics} />}
        {selectedTab === "users" && <UsersTab analytics={analytics?.users} />}
        {selectedTab === "schools" && (
          <SchoolsTab analytics={analytics?.schools} />
        )}
        {selectedTab === "content" && (
          <ContentTab analytics={analytics?.content} />
        )}
        {selectedTab === "quizzes" && (
          <QuizzesTab analytics={analytics?.quizzes} />
        )}
        {selectedTab === "financial" && (
          <FinancialTab analytics={analytics?.financial} />
        )}
      </Animated.ScrollView>
      <StatusBar style="light" />
    </View>
  );
};

// Tab Button Component
const TabButton = ({ label, icon, active, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.tabButton, active && styles.tabButtonActive]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.white : colors.medium}
        />
        <AppText
          style={{
            ...styles.tabButtonText,
            ...(active && styles.tabButtonTextActive),
          }}
        >
          {label}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Overview Tab
const OverviewTab = ({ analytics }) => {
  if (!analytics) return null;

  const quickStats = [
    {
      label: "Total Users",
      value: analytics.users?.overview?.total || 0,
      icon: "people",
      gradient: [colors.primaryDeep, colors.primary],
      change: "+12%",
      positive: true,
    },
    {
      label: "Active Schools",
      value: analytics.schools?.overview?.total || 0,
      icon: "school",
      gradient: [colors.accentDeep, colors.accent],
      change: "+8%",
      positive: true,
    },
    {
      label: "Total Quizzes",
      value: analytics.quizzes?.overview?.total || 0,
      icon: "game-controller",
      gradient: [colors.greenDark, colors.green],
      change: "+24%",
      positive: true,
    },
    {
      label: "Support Tickets",
      value: analytics.support?.overview?.open || 0,
      icon: "headset",
      gradient: [colors.warningDark, colors.warning],
      change: "-5%",
      positive: true,
    },
  ];

  return (
    <View style={styles.tabContent}>
      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        {quickStats.map((stat, index) => (
          <Animated.View
            key={index}
            entering={FadeInUp.delay(index * 100).springify()}
          >
            <StatCard {...stat} />
          </Animated.View>
        ))}
      </View>

      {/* Featured Metrics */}
      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <SectionHeader title="Key Metrics" icon="trending-up" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <MetricCard
          title="User Engagement"
          value="85%"
          subtitle="Daily active users"
          icon="flame"
          iconColor={colors.heart}
          gradient={[colors.google, colors.google + 80]}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).springify()}>
        <MetricCard
          title="Content Library"
          value={analytics.content?.overview?.totalQuestions || 0}
          subtitle="Total questions available"
          icon="book"
          iconColor={colors.accent}
          gradient={[colors.primary, colors.primaryLight]}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).springify()}>
        <MetricCard
          title="Average Score"
          value={
            Math.round(analytics.quizzes?.userStats?.averageScore || 0) + "%"
          }
          subtitle="Across all quizzes"
          icon="trophy"
          iconColor={colors.warning}
          gradient={[colors.warningDark, colors.warning]}
        />
      </Animated.View>

      {/* Leaderboard Preview */}
      <Animated.View entering={FadeInUp.delay(800).springify()}>
        <SectionHeader title="Top Performers" icon="medal" />
      </Animated.View>

      {analytics.users?.leaderboards?.topByPoints
        ?.slice(0, 5)
        .map((user, index) => (
          <Animated.View
            key={index}
            entering={FadeInRight.delay(900 + index * 50).springify()}
          >
            <LeaderboardItem user={user} rank={index + 1} />
          </Animated.View>
        ))}
    </View>
  );
};

// Users Tab
const UsersTab = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <InfoCard
          title="Total Users"
          value={analytics.overview?.total}
          subtitle="Registered accounts"
          icon="people-circle"
          gradient={[colors.primary, colors.primaryDeep]}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <SectionHeader title="User Distribution" icon="pie-chart" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()}>
        <DistributionCard
          title="By Account Type"
          data={analytics.distribution?.byAccountType || []}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <DistributionCard
          title="By Gender"
          data={analytics.distribution?.byGender || []}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <SectionHeader title="Points Leaderboard" icon="trophy" />
      </Animated.View>

      {analytics.leaderboards?.topByPoints?.map((user, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(600 + index * 50).springify()}
        >
          <LeaderboardItem user={user} rank={index + 1} showPoints />
        </Animated.View>
      ))}

      <Animated.View entering={FadeInUp.delay(1000).springify()}>
        <SectionHeader title="Streak Leaders" icon="flame" />
      </Animated.View>

      {analytics.leaderboards?.topByStreak?.slice(0, 5).map((user, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(1100 + index * 50).springify()}
        >
          <LeaderboardItem user={user} rank={index + 1} showStreak />
        </Animated.View>
      ))}
    </View>
  );
};

// Schools Tab
const SchoolsTab = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <InfoCard
          title="Total Schools"
          value={analytics.overview?.total}
          subtitle="Active institutions"
          icon="school"
          gradient={[colors.accentDeep, colors.accent]}
        />
      </Animated.View>

      <View style={styles.statsRow}>
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={{ flex: 1, marginRight: 8 }}
        >
          <MiniStatCard
            label="Students"
            value={analytics.people?.totalStudents}
            icon="person"
            color={colors.green}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={{ flex: 1, marginLeft: 8 }}
        >
          <MiniStatCard
            label="Teachers"
            value={analytics.people?.totalTeachers}
            icon="person-add"
            color={colors.accent}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <SectionHeader title="School Activities" icon="pulse" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <ActivityCard
          title="Classes"
          value={analytics.activities?.totalClasses}
          icon="desktop"
          color={colors.primary}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).springify()}>
        <ActivityCard
          title="Assignments"
          value={analytics.activities?.totalAssignments}
          icon="document-text"
          color={colors.accent}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).springify()}>
        <ActivityCard
          title="Announcements"
          value={analytics.activities?.totalAnnouncements}
          icon="megaphone"
          color={colors.green}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(800).springify()}>
        <ActivityCard
          title="School Quizzes"
          value={analytics.activities?.totalQuizzes}
          icon="game-controller"
          color={colors.warning}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(900).springify()}>
        <SectionHeader title="Top Schools by Students" icon="trending-up" />
      </Animated.View>

      {analytics.topSchools?.byStudents?.slice(0, 5).map((school, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(1000 + index * 50).springify()}
        >
          <SchoolRankItem school={school} rank={index + 1} />
        </Animated.View>
      ))}
    </View>
  );
};

// Content Tab
const ContentTab = ({ analytics }) => {
  if (!analytics) return null;

  const contentStats = [
    {
      label: "Categories",
      value: analytics.overview?.totalCategories,
      icon: "folder",
      color: colors.primary,
    },
    {
      label: "Subjects",
      value: analytics.overview?.totalSubjects,
      icon: "book",
      color: colors.accent,
    },
    {
      label: "Topics",
      value: analytics.overview?.totalTopics,
      icon: "list",
      color: colors.green,
    },
    {
      label: "Questions",
      value: analytics.overview?.totalQuestions,
      icon: "help-circle",
      color: colors.warning,
    },
  ];

  return (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <SectionHeader title="Content Library" icon="library" />
      </Animated.View>

      <View style={styles.statsGrid}>
        {contentStats.map((stat, index) => (
          <Animated.View
            key={index}
            entering={FadeInUp.delay(200 + index * 100).springify()}
          >
            <MiniStatCard {...stat} />
          </Animated.View>
        ))}
      </View>

      <View style={styles.statsRow}>
        <Animated.View
          entering={FadeInUp.delay(600).springify()}
          style={{ flex: 1, marginRight: 8 }}
        >
          <MetricCard
            title="Theory"
            value={analytics.questionTypes?.theory}
            subtitle="questions"
            icon="document-text"
            iconColor={colors.accent}
            gradient={[colors.accent, colors.accentLight]}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(700).springify()}
          style={{ flex: 1, marginLeft: 8 }}
        >
          <MetricCard
            title="Objective"
            value={analytics.questionTypes?.objective}
            subtitle="questions"
            icon="checkmark-circle"
            iconColor={colors.green}
            gradient={[colors.green, colors.greenLight]}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(800).springify()}>
        <SectionHeader title="Top Categories" icon="trending-up" />
      </Animated.View>

      {analytics.topContent?.categories?.slice(0, 5).map((category, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(900 + index * 50).springify()}
        >
          <ContentRankItem
            name={category.name}
            count={category.subjectCount}
            label="subjects"
            rank={index + 1}
          />
        </Animated.View>
      ))}

      <Animated.View entering={FadeInUp.delay(1200).springify()}>
        <SectionHeader title="Top Subjects" icon="star" />
      </Animated.View>

      {analytics.topContent?.subjects?.slice(0, 5).map((subject, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(1300 + index * 50).springify()}
        >
          <ContentRankItem
            name={subject.name}
            count={subject.topicCount}
            label="topics"
            rank={index + 1}
          />
        </Animated.View>
      ))}
    </View>
  );
};

// Quizzes Tab
const QuizzesTab = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <InfoCard
          title="Total Quizzes"
          value={analytics.overview?.total}
          subtitle="Created by users"
          icon="game-controller"
          gradient={[...successGradient].reverse()}
        />
      </Animated.View>

      <View style={styles.statsRow}>
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={{ flex: 1, marginRight: 8 }}
        >
          <MiniStatCard
            label="Solo Quizzes"
            value={analytics.userStats?.totalSoloQuizzes}
            icon="person"
            color={colors.accent}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={{ flex: 1, marginLeft: 8 }}
        >
          <MiniStatCard
            label="Multiplayer"
            value={analytics.userStats?.totalMultiplayerQuizzes}
            icon="people"
            color={colors.green}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <MetricCard
          title="Average Accuracy"
          value={Math.round(analytics.userStats?.averageAccuracy || 0) + "%"}
          subtitle="Across all quizzes"
          icon="analytics"
          iconColor={colors.green}
          gradient={[...successGradient].reverse()}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <MetricCard
          title="Total Wins"
          value={analytics.userStats?.totalWins}
          subtitle="Competition victories"
          icon="trophy"
          iconColor={colors.warning}
          gradient={[colors.warningDark, colors.warning]}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).springify()}>
        <SectionHeader title="Top Performers" icon="medal" />
      </Animated.View>

      {analytics.topPerformers?.slice(0, 8).map((user, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(700 + index * 50).springify()}
        >
          <QuizPerformerItem user={user} rank={index + 1} />
        </Animated.View>
      ))}
    </View>
  );
};

// Financial Tab
const FinancialTab = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <InfoCard
          title="Total Balance"
          value={`₦${(analytics.wallets?.totalBalance || 0).toLocaleString()}`}
          subtitle="Across all wallets"
          icon="wallet"
          gradient={[...successGradient].reverse()}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <SectionHeader title="Wallet Accounts" icon="cash" />
      </Animated.View>

      {analytics.wallets?.accounts?.map((account, index) => (
        <Animated.View
          key={index}
          entering={FadeInRight.delay(300 + index * 100).springify()}
        >
          <WalletCard account={account} />
        </Animated.View>
      ))}

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <SectionHeader title="Transactions" icon="swap-horizontal" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600).springify()}>
        <InfoCard
          title="Total Transactions"
          value={analytics.transactions?.total}
          subtitle={`${analytics.transactions?.recent} in last 30 days`}
          icon="receipt"
          gradient={[colors.accentDeep, colors.accent]}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).springify()}>
        <SectionHeader title="Payouts" icon="trending-down" />
      </Animated.View>

      <View style={styles.statsRow}>
        <Animated.View
          entering={FadeInUp.delay(800).springify()}
          style={{ flex: 1, marginRight: 8 }}
        >
          <MiniStatCard
            label="Total Payouts"
            value={analytics.payouts?.total}
            icon="arrow-down-circle"
            color={colors.warning}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(900).springify()}
          style={{ flex: 1, marginLeft: 8 }}
        >
          <MiniStatCard
            label="Recent"
            value={analytics.payouts?.recent}
            icon="time"
            color={colors.green}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(1000).springify()}>
        <MetricCard
          title="Average Payout"
          value={`₦${Math.round(
            analytics.payouts?.statistics?.averageAmount || 0,
          ).toLocaleString()}`}
          subtitle={`${Math.round(
            analytics.payouts?.statistics?.averagePoints || 0,
          ).toLocaleString()} points`}
          icon="cash-outline"
          iconColor={colors.green}
          gradient={[...successGradient].reverse()}
        />
      </Animated.View>
    </View>
  );
};

// Stat Card Component
const StatCard = ({ label, value, icon, gradient, change, positive }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 25,
      stiffness: 100,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.statCard, animatedStyle]}>
      <LinearGradient colors={gradient} style={styles.statCardGradient}>
        <View style={styles.statCardContent}>
          <View style={styles.statCardIcon}>
            <Ionicons name={icon} size={24} color={colors.white} />
          </View>
          <AppText style={styles.statCardValue}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </AppText>
          <AppText style={styles.statCardLabel}>{label}</AppText>
          {change && (
            <View
              style={[
                styles.changeIndicator,
                {
                  backgroundColor: positive
                    ? colors.greenLighter
                    : colors.heartLighter,
                },
              ]}
            >
              <Ionicons
                name={positive ? "trending-up" : "trending-down"}
                size={12}
                color={positive ? colors.green : colors.heart}
              />
              <AppText
                style={[
                  styles.changeText,
                  { color: positive ? colors.green : colors.heart },
                ]}
              >
                {change}
              </AppText>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon, iconColor, gradient }) => {
  return (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={gradient}
        style={styles.metricCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.metricCardContent}>
          <View style={styles.metricCardLeft}>
            <AppText style={styles.metricCardTitle}>{title}</AppText>
            <AppText style={styles.metricCardValue}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </AppText>
            <AppText style={styles.metricCardSubtitle}>{subtitle}</AppText>
          </View>
          <View
            style={[styles.metricCardIcon, { backgroundColor: colors.white }]}
          >
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Info Card Component
const InfoCard = ({ title, value, subtitle, icon, gradient }) => {
  return (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={gradient}
        style={styles.infoCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.infoCardContent}>
          <Ionicons name={icon} size={40} color={colors.white} />
          <View style={styles.infoCardText}>
            <AppText style={styles.infoCardValue}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </AppText>
            <AppText style={styles.infoCardTitle}>{title}</AppText>
            {subtitle && (
              <AppText style={styles.infoCardSubtitle}>{subtitle}</AppText>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Mini Stat Card
const MiniStatCard = ({ label, value, icon, color }) => {
  return (
    <View style={styles.miniStatCard}>
      <View style={[styles.miniStatIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <AppText style={styles.miniStatValue}>
        {typeof value === "number" ? value.toLocaleString() : value || 0}
      </AppText>
      <AppText style={styles.miniStatLabel}>{label}</AppText>
    </View>
  );
};

// Section Header
const SectionHeader = ({ title, icon }) => {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText style={styles.sectionHeaderText}>{title}</AppText>
    </View>
  );
};

// Leaderboard Item
const LeaderboardItem = ({ user, rank, showPoints, showStreak }) => {
  const getMedalColor = (rank) => {
    if (rank === 1) return colors.warning;
    if (rank === 2) return colors.medium;
    if (rank === 3) return "#CD7F32";
    return colors.lighter;
  };

  return (
    <View style={styles.leaderboardItem}>
      <View
        style={[styles.rankBadge, { backgroundColor: getMedalColor(rank) }]}
      >
        <AppText style={styles.rankText}>#{rank}</AppText>
      </View>
      <View style={styles.leaderboardContent}>
        <AppText style={styles.leaderboardName}>
          {user.username || `${user.firstName} ${user.lastName}`}
        </AppText>
        <AppText style={styles.leaderboardSubtext}>
          {showPoints && `${user.totalPoints?.toLocaleString()} points`}
          {showStreak && `${user.streak} day streak`}
        </AppText>
      </View>
      <Ionicons
        name={showStreak ? "flame" : "trophy"}
        size={24}
        color={colors.warning}
      />
    </View>
  );
};

// Distribution Card
const DistributionCard = ({ title, data }) => {
  return (
    <View style={styles.distributionCard}>
      <AppText style={styles.distributionTitle}>{title}</AppText>
      {data.map((item, index) => (
        <View key={index} style={styles.distributionItem}>
          <AppText style={styles.distributionLabel}>
            {item._id || "Unknown"}
          </AppText>
          <View style={styles.distributionRight}>
            <AppText style={styles.distributionValue}>{item.count}</AppText>
            <View
              style={[
                styles.distributionBar,
                {
                  width: `${Math.min((item.count / Math.max(...data.map((d) => d.count))) * 100, 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// Activity Card
const ActivityCard = ({ title, value, icon, color }) => {
  return (
    <View style={styles.activityCard}>
      <View style={[styles.activityIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.activityContent}>
        <AppText style={styles.activityTitle}>{title}</AppText>
        <AppText style={styles.activityValue}>
          {typeof value === "number" ? value.toLocaleString() : value || 0}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.lighter} />
    </View>
  );
};

// School Rank Item
const SchoolRankItem = ({ school, rank }) => {
  return (
    <View style={styles.schoolRankItem}>
      <AppText style={styles.schoolRank}>#{rank}</AppText>
      <View style={styles.schoolRankContent}>
        <AppText style={styles.schoolName}>{school.name}</AppText>
        <AppText style={styles.schoolCount}>
          {school.studentCount} students
        </AppText>
      </View>
      <Ionicons name="people" size={20} color={colors.primary} />
    </View>
  );
};

// Content Rank Item
const ContentRankItem = ({ name, count, label, rank }) => {
  return (
    <View style={styles.contentRankItem}>
      <AppText style={styles.contentRank}>#{rank}</AppText>
      <View style={styles.contentRankContent}>
        <AppText style={styles.contentName}>{name}</AppText>
        <AppText style={styles.contentCount}>
          {count} {label}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.lighter} />
    </View>
  );
};

// Quiz Performer Item
const QuizPerformerItem = ({ user, rank }) => {
  const getMedalColor = (rank) => {
    if (rank === 1) return colors.warning;
    if (rank === 2) return colors.medium;
    if (rank === 3) return "#CD7F32";
    return colors.lighter;
  };

  return (
    <View style={styles.quizPerformerItem}>
      <View
        style={[
          styles.performerRankBadge,
          { backgroundColor: getMedalColor(rank) },
        ]}
      >
        <AppText style={styles.performerRankText}>#{rank}</AppText>
      </View>
      <View style={styles.performerContent}>
        <AppText style={styles.performerName}>{user.username}</AppText>
        <View style={styles.performerStats}>
          <AppText style={styles.performerStat}>
            Score: {Math.round(user.quizStats?.averageScore || 0)}
          </AppText>
          <AppText style={styles.performerStat}>•</AppText>
          <AppText style={styles.performerStat}>
            {user.quizStats?.totalQuizzes} quizzes
          </AppText>
          <AppText style={styles.performerStat}>•</AppText>
          <AppText style={styles.performerStat}>
            {Math.round(user.quizStats?.accuracyRate || 0)}% accuracy
          </AppText>
        </View>
      </View>
    </View>
  );
};

// Wallet Card
const WalletCard = ({ account }) => {
  return (
    <View style={styles.walletCard}>
      <LinearGradient
        colors={
          account.accountType === "school"
            ? [colors.accentDeep, colors.accent]
            : [colors.greenDark, colors.green]
        }
        style={styles.walletCardGradient}
      >
        <View style={styles.walletCardContent}>
          <View>
            <AppText style={styles.walletType}>
              {account.accountType.toUpperCase()} WALLET
            </AppText>
            <AppText style={styles.walletBalance}>
              ₦{account.balance.toLocaleString()}
            </AppText>
          </View>
          <Ionicons name="wallet" size={32} color={colors.white} />
        </View>
        <View style={styles.walletFooter}>
          <AppText style={styles.walletFooterText}>
            Credits: ₦{account.totalCredits.toLocaleString()}
          </AppText>
          <AppText style={styles.walletFooterText}>
            Debits: ₦{account.totalDebits.toLocaleString()}
          </AppText>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.primaryDeep,
    fontWeight: "600",
  },
  header: {
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightly,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    marginRight: 8,
    backgroundColor: colors.extraLight,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: colors.medium,
  },
  tabButtonTextActive: {
    fontWeight: "700",
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  statCardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  statCardContent: {
    padding: 16,
    alignItems: "center",
  },
  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    textAlign: "center",
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    marginLeft: 8,
  },
  metricCard: {
    marginBottom: 12,
  },
  metricCardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  metricCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  metricCardLeft: {
    flex: 1,
  },
  metricCardTitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 4,
  },
  metricCardSubtitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  metricCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  leaderboardContent: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 2,
  },
  leaderboardSubtext: {
    fontSize: 13,
    color: colors.medium,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoCardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  infoCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
  },
  infoCardText: {
    marginLeft: 16,
    flex: 1,
  },
  infoCardValue: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    fontWeight: "600",
  },
  infoCardSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  miniStatCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  miniStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.black,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: colors.medium,
    textAlign: "center",
  },
  distributionCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 12,
  },
  distributionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  distributionLabel: {
    fontSize: 14,
    color: colors.black,
    textTransform: "capitalize",
    flex: 1,
  },
  distributionRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 4,
  },
  distributionBar: {
    height: 6,
    borderRadius: 3,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: colors.medium,
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
  },
  schoolRankItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  schoolRank: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    marginRight: 12,
    width: 32,
  },
  schoolRankContent: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  schoolCount: {
    fontSize: 13,
    color: colors.medium,
  },
  contentRankItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  contentRank: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.accent,
    marginRight: 12,
    width: 32,
  },
  contentRankContent: {
    flex: 1,
  },
  contentName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  contentCount: {
    fontSize: 13,
    color: colors.medium,
  },
  quizPerformerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  performerRankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  performerContent: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 6,
  },
  performerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  performerStat: {
    fontSize: 12,
    color: colors.medium,
    marginRight: 6,
  },
  walletCard: {
    marginBottom: 12,
  },
  walletCardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  walletCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  walletType: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  walletBalance: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
  },
  walletFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  walletFooterText: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
});

export default AnalyticsScreen;
