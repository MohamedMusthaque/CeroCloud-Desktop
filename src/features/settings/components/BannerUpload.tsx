import React from 'react'
import { Upload, X, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'

interface BannerUploadProps {
    label: string
    currentImage?: string
    onUpload: (data: string) => void
    onRemove: () => void
    recommendedSize?: string
}

export function BannerUpload({ label, currentImage, onUpload, onRemove, recommendedSize }: BannerUploadProps) {
    const { t } = useTranslation()
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(t('banner.tooLarge'))
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => onUpload(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="space-y-3 group/item">
            <div className="flex justify-between items-end">
                <h5 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</h5>
                {recommendedSize && <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{recommendedSize}</span>}
            </div>

            <div className={cn(
                "relative transition-all duration-300 rounded-2xl overflow-hidden border-2",
                currentImage
                    ? "border-solid border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    : "border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/5 bg-slate-50/50 dark:bg-slate-900/20 h-20"
            )}>

                {currentImage ? (
                    <div className="relative w-full aspect-[4/1] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5" />
                        <img
                            src={currentImage}
                            className="max-h-full max-w-full object-contain relative z-10"
                            alt={label}
                        />

                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20 backdrop-blur-[2px]">
                            <label className="cursor-pointer px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-all transform hover:scale-105 shadow-xl">
                                <Camera className="w-3.5 h-3.5" />
                                <span>{t('banner.change')}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
                            </label>
                            <button
                                onClick={onRemove}
                                className="p-2 bg-white/20 hover:bg-red-500 text-white border border-white/50 hover:border-red-500 rounded-xl transition-all transform hover:scale-105 shadow-xl backdrop-blur-sm"
                                title={t('banner.remove')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-row items-center justify-center h-full gap-4 cursor-pointer px-4 group-hover/item:text-indigo-500 transition-colors w-full">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 border border-slate-100 dark:border-slate-700">
                            <Upload className="w-4 h-4 text-slate-400 group-hover/item:text-indigo-500 transition-colors" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover/item:text-indigo-500 transition-colors">{t('banner.clickToUpload')}</span>
                            <span className="text-[10px] text-slate-400">{t('banner.formats')}</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
                    </label>
                )}
            </div>
        </div>
    )
}
