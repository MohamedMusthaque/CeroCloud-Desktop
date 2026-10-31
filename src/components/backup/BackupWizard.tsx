/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { X, Download, HardDrive, CheckCircle, ArrowRight, ExternalLink, Image as ImageIcon, Loader2, Save, Lock, Shield, Eye, EyeOff, ArrowLeft, Check, FileJson, AlertTriangle, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { SiGoogledrive, SiDropbox } from 'react-icons/si'
import { zipBackupService } from '@/services/zipBackupService'
import { saveAs } from 'file-saver'
import { useTranslation } from '@/i18n'

interface BackupWizardProps {
    onClose: () => void
}

type Step = 'create' | 'security' | 'choose' | 'guide-local' | 'guide-drive' | 'guide-dropbox' | 'complete'

export function BackupWizard({ onClose }: BackupWizardProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<Step>('create')
    const [backupFile, setBackupFile] = useState<{ filename: string } | null>(null)
    const [creating, setCreating] = useState(false)
    const [hasImages, setHasImages] = useState(false)
    const [useEncryption, setUseEncryption] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [backupBlob, setBackupBlob] = useState<Blob | null>(null)

    const handleStartBackup = () => {
        setStep('security')
    }

    const handleCreateBackup = async (withPassword?: string) => {
        setCreating(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 800))
            const result = await zipBackupService.createZipBackup(withPassword, false)

            if (result.success && result.filename && result.content) {
                const products = await window.electronAPI.products.getAll()
                const productsWithImages = products.filter((p: any) => p.image)
                setHasImages(productsWithImages.length > 0)

                setBackupFile({ filename: result.filename })
                setBackupBlob(result.content)
                setStep('choose')
                toast.success(withPassword ? t('bw.encryptedCreated') : t('bw.created'))
            } else {
                toast.error(t('bw.createErrorDetail', { error: result.error || t('bw.unknown') }))
            }
        } catch (error) {
            console.error(error)
            toast.error(t('bw.createError'))
        } finally {
            setCreating(false)
        }
    }

    const handleDownload = () => {
        if (backupBlob && backupFile) {
            saveAs(backupBlob, backupFile.filename)
            toast.success(t('bw.saved'))
        } else {
            toast.error(t('bw.fileNotFound'))
        }
    }

    const handleSecurityContinue = () => {
        if (useEncryption) {
            if (!password || password.length < 6) {
                toast.error(t('bw.passwordMin'))
                return
            }
            if (password !== confirmPassword) {
                toast.error(t('bw.passwordMismatch'))
                return
            }
            handleCreateBackup(password)
        } else {
            handleCreateBackup()
        }
    }

    const openDrive = () => window.open('https://drive.google.com', '_blank')
    const openDropbox = () => window.open('https://www.dropbox.com', '_blank')

    const getBackTarget = (): Step | null => {
        if (step === 'security') return 'create'
        if (['guide-local', 'guide-drive', 'guide-dropbox'].includes(step)) return 'choose'
        return null
    }

    const handleBack = () => {
        const target = getBackTarget()
        if (target) setStep(target)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            {getBackTarget() && (
                                <button
                                    onClick={handleBack}
                                    className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all group"
                                    title={t('bw.back')}
                                >
                                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                            )}
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Save className="w-5 h-5 text-primary" />
                                {t('bw.title')}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Create */}
                            {step === 'create' && (
                                <motion.div
                                    key="create"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center justify-center text-center space-y-8 py-4"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                                        <div className="w-28 h-28 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center relative border border-primary/10">
                                            {creating && (
                                                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                                            )}
                                            <Download className="w-12 h-12 text-primary drop-shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="max-w-md">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                            {creating ? t('bw.generating') : t('bw.createTitle')}
                                        </h3>
                                        <p className="text-gray-500 text-lg leading-relaxed">
                                            {creating
                                                ? t('bw.generatingDesc')
                                                : t('bw.createDesc')}
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleStartBackup}
                                        disabled={creating}
                                        className="px-10 py-4 bg-primary text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none flex items-center gap-3"
                                    >
                                        {creating && <Loader2 className="w-5 h-5 animate-spin" />}
                                        {creating ? t('bw.processing') : t('bw.startNow')}
                                    </button>
                                </motion.div>
                            )}

                            {/* Step 2: Security (Encryption Option) */}
                            {step === 'security' && (
                                <motion.div
                                    key="security"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-200 dark:border-purple-800">
                                            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                            {t('bw.protectTitle')}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('bw.protectDesc')}
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-1 rounded-2xl border border-purple-200 dark:border-purple-800/50">
                                        <div className="bg-white/50 dark:bg-gray-900/50 p-4 rounded-xl backdrop-blur-sm">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => {
                                                        setUseEncryption(!useEncryption)
                                                        if (useEncryption) {
                                                            setPassword('')
                                                            setConfirmPassword('')
                                                        }
                                                    }}
                                                    className={`
                                                        relative w-12 h-7 rounded-full transition-colors flex-shrink-0
                                                        ${useEncryption ? 'bg-purple-600 shadow-lg shadow-purple-600/30' : 'bg-gray-300 dark:bg-gray-600'}
                                                    `}
                                                >
                                                    <div className={`
                                                        absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform
                                                        ${useEncryption ? 'translate-x-5' : 'translate-x-0'}
                                                    `} />
                                                </button>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                                                        <Lock className="w-4 h-4 text-purple-600" />
                                                        {t('bw.encrypt')}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                        {useEncryption ? (
                                                            <>
                                                                <ShieldCheck className="w-3 h-3 text-green-600" />
                                                                {t('bw.encryptOn')}
                                                            </>
                                                        ) : (
                                                            t('bw.encryptOff')
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {useEncryption && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3 overflow-hidden"
                                            >
                                                <div className="space-y-3 pt-1">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                                            {t('bw.password')}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                placeholder={t('bw.passwordPlaceholder')}
                                                                className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 p-1.5"
                                                            >
                                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                                            {t('bw.confirmPassword')}
                                                        </label>
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            placeholder={t('bw.confirmPlaceholder')}
                                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                                                        />
                                                    </div>

                                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-3 text-xs text-amber-800 dark:text-amber-200">
                                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                                        <p>{t('bw.passwordWarning')} <strong>{t('bw.passwordWarningStrong')}</strong></p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="pt-2">
                                        <button
                                            onClick={handleSecurityContinue}
                                            disabled={creating}
                                            className="w-full px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-600/30 hover:-translate-y-0.5 text-sm"
                                        >
                                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {creating ? t('bw.creating') : (useEncryption ? t('bw.generateProtected') : t('bw.generatePlain'))}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Choose Destination */}
                            {step === 'choose' && (
                                <motion.div
                                    key="choose"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="text-center mb-4 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-green-500/20 blur-2xl rounded-full pointer-events-none"></div>

                                        <div className="relative inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/10 text-green-600 rounded-2xl mb-2 shadow-xl shadow-green-900/10 border border-green-200 dark:border-green-800">
                                            <CheckCircle className="w-6 h-6 drop-shadow-sm" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            {t('bw.ready')}
                                        </h3>

                                        <div className="mt-2 mx-auto max-w-sm bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 flex items-center gap-3 shadow-sm group hover:border-primary/30 transition-colors backdrop-blur-sm">
                                            <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-primary shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
                                                <FileJson className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0">{t('bw.generatedFile')}</p>
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate font-mono">
                                                    {backupFile?.filename}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2.5">
                                        {[
                                            {
                                                icon: HardDrive,
                                                title: t('bw.saveToPc'),
                                                desc: t('bw.saveToPcDesc'),
                                                color: 'gray',
                                                iconBg: 'bg-gray-100 dark:bg-gray-800',
                                                iconColor: 'text-gray-600 dark:text-gray-300',
                                                action: () => setStep('guide-local')
                                            },
                                            {
                                                icon: SiGoogledrive,
                                                title: 'Google Drive',
                                                desc: t('bw.driveDesc'),
                                                color: 'blue',
                                                iconBg: 'bg-[#4285F4]/10',
                                                iconColor: 'text-[#4285F4]',
                                                action: () => setStep('guide-drive')
                                            },
                                            {
                                                icon: SiDropbox,
                                                title: 'Dropbox',
                                                desc: t('bw.dropboxDesc'),
                                                color: 'cyan',
                                                iconBg: 'bg-[#0061FF]/10',
                                                iconColor: 'text-[#0061FF]',
                                                action: () => setStep('guide-dropbox')
                                            }
                                        ].map((opt, i) => (
                                            <motion.button
                                                key={i}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={opt.action}
                                                className="group relative flex items-center gap-4 p-3 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg dark:hover:shadow-primary/10 hover:shadow-primary/5 transition-all rounded-2xl text-left overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                                <div className={`p-2.5 rounded-xl ${opt.iconBg} ${opt.iconColor} group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50`}>
                                                    <opt.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 relative z-10">
                                                    <h4 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">{opt.title}</h4>
                                                    <p className="text-xs text-gray-500 font-medium group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{opt.desc}</p>
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>

                                    {hasImages && (
                                        <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                                <ImageIcon className="w-4 h-4" />
                                            </div>
                                            <p className="text-xs font-medium text-purple-900 dark:text-purple-200 leading-tight">
                                                {t('bw.includesImages')} <span className="opacity-75 font-normal">{t('bw.includesImagesHint')}</span>
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Steps for Guides */}
                            {['guide-local', 'guide-drive', 'guide-dropbox', 'complete'].includes(step) && (
                                <motion.div
                                    key="guides"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-4"
                                >
                                    {step === 'complete' ? (
                                        <div className="flex flex-col items-center gap-4 py-6">
                                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-bounce">
                                                <CheckCircle className="w-8 h-8 text-green-600" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('bw.finished')}</h3>
                                                <p className="text-sm text-gray-500">{t('bw.dataSafe')}</p>
                                            </div>
                                            <button onClick={onClose} className="mt-2 px-8 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:scale-105 transition-transform text-sm">{t('bw.close')}</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">

                                            {/* LOCAL guide */}
                                            {step === 'guide-local' && (
                                                <div className="space-y-5">
                                                    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center group shadow-sm">
                                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600"></div>

                                                        {/* Header */}
                                                        <div className="mb-6">
                                                            <div className="mx-auto w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 mb-3 rotate-3 group-hover:rotate-0 transition-transform duration-500 border border-gray-100 dark:border-gray-700">
                                                                <HardDrive className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('bw.localTitle')}</h4>
                                                            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-2">
                                                                {t('bw.localDesc')}
                                                            </p>
                                                        </div>

                                                        {/* File Info Box */}
                                                        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 mb-5 text-left shadow-sm flex items-center gap-3 group/file hover:border-blue-500/30 transition-colors">
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg shrink-0">
                                                                <FileJson className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">{t('bw.fileName')}</p>
                                                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate font-medium select-all">
                                                                    {backupFile?.filename}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Action Button */}
                                                        <button
                                                            onClick={handleDownload}
                                                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                                                        >
                                                            <Save className="w-5 h-5" />
                                                            <span className="text-sm">{t('bw.downloadNow')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* GOOGLE DRIVE guide */}
                                            {step === 'guide-drive' && (
                                                <div className="space-y-4">
                                                    <div className="text-center mb-4">
                                                        <SiGoogledrive className="w-12 h-12 mx-auto text-[#4285F4] mb-2 drop-shadow-sm" />
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Google Drive</h3>
                                                        <p className="text-sm text-gray-500">{t('bw.driveSubtitle')}</p>
                                                    </div>

                                                    <div className="grid gap-3">
                                                        {/* Step 1: Download */}
                                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm text-[#4285F4] font-bold text-base border border-blue-100 dark:border-blue-900/50">1</div>
                                                                <div className="text-left">
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.downloadFile')}</p>
                                                                    <p className="text-[10px] text-gray-500">{t('bw.downloadFileDesc')}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleDownload}
                                                                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 text-[#4285F4] font-bold rounded-lg text-xs border border-blue-200 dark:border-blue-900 shadow-sm flex items-center gap-1.5 transition-all"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                {t('bw.save')}
                                                            </button>
                                                        </div>

                                                        {/* Next steps */}
                                                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl space-y-3 text-left">
                                                            <div className="flex gap-3">
                                                                <span className="flex-shrink-0 w-6 h-6 bg-[#4285F4] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-blue-500/20">2</span>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.openDrive')}</p>
                                                                    <p className="text-xs text-gray-500">{t('bw.openDriveDesc')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700 ml-3 -my-1.5"></div>
                                                            <div className="flex gap-3">
                                                                <span className="flex-shrink-0 w-6 h-6 bg-[#34A853] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-green-500/20">3</span>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.uploadFile')}</p>
                                                                    <p className="text-xs text-gray-500 break-all">{backupFile?.filename}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={openDrive}
                                                        className="w-full py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 text-sm"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        {t('bw.openDriveButton')}
                                                    </button>
                                                </div>
                                            )}

                                            {/* DROPBOX guide */}
                                            {step === 'guide-dropbox' && (
                                                <div className="space-y-4">
                                                    <div className="text-center mb-4">
                                                        <SiDropbox className="w-12 h-12 mx-auto text-[#0061FF] mb-2 drop-shadow-sm" />
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dropbox</h3>
                                                        <p className="text-sm text-gray-500">{t('bw.dropboxSubtitle')}</p>
                                                    </div>

                                                    <div className="grid gap-3">
                                                        {/* Step 1: Download */}
                                                        <div className="bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm text-[#0061FF] font-bold text-base border border-cyan-100 dark:border-cyan-900/50">1</div>
                                                                <div className="text-left">
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.downloadFile')}</p>
                                                                    <p className="text-[10px] text-gray-500">{t('bw.downloadFileDesc')}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleDownload}
                                                                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-cyan-50 dark:hover:bg-gray-700 text-[#0061FF] font-bold rounded-lg text-xs border border-cyan-200 dark:border-cyan-900 shadow-sm flex items-center gap-1.5 transition-all"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                {t('bw.save')}
                                                            </button>
                                                        </div>

                                                        {/* Next steps */}
                                                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl space-y-3 text-left">
                                                            <div className="flex gap-3">
                                                                <span className="flex-shrink-0 w-6 h-6 bg-[#0061FF] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-blue-600/20">2</span>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.openDropbox')}</p>
                                                                    <p className="text-xs text-gray-500">{t('bw.openDropboxDesc')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700 ml-3 -my-1.5"></div>
                                                            <div className="flex gap-3">
                                                                <span className="flex-shrink-0 w-6 h-6 bg-[#0061FF]/80 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-blue-600/20">3</span>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('bw.uploadFile')}</p>
                                                                    <p className="text-xs text-gray-500 break-all">{backupFile?.filename}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={openDropbox}
                                                        className="w-full py-3 bg-[#0061FF] hover:bg-[#0050d6] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 text-sm"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        {t('bw.openDropboxButton')}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex justify-center pt-1">
                                                <button
                                                    onClick={() => setStep('complete')}
                                                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center gap-2 shadow-xl hover:-translate-y-0.5 hover:shadow-2xl text-sm"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    {t('bw.done')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}