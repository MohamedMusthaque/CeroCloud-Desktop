import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import crypto from 'crypto'
import { Product, Category, Sale, Supplier, SaleItem, Client, Expense, ExpenseType, SavingsAccount, SavingsTransaction, SAVINGS_CATEGORIES, Purchase, PurchaseItem, SupplierPayment, SupplierAccount, CapitalEntry, CapitalItem, CapitalSettlement, CAPITAL_ENTRY_TYPES, CAPITAL_FORMS, GoodsReceipt, GoodsReceiptItem } from '../../src/types/database'
import { PAGE_IDS, sanitizePermissions, type AuthUser, type UserRole } from '../../src/lib/permissions'

// Database setup: opened by initializeDatabase() once the data folder is known (see dataLocation.ts)
let db: Database.Database
let dbPath = ''

// ==========================================
// 1. Schema definition
// ==========================================

// Returns true if the column was just added
function addColumnIfMissing(table: string, column: string, definition: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (columns.some(c => c.name === column)) return false
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  return true
}

// ==========================================
// Audit: who created / changed each record and when
// ==========================================

// Username of whoever performs the action (null = system, e.g. demo data)
export type Actor = string | null

const AUDITED_TABLES = ['products', 'categories', 'suppliers', 'clients', 'sales', 'users']

// Audit columns are set by the main process, never by data sent from the UI
const AUDIT_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by']

function editableFields(data: object): string[] {
  return Object.keys(data).filter(key => key !== 'id' && !AUDIT_COLUMNS.includes(key))
}

// ==========================================
// Authentication: scrypt passwords with a random salt ("salt:hash" in hex)
// ==========================================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

// No default user is seeded: a fresh database stays empty until the first-run Admin Setup creates one
function countUsers(): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count
}

export type { AuthUser }

export interface ManagedUser extends AuthUser {
  created_at?: string
  created_by?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

export interface UserInput {
  username?: string
  password?: string
  role?: UserRole
  permissions?: string[]
}

// User-management errors; the UI translates the code
export class UserError extends Error {
  constructor(public code: 'USERNAME_REQUIRED' | 'USERNAME_TAKEN' | 'PASSWORD_TOO_SHORT' | 'LAST_ADMIN' | 'SELF_DELETE' | 'SELF_DEMOTE' | 'NOT_FOUND' | 'SETUP_COMPLETE') {
    super(code)
  }
}

const MIN_PASSWORD_LENGTH = 4

type UserRow = {
  id: number; username: string; role: string; permissions: string | null; password_hash: string
  created_at?: string; created_by?: string | null; updated_at?: string | null; updated_by?: string | null
}

function rowToUser(row: UserRow): ManagedUser {
  let permissions: unknown = []
  try { permissions = JSON.parse(row.permissions || '[]') } catch { /* corrupt permissions = none */ }
  return {
    id: row.id,
    username: row.username,
    role: row.role === 'admin' ? 'admin' : 'user',
    permissions: sanitizePermissions(permissions),
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    updated_by: row.updated_by
  }
}

function countAdmins(): number {
  return (db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }).count
}

export const userQueries = {
  // First run: true until the Admin Setup has created the first user
  needsSetup: (): boolean => countUsers() === 0,

  // Creates the first administrator; refused once any user exists so it can't be used to bypass login
  createInitialAdmin: (usernameInput: string, password: string): ManagedUser => {
    const username = usernameInput.trim()
    if (!username) throw new UserError('USERNAME_REQUIRED')
    if (!password || password.length < MIN_PASSWORD_LENGTH) throw new UserError('PASSWORD_TOO_SHORT')

    const id = db.transaction(() => {
      if (countUsers() > 0) throw new UserError('SETUP_COMPLETE')
      const now = new Date().toISOString()
      const info = db.prepare('INSERT INTO users(username, password_hash, role, permissions, created_at, created_by, updated_at, updated_by) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')
        .run(username, hashPassword(password), 'admin', DEFAULT_PERMISSIONS, now, username, now, username)
      return Number(info.lastInsertRowid)
    })()
    return userQueries.getById(id)!
  },

  authenticate:(username: string, password: string): AuthUser | null => {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as UserRow | undefined
    if (!row || !verifyPassword(password, row.password_hash)) return null
    return rowToUser(row)
  },

  getById: (id: number): ManagedUser | null => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    return row ? rowToUser(row) : null
  },

  getAll: (): ManagedUser[] => {
    return (db.prepare('SELECT * FROM users ORDER BY username COLLATE NOCASE').all() as UserRow[]).map(rowToUser)
  },

  create: (input: UserInput, actor: AuthUser): ManagedUser => {
    const username = (input.username ?? '').trim()
    if (!username) throw new UserError('USERNAME_REQUIRED')
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) throw new UserError('PASSWORD_TOO_SHORT')
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new UserError('USERNAME_TAKEN')

    const now = new Date().toISOString()
    const info = db.prepare('INSERT INTO users(username, password_hash, role, permissions, created_at, created_by, updated_at, updated_by) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(
      username,
      hashPassword(input.password),
      input.role === 'admin' ? 'admin' : 'user',
      JSON.stringify(sanitizePermissions(input.permissions)),
      now, actor.username, now, actor.username
    )
    return userQueries.getById(Number(info.lastInsertRowid))!
  },

  // actor: user making the change (cannot remove their own admin role)
  update: (id: number, input: UserInput, actor: AuthUser): ManagedUser => {
    const actorId = actor.id
    const existing = userQueries.getById(id)
    if (!existing) throw new UserError('NOT_FOUND')

    const updates: Record<string, string> = {}
    if (input.username !== undefined) {
      const username = input.username.trim()
      if (!username) throw new UserError('USERNAME_REQUIRED')
      const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
      if (taken) throw new UserError('USERNAME_TAKEN')
      updates.username = username
    }
    if (input.password) {
      if (input.password.length < MIN_PASSWORD_LENGTH) throw new UserError('PASSWORD_TOO_SHORT')
      updates.password_hash = hashPassword(input.password)
    }
    if (input.role !== undefined) {
      const role: UserRole = input.role === 'admin' ? 'admin' : 'user'
      if (existing.role === 'admin' && role !== 'admin') {
        if (id === actorId) throw new UserError('SELF_DEMOTE')
        if (countAdmins() <= 1) throw new UserError('LAST_ADMIN')
      }
      updates.role = role
    }
    if (input.permissions !== undefined) {
      updates.permissions = JSON.stringify(sanitizePermissions(input.permissions))
    }

    const fields = Object.keys(updates)
    if (fields.length > 0) {
      db.prepare(`UPDATE users SET ${fields.map(f => `${f} = @${f}`).join(', ')}, updated_at = @updated_at, updated_by = @updated_by WHERE id = @id`)
        .run({ ...updates, id, updated_at: new Date().toISOString(), updated_by: actor.username })
    }
    return userQueries.getById(id)!
  },

  delete: (id: number, actorId: number): void => {
    const existing = userQueries.getById(id)
    if (!existing) throw new UserError('NOT_FOUND')
    if (id === actorId) throw new UserError('SELF_DELETE')
    if (existing.role === 'admin' && countAdmins() <= 1) throw new UserError('LAST_ADMIN')
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }
}

// First administrator (Admin Setup): access to every page
const DEFAULT_PERMISSIONS = JSON.stringify(PAGE_IDS)

// Starter expense types; the user can rename, delete or add more
const DEFAULT_EXPENSE_TYPES = ['Transport', 'Employee Salary', 'Fuel', 'Rent', 'Utilities', 'Other']

function seedExpenseTypes() {
  const insert = db.prepare('INSERT OR IGNORE INTO expense_types(name, description, created_at, updated_at) VALUES(?, ?, ?, ?)')
  const now = new Date().toISOString()
  db.transaction(() => {
    for (const name of DEFAULT_EXPENSE_TYPES) insert.run(name, '', now, now)
  })()
}

function initSchema() {
  // Table: products
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        supplier_id INTEGER,
        supplier_name TEXT,
        image TEXT,
        price REAL NOT NULL,
        cost REAL,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 5,
        unit TEXT DEFAULT 'unidad',
        created_at TEXT,
        updated_at TEXT
    )`)

  // Table: categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT
    )`)

  // Table: suppliers
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TEXT
    )`)

  // Table: clients
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tax_id TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        credit_limit REAL DEFAULT 0,
        credit_limit_enabled INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
    )`)

  // Table: sales
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT,
        customer_name TEXT,
        client_id INTEGER,
        notes TEXT,
        status TEXT DEFAULT 'completed',
        created_at TEXT
    )`)

  // Table: sale items
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_code TEXT,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )`)




  // Table: expense types (user-defined: Transport, Salaries, Fuel...)
  const isNewExpenseTypesTable = !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'expense_types'").get()
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        description TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT
    )`)
  if (isNewExpenseTypesTable) seedExpenseTypes()

  // Table: business expenses
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_type_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        expense_date TEXT NOT NULL,
        payment_method TEXT,
        description TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
    )`)

  // Table: savings accounts (employee, personal or other savings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE,
        category TEXT NOT NULL DEFAULT 'other',
        description TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT
    )`)

  // Table: savings deposits and withdrawals
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_date TEXT NOT NULL,
        payment_method TEXT,
        description TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (account_id) REFERENCES savings_accounts(id)
    )`)

  // Table: purchase orders (goods ordered from a supplier, received later)
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        received_date TEXT,
        status TEXT NOT NULL DEFAULT 'ordered',
        total REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )`)

  // Table: purchase order items
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_code TEXT,
        product_name TEXT,
        ordered_quantity INTEGER NOT NULL,
        received_quantity INTEGER,
        unit_cost REAL NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    )`)

  // Table: money paid to (or refunded by) suppliers, optionally for one order
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        purchase_id INTEGER,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id)
    )`)

  // Table: owner capital, income earned outside sales and owner withdrawals
  // (supplier_id / purchase_id have no foreign key: a restore can replace purchases while keeping these)
  db.exec(`
    CREATE TABLE IF NOT EXISTS capital_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        form TEXT NOT NULL DEFAULT 'money',
        source TEXT,
        supplier_id INTEGER,
        purchase_id INTEGER,
        amount REAL NOT NULL,
        entry_date TEXT NOT NULL,
        payment_method TEXT,
        description TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT
    )`)

  // Table: goods given as capital
  db.exec(`
    CREATE TABLE IF NOT EXISTS capital_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_code TEXT,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES capital_entries(id) ON DELETE CASCADE
    )`)

  // Table: loan repayments and payments in towards promised capital
  db.exec(`
    CREATE TABLE IF NOT EXISTS capital_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        settlement_date TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (entry_id) REFERENCES capital_entries(id) ON DELETE CASCADE
    )`)

  // Table: Goods Received Notes (goods bought from clients)
  // (client_id has no foreign key: a restore can replace clients while keeping these)
  db.exec(`
    CREATE TABLE IF NOT EXISTS goods_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        client_name TEXT NOT NULL,
        receipt_date TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        payment_method TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        notes TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        updated_by TEXT
    )`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_code TEXT,
        product_name TEXT,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE
    )`)

  // Table: users (local login)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        permissions TEXT DEFAULT '[]',
        created_at TEXT
    )`)
  addColumnIfMissing('users', 'permissions', "TEXT DEFAULT '[]'")

  // Columns added after the first version (existing databases)
  addColumnIfMissing('clients', 'credit_limit', 'REAL DEFAULT 0')
  addColumnIfMissing('capital_entries', 'form', "TEXT NOT NULL DEFAULT 'money'")
  addColumnIfMissing('capital_entries', 'supplier_id', 'INTEGER')
  addColumnIfMissing('capital_entries', 'purchase_id', 'INTEGER')
  if (addColumnIfMissing('clients', 'credit_limit_enabled', 'INTEGER DEFAULT 0')) {
    // Existing clients were always limit-checked: keep enforcing it for them
    db.exec('UPDATE clients SET credit_limit_enabled = 1')
  }
  addColumnIfMissing('sales', 'client_id', 'INTEGER')
  addColumnIfMissing('sales', 'cheque_number', 'TEXT')
  addColumnIfMissing('sales', 'cheque_bank', 'TEXT')
  // File name of the attached NIC scan (see attachments.ts)
  addColumnIfMissing('suppliers', 'nic_attachment', 'TEXT')
  addColumnIfMissing('clients', 'nic_attachment', 'TEXT')
  if (addColumnIfMissing('sale_items', 'unit_cost', 'REAL')) {
    // Older sales didn't store the cost: approximate it with the product's current cost
    db.exec('UPDATE sale_items SET unit_cost = (SELECT cost FROM products WHERE products.id = sale_items.product_id)')
  }
  for (const table of AUDITED_TABLES) {
    addColumnIfMissing(table, 'created_by', 'TEXT')
    addColumnIfMissing(table, 'updated_at', 'TEXT')
    addColumnIfMissing(table, 'updated_by', 'TEXT')
  }

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON clients(tax_id);
    CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON clients(tax_id);
    CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_type_id ON expenses(expense_type_id);
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_account_id ON savings_transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_date ON savings_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase_id ON supplier_payments(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_capital_entries_date ON capital_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_capital_items_entry_id ON capital_items(entry_id);
    CREATE INDEX IF NOT EXISTS idx_capital_settlements_entry_id ON capital_settlements(entry_id);
    CREATE INDEX IF NOT EXISTS idx_goods_receipts_client_id ON goods_receipts(client_id);
    CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt_id ON goods_receipt_items(receipt_id);
  `)

  console.log('SQLite schema initialized.')
}

