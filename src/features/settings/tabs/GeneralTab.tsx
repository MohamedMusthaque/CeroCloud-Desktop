import React from 'react'
import { CompanySettings } from '@/types/database'
import {
    Store,
    MapPin,
    Phone,
    Camera,
    X,
    Coins,
    Building,
    Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/i18n'

interface GeneralTabProps {
    settings: CompanySettings
    setSettings: (settings: CompanySettings) => void
    logoPreview: string
    handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleRemoveLogo: () => void
}

export function GeneralTab({ settings, setSettings, logoPreview, handleLogoUpload, handleRemoveLogo }: GeneralTabProps) {
    const { t } = useTranslation()
    return (

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Text */}
            <div className="text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('general.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('general.subtitle')}</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">

                    {/* Logo Area */}
                    <div className="flex flex-col items-center gap-4 shrink-0 mx-auto md:mx-0">
                        <div className={cn(
                            "relative group w-32 h-32 rounded-3xl border-2 border-dashed flex items-center justify-center transition-all overflow-hidden cursor-pointer shadow-sm",
                            logoPreview
                                ? "border-indigo-500/30 bg-white dark:bg-slate-800"
                                : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-indigo-400/50"
                        )}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                            />

                            {logoPreview ? (
                                <>
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2 relative z-10" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all z-20 backdrop-blur-[2px]">
                                        <Camera className="w-8 h-8 text-white/90" />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveLogo()
                                        }}
                                        className="absolute top-2 right-2 z-[60] p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"
                                        title={t('general.removeLogo')}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto text-indigo-500 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">{t('general.logo')}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">
                            {t('general.visibleInReports')}
                        </span>
                    </div>

                    {/* Main Info Fields */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('general.businessName')}</label>
                            <div className="relative group">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-white font-bold text-lg placeholder:font-medium"
                                    placeholder={t('general.businessNamePlaceholder')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('general.address')}</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    value={settings.address || ''}
                                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-white font-medium"
                                    placeholder={t('general.addressPlaceholder')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('general.phone')}</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    value={settings.phone || ''}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-white font-medium"
                                    placeholder="+502 0000 0000"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Regional Settings */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none" />

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 relative z-10">
                    <Coins className="w-5 h-5 text-purple-500" />
                    {t('general.regional')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('general.currency')}</label>
                        <div className="relative group">
                            <select
                                value={settings.currency}
                                onChange={(e) => {
                                    const val = e.target.value
                                    let sym = '$'
                                    if (val === 'GTQ') sym = 'Q'
                                    if (val === 'EUR') sym = '€'
                                    setSettings({ ...settings, currency: val, currencySymbol: sym })
                                }}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
                            >
                                <option value="GTQ">{t('general.currency.GTQ')}</option>
                                <option value="USD">{t('general.currency.USD')}</option>
                                <option value="EUR">{t('general.currency.EUR')}</option>
                                <option value="MXN">{t('general.currency.MXN')}</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-white px-2 py-0.5 rounded pointer-events-none">
                                {settings.currencySymbol}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t('general.tax')}</label>
                            <Switch
                                checked={settings.enableTax}
                                onChange={(c) => setSettings({ ...settings, enableTax: c })}
                            />
                        </div>

                        {settings.enableTax ? (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                <div className="relative w-full">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    <input
                                        type="number"
                                        value={settings.taxRate}
                                        onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-bold text-gray-900 dark:text-white"
                                        placeholder="12"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap px-4 py-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700/50 transition-colors group">
                                    <div className={cn(
                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm",
                                        settings.taxIncluded
                                            ? "bg-purple-600 border-purple-600 text-white"
                                            : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 group-hover:border-purple-400"
                                    )}>
                                        {settings.taxIncluded && <Check className="w-3.5 h-3.5" />}
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.taxIncluded}
                                            onChange={(e) => setSettings({ ...settings, taxIncluded: e.target.checked })}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{t('general.taxIncluded')}</span>
                                </label>
                            </div>
                        ) : (
                            <div className="h-[48px] flex items-center justify-center bg-gray-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-gray-200 dark:border-slate-700/50 text-gray-400 text-xs font-medium">
                                {t('general.noTax')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
