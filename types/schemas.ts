import type { z } from "zod";
import type {
  ForgotPasswordSchema,
  LoginSchema,
  NewPasswordSchema,
  RegisterSchema,
  SettingsSchema,
} from "@/schemas";

export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type NewPasswordFormData = z.infer<typeof NewPasswordSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type SettingsFormData = z.infer<typeof SettingsSchema>;
