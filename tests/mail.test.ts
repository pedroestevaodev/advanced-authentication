import { describe, expect, test } from "bun:test";
import { logResendResult } from "@/lib/mail";

describe("logResendResult", () => {
  test("logs when Resend returns an error", () => {
    const messages: string[] = [];
    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      logResendResult("send verification email", {
        error: { message: "API key invalid" },
      });
    } finally {
      console.error = originalError;
    }

    expect(messages).toEqual([
      "Failed to send verification email API key invalid",
    ]);
  });

  test("does not log when Resend succeeds", () => {
    const messages: string[] = [];
    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      logResendResult("send verification email", { error: null });
    } finally {
      console.error = originalError;
    }

    expect(messages).toEqual([]);
  });
});
