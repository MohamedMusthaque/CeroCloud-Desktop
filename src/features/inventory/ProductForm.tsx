/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Image as ImageIcon, Loader2, Save } from 'lucide-react'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'
import { Product, Supplier } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, getImageSrc } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormValues } from '@/lib/validators'
import { useTranslation, type TranslationKey } from '@/i18n'

interface ProductFormProps {
    product: Product | null
    onClose: () => void
}

export function ProductForm({ product, onClose }: ProductFormProps) {
    const { t } = useTranslation()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    // Schema messages are translation keys (see validators.ts)
    const errorText = (message?: string) => message ? t(message as TranslationKey) : null

    useEffect(() => {
        supplierService.getAll().then(setSuppliers).catch(console.error)
    }, [])

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            category: '',
            image: '',
            price: 0,
            cost: 0,
            stock: 0,
            min_stock: 0,
            unit: 'unidad',
            supplier_id: undefined,
        }
    })

    // Watch image for preview
    const imagePreview = watch('image')

    useEffect(() => {
        if (product) {
            reset({
                code: product.code,
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                image: product.image || '',
                price: product.price,
                cost: product.cost || 0,
                stock: product.stock,
                min_stock: product.min_stock,
                unit: product.unit as any,
                supplier_id: product.supplier_id,
            })
        }
    }, [product, reset])

    const onSubmit = async (data: ProductFormValues) => {
        try {
            if (product?.id) {
                await productService.update(product.id, data)
                toast.success(t('productForm.updated'))
            } else {
                await productService.create(data)
                toast.success(t('productForm.created'))
            }
            onClose()
        } catch (error) {
            console.error('Error saving product:', error)
            toast.error(t('productForm.saveError'))
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // @ts-ignore - Electron File object
            const filePath = file.path

            if (filePath) {
                const toastId = toast.loading(t('productForm.savingImage'))
                try {
                    const result = await window.electronAPI.products.saveImage(filePath)
                    if (result.success && result.filename) {
                        setValue('image', result.filename, { shouldDirty: true })
                        toast.success(t('productForm.imageSaved'), { id: toastId })
                    } else {
                        toast.error(t('productForm.imageError'), { id: toastId })
                    }
                } catch (error) {
                    console.error(error)
                    toast.error(t('productForm.systemError'), { id: toastId })
                }
            }
        }
    }

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur z-10 sticky top-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {product ? t('productForm.editTitle') : t('productForm.newTitle')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {product ? t('productForm.editSubtitle') : t('productForm.newSubtitle')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* Image Upload Section */}
                            <div className="flex gap-6 items-start">
                                <div className="shrink-0">
                                    <div className={cn(
                                        "relative group w-32 h-32 rounded-2xl bg-gray-100 dark:bg-gray-700 border-2 border-dashed overflow-hidden flex items-center justify-center transition-colors",
                                        imagePreview ? "border-primary/50" : "border-gray-300 dark:border-gray-600 hover:border-primary/50"
                                    )}>
                                        {imagePreview ? (
                                            <img
                                                src={getImageSrc(imagePreview)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label className="cursor-pointer text-white text-xs font-medium text-center px-2 w-full h-full flex items-center justify-center">
                                                {t('productForm.change')}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    {imagePreview && (
                                        <button
                                            type="button"
                                            onClick={() => setValue('image', '', { shouldDirty: true })}
                                            className="text-xs text-red-500 hover:text-red-600 mt-2 w-full text-center"
                                        >
                                            {t('productForm.remove')}
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.name')}</label>
                                            <input
                                                type="text"
                                                {...register('name')}
                                                placeholder={t('productForm.namePlaceholder')}
                                                className={cn(
                                                    "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border focus:ring-2 transition-all outline-none",
                                                    errors.name
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                                        : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                                                )}
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errorText(errors.name.message)}</p>}
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.barcode')}</label>
                                            <input
                                                type="text"
                                                {...register('code')}
                                                placeholder={t('productForm.barcodePlaceholder')}
                                                className={cn(
                                                    "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border focus:ring-2 transition-all outline-none",
                                                    errors.code
                                                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                                        : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                                                )}
                                            />
                                            {errors.code && <p className="text-red-500 text-xs mt-1">{errorText(errors.code.message)}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.description')}</label>
                                        <textarea
                                            {...register('description')}
                                            rows={2}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.category')}</label>
                                    <input
                                        type="text"
                                        {...register('category')}
                                        placeholder={t('productForm.categoryPlaceholder')}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.supplier')}</label>
                                    <select
                                        {...register('supplier_id')}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">{t('productForm.supplierPlaceholder')}</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.unit')}</label>
                                    <select
                                        {...register('unit')}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="unidad">{t('unit.unidad')}</option>
                                        <option value="ton">{t('unit.ton')}</option>
                                        <option value="kg">{t('unit.kg')}</option>
                                        <option value="g">{t('unit.g')}</option>
                                        <option value="l">{t('unit.l')}</option>
                                        <option value="ml">{t('unit.ml')}</option>
                                        <option value="m">{t('unit.m')}</option>
                                        <option value="caja">{t('unit.caja')}</option>
                                        <option value="paquete">{t('unit.paquete')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.cost')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register('cost')}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                    {errors.cost && <p className="text-red-500 text-xs mt-1">{errorText(errors.cost.message)}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1">{t('productForm.price')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register('price')}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 border text-primary font-bold focus:ring-2 transition-all outline-none",
                                            errors.price
                                                ? "border-red-300 focus:border-red-500"
                                                : "border-primary/20 dark:border-primary/30 focus:ring-primary/20 focus:border-primary"
                                        )}
                                    />
                                    {errors.price && <p className="text-red-500 text-xs mt-1">{errorText(errors.price.message)}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.stock')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('stock')}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border focus:ring-2 transition-all outline-none",
                                            errors.stock
                                                ? "border-red-300 focus:border-red-500"
                                                : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                                        )}
                                    />
                                    {errors.stock && <p className="text-red-500 text-xs mt-1">{errorText(errors.stock.message)}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('productForm.minStock')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('min_stock')}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border focus:ring-2 transition-all outline-none",
                                            errors.min_stock
                                                ? "border-red-300 focus:border-red-500"
                                                : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                                        )}
                                    />
                                    {errors.min_stock && <p className="text-red-500 text-xs mt-1">{errorText(errors.min_stock.message)}</p>}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            form="product-form"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {product ? t('productForm.saveChanges') : t('productForm.create')}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    )
}
