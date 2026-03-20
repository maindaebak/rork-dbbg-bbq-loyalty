import { ChevronDown } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  type CountryCode,
} from "@/constants/country-codes";

interface PhoneInputProps {
  countryCode: CountryCode;
  onCountryCodeChange: (cc: CountryCode) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  testID: string;
}

export function PhoneInput({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  testID,
}: PhoneInputProps) {
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const filteredCodes = search.trim()
    ? COUNTRY_CODES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search),
      )
    : COUNTRY_CODES;

  const handleSelect = useCallback(
    (cc: CountryCode) => {
      onCountryCodeChange(cc);
      setPickerVisible(false);
      setSearch("");
    },
    [onCountryCodeChange],
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      const digits = value.replace(/[^\d]/g, "");
      onPhoneNumberChange(digits.slice(0, 15));
    },
    [onPhoneNumberChange],
  );

  const renderItem = useCallback(
    ({ item }: { item: CountryCode }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          pickerStyles.item,
          pressed && pickerStyles.itemPressed,
          item.code === countryCode.code && pickerStyles.itemSelected,
        ]}
        testID={`${testID}-country-${item.code}`}
      >
        <Text style={pickerStyles.itemFlag}>{item.flag}</Text>
        <Text style={pickerStyles.itemCode}>{item.code}</Text>
        <Text style={pickerStyles.itemDial}>{item.dial}</Text>
      </Pressable>
    ),
    [countryCode.code, handleSelect, testID],
  );

  const keyExtractor = useCallback((item: CountryCode) => `${item.code}-${item.dial}`, []);

  return (
    <View style={styles.wrapper} testID={`${testID}-wrap`}>
      <Text style={styles.label}>Phone number</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [
            styles.countryButton,
            pressed && styles.countryButtonPressed,
          ]}
          testID={`${testID}-country-picker`}
        >
          <Text style={styles.flag}>{countryCode.flag}</Text>
          <Text style={styles.dial}>{countryCode.dial}</Text>
          <ChevronDown color="#C8AA94" size={14} />
        </Pressable>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={handlePhoneChange}
          placeholder="Phone number"
          placeholderTextColor="#8E6D56"
          style={styles.input}
          testID={testID}
          value={phoneNumber}
        />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setPickerVisible(false);
          setSearch("");
        }}
        transparent
        visible={pickerVisible}
      >
        <Pressable
          onPress={() => {
            setPickerVisible(false);
            setSearch("");
          }}
          style={pickerStyles.overlay}
        >
          <Pressable style={pickerStyles.sheet} onPress={() => {}}>
            <View style={pickerStyles.handle} />
            <Text style={pickerStyles.title}>Select country code</Text>
            <TextInput
              autoFocus
              onChangeText={setSearch}
              placeholder="Search country or code..."
              placeholderTextColor="#8E6D56"
              style={pickerStyles.search}
              testID={`${testID}-country-search`}
              value={search}
            />
            <FlatList
              data={filteredCodes}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              style={pickerStyles.list}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export { DEFAULT_COUNTRY_CODE, type CountryCode };

const styles = StyleSheet.create({
  countryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  countryButtonPressed: {
    opacity: 0.7,
  },
  dial: {
    color: "#F8E7D0",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  flag: {
    fontSize: 18,
  },
  input: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  label: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  wrapper: {
    gap: 8,
  },
});

const pickerStyles = StyleSheet.create({
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(247, 197, 139, 0.3)",
    borderRadius: 3,
    height: 5,
    marginBottom: 12,
    width: 40,
  },
  item: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  itemCode: {
    color: "#F8E7D0",
    fontSize: 15,
    fontWeight: "700" as const,
    minWidth: 36,
  },
  itemDial: {
    color: "#C8AA94",
    fontSize: 15,
  },
  itemFlag: {
    fontSize: 22,
  },
  itemPressed: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
  },
  itemSelected: {
    backgroundColor: "rgba(247, 197, 139, 0.12)",
  },
  list: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
    flex: 1,
    justifyContent: "flex-end",
  },
  search: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 15,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheet: {
    backgroundColor: "#1A120E",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "70%",
    paddingBottom: 30,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  title: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "800" as const,
    marginBottom: 14,
    textAlign: "center",
  },
});