// ==========================================
// 2. Migration logic (JSON -> SQLite)
// ==========================================

function migrateFromJSON() {
  const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number }
  if (productCount.count > 0) return

  const jsonPath = path.join(app.getPath('userData'), 'cerocloud-data.json')
  if (fs.existsSync(jsonPath)) {
    console.log('Old JSON data file found. Migrating to SQLite...')
    try {
      const rawData = fs.readFileSync(jsonPath, 'utf8')
      const jsonData = JSON.parse(rawData)

      const insertProduct = db.prepare(`
                INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, created_at, updated_at)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @created_at, @updated_at)
            `)

      const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories(id, name, description, created_at) VALUES(@id, @name, @description, @created_at)`)
      const insertSupplier = db.prepare(`INSERT INTO suppliers(id, name, contact, phone, email, address, created_at) VALUES(@id, @name, @contact, @phone, @email, @address, @created_at)`)
      const insertSale = db.prepare(`INSERT INTO sales(id, subtotal, tax, discount, total, payment_method, customer_name, status, created_at) VALUES(@id, @subtotal, @tax, @discount, @total, @payment_method, @customer_name, @status, @created_at)`)
      const insertSaleItem = db.prepare(`INSERT INTO sale_items(sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal) VALUES(@sale_id, @product_id, @product_code, @product_name, @quantity, @unit_price, @subtotal)`)

      const migration = db.transaction(() => {
        if (jsonData.products) {
          for (const p of jsonData.products) {
            insertProduct.run({
              id: p.id, code: p.code, name: p.name, description: p.description || '', category: p.category || '',
              price: p.price, cost: p.cost || 0, stock: p.stock, min_stock: p.min_stock,
              unit: p.unit || 'unidad', created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString()
            })
          }
        }

        if (jsonData.categories) {
          for (const c of jsonData.categories) {
            insertCategory.run({ id: c.id, name: c.name, description: c.description || '', created_at: c.created_at || new Date().toISOString() })
          }
        }

        if (jsonData.suppliers) {
          for (const s of jsonData.suppliers) {
            insertSupplier.run({
              id: s.id, name: s.name, contact: s.contact || '', phone: s.phone || '',
              email: s.email || '', address: s.address || '', created_at: s.created_at || new Date().toISOString()
            })
          }
        }

        if (jsonData.sales) {
          for (const s of jsonData.sales) {
            insertSale.run({
              id: s.id, subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total,
              payment_method: s.payment_method, customer_name: s.customer_name || '',
              status: s.status || 'completed', created_at: s.created_at || new Date().toISOString()
            })

            if (s.items) {
              for (const item of s.items) {
                insertSaleItem.run({
                  sale_id: s.id, product_id: item.product_id || 0,
                  product_code: item.product_code || '', product_name: item.product_name || '',
                  quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal
                })
              }
            }
          }
        }
      })

      migration()
      console.log('Migration completed.')
    } catch (error) {
      console.error('Error migrating JSON data:', error)
    }
  } else {
    initializeDemoData()
  }
}

function initializeDemoData() {
  console.log('Creating demo data...')
  const insert = db.prepare(`
        INSERT INTO products(code, name, description, category, price, cost, stock, min_stock, unit, created_at, updated_at)
  VALUES(@code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @created_at, @updated_at)
    `)

  const demoProducts = [
    { code: 'DEMO01', name: 'HP 15 Laptop', description: '8GB RAM, 256GB SSD', category: 'Electronics', price: 599.99, cost: 450.00, stock: 10, min_stock: 2, unit: 'unidad' },
    { code: 'DEMO02', name: 'Wireless Mouse', description: 'Optical 2.4GHz', category: 'Accessories', price: 12.50, cost: 6.00, stock: 50, min_stock: 10, unit: 'unidad' },
    { code: 'DEMO03', name: 'Mechanical Keyboard', description: 'RGB Gaming', category: 'Accessories', price: 45.00, cost: 25.00, stock: 15, min_stock: 5, unit: 'unidad' },
    { code: 'DEMO04', name: '24" Monitor', description: 'Full HD IPS', category: 'Electronics', price: 120.00, cost: 90.00, stock: 5, min_stock: 2, unit: 'unidad' },
    { code: 'DEMO05', name: 'HDMI Cable', description: '2 meters 4K', category: 'Cables', price: 5.99, cost: 1.50, stock: 100, min_stock: 20, unit: 'unidad' }
  ]

  const tx = db.transaction(() => {
    for (const p of demoProducts) {
      insert.run({ ...p, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    }
  })
  tx()
}

// ==========================================
// 3. Database operations (queries)
// ==========================================

// Internal log helper REMOVED
// In-store barcodes are EAN-13 codes starting with "20": that prefix is reserved for internal use,
// so a generated code never clashes with a manufacturer's barcode
const INTERNAL_BARCODE_PREFIX = '20'

// EAN-13 check digit for the first 12 digits (weights 1, 3, 1, 3...)
function ean13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10
}

// Next unused in-store barcode, numbered after the highest one generated so far
export function nextInternalBarcode(): string {
  const pattern = INTERNAL_BARCODE_PREFIX + '[0-9]'.repeat(11)
  const codes = db.prepare('SELECT code FROM products WHERE code GLOB ?').all(pattern) as { code: string }[]
  let serial = codes.reduce((max, { code }) => Math.max(max, Number(code.slice(2, 12))), 0) + 1
  const exists = db.prepare('SELECT 1 FROM products WHERE code = ?')
  for (;;) {
    const first12 = INTERNAL_BARCODE_PREFIX + String(serial).padStart(10, '0')
    const code = first12 + ean13CheckDigit(first12)
    if (!exists.get(code)) return code
    serial++
  }
}

export const productQueries = {
  getAll: (): Product[] => {
    return db.prepare('SELECT * FROM products ORDER BY name ASC').all() as Product[]
  },

  getById: (id: number): Product | undefined => {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
  },

  search: (term: string): Product[] => {
    const pattern = `% ${term}% `
    return db.prepare(`
  SELECT * FROM products 
            WHERE name LIKE ? OR code LIKE ? OR description LIKE ? OR category LIKE ?
    `).all(pattern, pattern, pattern, pattern) as Product[]
  },

  create: (product: Omit<Product, 'id'> & { id?: number }, actor: Actor = null): Product => {
    // Allow an explicit ID (for restores) or NULL (autoincrement)
    const stmt = db.prepare(`
            INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, image, supplier_id, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @image, @supplier_id, @created_at, @created_by, @updated_at, @updated_by)
    `)

    const audit = {
      created_at: product.created_at || new Date().toISOString(),
      created_by: actor,
      updated_at: product.updated_at || new Date().toISOString(),
      updated_by: actor
    }
    const info = stmt.run({
      ...product,
      id: product.id || null,
      description: product.description || '',
      category: product.category || '',
      cost: product.cost || 0,
      unit: product.unit || 'unidad',
      image: product.image || null,
      supplier_id: product.supplier_id || null,
      ...audit
    })

    const newId = Number(info.lastInsertRowid)

    return { ...product, ...audit, id: newId }
  },

  createOrUpdate: (product: Omit<Product, 'id'> & { id?: number }, actor: Actor = null): { product: Product; isNew: boolean } => {
    // Check whether a product with the same code exists
    const existing = db.prepare('SELECT * FROM products WHERE code = ?').get(product.code) as Product | undefined

    if (existing) {
      // Update the existing product
      const updateStmt = db.prepare(`
        UPDATE products 
        SET name = @name,
    description = @description,
    category = @category,
    price = @price,
    cost = @cost,
    stock = @stock,
    min_stock = @min_stock,
    unit = @unit,
    image = @image,
    supplier_id = @supplier_id,
    updated_at = @updated_at,
    updated_by = @updated_by
        WHERE code = @code
    `)

      const audit = { updated_at: new Date().toISOString(), updated_by: actor }
      updateStmt.run({
        ...product,
        image: product.image || null,
        supplier_id: product.supplier_id || null,
        ...audit
      })

      // Update log REMOVED

      return {
        product: { ...existing, ...product, ...audit, id: existing.id },
        isNew: false
      }
    } else {
      // Create a new product
      return {
        product: productQueries.create(product, actor),
        isNew: true
      }
    }
  },

  update: (id: number, productData: Partial<Product>, actor: Actor = null): Product | null => {
    const fields = editableFields(productData)
    if (fields.length === 0) return productQueries.getById(id) || null



    const setClause = fields.map(field => `${field} = @${field} `).join(', ')
    const stmt = db.prepare(`UPDATE products SET ${setClause}, updated_at = @updated_at, updated_by = @updated_by WHERE id = @id`)

    stmt.run({
      ...productData,
      id,
      updated_at: new Date().toISOString(),
      updated_by: actor
    })

    // Stock adjustment log REMOVED

    return productQueries.getById(id) || null
  },

  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return info.changes > 0
  },

  getLowStock: (): Product[] => {
    return db.prepare('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC').all() as Product[]
  }
}

// Category-management errors; the UI translates the code
export class CategoryError extends Error {
  constructor(public code: 'NAME_REQUIRED' | 'NAME_TAKEN' | 'NOT_FOUND') {
    super(code)
  }
}

// Products store the category name as text; these queries keep both in sync
export const categoryQueries = {
  getAll: (): Category[] => {
    // Register categories that only exist on products (imports, old data)
    db.prepare(`
      INSERT INTO categories (name, description, created_at)
      SELECT TRIM(p.category), '', ? FROM products p
      WHERE TRIM(COALESCE(p.category, '')) != ''
        AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = TRIM(p.category) COLLATE NOCASE)
      GROUP BY LOWER(TRIM(p.category))
    `).run(new Date().toISOString())

    return db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE TRIM(p.category) = c.name COLLATE NOCASE) AS products_count
      FROM categories c ORDER BY c.name COLLATE NOCASE ASC
    `).all() as Category[]
  },

  create: (name: string, description?: string, actor: Actor = null): Category => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) throw new CategoryError('NAME_REQUIRED')
    if (db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE').get(trimmed)) throw new CategoryError('NAME_TAKEN')

    const createdAt = new Date().toISOString()
    const info = db.prepare('INSERT INTO categories (name, description, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(trimmed, description?.trim() || '', createdAt, actor, createdAt, actor)
    return {
      id: Number(info.lastInsertRowid), name: trimmed, description: description?.trim() || '',
      created_at: createdAt, created_by: actor, updated_at: createdAt, updated_by: actor, products_count: 0
    }
  },

  // Renaming also updates the products that use the category
  update: (id: number, data: { name?: string; description?: string }, actor: Actor = null): Category => {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined
    if (!existing) throw new CategoryError('NOT_FOUND')

    const name = data.name !== undefined ? data.name.trim() : existing.name
    if (!name) throw new CategoryError('NAME_REQUIRED')
    if (db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id != ?').get(name, id)) throw new CategoryError('NAME_TAKEN')
    const description = data.description !== undefined ? data.description.trim() : (existing.description || '')

    const updatedAt = new Date().toISOString()
    db.transaction(() => {
      db.prepare('UPDATE categories SET name = ?, description = ?, updated_at = ?, updated_by = ? WHERE id = ?')
        .run(name, description, updatedAt, actor, id)
      if (name !== existing.name) {
        db.prepare('UPDATE products SET category = ?, updated_at = ?, updated_by = ? WHERE TRIM(category) = ? COLLATE NOCASE')
          .run(name, updatedAt, actor, existing.name)
      }
    })()

    return { ...existing, name, description, updated_at: updatedAt, updated_by: actor }
  },

  // Deleting leaves its products uncategorized
  delete: (id: number, actor: Actor = null): void => {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined
    if (!existing) throw new CategoryError('NOT_FOUND')

    db.transaction(() => {
      db.prepare("UPDATE products SET category = '', updated_at = ?, updated_by = ? WHERE TRIM(category) = ? COLLATE NOCASE")
        .run(new Date().toISOString(), actor, existing.name)
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    })()
  }
}

export const clientQueries = {
  getAll: (): Client[] => {
    return db.prepare('SELECT * FROM clients ORDER BY name ASC').all() as Client[]
  },

  getById: (id: number): Client | undefined => {
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined
  },

  search: (term: string): Client[] => {
    const pattern = `%${term}%`
    return db.prepare(`
            SELECT * FROM clients 
            WHERE name LIKE ? OR tax_id LIKE ? OR phone LIKE ?
        `).all(pattern, pattern, pattern) as Client[]
  },

  create: (client: Omit<Client, 'id'> & { id?: number }, actor: Actor = null): Client => {
    const stmt = db.prepare(`
            INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, credit_limit_enabled, nic_attachment, created_at, created_by, updated_at, updated_by)
            VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @credit_limit_enabled, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
        `)

    const audit = {
      created_at: client.created_at || new Date().toISOString(),
      created_by: actor,
      updated_at: client.updated_at || new Date().toISOString(),
      updated_by: actor
    }
    const info = stmt.run({
      ...client,
      id: client.id || null,
      tax_id: client.tax_id || null,
      address: client.address || null,
      phone: client.phone || null,
      email: client.email || null,
      notes: client.notes || '',
      credit_limit: client.credit_limit || 0,
      credit_limit_enabled: client.credit_limit_enabled ? 1 : 0,
      nic_attachment: client.nic_attachment || null,
      ...audit
    })

    return { ...client, ...audit, id: Number(info.lastInsertRowid) }
  },

  update: (id: number, clientData: Partial<Client>, actor: Actor = null): Client | null => {
    const fields = editableFields(clientData)
    if (fields.length === 0) return clientQueries.getById(id) || null

    const setClause = fields.map(field => `${field} = @${field}`).join(', ')
    const stmt = db.prepare(`UPDATE clients SET ${setClause}, updated_at = @updated_at, updated_by = @updated_by WHERE id = @id`)

    stmt.run({
      ...clientData,
      id,
      updated_at: new Date().toISOString(),
      updated_by: actor
    })

    return clientQueries.getById(id) || null
  },

  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM clients WHERE id = ?').run(id)
    return info.changes > 0
  },

  // Outstanding balance: total of the client's non-cancelled credit sales
  getCreditBalance: (id: number): number => {
    const row = db.prepare(`
            SELECT COALESCE(SUM(total), 0) AS balance FROM sales
            WHERE client_id = ? AND payment_method = 'credit' AND status != 'cancelled'
        `).get(id) as { balance: number }
    return row.balance
  }
}

