import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { resolverUrlMidia } from "../api/client";
import BrandLogo from "../components/BrandLogo";
import Field from "../components/Field";
import { colors, globalStyles } from "../styles";

export default function EditarCursoScreen({ curso, onCancel, onSave, salvando }) {
  const [titulo, setTitulo] = useState(curso?.titulo || "");
  const [descricao, setDescricao] = useState(curso?.descricao || "");
  const [imagem, setImagem] = useState(null);
  const preview = imagem?.uri || resolverUrlMidia(curso?.imagem);

  async function escolherImagem() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });

    if (!result.canceled) {
      setImagem(result.assets[0]);
    }
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <BrandLogo compact />
        </View>
        <Text style={styles.heading}>Editar curso</Text>
        <View style={styles.card}>
          <Pressable style={styles.upload} onPress={escolherImagem}>
            {preview ? <Image source={{ uri: preview }} style={styles.image} /> : null}
            <View style={styles.uploadIcon}>
              <Ionicons name="cloud-upload-outline" size={48} color={colors.white} />
            </View>
          </Pressable>

          <Field label="Titulo:" value={titulo} onChangeText={setTitulo} />
          <Field label="Descricao:" value={descricao} onChangeText={setDescricao} multiline />

          <Pressable style={styles.archiveButton}>
            <Text style={styles.archiveText}>Arquivar curso</Text>
          </Pressable>

          <View style={styles.buttons}>
            <Pressable style={globalStyles.secondaryButton} onPress={onCancel}>
              <Text style={globalStyles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={globalStyles.primaryButton}
              onPress={() => onSave({ titulo, descricao, imagem })}
              disabled={salvando}
            >
              <Text style={globalStyles.buttonText}>{salvando ? "Salvando..." : "Salvar"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.green
  },
  page: {
    flexGrow: 1,
    paddingBottom: 28
  },
  header: {
    height: 120,
    backgroundColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center"
  },
  heading: {
    color: colors.white,
    fontSize: 46,
    fontWeight: "800",
    marginTop: 38,
    marginLeft: 40,
    marginBottom: 56
  },
  card: {
    marginHorizontal: 39,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 15
  },
  upload: {
    height: 152,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#d6d6d6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  uploadIcon: {
    alignItems: "center",
    justifyContent: "center"
  },
  archiveButton: {
    minHeight: 34,
    borderRadius: 6,
    backgroundColor: colors.amber,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 26
  },
  archiveText: {
    color: colors.black,
    fontSize: 23
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  }
});
