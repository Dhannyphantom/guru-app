import React from "react";
import { Redirect } from "expo-router";
import { hasCompletedProfile } from "@/src/helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "@/src/context/usersSlice";
import { selectSchool, selectSchoolVerified } from "@/src/context/schoolSlice";

export default function DashboardPage() {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isSchoolVerified = useSelector(selectSchoolVerified);

  const profileCompleted = hasCompletedProfile(user);
  const schoolSub = school?.subscription?.isActive;
  const isPro = ["manager", "professional"].includes(user?.accountType);
  const hasJoined = Boolean(school && isSchoolVerified && schoolSub);
  const userSubbed = user?.subscription?.isActive;

  if (!profileCompleted.bool) {
    // setPopper(profileCompleted.pop);
    return (
      <Redirect href={{ pathname: "/profile", params: { check: "profile" } }} />
    );
  } else {
    if (user?.accountType === "student") {
      // Check if school has active sub
      if (hasJoined) {
        if (userSubbed) {
          return <Redirect href={"/main/session"} />;
        } else {
          return (
            <Redirect
              href={{ pathname: "/profile", params: { check: "subscription" } }}
            />
          );
        }
      } else {
        return (
          <Redirect
            href={{ pathname: "/school", params: { check: "school_join" } }}
          />
        );
      }
    } else if (user?.accountType === "teacher" && !hasJoined) {
      return (
        <Redirect
          href={{ pathname: "/school", params: { check: "school_join" } }}
        />
      );
    } else if (
      user?.accountType === "teacher" &&
      Boolean(school) &&
      hasJoined
    ) {
      // ("Dashboard");
      return <Redirect href={"/main/dashboard"} />;
    } else if (user?.accountType === "teacher" && !Boolean(school)) {
      // setPopper({
      //   vis: true,
      //   type: "failed",
      //   msg: "Please join or create your school profile",
      //   timer: 2000,
      // });
      return <Redirect href={"/school"} />;
    } else if (isPro && user?.verified) {
      return <Redirect href={"/pros/pro"} />;
    } else if (isPro && !user?.verified) {
      return <Redirect href={"/profile"} />;
      // setPopper({
      //   vis: true,
      //   type: "failed",
      //   msg: "Awaiting professional verification",
      //   timer: 2000,
      // });
    }
  }
}