export const supplierQueries = {
  getAll: (): Supplier[] => {
    return db.prepare(`
      SELECT s.*, count(p.id) as products_count 
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all() as Supplier[]
  },

  getById: (id: number): Supplier | undefined => {
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier | undefined
  },

  create: (supplier: Omit<Supplier, 'id'> & { id?: number }, actor: Actor = null): Supplier => {
    const stmt = db.prepare(`
            INSERT INTO suppliers(id, name, contact, phone, email, address, nic_attachment, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @name, @contact, @phone, @email, @address, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
        `)
    const createdAt = supplier.created_at || new Date().toISOString()
    const audit = { created_at: createdAt, created_by: actor, updated_at: createdAt, updated_by: actor }
    const info = stmt.run({
      ...supplier,
      id: supplier.id || null,
      contact: supplier.contact || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      nic_attachment: supplier.nic_attachment || null,
      ...audit
    })
    return { ...supplier, ...audit, id: Number(info.lastInsertRowid) }
  },

  update: (id: number, supplierData: Partial<Supplier>, actor: Actor = null): Supplier | null => {
    const fields = editableFields(supplierData)
    if (fields.length === 0) return supplierQueries.getById(id) || null

    const setClause = fields.map(field => `${field} = @${field} `).join(', ')
    const stmt = db.prepare(`UPDATE suppliers SET ${setClause}, updated_at = @updated_at, updated_by = @updated_by WHERE id = @id`)

    stmt.run({ ...supplierData, id, updated_at: new Date().toISOString(), updated_by: actor })
    return supplierQueries.getById(id) || null
  },

  // Callers check supplierHasPurchases() first: orders and payments keep the supplier's history
  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return info.changes > 0
  }
}

export function supplierHasPurchases(id: number): boolean {
  return !!db.prepare(`
    SELECT 1 FROM purchase_orders WHERE supplier_id = @id
    UNION ALL SELECT 1 FROM supplier_payments WHERE supplier_id = @id
    LIMIT 1
  `).get({ id })
}

export const saleQueries = {
  getAll: (): Sale[] => {
    const sales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all() as Sale[]
    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?')

    return sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id) as SaleItem[]
    }))
  },

  getById: (id: number): Sale | undefined => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale | undefined
    if (!sale) return undefined

    sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
    return sale
  },

  create: (sale: Omit<Sale, 'id'> & { id?: number }, actor: Actor = null): Sale => {
    const createTx = db.transaction(() => {
      // 1. Insert the sale (allows restoring the original ID, status and dates)
      const insertSale = db.prepare(`
                INSERT INTO sales(id, subtotal, tax, discount, total, payment_method, cheque_number, cheque_bank, customer_name, client_id, notes, status, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @subtotal, @tax, @discount, @total, @payment_method, @cheque_number, @cheque_bank, @customer_name, @client_id, @notes, @status, @created_at, @created_by, @updated_at, @updated_by)
    `)

      const createdAt = sale.created_at || new Date().toISOString()
      const audit = { created_at: createdAt, created_by: actor, updated_at: createdAt, updated_by: actor }
      const info = insertSale.run({
        ...sale,
        id: sale.id || null,
        client_id: sale.client_id ?? null,
        // Cheque details only make sense on cheque bills
        cheque_number: sale.payment_method === 'cheque' ? sale.cheque_number?.trim() || null : null,
        cheque_bank: sale.payment_method === 'cheque' ? sale.cheque_bank?.trim() || null : null,
        notes: sale.notes || '',
        status: sale.status || 'completed',
        ...audit
      })
      const saleId = Number(info.lastInsertRowid)

      // 2. Insert items and update stock
      // The unit cost is frozen at sale time, so changing the product's cost doesn't alter past profit
      const insertItem = db.prepare(`
                INSERT INTO sale_items(sale_id, product_id, product_code, product_name, quantity, unit_price, unit_cost, subtotal)
  VALUES(@sale_id, @product_id, @product_code, @product_name, @quantity, @unit_price,
         COALESCE(@unit_cost, (SELECT cost FROM products WHERE id = @product_id)), @subtotal)
            `)

      const updateStock = db.prepare(`UPDATE products SET stock = ROUND(stock - @qty, 3) WHERE id = @id`)

      // A restore first brings back the products with their stock from the backup, then the sales.
      // That stock already reflects those sales, so deducting it again would count them twice.
      // So: a sale with an 'id' is a restore and leaves stock alone; only NEW sales (no id) deduct stock.

      const isRestore = !!sale.id;

      for (const item of sale.items) {
        insertItem.run({
          sale_id: saleId,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: roundQuantity(item.quantity),
          unit_price: item.unit_price,
          // Only a restore brings its own cost; a new sale always uses the product's current cost
          unit_cost: isRestore ? item.unit_cost ?? null : null,
          subtotal: item.subtotal
        })

        if (!isRestore) {
          // Update stock
          updateStock.run({ qty: roundQuantity(item.quantity), id: item.product_id })
        }
      }

      return { ...sale, ...audit, id: saleId, status: sale.status || 'completed' } as Sale
    })

    return createTx()
  },

  getTotalSales: (): number => {
    const result = db.prepare('SELECT SUM(total) as total FROM sales WHERE status = "completed"').get() as { total: number }
    return result.total || 0
  },

  getSalesToday: (): Sale[] => {
    const today = new Date().toISOString().split('T')[0]
    const sales = db.prepare('SELECT * FROM sales WHERE created_at LIKE ? ORDER BY created_at DESC').all(`${today}% `) as Sale[]

    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?')
    return sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id) as SaleItem[]
    }))
  },

  getRecent: (limit: number = 10): Sale[] => {
    const sales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC LIMIT ?').all(limit) as Sale[]
    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?')
    return sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id) as SaleItem[]
    }))
  },

  getByCustomerName: (name: string): Sale[] => {
    const sales = db.prepare('SELECT * FROM sales WHERE customer_name = ? ORDER BY created_at DESC').all(name) as Sale[]
    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?')
    return sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id) as SaleItem[]
    }))
  },

  // Sales that include the product (newest first), with all their items
  getByProductId: (productId: number): Sale[] => {
    const sales = db.prepare(`
      SELECT * FROM sales WHERE id IN (SELECT sale_id FROM sale_items WHERE product_id = ?)
      ORDER BY created_at DESC
    `).all(productId) as Sale[]
    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?')
    return sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id) as SaleItem[]
    }))
  }
}

export const cancelSale = (id: number, actor: Actor = null): Sale | null => {
  const cancelTx = db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale
    if (!sale || sale.status === 'cancelled') return null

    db.prepare("UPDATE sales SET status = 'cancelled', updated_at = ?, updated_by = ? WHERE id = ?")
      .run(new Date().toISOString(), actor, id)

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
    const updateStock = db.prepare('UPDATE products SET stock = ROUND(stock + @qty, 3) WHERE id = @id')

    for (const item of items) {


      // Restore stock
      updateStock.run({ qty: item.quantity, id: item.product_id })
    }

    return db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale
  })

  const result = cancelTx()
  if (result) {
    result.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
  }
  return result
}

// ==========================================
// Expenses and expense types
// ==========================================

// Expense errors; the UI translates the code
export class ExpenseError extends Error {
  constructor(public code: 'NAME_REQUIRED' | 'NAME_TAKEN' | 'TYPE_IN_USE' | 'TYPE_REQUIRED' | 'AMOUNT_INVALID' | 'DATE_INVALID' | 'NOT_FOUND') {
    super(code)
  }
}

export interface ExpenseInput {
  expense_type_id?: number
  amount?: number
  expense_date?: string
  payment_method?: string
  description?: string
}

export const expenseTypeQueries = {
  // Includes how many expenses use each type and their total amount
  getAll: (): ExpenseType[] => {
    return db.prepare(`
      SELECT t.*, COUNT(e.id) AS expenses_count, COALESCE(SUM(e.amount), 0) AS total_amount
      FROM expense_types t
      LEFT JOIN expenses e ON e.expense_type_id = t.id
      GROUP BY t.id
      ORDER BY t.name COLLATE NOCASE ASC
    `).all() as ExpenseType[]
  },

  create: (name: string, description?: string, actor: Actor = null): ExpenseType => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) throw new ExpenseError('NAME_REQUIRED')
    if (db.prepare('SELECT 1 FROM expense_types WHERE name = ?').get(trimmed)) throw new ExpenseError('NAME_TAKEN')

    const now = new Date().toISOString()
    const info = db.prepare('INSERT INTO expense_types(name, description, created_at, created_by, updated_at, updated_by) VALUES(?, ?, ?, ?, ?, ?)')
      .run(trimmed, description?.trim() || '', now, actor, now, actor)
    return {
      id: Number(info.lastInsertRowid), name: trimmed, description: description?.trim() || '',
      created_at: now, created_by: actor, updated_at: now, updated_by: actor, expenses_count: 0, total_amount: 0
    }
  },

  // Expenses store the type id, so renaming needs no syncing
  update: (id: number, data: { name?: string; description?: string }, actor: Actor = null): ExpenseType => {
    const existing = db.prepare('SELECT * FROM expense_types WHERE id = ?').get(id) as ExpenseType | undefined
    if (!existing) throw new ExpenseError('NOT_FOUND')

    const name = data.name !== undefined ? data.name.trim() : existing.name
    if (!name) throw new ExpenseError('NAME_REQUIRED')
    if (db.prepare('SELECT 1 FROM expense_types WHERE name = ? AND id != ?').get(name, id)) throw new ExpenseError('NAME_TAKEN')
    const description = data.description !== undefined ? data.description.trim() : (existing.description || '')

    const updatedAt = new Date().toISOString()
    db.prepare('UPDATE expense_types SET name = ?, description = ?, updated_at = ?, updated_by = ? WHERE id = ?')
      .run(name, description, updatedAt, actor, id)
    return { ...existing, name, description, updated_at: updatedAt, updated_by: actor }
  },

  // A type with recorded expenses can't be deleted (they would lose their classification)
  delete: (id: number): void => {
    if (!db.prepare('SELECT 1 FROM expense_types WHERE id = ?').get(id)) throw new ExpenseError('NOT_FOUND')
    if (db.prepare('SELECT 1 FROM expenses WHERE expense_type_id = ? LIMIT 1').get(id)) throw new ExpenseError('TYPE_IN_USE')
    db.prepare('DELETE FROM expense_types WHERE id = ?').run(id)
  }
}

// Validates and normalizes expense fields; `existing` supplies values not sent when editing
function normalizeExpense(input: ExpenseInput, existing?: Expense) {
  const typeId = Number(input.expense_type_id ?? existing?.expense_type_id)
  if (!typeId) throw new ExpenseError('TYPE_REQUIRED')
  if (!db.prepare('SELECT 1 FROM expense_types WHERE id = ?').get(typeId)) throw new ExpenseError('TYPE_REQUIRED')

  const amount = Number(input.amount ?? existing?.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new ExpenseError('AMOUNT_INVALID')

  // Expense date as a local day 'YYYY-MM-DD'
  const date = String(input.expense_date ?? existing?.expense_date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) throw new ExpenseError('DATE_INVALID')

  return {
    expense_type_id: typeId,
    amount: Math.round(amount * 100) / 100,
    expense_date: date,
    payment_method: input.payment_method ?? existing?.payment_method ?? 'cash',
    description: (input.description ?? existing?.description ?? '').trim()
  }
}

export const expenseQueries = {
  getAll: (): Expense[] => {
    return db.prepare(`
      SELECT e.*, t.name AS expense_type_name
      FROM expenses e
      LEFT JOIN expense_types t ON t.id = e.expense_type_id
      ORDER BY e.expense_date DESC, e.id DESC
    `).all() as Expense[]
  },

  getById: (id: number): Expense | undefined => {
    return db.prepare(`
      SELECT e.*, t.name AS expense_type_name
      FROM expenses e
      LEFT JOIN expense_types t ON t.id = e.expense_type_id
      WHERE e.id = ?
    `).get(id) as Expense | undefined
  },

  create: (input: ExpenseInput, actor: Actor = null): Expense => {
    const now = new Date().toISOString()
    const info = db.prepare(`
      INSERT INTO expenses(expense_type_id, amount, expense_date, payment_method, description, created_at, created_by, updated_at, updated_by)
      VALUES(@expense_type_id, @amount, @expense_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
    `).run({ ...normalizeExpense(input), created_at: now, created_by: actor, updated_at: now, updated_by: actor })
    return expenseQueries.getById(Number(info.lastInsertRowid))!
  },

  update: (id: number, input: ExpenseInput, actor: Actor = null): Expense => {
    const existing = expenseQueries.getById(id)
    if (!existing) throw new ExpenseError('NOT_FOUND')

    db.prepare(`
      UPDATE expenses SET expense_type_id = @expense_type_id, amount = @amount, expense_date = @expense_date,
        payment_method = @payment_method, description = @description, updated_at = @updated_at, updated_by = @updated_by
      WHERE id = @id
    `).run({ ...normalizeExpense(input, existing), id, updated_at: new Date().toISOString(), updated_by: actor })
    return expenseQueries.getById(id)!
  },

  delete: (id: number): void => {
    const info = db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    if (info.changes === 0) throw new ExpenseError('NOT_FOUND')
  }
}

// ==========================================
// Savings accounts and transactions
// ==========================================

// Savings errors; the UI translates the code
export class SavingsError extends Error {
  constructor(public code: 'NAME_REQUIRED' | 'NAME_TAKEN' | 'CATEGORY_INVALID' | 'ACCOUNT_REQUIRED' | 'ACCOUNT_IN_USE' | 'TYPE_INVALID' | 'AMOUNT_INVALID' | 'DATE_INVALID' | 'INSUFFICIENT_BALANCE' | 'NOT_FOUND') {
    super(code)
  }
}

export interface SavingsAccountInput {
  name?: string
  category?: string
  description?: string
}

export interface SavingsTransactionInput {
  account_id?: number
  type?: string
  amount?: number
  transaction_date?: string
  payment_method?: string
  description?: string
}

const SAVINGS_ACCOUNT_SELECT = `
  SELECT a.*,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END), 0) AS balance,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount END), 0) AS total_withdrawals,
    COUNT(t.id) AS transactions_count,
    MAX(t.transaction_date) AS last_transaction_date
  FROM savings_accounts a
  LEFT JOIN savings_transactions t ON t.account_id = a.id
`

// Sums of REAL amounts carry float noise (e.g. -7e-15): round to cents, and `+ 0` turns -0 into 0
const roundMoney = (value: number) => Math.round(value * 100) / 100 + 0

function withRoundedTotals(account: SavingsAccount): SavingsAccount {
  return {
    ...account,
    balance: roundMoney(account.balance ?? 0),
    total_deposits: roundMoney(account.total_deposits ?? 0),
    total_withdrawals: roundMoney(account.total_withdrawals ?? 0)
  }
}

// Quantities can be decimal (kg, litres...): kept to 3 decimals so sums don't drift (0.1 + 0.2)
const roundQuantity = (value: number) => Math.round(value * 1000) / 1000 + 0
const isQuantity = (value: number, allowZero = false) => Number.isFinite(value) && (allowZero ? value >= 0 : value > 0)

// Validates and normalizes account fields; `existing` supplies values not sent when editing
function normalizeSavingsAccount(input: SavingsAccountInput, id?: number, existing?: SavingsAccount) {
  const name = String(input.name ?? existing?.name ?? '').trim()
  if (!name) throw new SavingsError('NAME_REQUIRED')
  const category = String(input.category ?? existing?.category ?? '')
  if (!(SAVINGS_CATEGORIES as readonly string[]).includes(category)) throw new SavingsError('CATEGORY_INVALID')
  // Names are unique within a category (the same person can have a personal and an employee account)
  if (db.prepare('SELECT 1 FROM savings_accounts WHERE name = ? AND category = ? AND id != ?').get(name, category, id ?? 0)) {
    throw new SavingsError('NAME_TAKEN')
  }
  return { name, category, description: String(input.description ?? existing?.description ?? '').trim() }
}

export const savingsAccountQueries = {
  // Includes the balance and totals of each account
  getAll: (): SavingsAccount[] => {
    return (db.prepare(`${SAVINGS_ACCOUNT_SELECT} GROUP BY a.id ORDER BY a.name ASC`).all() as SavingsAccount[]).map(withRoundedTotals)
  },

  getById: (id: number): SavingsAccount | undefined => {
    const account = db.prepare(`${SAVINGS_ACCOUNT_SELECT} WHERE a.id = ? GROUP BY a.id`).get(id) as SavingsAccount | undefined
    return account && withRoundedTotals(account)
  },

  create: (input: SavingsAccountInput, actor: Actor = null): SavingsAccount => {
    const now = new Date().toISOString()
    const info = db.prepare(`
      INSERT INTO savings_accounts(name, category, description, created_at, created_by, updated_at, updated_by)
      VALUES(@name, @category, @description, @created_at, @created_by, @updated_at, @updated_by)
    `).run({ ...normalizeSavingsAccount(input), created_at: now, created_by: actor, updated_at: now, updated_by: actor })
    return savingsAccountQueries.getById(Number(info.lastInsertRowid))!
  },

  update: (id: number, input: SavingsAccountInput, actor: Actor = null): SavingsAccount => {
    const existing = savingsAccountQueries.getById(id)
    if (!existing) throw new SavingsError('NOT_FOUND')
    db.prepare(`
      UPDATE savings_accounts SET name = @name, category = @category, description = @description,
        updated_at = @updated_at, updated_by = @updated_by
      WHERE id = @id
    `).run({ ...normalizeSavingsAccount(input, id, existing), id, updated_at: new Date().toISOString(), updated_by: actor })
    return savingsAccountQueries.getById(id)!
  },

  // An account with transactions can't be deleted (its history would be lost)
  delete: (id: number): void => {
    if (!db.prepare('SELECT 1 FROM savings_accounts WHERE id = ?').get(id)) throw new SavingsError('NOT_FOUND')
    if (db.prepare('SELECT 1 FROM savings_transactions WHERE account_id = ? LIMIT 1').get(id)) throw new SavingsError('ACCOUNT_IN_USE')
    db.prepare('DELETE FROM savings_accounts WHERE id = ?').run(id)
  }
}

// Validates and normalizes transaction fields; `existing` supplies values not sent when editing
function normalizeSavingsTransaction(input: SavingsTransactionInput, existing?: SavingsTransaction) {
  const accountId = Number(input.account_id ?? existing?.account_id)
  if (!accountId || !db.prepare('SELECT 1 FROM savings_accounts WHERE id = ?').get(accountId)) throw new SavingsError('ACCOUNT_REQUIRED')

  const type = String(input.type ?? existing?.type ?? '')
  if (type !== 'deposit' && type !== 'withdrawal') throw new SavingsError('TYPE_INVALID')

  const amount = Math.round(Number(input.amount ?? existing?.amount) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) throw new SavingsError('AMOUNT_INVALID')

  // Transaction date as a local day 'YYYY-MM-DD'
  const date = String(input.transaction_date ?? existing?.transaction_date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) throw new SavingsError('DATE_INVALID')

  return {
    account_id: accountId,
    type,
    amount,
    transaction_date: date,
    payment_method: String(input.payment_method ?? existing?.payment_method ?? 'cash'),
    description: String(input.description ?? existing?.description ?? '').trim()
  }
}

// Withdrawals can't take an account below zero; call it inside the transaction that made the change so it rolls back
function assertSavingsBalance(accountIds: number[]) {
  for (const id of new Set(accountIds)) {
    const { balance } = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
      FROM savings_transactions WHERE account_id = ?
    `).get(id) as { balance: number }
    // Rounded to cents so float noise doesn't count as overdrawn
    if (roundMoney(balance) < 0) throw new SavingsError('INSUFFICIENT_BALANCE')
  }
}

