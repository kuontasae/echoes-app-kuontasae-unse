"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Message = {
  text: string;
  type: "success" | "error";
};

const passwordResetMessages = {
  checkingSession: "認証リンクを確認しています...",
  missingSession: "認証セッションが見つかりません。メールのリンクをもう一度開いてください。",
  invalidLink: "リンクの有効期限が切れているか、無効です。もう一度パスワード再設定メールを送信してください。",
  weakPassword: "パスワードは6文字以上で入力してください。",
  missingPassword: "新しいパスワードを入力してください",
  passwordMismatch: "パスワードが一致しません",
  updateFailed: "パスワードの更新に失敗しました。時間をおいてもう一度お試しください。",
  updateSuccess: "パスワードを更新しました。ログイン画面へ移動します。",
  signOutFailed: "ログイン画面へ戻れませんでした。時間をおいてもう一度お試しください。",
} as const;

const mapPasswordResetError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("auth session missing")) {
    return passwordResetMessages.missingSession;
  }
  if (
    lowerMessage.includes("expired") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("token") ||
    lowerMessage.includes("otp") ||
    lowerMessage.includes("code")
  ) {
    return passwordResetMessages.invalidLink;
  }
  if (
    lowerMessage.includes("weak") ||
    lowerMessage.includes("password should be") ||
    lowerMessage.includes("at least 6")
  ) {
    return passwordResetMessages.weakPassword;
  }

  return passwordResetMessages.updateFailed;
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const markRecoveryReady = () => {
      if (!isMounted) return;
      setIsRecoveryReady(true);
      setMessage(null);
    };

    const showRecoveryError = (error: unknown) => {
      if (!isMounted) return;
      setIsRecoveryReady(false);
      setMessage({ text: mapPasswordResetError(error), type: "error" });
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
      setMessage({ text: passwordResetMessages.signOutFailed, type: "error" });
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
    if (password.length < 6) {
      setMessage({ text: passwordResetMessages.weakPassword, type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ text: mapPasswordResetError(error), type: "error" });
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
            <h2 className="text-xl font-bold mb-2">新しいパスワードを設定</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              メールのリンクから開いた場合のみ、パスワードを更新できます。
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
            placeholder="新しいパスワード"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSessionChecking || isLoading || isSigningOut}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
          <input
            type="password"
            placeholder="新しいパスワード（確認）"
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
            {isSessionChecking ? "確認中..." : isSigningOut ? "移動中..." : isLoading ? "更新中..." : "パスワードを更新"}
          </button>
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={isLoading || isSigningOut}
            className="text-center text-xs text-zinc-500 hover:text-white font-bold transition-colors disabled:opacity-50"
          >
            {isSigningOut ? "移動中..." : "ログイン画面へ戻る"}
          </button>
        </div>
      </form>
    </main>
  );
}
