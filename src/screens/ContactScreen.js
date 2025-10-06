import { useEffect, useState } from "react";
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import * as Contacts from "expo-contacts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/AppText";
import AppButton from "../components/AppButton";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import { NavBack } from "../components/AppIcons";
import { dummyLeaderboards } from "../helpers/dataStore";
import { formatContact, generateRandoms } from "../helpers/helperFunctions";
import FriendCard from "../components/FriendCard";
import SearchBar from "../components/SearchBar";

const { width, height } = Dimensions.get("screen");

const HEADER_HEIGHT = height * 0.22;

const sortContacts = (arr) => {
  const order = { pending: 2, invite: 1 };

  return arr.sort((a, b) => order[a.status] - order[b.status]);
};

const ContactScreen = () => {
  const topper = useSafeAreaInsets().top;

  const [contactsData, setContactsData] = useState([]);

  const handlePress = async () => {
    const data = await Contacts.presentContactPickerAsync();
  };

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        const contacts = data.filter((contItem) =>
          Boolean(contItem.phoneNumbers)
        );

        if (contacts.length > 0) {
          const contactRands = generateRandoms(6, contacts.length);
          let newContacts = contacts.map((item, idx) => {
            if (contactRands.includes(idx)) {
              const indexArr = contactRands.findIndex((item) => item == idx);
              const user = dummyLeaderboards[indexArr];
              const username = "@"
                .concat(user?.name?.split(" ").join("_"))
                .slice(0, 9)
                .toLowerCase();
              return {
                _id: item._id,
                user: item,
                school: username,
                status: "invite",
              };
            } else {
              return {
                _id: item._id,
                user: item,
                status: "pending",
              };
            }
          });
          newContacts = sortContacts(newContacts);

          setContactsData(newContacts);
        }
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header} />
      <View style={styles.main}>
        <View style={styles.mainHeader}>
          <AppText
            style={styles.headerTitle}
            fontWeight="heavy"
            size={"xxlarge"}
          >
            My Contacts
          </AppText>
          {/* <AppText style={styles.headerMsg} fontWeight="bold" size={"large"}>
          Follow your friends from your contact list
        </AppText> */}
        </View>
        <View style={styles.mainContent}>
          <SearchBar placeholder="Search contact lists..." />
          <FlatList
            data={contactsData}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <FriendCard data={item} type="invite" />
            )}
          />
        </View>
      </View>
      <NavBack style={{ ...styles.nav, top: topper + 15 }} />
    </View>
  );
};

export default ContactScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width,
    height: HEADER_HEIGHT,
    backgroundColor: colors.primaryDeep,
    padding: 20,
    paddingLeft: 25,
  },
  headerTitle: {
    color: colors.white,
  },
  // headerMsg: {
  //   color: colors.white,
  // },
  main: {
    bottom: HEADER_HEIGHT / 2,
    alignItems: "center",
  },
  mainHeader: {},
  mainContent: {
    backgroundColor: colors.white,
    width: width * 0.92,
    minHeight: height * 0.65,
    maxHeight: height * 0.78,
    marginTop: 20,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
  },
  nav: {
    position: "absolute",
    left: 20,
  },
});