const SAVINGS_TRANSACTION_SELECT = `
  SELECT t.*, a.name AS account_name, a.category AS account_category
  FROM savings_transactions t
  LEFT JOIN savings_accounts a ON a.id = t.account_id
`

export const savingsTransactionQueries = {
  // Newest first, with the account name and category
  getAll: (): SavingsTransaction[] => {
    return db.prepare(`${SAVINGS_TRANSACTION_SELECT} ORDER BY t.transaction_date DESC, t.id DESC`).all() as SavingsTransaction[]
  },

  getById: (id: number): SavingsTransaction | undefined => {
    return db.prepare(`${SAVINGS_TRANSACTION_SELECT} WHERE t.id = ?`).get(id) as SavingsTransaction | undefined
  },

  create: (input: SavingsTransactionInput, actor: Actor = null): SavingsTransaction => {
    const values = normalizeSavingsTransaction(input)
    const now = new Date().toISOString()
    const id = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO savings_transactions(account_id, type, amount, transaction_date, payment_method, description, created_at, created_by, updated_at, updated_by)
        VALUES(@account_id, @type, @amount, @transaction_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
      `).run({ ...values, created_at: now, created_by: actor, updated_at: now, updated_by: actor })
      assertSavingsBalance([values.account_id])
      return Number(info.lastInsertRowid)
    })()
    return savingsTransactionQueries.getById(id)!
  },

  update: (id: number, input: SavingsTransactionInput, actor: Actor = null): SavingsTransaction => {
    const existing = savingsTransactionQueries.getById(id)
    if (!existing) throw new SavingsError('NOT_FOUND')
    const values = normalizeSavingsTransaction(input, existing)
    db.transaction(() => {
      db.prepare(`
        UPDATE savings_transactions SET account_id = @account_id, type = @type, amount = @amount, transaction_date = @transaction_date,
          payment_method = @payment_method, description = @description, updated_at = @updated_at, updated_by = @updated_by
        WHERE id = @id
      `).run({ ...values, id, updated_at: new Date().toISOString(), updated_by: actor })
      // Moving or shrinking a deposit can overdraw the account it came from
      assertSavingsBalance([existing.account_id, values.account_id])
    })()
    return savingsTransactionQueries.getById(id)!
  },

  delete: (id: number): void => {
    const existing = savingsTransactionQueries.getById(id)
    if (!existing) throw new SavingsError('NOT_FOUND')
    db.transaction(() => {
      db.prepare('DELETE FROM savings_transactions WHERE id = ?').run(id)
      // Deleting a deposit that later withdrawals relied on would overdraw the account
      assertSavingsBalance([existing.account_id])
    })()
  }
}

// ==========================================
// Capital, other income and owner withdrawals
// ==========================================
//
// Capital (initial or additional) is what the owner puts into the business. It never counts as profit.
// It can arrive as money, as goods (the owner's own, or a supplier's on credit, owed on the supplier
// account), as borrowed money that is repaid over time, or as a promise paid in over time.
// Other income is money earned outside sales and adds to profit; withdrawals are money the owner takes out.

// Capital errors; the UI translates the code
export class CapitalError extends Error {
  constructor(public code: 'TYPE_INVALID' | 'FORM_INVALID' | 'AMOUNT_INVALID' | 'DATE_INVALID' | 'SUPPLIER_REQUIRED' | 'ITEMS_REQUIRED' | 'PRODUCT_REQUIRED' | 'QUANTITY_INVALID' | 'COST_INVALID' | 'NOT_EDITABLE' | 'NOT_SETTLEABLE' | 'AMOUNT_TOO_HIGH' | 'BELOW_SETTLED' | 'HAS_SETTLEMENTS' | 'HAS_PAYMENTS' | 'STOCK_USED' | 'NOT_FOUND') {
    super(code)
  }
}

export interface CapitalEntryInput {
  type?: string
  form?: string
  source?: string
  amount?: number
  entry_date?: string
  payment_method?: string
  description?: string
  supplier_id?: number | null
  // Goods forms: what was given, at what cost
  items?: { product_id?: number; quantity?: number; unit_cost?: number }[]
  // Goods forms: store the given unit cost as the product's cost
  update_costs?: boolean
}

export interface CapitalSettlementInput {
  amount?: number
  settlement_date?: string
  payment_method?: string
  notes?: string
}

const CAPITAL_TYPES = ['initial_capital', 'capital']
const GOODS_FORMS = ['goods', 'supplier_credit']
const SETTLED_FORMS = ['loan', 'pledge']

function requireCapitalDay(value: unknown): string {
  const day = String(value ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || isNaN(Date.parse(day))) throw new CapitalError('DATE_INVALID')
  return day
}

function requireCapitalAmount(value: unknown): number {
  const amount = roundMoney(Number(value))
  if (!Number.isFinite(amount) || amount <= 0) throw new CapitalError('AMOUNT_INVALID')
  return amount
}

// Validates goods and snapshots each product's code and name
function normalizeCapitalItems(items: CapitalEntryInput['items']) {
  if (!Array.isArray(items) || items.length === 0) throw new CapitalError('ITEMS_REQUIRED')
  const getProduct = db.prepare('SELECT id, code, name FROM products WHERE id = ?')
  return items.map(item => {
    const product = getProduct.get(Number(item.product_id)) as { id: number; code: string; name: string } | undefined
    if (!product) throw new CapitalError('PRODUCT_REQUIRED')
    const quantity = roundQuantity(Number(item.quantity))
    if (!isQuantity(quantity)) throw new CapitalError('QUANTITY_INVALID')
    const unitCost = roundMoney(Number(item.unit_cost))
    if (!Number.isFinite(unitCost) || unitCost < 0) throw new CapitalError('COST_INVALID')
    return { product_id: product.id, product_code: product.code, product_name: product.name, quantity, unit_cost: unitCost }
  })
}

export const capitalQueries = {
  // Newest first, each with its goods, settlements and the amount settled so far
  getAll: (): CapitalEntry[] => {
    const entries = db.prepare(`
      SELECT c.*, s.name AS supplier_name FROM capital_entries c
      LEFT JOIN suppliers s ON s.id = c.supplier_id
      ORDER BY c.entry_date DESC, c.id DESC
    `).all() as CapitalEntry[]
    const items = db.prepare('SELECT * FROM capital_items ORDER BY id ASC').all() as CapitalItem[]
    const settlements = db.prepare('SELECT * FROM capital_settlements ORDER BY settlement_date ASC, id ASC').all() as CapitalSettlement[]
    return entries.map(entry => {
      const own = settlements.filter(st => st.entry_id === entry.id)
      return {
        ...entry,
        items: items.filter(i => i.entry_id === entry.id),
        settlements: own,
        settled: roundMoney(own.reduce((sum, st) => sum + st.amount, 0))
      }
    })
  },

  getById: (id: number): CapitalEntry | undefined => {
    return capitalQueries.getAll().find(entry => entry.id === id)
  },

  create: (input: CapitalEntryInput, actor: Actor = null): CapitalEntry => {
    const type = String(input.type ?? '')
    if (!(CAPITAL_ENTRY_TYPES as readonly string[]).includes(type)) throw new CapitalError('TYPE_INVALID')
    // Only capital comes in other forms; income and withdrawals are money
    const form = CAPITAL_TYPES.includes(type) ? String(input.form ?? 'money') : 'money'
    if (!(CAPITAL_FORMS as readonly string[]).includes(form)) throw new CapitalError('FORM_INVALID')
    const date = requireCapitalDay(input.entry_date)

    const isGoods = GOODS_FORMS.includes(form)
    const items = isGoods ? normalizeCapitalItems(input.items) : []
    const amount = isGoods
      ? requireCapitalAmount(items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0))
      : requireCapitalAmount(input.amount)

    let supplierId: number | null = null
    if (form === 'supplier_credit') {
      supplierId = Number(input.supplier_id)
      if (!supplierId || !db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(supplierId)) throw new CapitalError('SUPPLIER_REQUIRED')
    }

    const now = new Date().toISOString()
    const values = {
      type, form, amount, entry_date: date, supplier_id: supplierId,
      source: String(input.source ?? '').trim(),
      // Goods and promises bring no money in on the day
      payment_method: isGoods || form === 'pledge' ? '' : String(input.payment_method || 'cash'),
      description: String(input.description ?? '').trim()
    }

    const id = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO capital_entries(type, form, source, supplier_id, amount, entry_date, payment_method, description, created_at, created_by, updated_at, updated_by)
        VALUES(@type, @form, @source, @supplier_id, @amount, @entry_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
      `).run({ ...values, created_at: now, created_by: actor, updated_at: now, updated_by: actor })
      const entryId = Number(info.lastInsertRowid)
      if (!isGoods) return entryId

      const insertItem = db.prepare(`
        INSERT INTO capital_items(entry_id, product_id, product_code, product_name, quantity, unit_cost)
        VALUES(@entry_id, @product_id, @product_code, @product_name, @quantity, @unit_cost)
      `)
      const addStock = db.prepare('UPDATE products SET stock = ROUND(stock + @qty, 3), updated_at = @now, updated_by = @actor WHERE id = @id')
      const updateCost = db.prepare('UPDATE products SET cost = @cost WHERE id = @id')
      for (const item of items) {
        insertItem.run({ ...item, entry_id: entryId })
        addStock.run({ id: item.product_id, qty: item.quantity, now, actor })
        if (input.update_costs) updateCost.run({ id: item.product_id, cost: item.unit_cost })
      }

      // Goods on credit: a received order on the supplier account holds the debt, paid off from Purchases
      if (form === 'supplier_credit') {
        const order = db.prepare(`
          INSERT INTO purchase_orders(supplier_id, order_date, received_date, status, total, notes, created_at, created_by, updated_at, updated_by)
          VALUES(@supplier_id, @date, @date, 'received', @total, @notes, @now, @actor, @now, @actor)
        `).run({ supplier_id: supplierId, date, total: amount, notes: `Capital #${entryId}`, now, actor })
        const purchaseId = Number(order.lastInsertRowid)
        const insertPurchaseItem = db.prepare(`
          INSERT INTO purchase_items(purchase_id, product_id, product_code, product_name, ordered_quantity, received_quantity, unit_cost)
          VALUES(@purchase_id, @product_id, @product_code, @product_name, @quantity, @quantity, @unit_cost)
        `)
        for (const item of items) insertPurchaseItem.run({ ...item, purchase_id: purchaseId })
        db.prepare('UPDATE capital_entries SET purchase_id = ? WHERE id = ?').run(purchaseId, entryId)
      }
      return entryId
    })()
    return capitalQueries.getById(id)!
  },

  // Type, form and goods can't change once recorded (stock and supplier accounts already moved)
  update: (id: number, input: CapitalEntryInput, actor: Actor = null): CapitalEntry => {
    const existing = capitalQueries.getById(id)
    if (!existing) throw new CapitalError('NOT_FOUND')
    if ((input.type && input.type !== existing.type) || (input.form && input.form !== existing.form)) throw new CapitalError('NOT_EDITABLE')

    const date = requireCapitalDay(input.entry_date ?? existing.entry_date)
    const isGoods = GOODS_FORMS.includes(existing.form)
    const amount = isGoods ? existing.amount : requireCapitalAmount(input.amount ?? existing.amount)
    if (SETTLED_FORMS.includes(existing.form) && amount < (existing.settled ?? 0)) throw new CapitalError('BELOW_SETTLED')
    const now = new Date().toISOString()

    db.transaction(() => {
      db.prepare(`
        UPDATE capital_entries SET source = @source, amount = @amount, entry_date = @entry_date, payment_method = @payment_method,
          description = @description, updated_at = @updated_at, updated_by = @updated_by
        WHERE id = @id
      `).run({
        id, amount, entry_date: date,
        source: String(input.source ?? existing.source ?? '').trim(),
        payment_method: isGoods || existing.form === 'pledge' ? '' : String(input.payment_method ?? existing.payment_method ?? 'cash'),
        description: String(input.description ?? existing.description ?? '').trim(),
        updated_at: now, updated_by: actor
      })
      if (existing.purchase_id) {
        db.prepare('UPDATE purchase_orders SET order_date = ?, received_date = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(date, date, now, actor, existing.purchase_id)
      }
    })()
    return capitalQueries.getById(id)!
  },

  // Goods are taken back out of stock; refused when they were already sold or the supplier was paid
  delete: (id: number): void => {
    const existing = capitalQueries.getById(id)
    if (!existing) throw new CapitalError('NOT_FOUND')
    if (existing.settlements?.length) throw new CapitalError('HAS_SETTLEMENTS')
    if (existing.purchase_id && db.prepare('SELECT 1 FROM supplier_payments WHERE purchase_id = ? LIMIT 1').get(existing.purchase_id)) {
      throw new CapitalError('HAS_PAYMENTS')
    }
    const getStock = db.prepare('SELECT stock FROM products WHERE id = ?')
    for (const item of existing.items ?? []) {
      const product = getStock.get(item.product_id) as { stock: number } | undefined
      if (product && product.stock < item.quantity) throw new CapitalError('STOCK_USED')
    }

    db.transaction(() => {
      const removeStock = db.prepare('UPDATE products SET stock = ROUND(stock - @qty, 3) WHERE id = @id')
      for (const item of existing.items ?? []) removeStock.run({ id: item.product_id, qty: item.quantity })
      if (existing.purchase_id) {
        db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(existing.purchase_id)
        db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(existing.purchase_id)
      }
      db.prepare('DELETE FROM capital_entries WHERE id = ?').run(id)
    })()
  },

  // Loan repayment or payment in towards promised capital, up to what's still outstanding
  settle: (entryId: number, input: CapitalSettlementInput, actor: Actor = null): CapitalEntry => {
    const entry = capitalQueries.getById(entryId)
    if (!entry) throw new CapitalError('NOT_FOUND')
    if (!SETTLED_FORMS.includes(entry.form)) throw new CapitalError('NOT_SETTLEABLE')
    const amount = requireCapitalAmount(input.amount)
    if (amount > roundMoney(entry.amount - (entry.settled ?? 0))) throw new CapitalError('AMOUNT_TOO_HIGH')
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO capital_settlements(entry_id, amount, settlement_date, payment_method, notes, created_at, created_by, updated_at, updated_by)
      VALUES(@entry_id, @amount, @settlement_date, @payment_method, @notes, @now, @actor, @now, @actor)
    `).run({
      entry_id: entryId, amount, settlement_date: requireCapitalDay(input.settlement_date),
      payment_method: String(input.payment_method || 'cash'), notes: String(input.notes ?? '').trim(), now, actor
    })
    return capitalQueries.getById(entryId)!
  },

  deleteSettlement: (id: number): void => {
    const info = db.prepare('DELETE FROM capital_settlements WHERE id = ?').run(id)
    if (info.changes === 0) throw new CapitalError('NOT_FOUND')
  }
}

// ==========================================
// Purchases: orders to suppliers, advance payments and goods receiving
// ==========================================
//
// Each supplier has a running account: payments add to it, refunds and received goods take from it.
// A payment can be linked to an order; while that order hasn't arrived the money is reserved for it
// ("open advance"), so it isn't used up by other goods. When goods arrive their value is charged to
// the account; any remaining credit stays as an advance for the supplier's next goods.

// Purchase errors; the UI translates the code
export class PurchaseError extends Error {
  constructor(public code: 'SUPPLIER_REQUIRED' | 'ITEMS_REQUIRED' | 'PRODUCT_REQUIRED' | 'QUANTITY_INVALID' | 'COST_INVALID' | 'DATE_INVALID' | 'AMOUNT_INVALID' | 'TYPE_INVALID' | 'NOT_EDITABLE' | 'HAS_PAYMENTS' | 'ORDER_INVALID' | 'REFUND_TOO_HIGH' | 'CLIENT_REQUIRED' | 'STOCK_USED' | 'NOT_FOUND') {
    super(code)
  }
}

export interface PurchaseItemInput {
  product_id?: number
  quantity?: number
  unit_cost?: number
}

export interface PaymentDetailsInput {
  amount?: number
  payment_date?: string
  payment_method?: string
  notes?: string
}

export interface PurchaseInput {
  supplier_id?: number
  order_date?: string
  notes?: string
  items?: PurchaseItemInput[]
  // Paid to the supplier when placing the order
  advance?: PaymentDetailsInput | null
}

export interface ReceivePurchaseInput {
  received_date?: string
  // Actual quantity and cost per order item; items left out arrive as ordered
  items?: { id?: number; received_quantity?: number; unit_cost?: number }[]
  // Store the received unit cost as the product's cost
  update_costs?: boolean
  // Settled while receiving: pay what's due, or take back an overpayment
  settlement?: (PaymentDetailsInput & { type?: string }) | null
}

export interface SupplierPaymentInput extends PaymentDetailsInput {
  supplier_id?: number
  purchase_id?: number | null
  type?: string
}

const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))

function requireDay(value: unknown): string {
  const day = String(value ?? '')
  if (!isDay(day)) throw new PurchaseError('DATE_INVALID')
  return day
}

function requireAmount(value: unknown): number {
  const amount = roundMoney(Number(value))
  if (!Number.isFinite(amount) || amount <= 0) throw new PurchaseError('AMOUNT_INVALID')
  return amount
}

export const supplierAccountQueries = {
  get: (supplierId: number): SupplierAccount => {
    const row = db.prepare(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = @id AND type = 'payment'), 0) AS total_paid,
        COALESCE((SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = @id AND type = 'refund'), 0) AS total_refunded,
        COALESCE((SELECT SUM(total) FROM purchase_orders WHERE supplier_id = @id AND status = 'received'), 0) AS total_received,
        COALESCE((
          SELECT SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END)
          FROM supplier_payments p JOIN purchase_orders o ON o.id = p.purchase_id
          WHERE p.supplier_id = @id AND o.status = 'ordered'
        ), 0) AS open_advances
    `).get({ id: supplierId }) as Omit<SupplierAccount, 'supplier_id' | 'balance' | 'available'>
    const balance = roundMoney(row.total_paid - row.total_refunded - row.total_received)
    const openAdvances = roundMoney(row.open_advances)
    return {
      supplier_id: supplierId,
      total_paid: roundMoney(row.total_paid),
      total_refunded: roundMoney(row.total_refunded),
      total_received: roundMoney(row.total_received),
      balance,
      open_advances: openAdvances,
      available: roundMoney(balance - openAdvances)
    }
  },

  getAll: (): SupplierAccount[] => {
    const ids = db.prepare('SELECT id FROM suppliers').all() as { id: number }[]
    return ids.map(({ id }) => supplierAccountQueries.get(id))
  }
}

