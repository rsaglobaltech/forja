import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../lib/auth.js";
import { api } from "../../lib/api.js";

const inputClass = "mb-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-text";
const labelClass = "mb-1 text-sm font-medium text-text";

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.register({ email, password });
      await signIn(result.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-app px-4">
      <View className="w-full max-w-sm rounded-md bg-surface p-6">
        <Text className="mb-6 text-xl font-semibold text-text">Crear cuenta</Text>

        <Text className={labelClass}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          className={`${inputClass} mb-4`}
        />

        <Text className={labelClass}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          className={inputClass}
        />
        <Text className="mb-4 text-xs text-gray-500">Mínimo 8 caracteres.</Text>

        {error && <Text className="mb-4 text-sm text-red-600">{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="items-center rounded-md bg-brand-500 px-4 py-2 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-medium text-white">Crear cuenta</Text>
          )}
        </Pressable>

        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-600">¿Ya tenés cuenta?</Text>
          <Link href="/login" className="text-sm text-brand-600">
            Iniciar sesión
          </Link>
        </View>
      </View>
    </View>
  );
}
