"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/context/AuthContext";

export type Language = "en" | "es";

type TranslateParams = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  t: (key: string, params?: TranslateParams) => string;
  setLanguage: (lang: Language) => Promise<void>;
};

const STORAGE_KEY = "snap.language";

const translations: Record<Language, Record<string, unknown>> = {
  en,
  es,
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getLanguageFromStorage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "es" ? "es" : "en";
}

function applyParams(template: string, params?: TranslateParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? ""));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [language, setLanguageState] = useState<Language>("en");
  const [readyFromProfile, setReadyFromProfile] = useState(false);

  useEffect(() => {
    setLanguageState(getLanguageFromStorage());
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (!user) {
        setReadyFromProfile(true);
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("language")
        .eq("id", user.id)
        .maybeSingle();

      const nextLanguage = data?.language === "es" ? "es" : "en";
      setLanguageState(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      setReadyFromProfile(true);
    };

    void sync();
  }, [supabase, user]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLanguageState(lang);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }

      if (!user) return;

      await supabase.from("user_profiles").update({ language: lang }).eq("id", user.id);
    },
    [supabase, user],
  );

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      const resolveKey = (dictionary: Record<string, unknown>) => {
        const keys = key.split(".");
        let value: unknown = dictionary;

        for (const k of keys) {
          if (!value || typeof value !== "object") return undefined;
          value = (value as Record<string, unknown>)[k];
          if (value === undefined) return undefined;
        }

        return typeof value === "string" ? value : undefined;
      };

      const value = resolveKey(translations[language]) ?? resolveKey(translations.en);
      if (!value) return key;
      return applyParams(value, params);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      t,
      setLanguage,
    }),
    [language, setLanguage, t],
  );

  if (!readyFromProfile && user) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return context;
}
