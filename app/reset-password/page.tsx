"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Message = {
  text: string;
  type: "success" | "error";
};

const LANGUAGE_STORAGE_KEY = "echoes_language";

const passwordResetI18n = {
  日本語: {
    title: "新しいパスワードを設定",
    helperText: "メールのリンクから開いた場合のみ、パスワードを更新できます。",
    passwordPlaceholder: "新しいパスワード",
    confirmPasswordPlaceholder: "新しいパスワード（確認）",
    updatePasswordButton: "パスワードを更新",
    backToLoginButton: "ログイン画面へ戻る",
    checkingSession: "認証リンクを確認しています...",
    checkingButton: "確認中...",
    updatingButton: "更新中...",
    redirectingButton: "移動中...",
    missingSession: "認証セッションが見つかりません。メールのリンクをもう一度開いてください。",
    invalidLink: "リンクの有効期限が切れているか、無効です。もう一度パスワード再設定メールを送信してください。",
    weakPassword: "パスワードは8文字以上で、英字と数字を含めてください。",
    missingPassword: "新しいパスワードを入力してください",
    passwordMismatch: "パスワードが一致しません",
    updateFailed: "パスワードの更新に失敗しました。時間をおいてもう一度お試しください。",
    updateSuccess: "パスワードを更新しました。ログイン画面へ移動します。",
    signOutFailed: "ログイン画面へ戻れませんでした。時間をおいてもう一度お試しください。",
  },
  English: {
    title: "Set a new password",
    helperText: "You can update your password only when opening this page from the email link.",
    passwordPlaceholder: "New password",
    confirmPasswordPlaceholder: "Confirm new password",
    updatePasswordButton: "Update password",
    backToLoginButton: "Back to login",
    checkingSession: "Checking your authentication link...",
    checkingButton: "Checking...",
    updatingButton: "Updating...",
    redirectingButton: "Redirecting...",
    missingSession: "No authentication session was found. Please open the email link again.",
    invalidLink: "This link has expired or is invalid. Please request another password reset email.",
    weakPassword: "Password must be at least 8 characters and include letters and numbers.",
    missingPassword: "Enter your new password",
    passwordMismatch: "Passwords do not match",
    updateFailed: "Could not update your password. Please try again later.",
    updateSuccess: "Your password has been updated. Redirecting to the login screen.",
    signOutFailed: "Could not return to the login screen. Please try again later.",
  },
  中文: {
    title: "设置新密码",
    helperText: "只有通过邮件链接打开此页面时，才能更新密码。",
    passwordPlaceholder: "新密码",
    confirmPasswordPlaceholder: "确认新密码",
    updatePasswordButton: "更新密码",
    backToLoginButton: "返回登录页面",
    checkingSession: "正在确认认证链接...",
    checkingButton: "确认中...",
    updatingButton: "更新中...",
    redirectingButton: "跳转中...",
    missingSession: "未找到认证会话。请再次打开邮件中的链接。",
    invalidLink: "此链接已过期或无效。请重新发送密码重置邮件。",
    weakPassword: "密码至少需要 8 个字符，并包含字母和数字。",
    missingPassword: "请输入新密码",
    passwordMismatch: "两次输入的密码不一致",
    updateFailed: "密码更新失败。请稍后再试。",
    updateSuccess: "密码已更新。正在前往登录页面。",
    signOutFailed: "无法返回登录页面。请稍后再试。",
  },
} as const;

type PasswordResetLanguage = keyof typeof passwordResetI18n;
type PasswordResetMessages = (typeof passwordResetI18n)[PasswordResetLanguage];

const DEFAULT_LANGUAGE: PasswordResetLanguage = "日本語";

const getSavedPasswordResetLanguage = (): PasswordResetLanguage => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage && savedLanguage in passwordResetI18n
    ? (savedLanguage as PasswordResetLanguage)
    : DEFAULT_LANGUAGE;
};

const mapPasswordResetError = (error: unknown, messages: PasswordResetMessages) => {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("auth session missing")) {
    return messages.missingSession;
  }
  if (
    lowerMessage.includes("expired") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("token") ||
    lowerMessage.includes("otp") ||
    lowerMessage.includes("code")
  ) {
    return messages.invalidLink;
  }
  if (
    lowerMessage.includes("weak") ||
    lowerMessage.includes("password should be") ||
    lowerMessage.includes("at least 6") ||
    lowerMessage.includes("at least 8")
  ) {
    return messages.weakPassword;
  }

  return messages.updateFailed;
};

