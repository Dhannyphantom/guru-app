import nigeriaLocale from "../../assets/data/nigeria-state-and-lgas.json";
import trophyImg from "../../assets/images/trophy.png";
import homeworkImg from "../../assets/images/homework.png";
import bellImg from "../../assets/images/bell.png";
import quizImage from "../../assets/images/quiz.png";

import classroomImg from "../../assets/images/online-learning.png";
import resultImg from "../../assets/images/result.png";
import goldMedalImg from "../../assets/images/gold-medal.png";
import colors from "./colors";
import {
  Easing,
  LightSpeedInRight,
  LightSpeedOutLeft,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";
import { nanoid } from "@reduxjs/toolkit";
import { Dimensions } from "react-native";

const { height } = Dimensions.get("screen");

export const A_DAY = 60 * 60 * 24 * 1000; // 1 day in milli

export const appData = {
  SUB_PER_MONTH: 1000,
  SCHOOL_SUB_PER_TERM: 10000,
  GT_VALUE: 10,
};

export const ngLocale = nigeriaLocale;

export const getClassColor = (level) => {
  const colorsObj = {
    "jss 1": colors.primary,
    "jss 2": colors.accent,
    "jss 3": "#9C27B0",
    "sss 1": "#FF9800",
    "sss 2": "#F44336",
    "sss 3": "#00BCD4",
  };
  return colorsObj[level?.toLowerCase()] || colors.primary;
};

export const defaultSettings = {
  notifications: true,
};

export const dummyLeaderboards = [
  {
    _id: nanoid(),
    name: "Nathaniel Moses",
    image: "",
    points: 4355,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Peter Mike",
    image: "",
    points: 3355,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Sara Olojo",
    image: "",
    points: 4389,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Micah Jude",
    image: "",
    points: 1092,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Klaus Michaelson",
    image: "",
    points: 1939,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Arongbonlo Oluwashikemi Oyindamola",
    image: "",
    points: 539,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Sunday Jakob",
    image: "",
    points: 103,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Paul Isanya",
    image: "",
    points: 45908,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Rebecca Nelson",
    image: "",
    points: 9139,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Deborah Rogbesan",
    image: "",
    points: 4398,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Christopher Okwor",
    image: "",
    points: 200,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Kingsley Onaji",
    image: "",
    points: 388,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Hannah Segun",
    image: "",
    points: 573,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
  {
    _id: nanoid(),
    name: "Mustaphar Ahmed",
    image: "",
    points: 994,
    school: "abundant life academy kabba",
    gender: "male",
    rank: "beginner",
  },
];

export const genderDropdown = [
  {
    _id: nanoid(),
    name: "male",
  },
  {
    _id: nanoid(),
    name: "female",
  },
];

const renewSubs = [
  {
    _id: nanoid(),
    name: "2500 GT for 7 days",
    value: 2500,
    days: 7,
  },
  {
    _id: nanoid(),
    name: "5000 GT for 14 days",
    value: 5000,
    days: 14,
  },
  {
    _id: nanoid(),
    name: "7500 GT for 21 days",
    value: 7500,
    days: 21,
  },
];

const renewsubDropdown = Array(12)
  .fill("1")
  .map((_i, idx) => {
    const cost = (idx + 1) * appData.SUB_PER_MONTH * appData.GT_VALUE;

    const prefix = idx + 1 > 1 ? `${idx + 1} months` : "month";

    return {
      _id: nanoid(),
      name: `${cost} GT for ${prefix}`,
      value: cost,
      days: (idx + 1) * 30,
    };
  });

export const renewSubList = [...renewSubs, ...renewsubDropdown];

export const teacherPreffix = [
  {
    _id: nanoid(),
    name: "mr.",
  },
  {
    _id: nanoid(),
    name: "ms.",
  },
  {
    _id: nanoid(),
    name: "mrs.",
  },
];

export const classLevel = [
  {
    _id: nanoid(),
    name: "Junior Secondary",
    value: "junior",
  },
  {
    _id: nanoid(),
    name: "Senior Secondary",
    value: "senior",
  },
];

export const gradesList = [
  {
    _id: nanoid(),
    grade: "A+",
    score: 95,
    max: 100,
    color: colors.accent,
    title: "Outstanding",
  },
  {
    _id: nanoid(),
    grade: "A",
    score: 70,
    color: colors.primary,
    max: 95,
    title: "Excellent",
  },
  {
    _id: nanoid(),
    grade: "B",
    score: 60,
    color: colors.greenDark,
    max: 70,
    title: "Good",
  },
  {
    _id: nanoid(),
    grade: "C",
    score: 50,
    max: 60,
    color: colors.warningDark,
    title: "Satisfactory",
  },
  {
    _id: nanoid(),
    grade: "D",
    score: 40,
    color: colors.google,
    max: 50,
    title: "Basic",
  },
  {
    _id: nanoid(),
    grade: "E",
    score: 30,
    max: 40,
    color: colors.facebook,
    title: "Bad",
  },
  {
    _id: nanoid(),
    grade: "F",
    score: 0,
    max: 30,
    color: colors.heartDark,
    title: "Fail",
  },
];

export const getGradeData = (numericScore) => {
  return gradesList.find((grade) => {
    return numericScore >= grade.score && numericScore <= grade.max;
  });
};

export const subDropdown = Array(12)
  .fill("1")
  .map((_i, idx) => {
    const cost = (idx + 1) * appData.SUB_PER_MONTH;
    const isYear = idx >= 11;
    const prefix = idx + 1 > 1 ? `${idx + 1} months` : "a month";

    return {
      _id: nanoid(),
      name: `₦${Number(cost).toLocaleString()} for ${
        isYear ? "a year" : prefix
      }`,
      value: cost,
      title: `+${(idx + 1) * 30} days`,
      days: (idx + 1) * 30,
    };
  });

export const subSchoolDrop = Array(10)
  .fill("1")
  .map((_i, idx) => {
    const nextIdx = idx + 1;
    const cost = nextIdx * appData.SCHOOL_SUB_PER_TERM;
    const isYear = idx >= 11;
    const prefix = `for ${nextIdx * 3} months`;

    return {
      _id: nanoid(),
      name: `₦${Number(cost).toLocaleString()} ${isYear ? "year" : prefix}`,
      value: cost,
      title: `+${nextIdx} term${nextIdx > 1 ? "s" : ""}`,
      days: (idx + 1) * 90,
    };
  });

export const studentRanking = [
  {
    _id: nanoid(),
    name: "Rookie Guru",
  },
  {
    _id: nanoid(),
    name: "Junior Learner",
  },
  {
    _id: nanoid(),
    name: "Nerd Ninja",
  },
  {
    _id: nanoid(),
    name: "Aspiring Student",
  },
  {
    _id: nanoid(),
    name: "Brain Buster",
  },
  {
    _id: nanoid(),
    name: "Honor Roll Member",
  },
  {
    _id: nanoid(),
    name: "Top Performer",
  },
  {
    _id: nanoid(),
    name: "Academic Achiever",
  },
  {
    _id: nanoid(),
    name: "Guru Extraordinaire",
  },
  {
    _id: nanoid(),
    name: "Valedictorian",
  },
];

export const schoolTypes = [
  {
    _id: nanoid(),
    name: "Private",
  },
  {
    _id: nanoid(),
    name: "Public",
  },
];

export const schoolLevels = [
  {
    _id: nanoid(),
    name: "Nursery",
  },
  {
    _id: nanoid(),
    name: "Primary",
  },
  {
    _id: nanoid(),
    name: "Junior Secondary",
  },
  {
    _id: nanoid(),
    name: "Senior Secondary",
  },
];

export const schoolClasses = [
  {
    _id: nanoid(),
    name: "JSS 1",
  },
  {
    _id: nanoid(),
    name: "JSS 2",
  },
  {
    _id: nanoid(),
    name: "JSS 3",
  },
  {
    _id: nanoid(),
    name: "SSS 1",
  },
  {
    _id: nanoid(),
    name: "SSS 2",
  },
  {
    _id: nanoid(),
    name: "SSS 3",
  },
];

export const schoolActions = [
  {
    _id: nanoid(),
    name: "Dashboard",
    image: goldMedalImg,
    bgColor: colors.heartLight,
    total: "O",
    nav: { screen: "/school/dashboard", data: { screen: "School" } },
  },
  {
    _id: nanoid(),
    name: "Quiz",
    image: quizImage,
    bgColor: colors.primaryLight,
    total: 2,
  },
  {
    _id: nanoid(),
    name: "Announcements",
    image: bellImg,
    bgColor: colors.accentLighter,
    total: 2,
    nav: { screen: "/school/notifications", data: { screen: "School" } },
  },
  {
    _id: nanoid(),
    name: "Assignments",
    image: homeworkImg,
    bgColor: colors.heartLighter,
    total: 2,
    nav: { screen: "/school/assignment/", data: {} },
  },
  {
    _id: nanoid(),
    name: "Leaderboard",
    bgColor: colors.greenLighter,
    image: trophyImg,
    total: 14,
    nav: { screen: "/school/leaderboard", data: { screen: "School" } },
  },
  {
    _id: nanoid(),
    name: "Classes",
    image: classroomImg,
    bgColor: colors.warningLight,
    total: 6,
  },
];

export const otherClasses = [
  {
    _id: nanoid(),
    name: "The Conquerors (SS3)",
  },
  {
    _id: nanoid(),
    name: "The Eccentrics (SS1)",
  },
  {
    _id: nanoid(),
    name: "The Overcomers (JSS3)",
  },

  {
    _id: nanoid(),
    name: "The Achievers (JSS2)",
  },
  {
    _id: nanoid(),
    name: "The Titans (JSS1)",
  },
];

export const teacherAssignments = [
  {
    _id: nanoid(),
    title: "Vectors",
    subject: "Physics",
    status: "active",
    date: new Date().toISOString(),
    date_exp: new Date(new Date().getTime() + A_DAY).toISOString(),
    submitted_count: 5,
    total_count: 60,
    class: "SS1",
  },
  {
    _id: nanoid(),
    title: "Work, Energy & Power",
    subject: "Physics",
    status: "inactive",
  },
  {
    _id: nanoid(),
    title: "Capacitance Calculation",
    subject: "Physics",
    status: "active",
    date: new Date().toISOString(),
    date_exp: new Date(new Date().getTime() + A_DAY).toISOString(),
    submitted_count: 35,
    total_count: 60,
    class: "SS3",
  },
  {
    _id: nanoid(),
    title: "Simple motion equation mastery",
    subject: "Physics",
    status: "inactive",
  },
];

export const rewards = [
  {
    _id: nanoid(),
    title: "You completed a 10 days streak!.",
    point: 100,
  },
  {
    _id: nanoid(),
    title: "You completed a 50 days streak!.",
    point: 1500,
  },
  {
    _id: nanoid(),
    title: "You invited John Snow_@johhny",
    point: 1000,
  },
  {
    _id: nanoid(),
    title: "You invited Sara West_@shallywest",
    point: 1000,
  },
];

export const teacherQuiz = [
  {
    _id: nanoid(),
    subject: "Physics",
    title: "Simple motion quiz",
    status: "inactive",
    history: [
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 18,
        student_count: 43,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 67,
        student_count: 83,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 98,
        student_count: 13,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 56,
        student_count: 13,
      },
    ],
  },
  {
    _id: nanoid(),
    subject: "Physics",
    title: "Work, energy and power quiz",
    status: "ongoing",
    history: [
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 78,
        student_count: 23,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 38,
        student_count: 30,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 44,
        student_count: 15,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 6,
        student_count: 43,
      },
    ],
  },
  {
    _id: nanoid(),
    subject: "Mathematics",
    title: "Qudratic equation quiz I",
    status: "inactive",
    history: [
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 68,
        student_count: 23,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 18,
        student_count: 23,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 45,
        student_count: 63,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 46,
        student_count: 6,
      },
    ],
  },
  {
    _id: nanoid(),
    subject: "Mathematics",
    title: "Qudratic equation quiz II",
    status: "inactive",
    history: [
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 45,
        student_count: 78,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 36,
        student_count: 72,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 52,
        student_count: 10,
      },
      {
        _id: nanoid(),
        date: new Date().toISOString(),
        average_score: 68,
        student_count: 23,
      },
    ],
  },
];

