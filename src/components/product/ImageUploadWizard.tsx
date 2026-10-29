import { useState } from 'react'
import { X, Image as ImageIcon, Upload, Cloud, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/i18n'

interface ImageUploadWizardProps {
    onComplete: (imageUrl: string) => void
    onClose: () => void
    currentImage?: string
}

type Step = 'upload' | 'choose' | 'guide-drive' | 'guide-dropbox' | 'enter-url' | 'complete'

export function ImageUploadWizard({ onComplete, onClose, currentImage }: ImageUploadWizardProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<Step>('upload')
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>(currentImage || '')
    const [imageUrl, setImageUrl] = useState(currentImage || '')

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
            setTimeout(() => setStep('choose'), 500)
        }
    }

    const openDrive = () => {
        window.open('https://drive.google.com', '_blank')
    }

    const openDropbox = () => {
        window.open('https://www.dropbox.com', '_blank')
    }

    const handleComplete = () => {
        if (imageUrl.trim()) {
            onComplete(imageUrl)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('img.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Step 1: Upload Image */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('img.addTitle')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('img.addDesc')}
                                </p>
                            </div>

                            {imagePreview && (
                                <div className="flex justify-center">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-w-xs max-h-64 rounded-lg shadow-lg object-cover"
                                    />
                                </div>
                            )}

                            <label className="block">
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                    <div className="text-center space-y-2">
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                            {t('img.clickToSelect')}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('img.formats')}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                </div>
                            </label>

                            {currentImage && (
                                <button
                                    onClick={() => setStep('enter-url')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('img.haveUrl')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 2: Choose Destination */}
                    {step === 'choose' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('img.selected')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {selectedImage?.name}
                                </p>
                            </div>

                            {imagePreview && (
                                <div className="flex justify-center">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-w-xs max-h-48 rounded-lg shadow-lg object-cover"
                                    />
                                </div>
                            )}

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                                    {t('img.whereToSave')}
                                </h4>

                                <div className="grid gap-4">
                                    <button
                                        onClick={() => setStep('guide-drive')}
                                        className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-500/10">
                                                <Cloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {t('img.uploadDrive')}
                                                </h5>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {t('img.stepByStep')}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setStep('guide-dropbox')}
                                        className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg group-hover:bg-cyan-500/10">
                                                <Cloud className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {t('img.uploadDropbox')}
                                                </h5>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {t('img.stepByStep')}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setStep('enter-url')}
                                        className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        {t('img.alreadyUploaded')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Guide - Google Drive */}
                    {step === 'guide-drive' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Cloud className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('img.driveGuide')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('img.followSteps')}
                                </p>
                            </div>

                            {imagePreview && (
                                <div className="flex justify-center">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-w-xs max-h-32 rounded-lg shadow object-cover"
                                    />
                                </div>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.openDrive')}</h4>
                                        <button
                                            onClick={openDrive}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm mt-2"
                                        >
                                            {t('img.openDriveButton')}
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.uploadImage')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('img.driveUploadDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.getShareLink')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {t('img.driveShareDesc')}
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                                            {t('img.drivePermissions')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.copyLink')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('img.copyLinkDesc')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('choose')}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('img.back')}
                                </button>
                                <button
                                    onClick={() => setStep('enter-url')}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {t('img.haveLink')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Guide - Dropbox */}
                    {step === 'guide-dropbox' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Cloud className="w-8 h-8 text-cyan-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('img.dropboxGuide')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('img.followSteps')}
                                </p>
                            </div>

                            {imagePreview && (
                                <div className="flex justify-center">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-w-xs max-h-32 rounded-lg shadow object-cover"
                                    />
                                </div>
                            )}

                            <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800 rounded-lg p-6 space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.openDropbox')}</h4>
                                        <button
                                            onClick={openDropbox}
                                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2 text-sm mt-2"
                                        >
                                            {t('img.openDropboxButton')}
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.uploadImage')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('img.dropboxUploadDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.getShareLink')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {t('img.dropboxShareDesc')}
                                        </p>
                                        <p className="text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded">
                                            {t('img.dropboxRawHint')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('img.copyLink')}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('img.copyLinkDesc')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('choose')}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('img.back')}
                                </button>
                                <button
                                    onClick={() => setStep('enter-url')}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {t('img.haveLink')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Enter URL */}
                    {step === 'enter-url' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('img.pasteUrlTitle')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('img.pasteUrlDesc')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('img.urlLabel')}
                                </label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder={t('img.urlPlaceholder')}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('img.publicHint')}
                                </p>
                            </div>

                            {imageUrl && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('img.preview')}</p>
                                    <div className="flex justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                        <img
                                            src={imageUrl}
                                            alt="Preview from URL"
                                            className="max-w-xs max-h-48 rounded shadow object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3E${encodeURIComponent(t('img.cannotLoad'))}%3C/text%3E%3C/svg%3E`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(selectedImage ? 'choose' : 'upload')}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('img.back')}
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={!imageUrl.trim()}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    {t('img.save')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
