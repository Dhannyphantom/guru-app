import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import { DashboardActions } from "../helpers/dataStore";
import { ProfileLink } from "./ProfileScreen";
import colors from "../helpers/colors";
import { Header } from "./NotificationsScreen";
import AppModal from "../components/AppModal";
import { useState } from "react";
import NewAnnouncement from "../components/NewAnnouncement";
import { useSelector } from "react-redux";
import { selectSchool } from "../context/schoolSlice";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const SchoolDashboardScreen = () => {
  const [modal, setModal] = useState({ vis: false, type: null });

  const school = useSelector(selectSchool);
  const router = useRouter();

  let ModalComponent = null;
  switch (modal?.type) {
    case "announcement":
      ModalComponent = NewAnnouncement;
      break;
  }

  const handleActionPress = (item) => {
    if (item?.modal) {
      setModal({ vis: true, type: item.modal });
    } else if (item?.nav) {
      // router.push("/school/assignment/create")
      router.push({
        pathname: item?.nav?.screen,
        params: { data: JSON.stringify(item?.nav?.data) },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Header title={school?.name} icon="school" />
      <View style={styles.main}>
        <FlatList
          data={DashboardActions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ProfileLink
              title={item.name}
              icon={item.icon}
              onPress={() => handleActionPress(item)}
            />
          )}
        />
      </View>
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ ...modal, vis: bool })}
        Component={() => (
          <ModalComponent
            data={{ schoolId: school?._id }}
            closeModal={() => setModal({ vis: false, type: null })}
          />
        )}
      />
    </View>
  );
};

export default SchoolDashboardScreen;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  form: {
    width: width * 0.95,
    backgroundColor: colors.white,
    elevation: 6,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    // minHeight: height * 0.4,
    maxHeight: height * 0.9,
  },
  formBtns: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  formTitle: {
    marginBottom: 20,
  },
  formText: {
    marginBottom: 20,
    marginTop: 15,
    textAlign: "center",
  },
  footer: {
    marginHorizontal: 25,
    alignItems: "center",
  },
  footerHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  footerTxt: {
    padding: 10,
    backgroundColor: colors.white,
    color: colors.medium,
  },
  separator: {
    height: 2,
    flex: 1,
    backgroundColor: colors.extraLight,
  },
  main: {
    backgroundColor: colors.white,
    bottom: 30,
    width: width * 0.9,
    alignSelf: "center",
    borderRadius: 10,
    paddingBottom: 10,
  },
});
