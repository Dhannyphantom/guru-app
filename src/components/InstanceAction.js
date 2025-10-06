import { Dimensions, FlatList, Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";

const { width } = Dimensions.get("screen");

/**
 * Component to display the list of instances (e.g., questions)
 * with the ability to switch between them and add a new one.
 */
export const AddInstance = ({
  list = [],
  updateActiveIndex,
  createNewInstance,
  activeIndex,
}) => {
  return (
    <View style={styles.instance}>
      {/* Scrollable instance numbers */}
      <View style={styles.instanceMain}>
        <FlatList
          data={list}
          horizontal
          keyExtractor={(item, index) => String(item) + "_" + index}
          renderItem={({ item, index }) => {
            const isCurrent = index === activeIndex;
            return (
              <AnimatedPressable
                onPress={() =>
                  updateActiveIndex({ num: Number(item), idx: index })
                }
                style={[
                  styles.instanceItem,
                  {
                    borderColor: isCurrent
                      ? colors.primary
                      : colors.primaryLighter,
                    backgroundColor: isCurrent ? colors.white : colors.unchange,
                  },
                ]}
              >
                <AppText
                  fontWeight="black"
                  size="xxlarge"
                  style={{
                    ...styles.instanceTxt,
                    color: isCurrent ? colors.primaryDeeper : colors.medium,
                  }}
                >
                  {index + 1}
                </AppText>
              </AnimatedPressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Add new instance button */}
      <AnimatedPressable onPress={createNewInstance} style={styles.instanceBtn}>
        <Ionicons name="add" size={25} color={colors.white} />
      </AnimatedPressable>
    </View>
  );
};

/**
 * Instance action buttons for save/delete operations.
 */
const InstanceAction = ({
  canDelete = true,
  onSave,
  showSave = true,
  onDelete,
}) => {
  return (
    <View style={styles.instanceAction}>
      {/* Save button */}
      {showSave && (
        <AnimatedPressable onPress={onSave} style={styles.instanceActionBtn}>
          <Ionicons
            name="checkmark-done"
            color={colors.primaryDeeper}
            size={20}
          />
          <AppText fontWeight="heavy" size="xxsmall" style={styles.saveText}>
            Save
          </AppText>
        </AnimatedPressable>
      )}

      {/* Delete button */}
      {canDelete && (
        <AnimatedPressable onPress={onDelete} style={styles.instanceActionBtn}>
          <Ionicons name="trash" color={colors.heart} size={20} />
        </AnimatedPressable>
      )}
    </View>
  );
};

export default InstanceAction;

const styles = StyleSheet.create({
  instance: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  instanceMain: {
    flex: 1,
  },
  instanceItem: {
    width: Platform.OS === "web" ? 50 : width * 0.12,
    height: Platform.OS === "web" ? 50 : width * 0.12,
    borderRadius: 12,
    backgroundColor: colors.unchange,
    marginRight: 15,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    margin: 6,
    borderWidth: 2,
    borderColor: colors.primaryLighter,
  },
  instanceTxt: {
    color: colors.primaryDeeper,
  },
  instanceBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    backgroundColor: colors.primaryDeeper,
    elevation: 2,
    marginRight: 15,
  },
  instanceAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  instanceActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  saveText: {
    color: colors.primaryDeeper,
    marginLeft: 4,
  },
});
