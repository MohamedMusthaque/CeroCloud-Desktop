import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
            name: 'cerocloud-language',
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

export function useTranslation() {
    const language = useLanguageStore((state) => state.language)
    const setLanguage = useLanguageStore((state) => state.setLanguage)

    return {
        language,
        setLanguage,
        locale: languageLocales[language],
        t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params)
    }
}