export const schoolQuizHistory = [
  {
    _id: nanoid(),
    subject: "Biology",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 39,
    numberOfQuestions: 40,
    teacher: { name: "Peter Parker" },
  },
  {
    _id: nanoid(),
    subject: "Mathematics",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 3,
    numberOfQuestions: 10,
    teacher: { name: "Paul Walker" },
  },
  {
    _id: nanoid(),
    subject: "English Language",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 5,
    numberOfQuestions: 10,
    teacher: { name: "John Doe" },
  },
  {
    _id: nanoid(),
    subject: "Phyiscs",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 20,
    numberOfQuestions: 20,
    teacher: { name: "Jay Jay" },
  },
  {
    _id: nanoid(),
    subject: "Mathematics",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 1,
    numberOfQuestions: 8,
    teacher: { name: "Paul Walker" },
  },
  {
    _id: nanoid(),
    subject: "Phyiscs",
    date: new Date().toISOString().slice(0, 10),
    answeredCorrectly: 29,
    numberOfQuestions: 30,
    teacher: { name: "Jay Jay" },
  },
];

export const notificationsArr = [
  {
    _id: nanoid(),
    from: "Guru",
    message:
      "You haven't practiced your quiz for a while now. You're missing out!",
    date: new Date().toLocaleDateString(),
    type: "system",
    read: false,
  },
  {
    _id: nanoid(),
    from: "My School",
    message:
      "Your teacher, Mr. Peter Parker have created a new quiz session for your class. Participate now",
    date: new Date().toLocaleDateString(),
    type: "school",
    read: false,
    nav: { screen: "School", data: {} },
  },
  {
    _id: nanoid(),
    from: "Guru Tips",
    message: "Do you know you can cash out N1 000 with 10 000 GT?",
    date: new Date().toLocaleDateString(),
    type: "alert",
    read: true,
  },
  {
    _id: nanoid(),
    from: "Guru",
    message:
      "Hey Dhannyphantom, Your friend Elena Gilbert is inviting you for a quiz session. Join now to earn XP!",
    date: new Date().toLocaleDateString(),
    type: "important",
    read: false,
  },
  {
    _id: nanoid(),
    from: "My School",
    message:
      "Your teacher, Mr. Paul Walker have released your Physics quiz results. Check results now!",
    date: new Date().toLocaleDateString(),
    type: "school",
    read: false,
    nav: { screen: "School", data: {} },
  },
  {
    _id: nanoid(),
    from: "Guru",
    message:
      "Hey Dhannyphantom, Practice a quiz session now to maintain your 25days streak!",
    date: new Date().toLocaleDateString(),
    type: "important",
    read: false,
  },
];

