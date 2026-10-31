import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation, type Language } from '@/i18n'
import { cn } from '@/lib/utils'

const LANGUAGES: { id: Language; label: string }[] = [
    { id: 'es', label: 'ES' },
    { id: 'en', label: 'EN' }
]

export function Login() {
    const { t, language, setLanguage } = useTranslation()
    const login = useAuthStore((state) => state.login)

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password) {
            setError(t('auth.required'))
            return
        }

        setLoading(true)
        setError(null)
        try {
            const ok = await login(username, password)
            if (!ok) {
                setError(t('auth.invalid'))
                setPassword('')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError(t('auth.error'))
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
                className="relative w-full max-w-md"
            >
                {/* Brand */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center p-3 shadow-2xl mb-4">
                        <img src="icon.png" alt="NexoraCloud" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">NexoraCloud</h1>
                    <p className="text-sm text-indigo-300 tracking-[0.15em] uppercase mt-1">{t('auth.tagline')}</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.welcome')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">{t('auth.subtitle')}</p>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label htmlFor="login-username" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                {t('auth.username')}
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="login-username"
                                    type="text"
                                    autoFocus
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); setError(null) }}
                                    placeholder={t('auth.usernamePlaceholder')}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="login-password" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                                {t('auth.password')}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                                    placeholder={t('auth.passwordPlaceholder')}
                                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
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

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                role="alert"
                                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                            {loading ? t('auth.signingIn') : t('auth.signIn')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
