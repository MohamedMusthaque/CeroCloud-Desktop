import { roundMoney } from './purchaseUi'

// One editable line of goods (product, quantity, unit cost); inputs are kept as typed text
export interface GoodsRow {
    key: number
    productId: string
    quantity: string
    unitCost: string
}

let nextKey = 1
export const emptyGoodsRow = (): GoodsRow => ({ key: nextKey++, productId: '', quantity: '1', unitCost: '' })
export const goodsRow = (productId: number, quantity: number, unitCost: number): GoodsRow =>
    ({ key: nextKey++, productId: String(productId), quantity: String(quantity), unitCost: String(unitCost) })

export const goodsTotal = (rows: GoodsRow[]) =>
    roundMoney(rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0))

export const goodsInput = (rows: GoodsRow[]) =>
    rows.map(row => ({ product_id: Number(row.productId), quantity: Number(row.quantity), unit_cost: Number(row.unitCost) || 0 }))