const PURCHASE_SELECT = `
  SELECT o.*, s.name AS supplier_name,
    (SELECT COUNT(*) FROM purchase_items i WHERE i.purchase_id = o.id) AS items_count,
    COALESCE((SELECT SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END) FROM supplier_payments p WHERE p.purchase_id = o.id), 0) AS paid
  FROM purchase_orders o
  LEFT JOIN suppliers s ON s.id = o.supplier_id
`

// Validates the order items and snapshots each product's code and name
function normalizePurchaseItems(items: PurchaseItemInput[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) throw new PurchaseError('ITEMS_REQUIRED')
  const getProduct = db.prepare('SELECT id, code, name FROM products WHERE id = ?')
  return items.map(item => {
    const product = getProduct.get(Number(item.product_id)) as { id: number; code: string; name: string } | undefined
    if (!product) throw new PurchaseError('PRODUCT_REQUIRED')
    const quantity = roundQuantity(Number(item.quantity))
    if (!isQuantity(quantity)) throw new PurchaseError('QUANTITY_INVALID')
    const unitCost = roundMoney(Number(item.unit_cost))
    if (!Number.isFinite(unitCost) || unitCost < 0) throw new PurchaseError('COST_INVALID')
    return { product_id: product.id, product_code: product.code, product_name: product.name, ordered_quantity: quantity, unit_cost: unitCost }
  })
}

