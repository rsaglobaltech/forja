import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useAuth } from "../../lib/auth.js";
import { api } from "../../lib/api.js";

export default function DashboardScreen() {
  const { token, signOut } = useAuth();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .me(token)
      .then((me) => setEmail(me.email))
      .catch(() => signOut());
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-app px-4">
      <View className="w-full max-w-sm items-center rounded-md bg-surface p-6">
        <Text className="mb-6 text-xl font-semibold text-text">Hola, {email ?? "…"}</Text>
        <Pressable
          onPress={signOut}
          className="w-full items-center rounded-md border border-gray-300 px-4 py-2"
        >
          <Text className="text-sm font-medium text-text">Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}
