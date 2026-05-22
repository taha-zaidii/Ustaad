"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion } from "framer-motion";
import { Briefcase, Hammer, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function OnboardingPage() {
  const router        = useRouter();
  const { t }         = useLanguage();
  const [role, setRole]         = useState<"client" | "freelancer" | null>(null);
  const [saving, setSaving]     = useState(false);

  const handleContinue = async () => {
    if (!role) return;
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType: role }),
      });
      if (!res.ok) throw new Error("Failed to set role");
      toast({ title: "Account Setup Complete!", description: "Welcome to Ustaad." });
      router.push("/dashboard");
    } catch {
      toast({ title: "Error", description: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-2"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-lg mx-auto"
          style={{ background: "var(--grad-brand)", boxShadow: "0 8px 24px -8px var(--brand-glow)" }}
        >
          U
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-lg mt-6 text-center"
      >
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {t("onboard.title")}
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
          {t("onboard.question")}
        </p>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Client */}
          <button
            id="role-client"
            type="button"
            role="radio"
            aria-checked={role === "client"}
            aria-label={t("onboard.client_title")}
            onClick={() => setRole("client")}
            className={`rounded-2xl p-6 text-left transition-all duration-200 ${
              role === "client" ? "ring-2" : "ring-1 hover:ring-2"
            }`}
            style={{
              background: "var(--bg-card)",
              border: role === "client" ? "2px solid var(--brand)" : "2px solid var(--border)",
              boxShadow: role === "client" ? "0 0 0 4px var(--brand-dim)" : "none",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: role === "client" ? "var(--brand-dim)" : "var(--bg-elevated)" }}
            >
              <Briefcase aria-hidden="true" className="w-6 h-6" style={{ color: role === "client" ? "var(--brand)" : "var(--text-secondary)" }} />
            </div>
            <div className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>
              {t("onboard.client_title")}
            </div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("onboard.client_desc")}
            </div>
          </button>

          {/* Freelancer / Mazdoor */}
          <button
            id="role-freelancer"
            type="button"
            role="radio"
            aria-checked={role === "freelancer"}
            aria-label={t("onboard.worker_title")}
            onClick={() => setRole("freelancer")}
            className="rounded-2xl p-6 text-left transition-all duration-200"
            style={{
              background: "var(--bg-card)",
              border: role === "freelancer" ? "2px solid var(--brand)" : "2px solid var(--border)",
              boxShadow: role === "freelancer" ? "0 0 0 4px var(--brand-dim)" : "none",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: role === "freelancer" ? "var(--brand-dim)" : "var(--bg-elevated)" }}
            >
              <Hammer aria-hidden="true" className="w-6 h-6" style={{ color: role === "freelancer" ? "var(--brand)" : "var(--text-secondary)" }} />
            </div>
            <div className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>
              {t("onboard.worker_title")}
            </div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("onboard.worker_desc")}
            </div>
          </button>
        </div>

        {/* Continue */}
        <button
          id="onboard-continue"
          onClick={handleContinue}
          disabled={!role || saving}
          className="w-full py-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--grad-brand)", boxShadow: "0 8px 24px -8px var(--brand-glow)" }}
        >
          {saving ? t("onboard.selecting") : t("onboard.continue")}
          {!saving && <ArrowRight className="w-5 h-5" />}
        </button>
      </motion.div>
    </div>
  );
}