function insertSupplierPayment(values: Omit<SupplierPayment, 'id'>, actor: Actor): number {
  const now = new Date().toISOString()
  const info = db.prepare(`
    INSERT INTO supplier_payments(supplier_id, purchase_id, type, amount, payment_date, payment_method, notes, created_at, created_by, updated_at, updated_by)
    VALUES(@supplier_id, @purchase_id, @type, @amount, @payment_date, @payment_method, @notes, @created_at, @created_by, @updated_at, @updated_by)
  `).run({ ...values, purchase_id: values.purchase_id ?? null, created_at: now, created_by: actor, updated_at: now, updated_by: actor })
  return Number(info.lastInsertRowid)
}

function paymentDetails(input: PaymentDetailsInput, fallbackDate: string) {
  return {
    amount: requireAmount(input.amount),
    payment_date: requireDay(input.payment_date || fallbackDate),
    payment_method: String(input.payment_method || 'cash'),
    notes: String(input.notes ?? '').trim()
  }
}

export const purchaseQueries = {
  // Newest first, with supplier name, item count and the amount paid for each order
  getAll: (): Purchase[] => {
    const rows = db.prepare(`${PURCHASE_SELECT} ORDER BY o.order_date DESC, o.id DESC`).all() as Purchase[]
    return rows.map(row => ({ ...row, paid: roundMoney(row.paid ?? 0) }))
  },

  getById: (id: number): Purchase | undefined => {
    const order = db.prepare(`${PURCHASE_SELECT} WHERE o.id = ?`).get(id) as Purchase | undefined
    if (!order) return undefined
    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id ASC').all(id) as PurchaseItem[]
    return { ...order, paid: roundMoney(order.paid ?? 0), items }
  },

  create: (input: PurchaseInput, actor: Actor = null): Purchase => {
    const supplierId = Number(input.supplier_id)
    if (!supplierId || !db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(supplierId)) throw new PurchaseError('SUPPLIER_REQUIRED')
    const orderDate = requireDay(input.order_date)
    const items = normalizePurchaseItems(input.items)
    const advance = input.advance ? paymentDetails(input.advance, orderDate) : null
    const total = roundMoney(items.reduce((sum, item) => sum + item.ordered_quantity * item.unit_cost, 0))
    const now = new Date().toISOString()

    const id = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO purchase_orders(supplier_id, order_date, status, total, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@supplier_id, @order_date, 'ordered', @total, @notes, @created_at, @created_by, @updated_at, @updated_by)
      `).run({ supplier_id: supplierId, order_date: orderDate, total, notes: String(input.notes ?? '').trim(), created_at: now, created_by: actor, updated_at: now, updated_by: actor })
      const purchaseId = Number(info.lastInsertRowid)
      const insertItem = db.prepare(`
        INSERT INTO purchase_items(purchase_id, product_id, product_code, product_name, ordered_quantity, unit_cost)
        VALUES(@purchase_id, @product_id, @product_code, @product_name, @ordered_quantity, @unit_cost)
      `)
      for (const item of items) insertItem.run({ ...item, purchase_id: purchaseId })
      if (advance) insertSupplierPayment({ ...advance, supplier_id: supplierId, purchase_id: purchaseId, type: 'payment' }, actor)
      return purchaseId
    })()
    return purchaseQueries.getById(id)!
  },

  // Only orders still waiting for the goods can be edited
  update: (id: number, input: PurchaseInput, actor: Actor = null): Purchase => {
    const existing = purchaseQueries.getById(id)
    if (!existing) throw new PurchaseError('NOT_FOUND')
    if (existing.status !== 'ordered') throw new PurchaseError('NOT_EDITABLE')
    const supplierId = Number(input.supplier_id ?? existing.supplier_id)
    if (!supplierId || !db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(supplierId)) throw new PurchaseError('SUPPLIER_REQUIRED')
    // Payments already made belong to the original supplier
    if (supplierId !== existing.supplier_id && db.prepare('SELECT 1 FROM supplier_payments WHERE purchase_id = ? LIMIT 1').get(id)) {
      throw new PurchaseError('HAS_PAYMENTS')
    }
    const orderDate = requireDay(input.order_date ?? existing.order_date)
    const items = normalizePurchaseItems(input.items ?? existing.items?.map(i => ({ product_id: i.product_id, quantity: i.ordered_quantity, unit_cost: i.unit_cost })))
    const total = roundMoney(items.reduce((sum, item) => sum + item.ordered_quantity * item.unit_cost, 0))

    db.transaction(() => {
      db.prepare(`
        UPDATE purchase_orders SET supplier_id = @supplier_id, order_date = @order_date, total = @total, notes = @notes,
          updated_at = @updated_at, updated_by = @updated_by
        WHERE id = @id
      `).run({ id, supplier_id: supplierId, order_date: orderDate, total, notes: String(input.notes ?? existing.notes ?? '').trim(), updated_at: new Date().toISOString(), updated_by: actor })
      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id)
      const insertItem = db.prepare(`
        INSERT INTO purchase_items(purchase_id, product_id, product_code, product_name, ordered_quantity, unit_cost)
        VALUES(@purchase_id, @product_id, @product_code, @product_name, @ordered_quantity, @unit_cost)
      `)
      for (const item of items) insertItem.run({ ...item, purchase_id: id })
    })()
    return purchaseQueries.getById(id)!
  },

  // Goods arrive: stock goes up, the goods' value is charged to the supplier account and the difference is settled
  receive: (id: number, input: ReceivePurchaseInput, actor: Actor = null): Purchase => {
    const order = purchaseQueries.getById(id)
    if (!order) throw new PurchaseError('NOT_FOUND')
    if (order.status !== 'ordered') throw new PurchaseError('NOT_EDITABLE')
    const receivedDate = requireDay(input.received_date)

    const changes = new Map((input.items ?? []).map(item => [Number(item.id), item]))
    const items = (order.items ?? []).map(item => {
      const change = changes.get(item.id!)
      const quantity = roundQuantity(Number(change?.received_quantity ?? item.ordered_quantity))
      if (!isQuantity(quantity, true)) throw new PurchaseError('QUANTITY_INVALID')
      const unitCost = roundMoney(Number(change?.unit_cost ?? item.unit_cost))
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new PurchaseError('COST_INVALID')
      return { ...item, received_quantity: quantity, unit_cost: unitCost }
    })
    if (!items.some(item => item.received_quantity > 0)) throw new PurchaseError('QUANTITY_INVALID')
    const total = roundMoney(items.reduce((sum, item) => sum + item.received_quantity * item.unit_cost, 0))

    // What's left after charging the goods: advance for this order plus any free credit with the supplier
    const account = supplierAccountQueries.get(order.supplier_id)
    const excess = roundMoney((order.paid ?? 0) + Math.max(account.available, 0) - total)

    let settlement: (ReturnType<typeof paymentDetails> & { type: 'payment' | 'refund' }) | null = null
    if (input.settlement) {
      const type = input.settlement.type
      if (type !== 'payment' && type !== 'refund') throw new PurchaseError('TYPE_INVALID')
      settlement = { ...paymentDetails(input.settlement, receivedDate), type }
      if (type === 'refund' && settlement.amount > Math.max(excess, 0)) throw new PurchaseError('REFUND_TOO_HIGH')
    }

    db.transaction(() => {
      const updateItem = db.prepare('UPDATE purchase_items SET received_quantity = @received_quantity, unit_cost = @unit_cost WHERE id = @id')
      const addStock = db.prepare('UPDATE products SET stock = ROUND(stock + @qty, 3), updated_at = @now, updated_by = @actor WHERE id = @id')
      const updateCost = db.prepare('UPDATE products SET cost = @cost WHERE id = @id')
      const now = new Date().toISOString()
      for (const item of items) {
        updateItem.run({ id: item.id, received_quantity: item.received_quantity, unit_cost: item.unit_cost })
        if (item.received_quantity > 0) {
          addStock.run({ id: item.product_id, qty: item.received_quantity, now, actor })
          if (input.update_costs) updateCost.run({ id: item.product_id, cost: item.unit_cost })
        }
      }
      db.prepare(`
        UPDATE purchase_orders SET status = 'received', received_date = @received_date, total = @total, updated_at = @updated_at, updated_by = @updated_by
        WHERE id = @id
      `).run({ id, received_date: receivedDate, total, updated_at: now, updated_by: actor })
      if (settlement) insertSupplierPayment({ ...settlement, supplier_id: order.supplier_id, purchase_id: id }, actor)
    })()
    return purchaseQueries.getById(id)!
  },

  // A cancelled order's advance stays in the supplier account (refund it or keep it for other goods)
  cancel: (id: number, actor: Actor = null): Purchase => {
    const order = purchaseQueries.getById(id)
    if (!order) throw new PurchaseError('NOT_FOUND')
    if (order.status !== 'ordered') throw new PurchaseError('NOT_EDITABLE')
    db.prepare("UPDATE purchase_orders SET status = 'cancelled', updated_at = ?, updated_by = ? WHERE id = ?").run(new Date().toISOString(), actor, id)
    return purchaseQueries.getById(id)!
  },

  // Received orders already changed stock and the supplier account, so they stay
  delete: (id: number): void => {
    const order = purchaseQueries.getById(id)
    if (!order) throw new PurchaseError('NOT_FOUND')
    if (order.status === 'received') throw new PurchaseError('NOT_EDITABLE')
    if (db.prepare('SELECT 1 FROM supplier_payments WHERE purchase_id = ? LIMIT 1').get(id)) throw new PurchaseError('HAS_PAYMENTS')
    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id)
  }
}

// ==========================================
// Goods Received Notes: goods bought from clients
// ==========================================

export interface GoodsReceiptInput {
  // A registered client, or a walk-in seller's name
  client_id?: number | null
  client_name?: string
  receipt_date?: string
  payment_method?: string
  notes?: string
  items?: PurchaseItemInput[]
  // Store the price paid as the product's cost
  update_costs?: boolean
}

export const goodsReceiptQueries = {
  // Newest first, each with its items
  getAll: (): GoodsReceipt[] => {
    const receipts = db.prepare('SELECT * FROM goods_receipts ORDER BY receipt_date DESC, id DESC').all() as GoodsReceipt[]
    const items = db.prepare('SELECT * FROM goods_receipt_items ORDER BY id ASC').all() as GoodsReceiptItem[]
    return receipts.map(receipt => ({ ...receipt, items: items.filter(i => i.receipt_id === receipt.id) }))
  },

  getById: (id: number): GoodsReceipt | undefined => {
    const receipt = db.prepare('SELECT * FROM goods_receipts WHERE id = ?').get(id) as GoodsReceipt | undefined
    if (!receipt) return undefined
    return { ...receipt, items: db.prepare('SELECT * FROM goods_receipt_items WHERE receipt_id = ? ORDER BY id ASC').all(id) as GoodsReceiptItem[] }
  },

  // Goods arrive now: stock goes up and the client is paid
  create: (input: GoodsReceiptInput, actor: Actor = null): GoodsReceipt => {
    let clientId: number | null = null
    let clientName = String(input.client_name ?? '').trim()
    if (input.client_id) {
      const client = db.prepare('SELECT id, name FROM clients WHERE id = ?').get(Number(input.client_id)) as { id: number; name: string } | undefined
      if (!client) throw new PurchaseError('CLIENT_REQUIRED')
      clientId = client.id
      clientName = client.name
    }
    if (!clientName) throw new PurchaseError('CLIENT_REQUIRED')

    const receiptDate = requireDay(input.receipt_date)
    const items = normalizePurchaseItems(input.items).map(item => ({
      product_id: item.product_id, product_code: item.product_code, product_name: item.product_name,
      quantity: item.ordered_quantity, unit_cost: item.unit_cost,
      subtotal: roundMoney(item.ordered_quantity * item.unit_cost)
    }))
    const total = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0))
    if (total <= 0) throw new PurchaseError('AMOUNT_INVALID')
    const now = new Date().toISOString()

    const id = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO goods_receipts(client_id, client_name, receipt_date, total, payment_method, status, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@client_id, @client_name, @receipt_date, @total, @payment_method, 'completed', @notes, @now, @actor, @now, @actor)
      `).run({
        client_id: clientId, client_name: clientName, receipt_date: receiptDate, total,
        payment_method: String(input.payment_method || 'cash'), notes: String(input.notes ?? '').trim(), now, actor
      })
      const receiptId = Number(info.lastInsertRowid)
      const insertItem = db.prepare(`
        INSERT INTO goods_receipt_items(receipt_id, product_id, product_code, product_name, quantity, unit_cost, subtotal)
        VALUES(@receipt_id, @product_id, @product_code, @product_name, @quantity, @unit_cost, @subtotal)
      `)
      const addStock = db.prepare('UPDATE products SET stock = ROUND(stock + @qty, 3), updated_at = @now, updated_by = @actor WHERE id = @id')
      const updateCost = db.prepare('UPDATE products SET cost = @cost WHERE id = @id')
      for (const item of items) {
        insertItem.run({ ...item, receipt_id: receiptId })
        addStock.run({ id: item.product_id, qty: item.quantity, now, actor })
        if (input.update_costs) updateCost.run({ id: item.product_id, cost: item.unit_cost })
      }
      return receiptId
    })()
    return goodsReceiptQueries.getById(id)!
  },

  // Like a bill, a GRN is cancelled rather than deleted; its goods leave stock again (refused once sold)
  cancel: (id: number, actor: Actor = null): GoodsReceipt => {
    const receipt = goodsReceiptQueries.getById(id)
    if (!receipt) throw new PurchaseError('NOT_FOUND')
    if (receipt.status !== 'completed') throw new PurchaseError('NOT_EDITABLE')
    const getStock = db.prepare('SELECT stock FROM products WHERE id = ?')
    for (const item of receipt.items ?? []) {
      const product = getStock.get(item.product_id) as { stock: number } | undefined
      if (product && product.stock < item.quantity) throw new PurchaseError('STOCK_USED')
    }
    const now = new Date().toISOString()
    db.transaction(() => {
      const removeStock = db.prepare('UPDATE products SET stock = ROUND(stock - @qty, 3), updated_at = @now, updated_by = @actor WHERE id = @id')
      for (const item of receipt.items ?? []) removeStock.run({ id: item.product_id, qty: item.quantity, now, actor })
      db.prepare("UPDATE goods_receipts SET status = 'cancelled', updated_at = ?, updated_by = ? WHERE id = ?").run(now, actor, id)
    })()
    return goodsReceiptQueries.getById(id)!
  }
}