export const calenderMonths = [
  {
    _id: nanoid(),
    name: "January",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "February",
    days: 29,
  },
  {
    _id: nanoid(),
    name: "March",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "April",
    days: 30,
  },
  {
    _id: nanoid(),
    name: "May",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "June",
    days: 30,
  },
  {
    _id: nanoid(),
    name: "July",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "August",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "September",
    days: 30,
  },
  {
    _id: nanoid(),
    name: "October",
    days: 31,
  },
  {
    _id: nanoid(),
    name: "November",
    days: 30,
  },
  {
    _id: nanoid(),
    name: "December",
    days: 31,
  },
];

export const subHistories = [
  {
    _id: nanoid(),
    date: new Date(2024, 0, 3),
    title: "Withdrawal",
    msg: "-4055",
    amount: 400,
  },
  {
    _id: nanoid(),
    date: new Date(2024, 0, 1),
    title: "Subscription",
    msg: "+3 months",
    amount: 6000,
  },
  {
    _id: nanoid(),
    date: new Date(2024, 0, 2),
    title: "Withdrawal",
    msg: "-540",
    amount: 860,
  },
  {
    _id: nanoid(),
    date: new Date(2024, 0, 13),
    title: "Withdrawal",
    msg: "-8140",
    amount: 1250,
  },
];

