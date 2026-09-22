import { Text, TextInput, View } from "react-native";
import { globalStyles } from "../styles";

export default function Field({ label, value, onChangeText, secureTextEntry, keyboardType, multiline, editable = true }) {
  return (
    <View style={globalStyles.field}>
      <Text style={globalStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        style={[globalStyles.input, multiline && { minHeight: 70, textAlignVertical: "top" }]}
      />
    </View>
  );
}
