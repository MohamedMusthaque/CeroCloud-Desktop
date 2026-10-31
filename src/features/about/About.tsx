/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, Heart, Github, Shield, X as XIcon, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import pkg from '../../../package.json'
import { useTranslation } from '@/i18n'

export function About() {
    const { t } = useTranslation()
    const version = pkg.version
    const [activeModal, setActiveModal] = useState<'privacy' | null>(null)

    const developers = [
        { name: 'MOHAMED MUSTHAQUE', role: 'Lead Developer', url: 'https://github.com/MohamedMusthaque', color: 'from-blue-500 to-indigo-600' }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5 }
        }
    }

    const Modal = ({ title, content, onClose }: { title: string, content: React.ReactNode, onClose: () => void }) => createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-white/20 dark:border-white/10 relative"
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center relative z-10 glass">
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">{title}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    <div className="p-8 overflow-y-auto leading-relaxed text-gray-600 dark:text-gray-300 space-y-4 relative z-10 text-lg">
                        {content}
                    </div>
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 flex justify-end relative z-10">
                        <button onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white hover:shadow-lg hover:shadow-primary/25 rounded-xl font-bold transition-all transform hover:-translate-y-0.5">
                            {t('about.understood')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )

    return (
        <div className="min-h-screen text-gray-900 dark:text-white pb-20">
            {/* Modals Logic */}
            {activeModal === 'privacy' && (
                <Modal
                    title={t('about.privacyTitle')}
                    onClose={() => setActiveModal(null)}
                    content={
                        <>
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                    <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">100% Offline</h4>
                                <p className="max-w-md mx-auto opacity-80">{t('about.privacyIntro')}</p>
                            </div>
                            <div className="space-y-4 bg-gray-100 dark:bg-white/5 p-6 rounded-2xl border border-gray-300 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300">
                                <div className="flex gap-3">
                                    <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block text-gray-900 dark:text-white">{t('about.localTitle')}</strong>
                                        {t('about.localDesc')}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block text-gray-900 dark:text-white">{t('about.noCollectionTitle')}</strong>
                                        {t('about.noCollectionDesc')}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block text-gray-900 dark:text-white">{t('about.userResponsibilityTitle')}</strong>
                                        {t('about.userResponsibilityDesc')}
                                    </div>
                                </div>
                            </div>
                        </>
                    }
                />
            )}

            <motion.div
                className="max-w-6xl mx-auto px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* HERO SECTION */}
                <motion.div variants={itemVariants} className="relative py-12 text-center">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

                    <motion.div
                        initial={{ y: 0 }}
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 inline-flex items-center justify-center mb-6"
                    >
                        {/* Circle Background Container */}
                        <div className="w-60 h-60 flex items-center justify-center relative z-10 group">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
                            <img
                                src="icon.png"
                                alt="NexoraCloud Icon"
                                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] transform scale-125 group-hover:scale-150 transition-transform duration-500"
                            />
                        </div>
                    </motion.div>

                    <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 drop-shadow-sm mb-0 leading-none">
                        NEXORACLOUD
                    </h1>
                    <p className="text-xl font-medium text-indigo-500 dark:text-indigo-400 tracking-[0.2em] uppercase mt-4 mb-8">
                        {t('about.tagline')}
                    </p>

                    <div className="flex justify-center gap-4 relative z-10">
                        <div className="px-5 py-2.5 bg-black/5 dark:bg-white/5 backdrop-blur-md rounded-full border border-gray-200 dark:border-white/10 flex items-center gap-3 text-sm font-medium shadow-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            {t('about.stableRelease', { version })}
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* LEFT COLUMN: ABOUT */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Main Card */}
                        <motion.div
                            variants={itemVariants}
                            whileHover={{ scale: 1.01 }}
                            className="flex-1 p-8 bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-300 dark:border-white/10 shadow-xl relative overflow-hidden group flex flex-col justify-center"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-indigo-500/20" />

                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <Sparkles className="text-yellow-500 fill-yellow-500" />
                                {t('about.powerTitle')}
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                <strong className="text-primary">NexoraCloud</strong> {t('about.intro1')}
                                <br /><br />
                                {t('about.intro2a')} <span className="text-gray-900 dark:text-white font-semibold">100% offline</span>{t('about.intro2b')}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-auto">
                                <FeatureTag label={t('about.tagOffline')} icon={Zap} />
                                <FeatureTag label={t('about.tagPrivacy')} icon={Shield} />
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: DEVELOPERS & PRIVACY */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Developers Card: fills the column above Privacy */}
                        <motion.div
                            variants={itemVariants}
                            className="flex-1 bg-gradient-to-br from-[#1a1c2e] to-[#0f1016] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 flex flex-col"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 relative z-10">
                                <Code className="w-7 h-7 text-indigo-400" />
                                {t('about.masterminds')}
                            </h3>

                            <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center">
                                {developers.map((dev) => (
                                    <a
                                        key={dev.name}
                                        href={dev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
                                    >
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${dev.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                                            <Github className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-2xl leading-tight mb-1">{dev.name}</p>
                                            <p className="text-sm text-white/50 uppercase tracking-wider">{dev.role}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </motion.div>

                        {/* Privacy */}
                        <motion.div variants={itemVariants}>
                            <LegalButton
                                title={t('about.privacy')}
                                icon={Shield}
                                color="emerald"
                                onClick={() => setActiveModal('privacy')}
                                className="w-full"
                            />
                        </motion.div>
                    </div>
                </div>

                {/* Footer */}
                <motion.div variants={itemVariants} className="mt-16 text-center space-y-2">
                    <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
                        {t('about.madeWith')} <Heart className="w-4 h-4 text-red-500 animate-bounce" /> {t('about.madeIn', { year: new Date().getFullYear() })}
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-xs">
                        {t('about.footer', { year: new Date().getFullYear() })}
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}

// Subcomponents for cleaner code
const FeatureTag = ({ label, icon: Icon }: { label: string, icon: any }) => (
    <span className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
    </span>
)

const LegalButton = ({ title, icon: Icon, color, onClick, className }: any) => {
    const colors: any = {
        emerald: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800"
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "p-4 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-300 dark:border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 group",
                colors[color],
                className
            )}
        >
            <Icon className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
            <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-inherit">{title}</span>
        </button>
    )
}

const CheckIcon = ({ className }: { className?: string }) => (
    <div className={cn("w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0", className)}>
        <Shield className="w-3 h-3 text-emerald-500" />
    </div>
)