export default function ResetPasswordPage() {
  const [language, setLanguage] = useState<PasswordResetLanguage>(DEFAULT_LANGUAGE);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const passwordResetMessages = passwordResetI18n[language];

  useEffect(() => {
    let isMounted = true;
    const savedLanguage = getSavedPasswordResetLanguage();
    const messages = passwordResetI18n[savedLanguage];

    setLanguage(savedLanguage);

    const markRecoveryReady = () => {
      if (!isMounted) return;
      setIsRecoveryReady(true);
      setMessage(null);
    };

    const showRecoveryError = (error: unknown) => {
      if (!isMounted) return;
      setIsRecoveryReady(false);
      setMessage({ text: mapPasswordResetError(error, messages), type: "error" });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markRecoveryReady();
      }
    });

    const initializeRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            showRecoveryError(error);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          showRecoveryError(error);
          return;
        }
        if (data.session) {
          markRecoveryReady();
          return;
        }

        showRecoveryError(new Error("Auth session missing!"));
      } catch (error) {
        showRecoveryError(error);
      } finally {
        if (isMounted) {
          setIsSessionChecking(false);
        }
      }
    };

    void initializeRecoverySession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOutAndRedirectToLogin = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      window.location.assign("/");
    } catch {
      setMessage({ text: passwordResetI18n[language].signOutFailed, type: "error" });
      setIsSigningOut(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOutAndRedirectToLogin();
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isRecoveryReady) {
      setMessage({ text: passwordResetMessages.missingSession, type: "error" });
      return;
    }
    if (!password || !confirmPassword) {
      setMessage({ text: passwordResetMessages.missingPassword, type: "error" });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: passwordResetMessages.passwordMismatch, type: "error" });
      return;
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage({ text: passwordResetMessages.weakPassword, type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ text: mapPasswordResetError(error, passwordResetMessages), type: "error" });
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setMessage({ text: passwordResetMessages.updateSuccess, type: "success" });
      setIsSigningOut(true);
      window.setTimeout(() => {
        void signOutAndRedirectToLogin();
      }, 800);
    } catch {
      setMessage({ text: passwordResetMessages.updateFailed, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 animate-fade-in">
      <h1 className="text-5xl font-black italic mb-8">Echoes.</h1>
      <form onSubmit={handleUpdatePassword} className="w-full max-w-sm flex flex-col gap-4">
        <div className="bg-[#1c1c1e] border border-zinc-800 p-8 rounded-3xl flex flex-col gap-4 shadow-2xl">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold mb-2">{passwordResetMessages.title}</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {passwordResetMessages.helperText}
            </p>
          </div>
          {message && (
            <div className={`rounded-2xl px-4 py-3 text-xs font-bold leading-relaxed ${message.type === "error" ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30"}`}>
              {message.text}
            </div>
          )}
          {isSessionChecking && (
            <div className="rounded-2xl px-4 py-3 text-xs font-bold leading-relaxed bg-zinc-800/60 text-zinc-300 border border-zinc-700">
              {passwordResetMessages.checkingSession}
            </div>
          )}
          <input
            type="password"
            placeholder={passwordResetMessages.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSessionChecking || isLoading || isSigningOut}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <input
            type="password"
            placeholder={passwordResetMessages.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSessionChecking || isLoading || isSigningOut}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={isLoading || isSigningOut || isSessionChecking || !isRecoveryReady}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl mt-2 disabled:opacity-50 transition-transform active:scale-95"
          >
            {isSessionChecking ? passwordResetMessages.checkingButton : isSigningOut ? passwordResetMessages.redirectingButton : isLoading ? passwordResetMessages.updatingButton : passwordResetMessages.updatePasswordButton}
          </button>
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={isLoading || isSigningOut}
            className="text-center text-xs text-zinc-500 hover:text-white font-bold transition-colors disabled:opacity-50"
          >
            {isSigningOut ? passwordResetMessages.redirectingButton : passwordResetMessages.backToLoginButton}
          </button>
        </div>
      </form>
    </main>
  );
}