const SUPPLIER_PAYMENT_SELECT = `
  SELECT p.*, s.name AS supplier_name
  FROM supplier_payments p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
`

export const supplierPaymentQueries = {
  // Newest first, with the supplier name
  getAll: (): SupplierPayment[] => {
    return db.prepare(`${SUPPLIER_PAYMENT_SELECT} ORDER BY p.payment_date DESC, p.id DESC`).all() as SupplierPayment[]
  },

  getById: (id: number): SupplierPayment | undefined => {
    return db.prepare(`${SUPPLIER_PAYMENT_SELECT} WHERE p.id = ?`).get(id) as SupplierPayment | undefined
  },

  create: (input: SupplierPaymentInput, actor: Actor = null): SupplierPayment => {
    const supplierId = Number(input.supplier_id)
    if (!supplierId || !db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(supplierId)) throw new PurchaseError('SUPPLIER_REQUIRED')
    const type = input.type
    if (type !== 'payment' && type !== 'refund') throw new PurchaseError('TYPE_INVALID')
    const details = paymentDetails(input, '')

    // Optional order: must be this supplier's and not cancelled
    let purchaseId: number | null = null
    if (input.purchase_id) {
      const order = db.prepare('SELECT supplier_id, status FROM purchase_orders WHERE id = ?').get(Number(input.purchase_id)) as { supplier_id: number; status: string } | undefined
      if (!order || order.supplier_id !== supplierId || order.status === 'cancelled') throw new PurchaseError('ORDER_INVALID')
      purchaseId = Number(input.purchase_id)
    }

    // The supplier can only give back money they're holding for us
    if (type === 'refund' && details.amount > Math.max(supplierAccountQueries.get(supplierId).balance, 0)) {
      throw new PurchaseError('REFUND_TOO_HIGH')
    }

    const id = insertSupplierPayment({ ...details, supplier_id: supplierId, purchase_id: purchaseId, type }, actor)
    return supplierPaymentQueries.getById(id)!
  },

  delete: (id: number): void => {
    const info = db.prepare('DELETE FROM supplier_payments WHERE id = ?').run(id)
    if (info.changes === 0) throw new PurchaseError('NOT_FOUND')
  }
}

// ==========================================
// Inventory logs (stock card / traceability)
// ==========================================

