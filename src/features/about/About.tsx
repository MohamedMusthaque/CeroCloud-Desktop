/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, Heart, Github, Globe, Facebook, Twitter, Shield, FileText, Mail, X as XIcon, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import pkg from '../../../package.json'
import { useTranslation } from '@/i18n'

export function About() {
    const { t } = useTranslation()
    const version = pkg.version
    const [activeModal, setActiveModal] = useState<'license' | 'support' | 'privacy' | null>(null)

    const developers = [
        { name: 'DANIEL ORTIZ', role: 'Lead Developer', url: 'https://github.com/DaaNiieeL123', color: 'from-blue-500 to-indigo-600' },
        { name: 'JOSUE VAQUIAX', role: 'Co-Developer', url: 'https://github.com/Jsue46', color: 'from-violet-500 to-purple-600' }
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
            {activeModal === 'license' && (
                <Modal
                    title={t('about.licenseTitle')}
                    onClose={() => setActiveModal(null)}
                    content={
                        <>
                            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center gap-4">
                                <FileText className="w-8 h-8 text-orange-500" />
                                <div>
                                    <h4 className="font-bold text-orange-700 dark:text-orange-400">{t('about.legalContract')}</h4>
                                    <p className="text-sm text-orange-600/80 dark:text-orange-400/80">{t('about.acceptTerms')}</p>
                                </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-2xl border border-gray-300 dark:border-white/10">
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                                    <h4 className="font-bold text-blue-700 dark:text-blue-400 mb-2">{t('about.licenseName')}</h4>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                        {t('about.licenseDescA')} <strong>{t('about.licenseDescStrong')}</strong> {t('about.licenseDescB')}
                                    </p>
                                </div>
                                <ul className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                                    <li className="pl-4 border-l-2 border-green-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.allowedTitle')}</strong>
                                        {t('about.allowedDesc')}
                                    </li>
                                    <li className="pl-4 border-l-2 border-green-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.modifyTitle')}</strong>
                                        {t('about.modifyDesc')}
                                    </li>
                                    <li className="pl-4 border-l-2 border-red-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.noSaleTitle')}</strong>
                                        {t('about.noSaleDesc')}
                                    </li>
                                    <li className="pl-4 border-l-2 border-red-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.commercialTitle')}</strong>
                                        {t('about.commercialDesc')}
                                    </li>
                                    <li className="pl-4 border-l-2 border-yellow-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.ipTitle')}</strong>
                                        {t('about.ipDesc')}
                                    </li>
                                    <li className="pl-4 border-l-2 border-gray-500/50">
                                        <strong className="block text-gray-900 dark:text-white mb-1">{t('about.warrantyTitle')}</strong>
                                        {t('about.warrantyDesc')}
                                    </li>
                                </ul>
                                <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl">
                                    <p className="text-xs text-orange-700 dark:text-orange-400">
                                        <strong>{t('about.licenseQuestions')}</strong> {t('about.contact')} <a href="mailto:proyectogit22@gmail.com" className="underline">proyectogit22@gmail.com</a>
                                    </p>
                                </div>
                            </div>
                        </>
                    }
                />
            )}
            {activeModal === 'support' && (
                <Modal
                    title={t('about.supportTitle')}
                    onClose={() => setActiveModal(null)}
                    content={
                        <div className="space-y-6">
                            <p className="text-xl font-medium">{t('about.supportIntro')}</p>
                            <div className="space-y-4">
                                <a
                                    href="https://github.com/CeroCloud/CeroCloud-Desktop/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 transition-all group cursor-pointer"
                                >
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                        <Github className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{t('about.reportBug')}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('about.reportBugDesc')}</p>
                                    </div>
                                </a>

                                <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
                                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{t('about.commercial')}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('about.commercialContact')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />
            )}
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
                                alt="CeroCloud Icon"
                                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] transform scale-125 group-hover:scale-150 transition-transform duration-500"
                            />
                        </div>
                    </motion.div>

                    <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 drop-shadow-sm mb-0 leading-none">
                        CEROCLOUD
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
                    {/* LEFT COLUMN: ABOUT & LEGAL */}
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
                                <strong className="text-primary">CeroCloud</strong> {t('about.intro1')}
                                <br /><br />
                                {t('about.intro2a')} <span className="text-gray-900 dark:text-white font-semibold">100% offline</span>{t('about.intro2b')}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-auto">
                                <FeatureTag label={t('about.tagOffline')} icon={Zap} />
                                <FeatureTag label={t('about.tagPrivacy')} icon={Shield} />
                                <FeatureTag label={t('about.tagFree')} icon={Code} />
                            </div>
                        </motion.div>

                        {/* Legal Quick Links */}
                        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <LegalButton
                                title={t('about.license')}
                                icon={FileText}
                                color="orange"
                                onClick={() => setActiveModal('license')}
                            />
                            <LegalButton
                                title={t('about.privacy')}
                                icon={Shield}
                                color="emerald"
                                onClick={() => setActiveModal('privacy')}
                            />
                            <LegalButton
                                title={t('about.support')}
                                icon={Mail}
                                color="blue"
                                onClick={() => setActiveModal('support')}
                            />
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: DEVELOPERS & COMMUNITY */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Developers Card */}
                        <motion.div
                            variants={itemVariants}
                            className="flex-1 bg-gradient-to-br from-[#1a1c2e] to-[#0f1016] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 flex flex-col"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                                <Code className="text-indigo-400" />
                                {t('about.masterminds')}
                            </h3>

                            <div className="space-y-4 relative z-10 flex-1">
                                {developers.map((dev) => (
                                    <a
                                        key={dev.name}
                                        href={dev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dev.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                            <Github className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg leading-none mb-1">{dev.name}</p>
                                            <p className="text-xs text-white/50 uppercase tracking-wider">{dev.role}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </motion.div>

                        {/* Social Links */}
                        <motion.div variants={itemVariants} className="p-6 bg-white dark:bg-gray-800/50 backdrop-blur-md rounded-[2.5rem] border border-gray-300 dark:border-white/10 shadow-lg">
                            <h3 className="text-center font-bold text-gray-500 text-sm uppercase tracking-wider mb-6">{t('about.community')}</h3>
                            <div className="flex justify-center gap-4">
                                <SocialButton icon={Github} href="https://github.com/CeroCloud/CeroCloud-Desktop" label="GitHub" />
                                <SocialButton icon={Facebook} onClick={() => toast.info(t('about.comingSoon'))} label="Facebook" />
                                <SocialButton icon={Twitter} onClick={() => toast.info(t('about.comingSoon'))} label="Twitter" />
                                <SocialButton icon={Globe} href="https://cerocloud.github.io/CeroCloud-website/" label="Website" />
                            </div>
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

const LegalButton = ({ title, icon: Icon, color, onClick }: any) => {
    const colors: any = {
        orange: "hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-800",
        emerald: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800",
        blue: "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800"
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "p-4 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-300 dark:border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-300 group",
                colors[color]
            )}
        >
            <Icon className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
            <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-inherit">{title}</span>
        </button>
    )
}

const SocialButton = ({ icon: Icon, href, label, onClick }: any) => {
    const className = "p-3 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all hover:-translate-y-1 cursor-pointer"

    if (onClick) {
        return (
            <button onClick={onClick} className={className} aria-label={label}>
                <Icon className="w-5 h-5" />
            </button>
        )
    }

    return (
        <a
            href={href}
            target="_blank"
            className={className}
            aria-label={label}
        >
            <Icon className="w-5 h-5" />
        </a>
    )
}

const CheckIcon = ({ className }: { className?: string }) => (
    <div className={cn("w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0", className)}>
        <Shield className="w-3 h-3 text-emerald-500" />
    </div>
)
