
import { CompanySettings } from '@/types/database'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
    Banknote,
    CreditCard,
    QrCode,
    MoreHorizontal,
    Check,
    Calculator,
    AlertCircle,
    Percent,
    User,
    FileText,
    Receipt,
    Hash,
    Type,
    Store,
    Palette
} from 'lucide-react'
import { BannerUpload } from '../components/BannerUpload'
import { useTranslation } from '@/i18n'

interface SalesTabProps {
    settings: CompanySettings
    setSettings: (settings: CompanySettings) => void
}

export function SalesTab({ settings, setSettings }: SalesTabProps) {
    const { t } = useTranslation()

    const paymentMethods = [
        { id: 'cash', icon: Banknote, label: t('sales.payment.cash'), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { id: 'card', icon: CreditCard, label: t('sales.payment.card'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'transfer', icon: QrCode, label: t('sales.payment.transfer'), color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { id: 'other', icon: MoreHorizontal, label: t('sales.payment.other'), color: 'text-gray-500', bg: 'bg-gray-500/10' }
    ]

    const posFeatures = [
        {
            key: 'autoConfirm',
            label: t('sales.pos.autoConfirm'),
            desc: t('sales.pos.autoConfirmDesc'),
            icon: Check,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            key: 'showChangeCalculation',
            label: t('sales.pos.showChange'),
            desc: t('sales.pos.showChangeDesc'),
            icon: Calculator,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            key: 'allowNegativeStock',
            label: t('sales.pos.negativeStock'),
            desc: t('sales.pos.negativeStockDesc'),
            icon: AlertCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10'
        },
        {
            key: 'discounts', // mapped manually
            label: t('sales.pos.discounts'),
            desc: t('sales.pos.discountsDesc'),
            icon: Percent,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            key: 'customer', // mapped manually
            label: t('sales.pos.customer'),
            desc: t('sales.pos.customerDesc'),
            icon: User,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        }
    ]

    const togglePaymentMethod = (method: string) => {
        const key = method as keyof typeof settings.paymentMethods
        const currentStatus = settings.paymentMethods?.[key] ?? true
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, [key]: !currentStatus }
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Text */}
            <div className="text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('sales.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">{t('sales.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Sales Configuration */}
                <div className="space-y-8">
                    {/* Payment Methods */}
                    <div className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-emerald-500" />
                            {t('sales.paymentMethods')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((pm) => {
                                const isActive = settings.paymentMethods?.[pm.id as keyof typeof settings.paymentMethods] ?? true
                                return (
                                    <button
                                        key={pm.id}
                                        onClick={() => togglePaymentMethod(pm.id)}
                                        className={cn(
                                            "relative p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col items-center justify-center gap-2 group",
                                            isActive
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
                                                : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-600"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-white dark:bg-white/10" : "bg-transparent")}>
                                            <pm.icon className={cn("w-5 h-5", isActive ? pm.color : "text-gray-400")} />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn("text-xs font-bold", isActive ? "text-gray-900 dark:text-white" : "text-gray-400")}>{pm.label}</span>
                                            {isActive && <Check className="w-3 h-3 text-indigo-500" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* POS Experience */}
                    <div className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 relative z-10">
                            <Store className="w-5 h-5 text-emerald-500" />
                            {t('sales.posExperience')}
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {posFeatures.map((feat) => {
                                let isChecked = false
                                let onChange = (_c: boolean) => { }

                                if (feat.key === 'discounts') {
                                    isChecked = settings.enableDiscounts
                                    onChange = (c) => setSettings({ ...settings, enableDiscounts: c })
                                } else if (feat.key === 'customer') {
                                    isChecked = settings.requireCustomerName
                                    onChange = (c) => setSettings({ ...settings, requireCustomerName: c })
                                } else {
                                    const key = feat.key as keyof typeof settings.pos
                                    isChecked = settings.pos?.[key] ?? false
                                    onChange = (c) => setSettings({ ...settings, pos: { ...settings.pos, [key]: c } })
                                }

                                return (
                                    <div key={feat.key} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", feat.bg)}>
                                                <feat.icon className={cn("w-5 h-5", feat.color)} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{feat.label}</h4>
                                                <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">{feat.desc}</p>
                                            </div>
                                        </div>
                                        <Switch checked={isChecked} onChange={onChange} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Invoice Configuration */}
                <div className="space-y-8">
                    {/* Billing Settings */}
                    <div className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 relative z-10">
                            <Receipt className="w-5 h-5 text-indigo-500" />
                            {t('sales.billing')}
                        </h3>

                        <div className="space-y-5 relative z-10">
                            {/* Numbering */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t('sales.prefix')}</label>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={settings.invoice?.prefix || 'FAC-'}
                                            onChange={(e) => setSettings({ ...settings, invoice: { ...settings.invoice, prefix: e.target.value } })}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl font-mono font-bold uppercase text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
                                            placeholder="FAC-"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t('sales.nextNumber')}</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="number"
                                            value={settings.invoice?.nextNumber || 1}
                                            onChange={(e) => setSettings({ ...settings, invoice: { ...settings.invoice, nextNumber: Number(e.target.value) } })}
                                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/50 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Paper Size */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider pl-1">{t('sales.paperSize')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        onClick={() => setSettings({ ...settings, invoice: { ...settings.invoice, paperSize: 'a4' } })}
                                        className={cn(
                                            "cursor-pointer p-3 rounded-xl border transition-all flex items-center gap-3",
                                            settings.invoice?.paperSize !== 'ticket80mm'
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500/50"
                                                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/20 hover:border-gray-300"
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", settings.invoice?.paperSize !== 'ticket80mm' ? "bg-white dark:bg-indigo-500/20 text-indigo-500" : "bg-gray-100 dark:bg-slate-800 text-gray-400")}>
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold dark:text-white">{t('sales.paperA4')}</div>
                                            <div className="text-[9px] text-gray-400">{t('sales.paperA4Desc')}</div>
                                        </div>
                                        {settings.invoice?.paperSize !== 'ticket80mm' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                                    </div>

                                    <div
                                        onClick={() => setSettings({ ...settings, invoice: { ...settings.invoice, paperSize: 'ticket80mm' } })}
                                        className={cn(
                                            "cursor-pointer p-3 rounded-xl border transition-all flex items-center gap-3",
                                            settings.invoice?.paperSize === 'ticket80mm'
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500/50"
                                                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/20 hover:border-gray-300"
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", settings.invoice?.paperSize === 'ticket80mm' ? "bg-white dark:bg-indigo-500/20 text-indigo-500" : "bg-gray-100 dark:bg-slate-800 text-gray-400")}>
                                            <Receipt className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold dark:text-white">{t('sales.paperTicket')}</div>
                                            <div className="text-[9px] text-gray-400">{t('sales.paperTicketDesc')}</div>
                                        </div>
                                        {settings.invoice?.paperSize === 'ticket80mm' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Customization Card */}
                    <div className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <Palette className="w-5 h-5 text-purple-500" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sales.visualCustomization')}</h3>
                        </div>
                        <div className="space-y-6">
                            <BannerUpload
                                label={t('sales.headerBanner')}
                                recommendedSize="800x200px"
                                currentImage={settings.invoice?.headerImage}
                                onUpload={(base64) => setSettings({ ...settings, invoice: { ...settings.invoice, headerImage: base64 } })}
                                onRemove={() => setSettings({ ...settings, invoice: { ...settings.invoice, headerImage: undefined } })}
                            />
                            <BannerUpload
                                label={t('sales.footerBanner')}
                                recommendedSize="800x150px"
                                currentImage={settings.invoice?.footerImage}
                                onUpload={(base64) => setSettings({ ...settings, invoice: { ...settings.invoice, footerImage: base64 } })}
                                onRemove={() => setSettings({ ...settings, invoice: { ...settings.invoice, footerImage: undefined } })}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div >
    )
}