// Inventory logs REMOVED

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function restoreDatabase(data: any) {
  const restoreTx = db.transaction(() => {
    console.log('Restoring database...')

    // Backups made before expenses, savings or capital existed don't include them: keep the current ones in that case
    const hasExpenses = Array.isArray(data.expenseTypes)
    const hasSavings = Array.isArray(data.savingsAccounts)
    const hasCapital = Array.isArray(data.capitalEntries)
    const keptTables = [
      ...(hasExpenses ? [] : ['expenses', 'expense_types']),
      ...(hasSavings ? [] : ['savings_transactions', 'savings_accounts']),
      ...(hasCapital ? [] : ['capital_entries', 'capital_items', 'capital_settlements'])
    ]

    // 1. Clear everything (purchases and GRNs reference suppliers, clients and products, which are always replaced)
    db.prepare('DELETE FROM goods_receipt_items').run()
    db.prepare('DELETE FROM goods_receipts').run()
    db.prepare('DELETE FROM supplier_payments').run()
    db.prepare('DELETE FROM purchase_items').run()
    db.prepare('DELETE FROM purchase_orders').run()
    if (hasExpenses) {
      db.prepare('DELETE FROM expenses').run()
      db.prepare('DELETE FROM expense_types').run()
    }
    if (hasSavings) {
      db.prepare('DELETE FROM savings_transactions').run()
      db.prepare('DELETE FROM savings_accounts').run()
    }
    if (hasCapital) {
      db.prepare('DELETE FROM capital_settlements').run()
      db.prepare('DELETE FROM capital_items').run()
      db.prepare('DELETE FROM capital_entries').run()
    }
    db.prepare('DELETE FROM sale_items').run()
    db.prepare('DELETE FROM sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM suppliers').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare(`DELETE FROM sqlite_sequence${keptTables.length ? ` WHERE name NOT IN (${keptTables.map(name => `'${name}'`).join(', ')})` : ''}`).run()

    // Original audit fields from the backup (older backups don't include them)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditOf = (r: any) => ({ created_by: r.created_by ?? null, updated_by: r.updated_by ?? null })

    // Prepared Statements
    const insertSupplier = db.prepare(`
        INSERT INTO suppliers(id, name, contact, phone, email, address, nic_attachment, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @name, @contact, @phone, @email, @address, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
    `)

    const insertCategory = db.prepare(`
        INSERT INTO categories(id, name, description, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @name, @description, @created_at, @created_by, @updated_at, @updated_by)
    `)

    const insertProduct = db.prepare(`
        INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, image, supplier_id, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @image, @supplier_id, @created_at, @created_by, @updated_at, @updated_by)
    `)

    const insertSale = db.prepare(`
        INSERT INTO sales(id, subtotal, tax, discount, total, payment_method, cheque_number, cheque_bank, customer_name, client_id, notes, status, created_at, created_by, updated_at, updated_by)
  VALUES(@id, @subtotal, @tax, @discount, @total, @payment_method, @cheque_number, @cheque_bank, @customer_name, @client_id, @notes, @status, @created_at, @created_by, @updated_at, @updated_by)
    `)

    // Older backups don't store the item cost: use the restored product's cost
    const insertSaleItem = db.prepare(`
        INSERT INTO sale_items(sale_id, product_id, product_code, product_name, quantity, unit_price, unit_cost, subtotal)
  VALUES(@sale_id, @product_id, @product_code, @product_name, @quantity, @unit_price,
         COALESCE(@unit_cost, (SELECT cost FROM products WHERE id = @product_id)), @subtotal)
    `)

    // 2. Restore suppliers
    if (data.suppliers) {
      for (const s of data.suppliers) {
        insertSupplier.run({
          id: s.id, name: s.name, contact: s.contact || '', phone: s.phone || '',
          email: s.email || '', address: s.address || '', nic_attachment: s.nic_attachment || null,
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.updated_at ?? null, ...auditOf(s)
        })
      }
    }

    // 3. Restore categories
    if (data.categories) {
      for (const c of data.categories) {
        insertCategory.run({
          id: c.id, name: c.name, description: c.description || '', created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at ?? null, ...auditOf(c)
        })
      }
    }

    // 4. Restore products
    if (data.products) {
      for (const p of data.products) {
        insertProduct.run({
          id: p.id, code: p.code, name: p.name, description: p.description || '', category: p.category || '',
          price: p.price, cost: p.cost || 0, stock: p.stock, min_stock: p.min_stock,
          unit: p.unit || 'unidad', image: p.image || null, supplier_id: p.supplier_id || null,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
          ...auditOf(p)
        })
      }
    }

    // 5. Restore sales
    if (data.sales) {
      for (const s of data.sales) {
        insertSale.run({
          id: s.id, subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total,
          payment_method: s.payment_method, customer_name: s.customer_name || '',
          client_id: s.client_id ?? null,
          cheque_number: s.cheque_number ?? null, cheque_bank: s.cheque_bank ?? null,
          notes: s.notes || '', status: s.status || 'completed',
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.updated_at ?? null, ...auditOf(s)
        })

        if (s.items) {
          for (const item of s.items) {
            insertSaleItem.run({
              sale_id: s.id, product_id: item.product_id || 0,
              product_code: item.product_code || '', product_name: item.product_name || '',
              quantity: item.quantity, unit_price: item.unit_price, unit_cost: item.unit_cost ?? null, subtotal: item.subtotal
            })
          }
        }
      }
    }
    // 6. Restore clients
    if (data.clients) {
      const insertClient = db.prepare(`
        INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, credit_limit_enabled, nic_attachment, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @credit_limit_enabled, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
      `)

      for (const c of data.clients) {
        insertClient.run({
          id: c.id, name: c.name, tax_id: c.tax_id || null, address: c.address || null,
          phone: c.phone || null, email: c.email || null, notes: c.notes || '',
          credit_limit: c.credit_limit || 0,
          // Backups made before the flag existed always enforced the limit
          credit_limit_enabled: c.credit_limit_enabled === undefined ? 1 : (c.credit_limit_enabled ? 1 : 0),
          nic_attachment: c.nic_attachment || null,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString(),
          ...auditOf(c)
        })
      }
    }

    // 7. Restore expense types and expenses
    if (hasExpenses) {
      const insertExpenseType = db.prepare(`
        INSERT INTO expense_types(id, name, description, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @name, @description, @created_at, @created_by, @updated_at, @updated_by)
      `)
      for (const t of data.expenseTypes) {
        insertExpenseType.run({
          id: t.id, name: t.name, description: t.description || '',
          created_at: t.created_at || new Date().toISOString(), updated_at: t.updated_at ?? null, ...auditOf(t)
        })
      }

      const insertExpense = db.prepare(`
        INSERT INTO expenses(id, expense_type_id, amount, expense_date, payment_method, description, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @expense_type_id, @amount, @expense_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
      `)
      for (const e of data.expenses ?? []) {
        insertExpense.run({
          id: e.id, expense_type_id: e.expense_type_id, amount: e.amount, expense_date: e.expense_date,
          payment_method: e.payment_method || 'cash', description: e.description || '',
          created_at: e.created_at || new Date().toISOString(), updated_at: e.updated_at ?? null, ...auditOf(e)
        })
      }
    }

    // 8a. Restore Goods Received Notes (stock already reflects them)
    if (Array.isArray(data.goodsReceipts)) {
      const insertReceipt = db.prepare(`
        INSERT INTO goods_receipts(id, client_id, client_name, receipt_date, total, payment_method, status, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @client_id, @client_name, @receipt_date, @total, @payment_method, @status, @notes, @created_at, @created_by, @updated_at, @updated_by)
      `)
      const insertReceiptItem = db.prepare(`
        INSERT INTO goods_receipt_items(id, receipt_id, product_id, product_code, product_name, quantity, unit_cost, subtotal)
        VALUES(@id, @receipt_id, @product_id, @product_code, @product_name, @quantity, @unit_cost, @subtotal)
      `)
      for (const r of data.goodsReceipts) {
        insertReceipt.run({
          id: r.id, client_id: r.client_id ?? null, client_name: r.client_name || '', receipt_date: r.receipt_date,
          total: r.total || 0, payment_method: r.payment_method || 'cash', status: r.status || 'completed', notes: r.notes || '',
          created_at: r.created_at || new Date().toISOString(), updated_at: r.updated_at ?? null, ...auditOf(r)
        })
        for (const i of r.items ?? []) {
          insertReceiptItem.run({
            id: i.id ?? null, receipt_id: r.id, product_id: i.product_id, product_code: i.product_code || '', product_name: i.product_name || '',
            quantity: i.quantity, unit_cost: i.unit_cost || 0, subtotal: i.subtotal ?? roundMoney(i.quantity * (i.unit_cost || 0))
          })
        }
      }
    }

    // 8. Restore purchases and supplier payments (stock already reflects received goods)
    if (Array.isArray(data.purchases)) {
      const insertPurchase = db.prepare(`
        INSERT INTO purchase_orders(id, supplier_id, order_date, received_date, status, total, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @supplier_id, @order_date, @received_date, @status, @total, @notes, @created_at, @created_by, @updated_at, @updated_by)
      `)
      const insertPurchaseItem = db.prepare(`
        INSERT INTO purchase_items(id, purchase_id, product_id, product_code, product_name, ordered_quantity, received_quantity, unit_cost)
        VALUES(@id, @purchase_id, @product_id, @product_code, @product_name, @ordered_quantity, @received_quantity, @unit_cost)
      `)
      for (const o of data.purchases) {
        insertPurchase.run({
          id: o.id, supplier_id: o.supplier_id, order_date: o.order_date, received_date: o.received_date ?? null,
          status: o.status || 'ordered', total: o.total || 0, notes: o.notes || '',
          created_at: o.created_at || new Date().toISOString(), updated_at: o.updated_at ?? null, ...auditOf(o)
        })
        for (const i of o.items ?? []) {
          insertPurchaseItem.run({
            id: i.id ?? null, purchase_id: o.id, product_id: i.product_id, product_code: i.product_code || '', product_name: i.product_name || '',
            ordered_quantity: i.ordered_quantity, received_quantity: i.received_quantity ?? null, unit_cost: i.unit_cost || 0
          })
        }
      }
    }
    if (Array.isArray(data.supplierPayments)) {
      const insertSupplierPaymentRow = db.prepare(`
        INSERT INTO supplier_payments(id, supplier_id, purchase_id, type, amount, payment_date, payment_method, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @supplier_id, @purchase_id, @type, @amount, @payment_date, @payment_method, @notes, @created_at, @created_by, @updated_at, @updated_by)
      `)
      for (const pay of data.supplierPayments) {
        insertSupplierPaymentRow.run({
          id: pay.id, supplier_id: pay.supplier_id, purchase_id: pay.purchase_id ?? null, type: pay.type, amount: pay.amount,
          payment_date: pay.payment_date, payment_method: pay.payment_method || 'cash', notes: pay.notes || '',
          created_at: pay.created_at || new Date().toISOString(), updated_at: pay.updated_at ?? null, ...auditOf(pay)
        })
      }
    }

    // 9. Restore savings accounts and transactions
    if (hasSavings) {
      const insertSavingsAccount = db.prepare(`
        INSERT INTO savings_accounts(id, name, category, description, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @name, @category, @description, @created_at, @created_by, @updated_at, @updated_by)
      `)
      for (const a of data.savingsAccounts) {
        insertSavingsAccount.run({
          id: a.id, name: a.name, category: a.category || 'other', description: a.description || '',
          created_at: a.created_at || new Date().toISOString(), updated_at: a.updated_at ?? null, ...auditOf(a)
        })
      }

      const insertSavingsTransaction = db.prepare(`
        INSERT INTO savings_transactions(id, account_id, type, amount, transaction_date, payment_method, description, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @account_id, @type, @amount, @transaction_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
      `)
      for (const t of data.savingsTransactions ?? []) {
        insertSavingsTransaction.run({
          id: t.id, account_id: t.account_id, type: t.type, amount: t.amount, transaction_date: t.transaction_date,
          payment_method: t.payment_method || 'cash', description: t.description || '',
          created_at: t.created_at || new Date().toISOString(), updated_at: t.updated_at ?? null, ...auditOf(t)
        })
      }
    }

    // 10. Restore capital and other income
    if (hasCapital) {
      const insertCapitalEntry = db.prepare(`
        INSERT INTO capital_entries(id, type, form, source, supplier_id, purchase_id, amount, entry_date, payment_method, description, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @type, @form, @source, @supplier_id, @purchase_id, @amount, @entry_date, @payment_method, @description, @created_at, @created_by, @updated_at, @updated_by)
      `)
      const insertCapitalItem = db.prepare(`
        INSERT INTO capital_items(id, entry_id, product_id, product_code, product_name, quantity, unit_cost)
        VALUES(@id, @entry_id, @product_id, @product_code, @product_name, @quantity, @unit_cost)
      `)
      const insertCapitalSettlement = db.prepare(`
        INSERT INTO capital_settlements(id, entry_id, amount, settlement_date, payment_method, notes, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @entry_id, @amount, @settlement_date, @payment_method, @notes, @created_at, @created_by, @updated_at, @updated_by)
      `)
      // Stock and supplier accounts already reflect these entries, so they are inserted as-is
      for (const c of data.capitalEntries) {
        insertCapitalEntry.run({
          id: c.id, type: c.type, form: c.form || 'money', source: c.source || '',
          supplier_id: c.supplier_id ?? null, purchase_id: c.purchase_id ?? null,
          amount: c.amount, entry_date: c.entry_date, payment_method: c.payment_method ?? 'cash', description: c.description || '',
          created_at: c.created_at || new Date().toISOString(), updated_at: c.updated_at ?? null, ...auditOf(c)
        })
        for (const i of c.items ?? []) {
          insertCapitalItem.run({
            id: i.id ?? null, entry_id: c.id, product_id: i.product_id, product_code: i.product_code || '', product_name: i.product_name || '',
            quantity: i.quantity, unit_cost: i.unit_cost || 0
          })
        }
        for (const st of c.settlements ?? []) {
          insertCapitalSettlement.run({
            id: st.id ?? null, entry_id: c.id, amount: st.amount, settlement_date: st.settlement_date,
            payment_method: st.payment_method || 'cash', notes: st.notes || '',
            created_at: st.created_at || new Date().toISOString(), updated_at: st.updated_at ?? null, ...auditOf(st)
          })
        }
      }
    }
  })

  restoreTx()
  console.log('Database restore completed.')
}

// Every NIC file name a client or supplier still points to
export function getNicAttachmentNames(): Set<string> {
  const rows = db.prepare(`
    SELECT nic_attachment AS name FROM clients WHERE nic_attachment IS NOT NULL
    UNION SELECT nic_attachment FROM suppliers WHERE nic_attachment IS NOT NULL
  `).all() as { name: string }[]
  return new Set(rows.map(r => r.name))
}

// Deletes all business data; users (and their ID sequence) are kept so everyone can still sign in
export function clearAll() {
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM goods_receipt_items').run()
    db.prepare('DELETE FROM goods_receipts').run()
    db.prepare('DELETE FROM capital_settlements').run()
    db.prepare('DELETE FROM capital_items').run()
    db.prepare('DELETE FROM capital_entries').run()
    db.prepare('DELETE FROM supplier_payments').run()
    db.prepare('DELETE FROM purchase_items').run()
    db.prepare('DELETE FROM purchase_orders').run()
    db.prepare('DELETE FROM savings_transactions').run()
    db.prepare('DELETE FROM savings_accounts').run()
    db.prepare('DELETE FROM expenses').run()
    db.prepare('DELETE FROM expense_types').run()
    db.prepare('DELETE FROM sale_items').run()
    db.prepare('DELETE FROM sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM suppliers').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare("DELETE FROM sqlite_sequence WHERE name != 'users'").run()
    seedExpenseTypes()
  })
  clearTx()
  console.log('Database cleared.')
}



export function initializeDatabase(filePath: string) {
  dbPath = filePath
  db = new Database(dbPath)
  // Enable WAL (write-ahead logging) for better performance and safety
  db.pragma('journal_mode = WAL')
  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  initSchema()
  try {
    migrateFromJSON()
  } catch (e) {
    console.error('Error during migration/initialization:', e)
  }
  console.log(`SQLite database ready at: ${dbPath}`)
}

// Consistent copy of the open database (used to move it to another folder)
export function backupDatabaseTo(destination: string) {
  return db.backup(destination)
}

export function closeDatabase() {
  if (!db?.open) return
  db.close()
  console.log('SQLite connection closed.')
}
