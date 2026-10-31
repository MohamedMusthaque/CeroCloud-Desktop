import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from 'date-fns'
import { es as esDateLocale, enUS } from 'date-fns/locale'
import { es, TranslationKey } from './locales/es'
import { en } from './locales/en'

export type Language = 'es' | 'en'
export type { TranslationKey }

export const translations: Record<Language, Record<TranslationKey, string>> = { es, en }

// Locale used for Intl date/number formatting per UI language
export const languageLocales: Record<Language, string> = {
    es: 'es-ES',
    en: 'en-US'
}

// date-fns locale per UI language
export const dateLocales: Record<Language, Locale> = {
    es: esDateLocale,
    en: enUS
}

interface LanguageStore {
    language: Language
    setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
    persist(
        (set) => ({
            language: 'es',
            setLanguage: (language) => {
                document.documentElement.lang = language
                set({ language })
            }
        }),
        {
            name: 'nexoracloud-language',
            onRehydrateStorage: () => (state) => {
                if (state) document.documentElement.lang = state.language
            }
        }
    )
)

type TranslationParams = Record<string, string | number>

// Translate a key, replacing {param} placeholders. Falls back to Spanish, then to the key itself.
export function translate(language: Language, key: TranslationKey, params?: TranslationParams): string {
    let text = translations[language][key] ?? translations.es[key] ?? key
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.split(`{${name}}`).join(String(value))
        }
    }
    return text
}

// Non-React usage (services, toasts outside components)
export function t(key: TranslationKey, params?: TranslationParams): string {
    return translate(useLanguageStore.getState().language, key, params)
}

// Current Intl locale / date-fns locale for non-React usage
export function getLocale(): string {
    return languageLocales[useLanguageStore.getState().language]
}

export function getDateLocale(): Locale {
    return dateLocales[useLanguageStore.getState().language]
}

// Label for a stored payment method value ('cash', 'card', ...); unknown values pass through
const paymentMethodKeys: Record<string, TranslationKey> = {
    cash: 'payment.cash',
    card: 'payment.card',
    transfer: 'payment.transfer',
    other: 'payment.other',
    credit: 'payment.credit'
}

export function paymentMethodLabel(method: string): string {
    const key = paymentMethodKeys[method]
    return key ? t(key) : method
}

// Label for a stored product unit value ('unidad', 'kg', ...); unknown values pass through
const productUnits = ['unidad', 'ton', 'kg', 'g', 'l', 'ml', 'm', 'caja', 'paquete'] as const
type ProductUnit = typeof productUnits[number]

export function unitLabel(unit: string, variant: 'long' | 'short' = 'short'): string {
    if (!productUnits.includes(unit as ProductUnit)) return unit
    return t(`${variant === 'long' ? 'unit' : 'unitShort'}.${unit as ProductUnit}`)
}

export function useTranslation() {
    const language = useLanguageStore((state) => state.language)
    const setLanguage = useLanguageStore((state) => state.setLanguage)
    // Stable per language so it can be used in hook dependency lists
    const translateFn = useCallback(
        (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
        [language]
    )

    return {
        language,
        setLanguage,
        locale: languageLocales[language],
        dateLocale: dateLocales[language],
        t: translateFn
    }
}
