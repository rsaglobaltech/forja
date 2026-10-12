import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { api } from "../../lib/api.js";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-app px-4">
      <View className="w-full max-w-sm rounded-md bg-surface p-6">
        <Text className="mb-6 text-xl font-semibold text-text">Reset password</Text>

        {submitted ? (
          <Text className="text-sm text-text">
            If that email exists, we've sent you a link to choose a new password.
          </Text>
        ) : (
          <>
            <Text className="mb-1 text-sm font-medium text-text">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
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
                <Text className="text-sm font-medium text-white">Send link</Text>
              )}
            </Pressable>
          </>
        )}

        <View className="mt-4 items-center">
          <Link href="/login" className="text-sm text-brand-600">
            Back to sign in
          </Link>
        </View>
      </View>
    </View>
  );
}
