import React from "react";
import { Redirect } from "expo-router";
import { hasCompletedProfile } from "@/src/helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "@/src/context/usersSlice";
import { selectSchool } from "@/src/context/schoolSlice";

export default function DashboardPage() {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);

  const profileCompleted = hasCompletedProfile(user);
  const isPro = ["manager", "professional"].includes(user?.accountType);
  const hasJoined = Boolean(
    school?.data && school?.isVerified && school?.data?.subscription?.isActive
  );

  if (!profileCompleted.bool) {
    // setPopper(profileCompleted.pop);
  } else {
    if (user?.accountType === "student") {
      // setStartQuiz(true);
    } else if (user?.accountType === "teacher" && !hasJoined) {
      return <Redirect href={"/school"} />;
    } else if (
      user?.accountType === "teacher" &&
      Boolean(school) &&
      hasJoined
    ) {
      // ("Dashboard");
      return <Redirect href={"/school/dashboard"} />;
    } else if (user?.accountType === "teacher" && !Boolean(school)) {
      // setPopper({
      //   vis: true,
      //   type: "failed",
      //   msg: "Please join or create your school profile",
      //   timer: 2000,
      // });
    } else if (isPro && user?.verified) {
      return <Redirect href={"/pros/pro"} />;
    } else if (isPro && !user?.verified) {
      // setPopper({
      //   vis: true,
      //   type: "failed",
      //   msg: "Awaiting professional verification",
      //   timer: 2000,
      // });
    }
  }
}
