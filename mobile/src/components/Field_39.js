import { StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from 'react';
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
  containerStyle,
  labelStyle,
  ...props
}) {
  const [altura, setAltura] = useState(88);
  return (
    <View style={[globalStyles.field, containerStyle]}>
      <Text style={[globalStyles.label, labelStyle]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        placeholderTextColor="#777777"
        {...props}
        onContentSizeChange={evento => { if (multiline) setAltura(Math.max(88, Math.ceil(evento.nativeEvent.contentSize.height))); props.onContentSizeChange?.(evento); }}
        style={[
          globalStyles.input,
          !editable && styles.disabled,
          multiline && styles.multiline,
          multiline && { height: altura },
          props.style
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
