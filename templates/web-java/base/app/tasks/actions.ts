"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api";

export interface FormState {
  error?: string;
}

const MESSAGES: Record<string, string> = {
  invalid_title: "El título debe tener entre 1 y 120 caracteres.",
};

export async function createTask(_: FormState, data: FormData): Promise<FormState> {
  try {
    await api.createTask(String(data.get("title") ?? ""));
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { error: MESSAGES[e.code] ?? e.message };
    throw e;
  }
  revalidatePath("/tasks");
  return {};
}

export async function completeTask(id: string): Promise<void> {
  await api.completeTask(id);
  revalidatePath("/tasks");
}
