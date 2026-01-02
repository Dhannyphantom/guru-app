import { Modal, StyleSheet, View, FlatList } from "react-native";
import SearchBar from "./SearchBar";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../helpers/colors";
import { nanoid } from "@reduxjs/toolkit";

// const {  } = Dimensions.get("screen");

export default function SearchModal({
  vis,
  data,
  setState,
  onSearch,
  placeholder = "Search ...",
  ItemComponent,
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={vis} transparent statusBarTranslucent>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 },
        ]}
      >
        <SearchBar
          placeholder={placeholder}
          onClose={() => setState({ vis: false })}
          onChangeCallback={onSearch}
          style={{ marginBottom: 0 }}
          showClose={true}
        />
        <View style={styles.main}>
          <FlatList
            data={data}
            keyExtractor={(item) => item?._id ?? item?.id ?? nanoid()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <ItemComponent item={item} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(255,255,255, 0.7)",
  },
  main: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 15,
  },
});