export const assignmentsArr = [
  {
    _id: nanoid(),
    teacher: { name: "John Nelson", pronoun: "Mr" },
    subject: "Physics",
    assignments: [
      {
        _id: nanoid(),
        title: "Gravitational force",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "pending",
        question:
          "Explain how gravitational force acts between two masses and calculate the force between two 5kg masses separated by 2m.",
      },
      {
        _id: nanoid(),
        title: "Motion assignment",
        expiry: new Date(Date.now() + A_DAY * 2).toISOString(),
        status: "pending",
        question:
          "Describe the equations of motion and solve a problem involving an object moving with constant acceleration.",
      },
      {
        _id: nanoid(),
        title: "Motion assignment II",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "submitted",
        question:
          "Analyze the motion of a projectile launched at an angle of 45° with an initial velocity of 20 m/s.",
      },
    ],
  },
  {
    _id: nanoid(),
    teacher: { name: "Neela Akoba", pronoun: "Miss" },
    subject: "Biology",
    assignments: [
      {
        _id: nanoid(),
        title: "Reproduction",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "pending",
        question:
          "Discuss the differences between sexual and asexual reproduction with examples.",
      },
      {
        _id: nanoid(),
        title: "Nutrition",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "submitted",
        question:
          "Explain the importance of macronutrients and micronutrients in human nutrition.",
      },
      {
        _id: nanoid(),
        title: "Taxonomy",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "passed",
        question:
          "Define taxonomy and describe the key characteristics used to classify organisms into kingdoms.",
      },
      {
        _id: nanoid(),
        title: "Genetics",
        expiry: new Date(Date.now() + A_DAY).toISOString(),
        status: "failed",
        question:
          "Explain Mendel's laws of inheritance and solve a problem involving a monohybrid cross.",
      },
    ],
  },
];

