"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

type I18nTextProps = {
  k: string;
  params?: Record<string, string | number>;
};

export function I18nText({ k, params }: I18nTextProps) {
  const { t } = useLanguage();
  return <>{t(k, params)}</>;
}

