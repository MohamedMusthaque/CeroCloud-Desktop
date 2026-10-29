import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { importService } from '@/services/importService'
import { Product } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/i18n'


interface ImportWizardProps {
    onClose: () => void
    onSuccess: () => void
}

type Step = 'select' | 'preview' | 'importing' | 'complete'

export function ImportWizard({ onClose, onSuccess }: ImportWizardProps) {
    const { t, language } = useTranslation()
    const [step, setStep] = useState<Step>('select')
    const [previewData, setPreviewData] = useState<Partial<Product>[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [validCount, setValidCount] = useState(0)
    const [invalidCount, setInvalidCount] = useState(0)
    const [importedCount, setImportedCount] = useState(0)

    const handleFileSelect = async (selectedFile: File) => {
        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()

        let result
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            result = await importService.parseExcel(selectedFile)
        } else if (fileExtension === 'csv') {
            result = await importService.parseCSV(selectedFile)
        } else {
            setErrors([t('import.unsupported')])
            return
        }

        if (result.success && result.data) {
            setPreviewData(result.data)
            setValidCount(result.validCount || 0)
            setInvalidCount(result.invalidCount || 0)
            setErrors(result.errors || [])
            setStep('preview')
        } else {
            setErrors(result.errors || [t('import.unknownError')])
        }
    }

    const handleImport = async () => {
        setStep('importing')
        let imported = 0
        let updated = 0

        try {
            for (const product of previewData) {
                const result = await window.electronAPI.products.createOrUpdate(product as Omit<Product, 'id'>)
                if (result.isNew) {
                    imported++
                } else {
                    updated++
                }
                setImportedCount(imported + updated)
                await new Promise(resolve => setTimeout(resolve, 20)) // Faster simulation
            }
            setStep('complete')
            onSuccess()
        } catch (error) {
            setErrors([t('import.criticalError', { error: String(error) })])
            setStep('preview')
        }
    }

    return createPortal(
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
                    className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur sticky top-0 z-10">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-primary" />
                                {t('import.title')}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {step === 'select' && (
                                <motion.div
                                    key="select"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center max-w-lg mx-auto">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileSpreadsheet className="w-8 h-8 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            {t('import.uploadTitle')}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {t('import.uploadDesc')}
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2 text-sm">
                                                    <Download className="w-4 h-4" />
                                                    {t('import.template')}
                                                </h4>
                                                <p className="text-xs text-blue-700 dark:text-blue-200 mb-3 leading-relaxed">
                                                    {t('import.templateDesc')}
                                                </p>
                                                <button
                                                    onClick={() => importService.downloadTemplate()}
                                                    className="w-full py-2 bg-white text-blue-600 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all text-xs"
                                                >
                                                    {t('import.downloadTemplate')}
                                                </button>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-2 text-xs uppercase tracking-wide">
                                                    {t('import.requiredColumns')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                                                    {(language === 'en'
                                                        ? ['code', 'name', 'price', 'stock', 'category', 'cost', 'unit', 'min_stock']
                                                        : ['codigo', 'nombre', 'precio', 'stock', 'categoria', 'costo', 'unidad', 'min_stock']
                                                    ).map(col => (
                                                        <div key={col} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                            <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                                                            {col}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-primary/50 transition-all cursor-pointer group bg-white dark:bg-gray-800">
                                            <div className="text-center p-6 space-y-3">
                                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{t('import.browse')}</p>
                                                    <p className="text-gray-400 text-xs mt-1">{t('import.supported')}</p>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls,.csv"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleFileSelect(file)
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {errors.length > 0 && (
                                        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">{t('import.fileError')}</p>
                                                <p className="text-sm">{errors[0]}</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {step === 'preview' && (
                                <motion.div
                                    key="preview"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('import.preview')}</h3>
                                            <p className="text-gray-500 text-sm">{t('import.previewDesc')}</p>
                                        </div>
                                        <div className="flex gap-2 text-xs font-medium">
                                            <div className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> {t('import.validCount', { count: validCount })}
                                            </div>
                                            {invalidCount > 0 && (
                                                <div className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {t('import.errorCount', { count: invalidCount })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                        <div className="max-h-[300px] overflow-auto custom-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                                    <tr>
                                                        {[t('import.col.code'), t('import.col.name'), t('import.col.category'), t('import.col.price'), t('import.col.stock')].map(h => (
                                                            <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {previewData.slice(0, 100).map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className="px-4 py-1.5 font-mono">{row.code || '-'}</td>
                                                            <td className="px-4 py-1.5 font-medium">{row.name || '-'}</td>
                                                            <td className="px-4 py-1.5 text-gray-500">{row.category || '-'}</td>
                                                            <td className="px-4 py-1.5 text-primary font-bold">${row.price}</td>
                                                            <td className="px-4 py-1.5">{row.stock}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {errors.length > 0 && (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs">
                                            <p className="font-bold mb-1">{t('import.warnings')}</p>
                                            <ul className="list-disc list-inside opacity-80">
                                                {errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                                                {errors.length > 3 && <li>{t('import.andMore', { count: errors.length - 3 })}</li>}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-2">
                                        <button
                                            onClick={() => { setStep('select'); setPreviewData([]) }}
                                            className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                        >
                                            {t('common.back')}
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            disabled={validCount === 0}
                                            className="flex-[2] py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-sm"
                                        >
                                            {t('import.confirm')}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'importing' && (
                                <motion.div
                                    key="importing"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 space-y-6"
                                >
                                    <div className="relative">
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                                            <circle cx="48" cy="48" r="44" stroke="#3b82f6" strokeWidth="6" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * importedCount) / validCount} className="transition-all duration-300 ease-out" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round((importedCount / validCount) * 100)}%</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('import.importing')}</h3>
                                        <p className="text-gray-500 text-sm">{t('import.progress', { done: importedCount, total: validCount })}</p>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'complete' && (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 space-y-4 text-center"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-bounce">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('import.success')}</h3>
                                    <p className="text-base text-gray-600 dark:text-gray-300 max-w-sm">
                                        {t('import.successPrefix')} <strong>{importedCount}</strong> {t('import.successSuffix')}
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg font-bold hover:opacity-90 transition-opacity shadow-lg text-sm"
                                    >
                                        {t('import.finish')}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    )
}