export const DashboardActions = [
  {
    _id: nanoid(),
    name: "New Quiz Session",
    icon: "rocket",
    nav: { screen: "/(protected)/quiz/new_quiz", data: {} },
  },

  {
    _id: nanoid(),
    name: "New Assignmet",
    icon: "book",
    nav: { screen: "/school/assignment/create", data: {} },
  },
  {
    _id: nanoid(),
    name: "New Announcement",
    icon: "notifications",
    modal: "announcement",
  },
  {
    _id: nanoid(),
    name: "Manage Classes",
    icon: "school",
    nav: { screen: "/school/classrooms", data: {} },
  },
  {
    _id: nanoid(),
    name: "Verify Students",
    icon: "people",
    nav: { screen: "/school/verify", data: { type: "student" } },
  },
  {
    _id: nanoid(),
    name: "Verify Teachers",
    icon: "people",
    nav: { screen: "/school/verify", data: { type: "teacher" } },
    // nav: { screen: "VerifyStudent", data: { type: "teacher" } },
  },
  // {
  //   _id: nanoid(),
  //   name: "Verify Teachers",
  //   icon: "people",
  //   nav: { screen: "VerifyStudent", data: {} },
  // },
  {
    _id: nanoid(),
    name: "Manage School Subscription",
    icon: "card",
    nav: { screen: "/school/subscription", data: { screen: "School" } },
  },
];

export const proActions = [
  {
    _id: nanoid(),
    name: "Panel",
    text: "Explore Guru analytics details screen",
    key: "panel",
  },
  {
    _id: nanoid(),
    name: "Create\nQuestion",
    text: "Create and customise multiple choice questions",
    key: "questions",
  },
  {
    _id: nanoid(),
    name: "Create Topics",
    text: "Create and customise Topics for different available subjects",
    key: "topics",
  },
  {
    _id: nanoid(),
    name: "Create Subjects",
    text: "Create and customise different subjects for different categories",
    key: "subjects",
  },
  {
    _id: nanoid(),
    name: "Create Category",
    text: "Create and customise Quiz Categories for your students",
    key: "category",
  },
  {
    _id: nanoid(),
    name: "Library",
    text: "See and Edit Questions Instances e.g topics, questions, subjects and category",
    key: "library",
  },
];

