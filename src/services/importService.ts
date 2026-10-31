/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx'
import { Product } from '@/types/database'
import { t, useLanguageStore } from '@/i18n'

interface ImportResult {
    success: boolean
    data?: Partial<Product>[]
    errors?: string[]
    validCount?: number
    invalidCount?: number
}

export const importService = {
    // Parse Excel file
    parseExcel: (file: File): Promise<ImportResult> => {
        return new Promise((resolve) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })

                    // Get first sheet
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                    const result = importService.validateAndTransform(jsonData)
                    resolve(result)
                } catch (error) {
                    resolve({
                        success: false,
                        errors: [t('importService.readExcelError')]
                    })
                }
            }

            reader.onerror = () => {
                resolve({
                    success: false,
                    errors: [t('importService.readError')]
                })
            }

            reader.readAsArrayBuffer(file)
        })
    },

    // Parse CSV file
    parseCSV: (file: File): Promise<ImportResult> => {
        return new Promise((resolve) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string
                    const workbook = XLSX.read(text, { type: 'string' })

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                    const result = importService.validateAndTransform(jsonData)
                    resolve(result)
                } catch (error) {
                    resolve({
                        success: false,
                        errors: [t('importService.readCsvError')]
                    })
                }
            }

            reader.onerror = () => {
                resolve({
                    success: false,
                    errors: [t('importService.readError')]
                })
            }

            reader.readAsText(file)
        })
    },

    // Validate and transform data
    validateAndTransform: (rawData: any[]): ImportResult => {
        const errors: string[] = []
        const validProducts: Partial<Product>[] = []
        let invalidCount = 0

        rawData.forEach((row, index) => {
            const rowNum = index + 2 // Excel row (header is 1)

            // Required fields validation
            if (!row.codigo && !row.code && !row.Codigo && !row.Code) {
                errors.push(t('importService.missingCode', { row: rowNum }))
                invalidCount++
                return
            }

            if (!row.nombre && !row.name && !row.Nombre && !row.Name) {
                errors.push(t('importService.missingName', { row: rowNum }))
                invalidCount++
                return
            }

            if (!row.precio && !row.price && !row.Precio && !row.Price && row.precio !== 0) {
                errors.push(t('importService.missingPrice', { row: rowNum }))
                invalidCount++
                return
            }

            // Transform to Product format (flexible column names)
            const product: Partial<Product> = {
                code: String(row.codigo || row.code || row.Codigo || row.Code || '').trim(),
                name: String(row.nombre || row.name || row.Nombre || row.Name || '').trim(),
                description: String(row.descripcion || row.description || row.Descripcion || row.Description || '').trim(),
                category: String(row.categoria || row.category || row.Categoria || row.Category || '').trim(),
                price: parseFloat(row.precio || row.price || row.Precio || row.Price || 0),
                cost: parseFloat(row.costo || row.cost || row.Costo || row.Cost || 0),
                stock: parseInt(row.stock || row.Stock || row.existencia || row.Existencia || 0),
                min_stock: parseInt(row.stock_minimo || row.min_stock || row.StockMinimo || row.MinStock || row.stock_min || 5),
                unit: String(row.unidad || row.unit || row.Unidad || row.Unit || 'unidad').trim(),
            }

            // Validate numeric fields
            if (isNaN(product.price!) || product.price! < 0) {
                errors.push(t('importService.invalidPrice', { row: rowNum }))
                invalidCount++
                return
            }

            if (isNaN(product.stock!) || product.stock! < 0) {
                errors.push(t('importService.invalidStock', { row: rowNum }))
                invalidCount++
                return
            }

            validProducts.push(product)
        })

        return {
            success: validProducts.length > 0,
            data: validProducts,
            errors: errors.length > 0 ? errors : undefined,
            validCount: validProducts.length,
            invalidCount
        }
    },

    // Generate template Excel
    downloadTemplate: () => {
        // Column headers follow the UI language; validateAndTransform accepts both
        const sample = {
            name: t('importService.sampleName'),
            description: t('importService.sampleDescription'),
            category: t('importService.sampleCategory')
        }
        const template = useLanguageStore.getState().language === 'en'
            ? [{
                code: 'PROD001',
                name: sample.name,
                description: sample.description,
                category: sample.category,
                price: 100.00,
                cost: 50.00,
                stock: 10,
                min_stock: 5,
                unit: 'unidad'
            }]
            : [{
                codigo: 'PROD001',
                nombre: sample.name,
                descripcion: sample.description,
                categoria: sample.category,
                precio: 100.00,
                costo: 50.00,
                stock: 10,
                stock_minimo: 5,
                unidad: 'unidad'
            }]

        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, t('importService.sheetName'))

        // Set column widths
        const wscols = [
            { wch: 12 }, // code
            { wch: 25 }, // name
            { wch: 30 }, // description
            { wch: 15 }, // category
            { wch: 10 }, // price
            { wch: 10 }, // cost
            { wch: 10 }, // stock
            { wch: 15 }, // min stock
            { wch: 10 }  // unit
        ]
        ws['!cols'] = wscols

        XLSX.writeFile(wb, t('importService.templateFile'))
    }
}
