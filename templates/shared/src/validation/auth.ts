import { z } from "zod";

/**
 * Fuente única de validación para web, móvil y route handlers. Repetir
 * estas reglas en cada capa es como se cuelan divergencias silenciosas.
 */
export const EmailSchema = z.string().trim().toLowerCase().email();

export const PasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: PasswordSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