export const panelItems = [
  {
    id: nanoid(),
    name: "Professionals",
    icon: "person",
    screen: "/pros/list",
  },
  {
    id: nanoid(),
    name: "Analytics",
    icon: "analytics",
    screen: "/pros/analytics",
  },
  {
    id: nanoid(),
    name: "Pro Token",
    icon: "copy",
    screen: null,
  },
  {
    id: nanoid(),
    name: "Library",
    icon: "book",
    screen: "/pros/edit",
  },
];

export const pointsSelect = [
  {
    _id: nanoid(),
    num: 1,
  },
  {
    _id: nanoid(),
    num: 2,
  },
  {
    _id: nanoid(),
    num: 3,
  },
  {
    _id: nanoid(),
    num: 4,
  },
  {
    _id: nanoid(),
    num: 5,
    selected: true,
  },
  {
    _id: nanoid(),
    num: 6,
  },
  {
    _id: nanoid(),
    num: 7,
  },
  {
    _id: nanoid(),
    num: 10,
  },
];

export const timerSelect = [
  {
    _id: nanoid(),
    num: 10,
  },
  {
    _id: nanoid(),
    num: 20,
  },
  {
    _id: nanoid(),
    num: 30,
  },
  {
    _id: nanoid(),
    num: 40,
    selected: true,
  },
  {
    _id: nanoid(),
    num: 60,
  },
  {
    _id: nanoid(),
    num: 90,
  },
  {
    _id: nanoid(),
    num: 100,
  },
  {
    _id: nanoid(),
    num: 120,
  },
];

export const schools = [
  {
    _id: nanoid(),
    name: "Abundant Life Acedemy",
    state: "kogi",
    lga: "kabba/bunu",
    rep: {
      name: "John Paul",
      preffix: "Mr.",
    },
  },
  {
    _id: nanoid(),
    name: "government science secondary school (GSSOK), okdayo",
    state: "kogi",
    lga: "kabba/bunu",
    rep: {
      name: "Peter Onaji",
      preffix: "Mr.",
    },
  },
  {
    _id: nanoid(),
    name: "St. Augustines college kabba",
    state: "kogi",
    lga: "kabba/bunu",
    rep: {
      name: "Moses Nathan",
      preffix: "Mr.",
    },
  },
  {
    _id: nanoid(),
    name: "st. monica",
    state: "kogi",
    lga: "kabba/bunu",
    rep: {
      name: "Susan Omonori",
      preffix: "Mrs.",
    },
  },
];

export const gradesArr = [
  { text: "A+", color: colors.primaryDeep },
  { text: "A", color: colors.accent },
  { text: "B", color: colors.warning },
  { text: "C", color: colors.greenDark },
  { text: "D", color: colors.medium },
  { text: "F", color: colors.heartDark },
];

export const assignmentHistory = Array(15)
  .fill("1")
  .map(() => {
    const randAvg = Math.max(30, Math.floor(Math.random() * 100));
    const randStudents = Math.floor(Math.random() * 200);
    const randDateNum = Math.floor(Math.random() * 100) * A_DAY;
    const randDate = new Date(new Date().getTime() - randDateNum).toISOString();
    return {
      _id: nanoid(),
      date: randDate,
      average_score: randAvg,
      student_count: randStudents,
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

export const states = nigeriaLocale.map((item) => ({
  name: item.state,
  _id: nanoid(),
}));

export const layoutTransit = LinearTransition.springify().damping(8);
export const PAD_BOTTOM = height * 0.18;

export const callback_url =
  "https://guru-server.onrender.com/payments/subscription_callback";

export const enterAnim = ZoomIn.duration(600).easing(Easing.ease);
export const enterAnimOther = LightSpeedInRight;
export const exitingAnim = LightSpeedOutLeft;
// export const SIMULATION_MODE = true;
// export const getSimulateData = (form) => {
//   return {
//     token: "tokenized",
//     user: { username: form.username, points: 0, rank: "beginner" },
//   };
// };
