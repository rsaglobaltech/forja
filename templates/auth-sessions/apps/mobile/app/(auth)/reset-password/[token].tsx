import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../../lib/api.js";

/** Se abre por deep link: <scheme>://reset-password/<token> (mail de recuperación). */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword({ token, newPassword });
      router.replace("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-app px-4">
      <View className="w-full max-w-sm rounded-md bg-surface p-6">
        <Text className="mb-6 text-xl font-semibold text-text">Elegí una contraseña nueva</Text>

        <Text className="mb-1 text-sm font-medium text-text">Contraseña nueva</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoComplete="new-password"
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm text-text"
        />

        {error && <Text className="mb-4 text-sm text-red-600">{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="items-center rounded-md bg-brand-500 px-4 py-2 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-medium text-white">Guardar contraseña</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
