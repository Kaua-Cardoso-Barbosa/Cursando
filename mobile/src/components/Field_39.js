import { StyleSheet, Text, TextInput, View } from "react-native";
import { globalStyles } from "../styles_39";

export default
function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  multiline,
  editable = true,
  ...props
}) {
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
        placeholderTextColor="#777777"
        {...props}
        style={[
          globalStyles.input,
          !editable && styles.disabled,
          multiline && styles.multiline
        ]}
      />
    </View>
  );
}

/* Sprint item 39 - Desenvolver todas as telas do aplicativo - Define os estilos dos componentes nativos desta tela */
const styles = StyleSheet.create({
  disabled: {
    color: "#333333",
    backgroundColor: "#f4f4f4"
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top"
  }
});
/* Fim item 39 */
