import {
  ForgotPasswordSchema,
  LoginSchema,
  NewPasswordSchema,
  RegisterSchema,
} from "@/schemas";
import { z } from "zod";

export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type NewPasswordFormData = z.infer<typeof NewPasswordSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
