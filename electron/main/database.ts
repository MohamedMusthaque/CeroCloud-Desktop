import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import crypto from 'crypto'
import { Product, Category, Sale, Supplier, SaleItem, Client, Expense, ExpenseType } from '../../src/types/database'
import { PAGE_IDS, sanitizePermissions, type AuthUser, type UserRole } from '../../src/lib/permissions'

// Database setup
const dbPath = path.join(app.getPath('userData'), 'nexoracloud.db')
const db = new Database(dbPath)

// Enable WAL (write-ahead logging) for better performance and safety
db.pragma('journal_mode = WAL')
// Enable foreign keys
db.pragma('foreign_keys = ON')

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

// Creates the default user (admin / admin) when no user exists
function seedDefaultUser() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }
  if (count === 0) {
    db.prepare('INSERT INTO users(username, password_hash, role, permissions, created_at) VALUES(?, ?, ?, ?, ?)')
      .run('admin', hashPassword('admin'), 'admin', DEFAULT_PERMISSIONS, new Date().toISOString())
    console.log('👤 Usuario por defecto creado: admin')
  }
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
  constructor(public code: 'USERNAME_REQUIRED' | 'USERNAME_TAKEN' | 'PASSWORD_TOO_SHORT' | 'LAST_ADMIN' | 'SELF_DELETE' | 'SELF_DEMOTE' | 'NOT_FOUND') {
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
  authenticate: (username: string, password: string): AuthUser | null => {
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

// Default user: administrator with access to every page
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
  seedDefaultUser()

  // Columns added after the first version (existing databases)
  addColumnIfMissing('clients', 'credit_limit', 'REAL DEFAULT 0')
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
  `)

  console.log('✅ Esquema SQLite inicializado con optimizaciones de rendimiento.')
}

// ==========================================
// 2. Migration logic (JSON -> SQLite)
// ==========================================

function migrateFromJSON() {
  const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number }
  if (productCount.count > 0) return

  const jsonPath = path.join(app.getPath('userData'), 'cerocloud-data.json')
  if (fs.existsSync(jsonPath)) {
    console.log('📦 Detectado archivo JSON antiguo. Iniciando migración a SQLite...')
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
      console.log('✅ Migración completada exitosamente.')
    } catch (error) {
      console.error('❌ Error migrando datos JSON:', error)
    }
  } else {
    initializeDemoData()
  }
}

function initializeDemoData() {
  console.log('📦 Inicializando datos de demostración...')
  const insert = db.prepare(`
        INSERT INTO products(code, name, description, category, price, cost, stock, min_stock, unit, created_at, updated_at)
  VALUES(@code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @created_at, @updated_at)
    `)

  const demoProducts = [
    { code: 'DEMO01', name: 'Laptop HP 15', description: '8GB RAM, 256GB SSD', category: 'Electrónica', price: 599.99, cost: 450.00, stock: 10, min_stock: 2, unit: 'unidad' },
    { code: 'DEMO02', name: 'Mouse Inalámbrico', description: 'Óptico 2.4Ghz', category: 'Accesorios', price: 12.50, cost: 6.00, stock: 50, min_stock: 10, unit: 'unidad' },
    { code: 'DEMO03', name: 'Teclado Mecánico', description: 'RGB Gamer', category: 'Accesorios', price: 45.00, cost: 25.00, stock: 15, min_stock: 5, unit: 'unidad' },
    { code: 'DEMO04', name: 'Monitor 24"', description: 'Full HD IPS', category: 'Electrónica', price: 120.00, cost: 90.00, stock: 5, min_stock: 2, unit: 'unidad' },
    { code: 'DEMO05', name: 'Cable HDMI', description: '2 metros 4K', category: 'Cables', price: 5.99, cost: 1.50, stock: 100, min_stock: 20, unit: 'unidad' }
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
            INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, nic_attachment, created_at, created_by, updated_at, updated_by)
            VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
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

  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return info.changes > 0
  }
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

      const updateStock = db.prepare(`UPDATE products SET stock = stock - @qty WHERE id = @id`)

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
          quantity: item.quantity,
          unit_price: item.unit_price,
          // Only a restore brings its own cost; a new sale always uses the product's current cost
          unit_cost: isRestore ? item.unit_cost ?? null : null,
          subtotal: item.subtotal
        })

        if (!isRestore) {
          // Update stock
          updateStock.run({ qty: item.quantity, id: item.product_id })
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
  }
}

export const cancelSale = (id: number, actor: Actor = null): Sale | null => {
  const cancelTx = db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale
    if (!sale || sale.status === 'cancelled') return null

    db.prepare("UPDATE sales SET status = 'cancelled', updated_at = ?, updated_by = ? WHERE id = ?")
      .run(new Date().toISOString(), actor, id)

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
    const updateStock = db.prepare('UPDATE products SET stock = stock + @qty WHERE id = @id')

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
// Inventory logs (stock card / traceability)
// ==========================================

// Inventory logs REMOVED

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function restoreDatabase(data: any) {
  const restoreTx = db.transaction(() => {
    console.log('🔄 Iniciando restauración de base de datos...')

    // Backups made before expenses existed don't include them: keep the current ones in that case
    const hasExpenses = Array.isArray(data.expenseTypes)

    // 1. Clear everything
    if (hasExpenses) {
      db.prepare('DELETE FROM expenses').run()
      db.prepare('DELETE FROM expense_types').run()
    }
    db.prepare('DELETE FROM sale_items').run()
    db.prepare('DELETE FROM sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM suppliers').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare(`DELETE FROM sqlite_sequence${hasExpenses ? '' : " WHERE name NOT IN ('expenses', 'expense_types')"}`).run()

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
        INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, nic_attachment, created_at, created_by, updated_at, updated_by)
        VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @nic_attachment, @created_at, @created_by, @updated_at, @updated_by)
      `)

      for (const c of data.clients) {
        insertClient.run({
          id: c.id, name: c.name, tax_id: c.tax_id || null, address: c.address || null,
          phone: c.phone || null, email: c.email || null, notes: c.notes || '',
          credit_limit: c.credit_limit || 0,
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
  })

  restoreTx()
  console.log('✅ Restauración completada exitosamente.')
}

// Every NIC file name a client or supplier still points to
export function getNicAttachmentNames(): Set<string> {
  const rows = db.prepare(`
    SELECT nic_attachment AS name FROM clients WHERE nic_attachment IS NOT NULL
    UNION SELECT nic_attachment FROM suppliers WHERE nic_attachment IS NOT NULL
  `).all() as { name: string }[]
  return new Set(rows.map(r => r.name))
}

export function clearAll() {
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM expenses').run()
    db.prepare('DELETE FROM expense_types').run()
    db.prepare('DELETE FROM sale_items').run()
    db.prepare('DELETE FROM sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM suppliers').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare('DELETE FROM sqlite_sequence').run()
  })
  clearTx()
  console.log('✅ Base de datos limpiada completamente')
}



export function initializeDatabase() {
  initSchema()
  try {
    migrateFromJSON()
  } catch (e) {
    console.error('Error durante la migración/inicialización:', e)
  }
  console.log(`✅ Base de datos SQLite activa en: ${dbPath} `)
}

export function closeDatabase() {
  db.close()
  console.log('✅ Conexión SQLite cerrada.')
}
