import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, Store, MapPin, Phone, Coins, ArrowRight, ArrowLeft, ShieldCheck, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { companyService, currencySymbols } from '@/services/companyService'
import { UserServiceError } from '@/services/userService'
import { userErrorMessage } from '@/features/users/userErrors'
import { useTranslation, type Language } from '@/i18n'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CompanySettings } from '@/types/database'

const LANGUAGES: { id: Language; label: string }[] = [
    { id: 'es', label: 'ES' },
    { id: 'en', label: 'EN' }
]

const CURRENCIES = ['GTQ', 'USD', 'EUR', 'MXN', 'LKR', 'INR', 'MYR', 'SGD'] as const

const STEPS = 2

const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
const labelClass = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1"

// First-run wizard: business details, then the first administrator account (shown while the database has no users)
export function AdminSetup() {
    const { t, language, setLanguage } = useTranslation()
    const completeSetup = useAuthStore((state) => state.completeSetup)
    const syncSession = useAuthStore((state) => state.syncSession)

    const [step, setStep] = useState(1)
    const [company, setCompany] = useState<CompanySettings>(() => {
        const current = companyService.getSettings()
        // The built-in placeholder name is not a real business name
        return current.name === 'NexoraCloud' ? { ...current, name: '' } : current
    })
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateCompany = (changes: Partial<CompanySettings>) => {
        setCompany({ ...company, ...changes })
        setError(null)
    }

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault()
        if (!company.name.trim()) {
            setError(t('setup.business.nameRequired'))
            return
        }
        setError(null)
        setStep(2)
    }

    const handleFinish = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password) {
            setError(t('setup.admin.required'))
            return
        }
        if (password !== confirmPassword) {
            setError(t('userForm.passwordMismatch'))
            return
        }

        setLoading(true)
        setError(null)
        try {
            companyService.saveSettings({
                ...company,
                name: company.name.trim(),
                address: company.address?.trim(),
                phone: company.phone?.trim()
            })
            await completeSetup(username, password)
        } catch (err) {
            // Another window/session finished setup first: go to the login screen
            if (err instanceof UserServiceError && err.code === 'SETUP_COMPLETE') {
                syncSession().catch(console.error)
                return
            }
            console.error('Setup error:', err)
            setError(userErrorMessage(err, t))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            {/* Language switch */}
            <div className="absolute top-5 right-5 flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.id}
                        type="button"
                        onClick={() => setLanguage(lang.id)}
                        className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                            language === lang.id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
                        )}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative w-full max-w-lg py-8"
            >
                {/* Brand */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center p-3 shadow-2xl mb-4">
                        <img src="icon.png" alt="NexoraCloud" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{t('setup.title')}</h1>
                    <p className="text-sm text-indigo-300 mt-2">{t('setup.subtitle')}</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
                    {/* Progress */}
                    <div className="flex items-center gap-3 mb-6">
                        {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => (
                            <div
                                key={n}
                                className={cn(
                                    "h-1.5 flex-1 rounded-full transition-colors",
                                    n <= step ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-200 dark:bg-gray-700"
                                )}
                            />
                        ))}
                        <span className="text-xs font-bold text-gray-400 whitespace-nowrap">
                            {t('setup.step', { current: step, total: STEPS })}
                        </span>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {step === 1 ? (
                            <motion.form
                                key="business"
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -16 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleNext}
                                className="space-y-5"
                                noValidate
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('setup.business.title')}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('setup.business.subtitle')}</p>
                                </div>

                                <div>
                                    <label htmlFor="setup-business-name" className={labelClass}>{t('general.businessName')} *</label>
                                    <div className="relative">
                                        <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="setup-business-name"
                                            type="text"
                                            autoFocus
                                            value={company.name}
                                            onChange={(e) => updateCompany({ name: e.target.value })}
                                            placeholder={t('general.businessNamePlaceholder')}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="setup-address" className={labelClass}>{t('general.address')}</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="setup-address"
                                            type="text"
                                            value={company.address ?? ''}
                                            onChange={(e) => updateCompany({ address: e.target.value })}
                                            placeholder={t('general.addressPlaceholder')}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="setup-phone" className={labelClass}>{t('general.phone')}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                id="setup-phone"
                                                type="tel"
                                                value={company.phone ?? ''}
                                                onChange={(e) => updateCompany({ phone: e.target.value })}
                                                placeholder="+502 0000 0000"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="setup-currency" className={labelClass}>{t('general.currency')}</label>
                                        <div className="relative">
                                            <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                id="setup-currency"
                                                value={company.currency}
                                                onChange={(e) => updateCompany({ currency: e.target.value, currencySymbol: currencySymbols[e.target.value] ?? '$' })}
                                                className={cn(inputClass, "appearance-none cursor-pointer")}
                                            >
                                                {CURRENCIES.map((code) => (
                                                    <option key={code} value={code}>{t(`general.currency.${code}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('general.tax')}</span>
                                        <Switch checked={company.enableTax} onChange={(checked) => updateCompany({ enableTax: checked })} />
                                    </div>
                                    {company.enableTax ? (
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={company.taxRate}
                                                    onChange={(e) => updateCompany({ taxRate: Number(e.target.value) })}
                                                    aria-label={t('general.tax')}
                                                    className={cn(inputClass, "font-bold")}
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={company.taxIncluded}
                                                    onChange={(e) => updateCompany({ taxIncluded: e.target.checked })}
                                                    className="w-4 h-4 rounded accent-indigo-600"
                                                />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('general.taxIncluded')}</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400">{t('general.noTax')}</p>
                                    )}
                                </div>

                                <ErrorMessage error={error} />

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {t('setup.next')}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="admin"
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleFinish}
                                className="space-y-5"
                                noValidate
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6 text-indigo-500" />
                                        {t('setup.admin.title')}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('setup.admin.subtitle')}</p>
                                </div>

                                <div>
                                    <label htmlFor="setup-username" className={labelClass}>{t('auth.username')}</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="setup-username"
                                            type="text"
                                            autoFocus
                                            autoComplete="username"
                                            value={username}
                                            onChange={(e) => { setUsername(e.target.value); setError(null) }}
                                            placeholder={t('setup.admin.usernamePlaceholder')}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="setup-password" className={labelClass}>{t('auth.password')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="setup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(null) }}
                                            placeholder={t('userForm.passwordPlaceholder')}
                                            className={cn(inputClass, "pr-11")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                            title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="setup-confirm-password" className={labelClass}>{t('userForm.confirmPassword')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="setup-confirm-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <ErrorMessage error={error} />

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setError(null) }}
                                        disabled={loading}
                                        className="px-5 py-3.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        {t('setup.back')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        {loading ? t('setup.finishing') : t('setup.finish')}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}

function ErrorMessage({ error }: { error: string | null }) {
    if (!error) return null
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400"
        >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
        </motion.div>
    )
}
