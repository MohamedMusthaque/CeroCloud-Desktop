import { useRef, useState } from 'react'
import { Contact, Upload, Eye, RefreshCw, Trash2, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/utils'

const ERROR_KEYS: Record<string, TranslationKey> = {
    TYPE: 'nic.error.TYPE',
    SIZE: 'nic.error.SIZE',
    NOT_FOUND: 'nic.error.NOT_FOUND'
}

interface NicAttachmentFieldProps {
    // Stored file name of the NIC scan, or null when none is attached
    value: string | null | undefined
    onChange: (filename: string | null) => void
}

// Attach / view / replace / remove the NIC (national identity card) scan of a supplier or client.
// The file is copied into app storage right away; the record keeps the new name once the form is saved.
export function NicAttachmentField({ value, onChange }: NicAttachmentFieldProps) {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const errorText = (code?: string) => t(ERROR_KEYS[code ?? ''] ?? 'nic.error.UNKNOWN')

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = '' // allow picking the same file again
        // Electron exposes the local path of a picked file
        const sourcePath = (file as (File & { path?: string }) | undefined)?.path
        if (!sourcePath) return

        setUploading(true)
        try {
            const result = await window.electronAPI.attachments.saveNic(sourcePath)
            if (result.success && result.filename) {
                onChange(result.filename)
            } else {
                toast.error(errorText(result.error))
            }
        } catch (error) {
            console.error(error)
            toast.error(errorText())
        } finally {
            setUploading(false)
        }
    }

    const view = async () => {
        if (!value) return
        const result = await window.electronAPI.attachments.openNic(value)
        if (!result.success) toast.error(errorText(result.error))
    }

    const isPdf = value?.toLowerCase().endsWith('.pdf')
    const actionClass = "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('nic.label')}</label>
            <input
                ref={inputRef}
                type="file"
                // The picker shows only PDFs and images; the main process also checks the file contents
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,application/pdf,image/*"
                onChange={handleFile}
                className="hidden"
            />

            {value ? (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {isPdf ? <FileText className="w-5 h-5" /> : <Contact className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('nic.attached')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{isPdf ? 'PDF' : t('nic.image')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={view} className={cn(actionClass, "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40")}>
                            <Eye className="w-3.5 h-3.5" /> {t('nic.view')}
                        </button>
                        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className={cn(actionClass, "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50")}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {t('nic.replace')}
                        </button>
                        <button type="button" onClick={() => onChange(null)} className={cn(actionClass, "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20")}>
                            <Trash2 className="w-3.5 h-3.5" /> {t('nic.remove')}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-sm font-medium">{uploading ? t('nic.uploading') : t('nic.upload')}</span>
                </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('nic.hint')}</p>
        </div>
    )
}
