import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import crypto from 'crypto'
import { Product, Category, Sale, Supplier, SaleItem, Client } from '../../src/types/database'
import { PAGE_IDS, sanitizePermissions, type AuthUser, type UserRole } from '../../src/lib/permissions'

// Configuración de la Base de Datos
const dbPath = path.join(app.getPath('userData'), 'cerocloud.db')
const db = new Database(dbPath)

// Habilitar WAL (Write-Ahead Logging) para mejor rendimiento y seguridad
db.pragma('journal_mode = WAL')
// Habilitar claves foráneas
db.pragma('foreign_keys = ON')

// ==========================================
// 1. Definición del Esquema (Schema)
// ==========================================

function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// ==========================================
// Autenticación: contraseñas con scrypt + salt aleatorio ("salt:hash" en hex)
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

// Crea el usuario por defecto (admin / admin) si no existe ningún usuario
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
}

export interface UserInput {
  username?: string
  password?: string
  role?: UserRole
  permissions?: string[]
}

// Errores de gestión de usuarios; el código se traduce en la interfaz
export class UserError extends Error {
  constructor(public code: 'USERNAME_REQUIRED' | 'USERNAME_TAKEN' | 'PASSWORD_TOO_SHORT' | 'LAST_ADMIN' | 'SELF_DELETE' | 'SELF_DEMOTE' | 'NOT_FOUND') {
    super(code)
  }
}

const MIN_PASSWORD_LENGTH = 4

type UserRow = { id: number; username: string; role: string; permissions: string | null; password_hash: string; created_at?: string }

function rowToUser(row: UserRow): ManagedUser {
  let permissions: unknown = []
  try { permissions = JSON.parse(row.permissions || '[]') } catch { /* permisos corruptos = ninguno */ }
  return {
    id: row.id,
    username: row.username,
    role: row.role === 'admin' ? 'admin' : 'user',
    permissions: sanitizePermissions(permissions),
    created_at: row.created_at
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

  create: (input: UserInput): ManagedUser => {
    const username = (input.username ?? '').trim()
    if (!username) throw new UserError('USERNAME_REQUIRED')
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) throw new UserError('PASSWORD_TOO_SHORT')
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) throw new UserError('USERNAME_TAKEN')

    const info = db.prepare('INSERT INTO users(username, password_hash, role, permissions, created_at) VALUES(?, ?, ?, ?, ?)').run(
      username,
      hashPassword(input.password),
      input.role === 'admin' ? 'admin' : 'user',
      JSON.stringify(sanitizePermissions(input.permissions)),
      new Date().toISOString()
    )
    return userQueries.getById(Number(info.lastInsertRowid))!
  },

  // actorId: usuario que realiza el cambio (no puede quitarse el rol de administrador)
  update: (id: number, input: UserInput, actorId: number): ManagedUser => {
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
      db.prepare(`UPDATE users SET ${fields.map(f => `${f} = @${f}`).join(', ')} WHERE id = @id`).run({ ...updates, id })
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

// Usuario por defecto: administrador con acceso a todas las páginas
const DEFAULT_PERMISSIONS = JSON.stringify(PAGE_IDS)

function initSchema() {
  // Tabla: Productos
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

  // Tabla: Categorías
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT
    )`)

  // Tabla: Proveedores
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

  // Tabla: Clientes
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

  // Tabla: Ventas
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

  // Tabla: Items de Venta
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




  // Tabla: Usuarios (login local)
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

  // Columnas agregadas después de la versión inicial (bases de datos existentes)
  addColumnIfMissing('clients', 'credit_limit', 'REAL DEFAULT 0')
  addColumnIfMissing('sales', 'client_id', 'INTEGER')

  // Índices Estratégicos para Rendimiento
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
  `)

  console.log('✅ Esquema SQLite inicializado con optimizaciones de rendimiento.')
}

// ==========================================
// 2. Lógica de Migración (JSON -> SQLite)
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
// 3. Operaciones de Base de Datos (Queries)
// ==========================================

// Helper interno para logs ELIMINADO
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

  create: (product: Omit<Product, 'id'> & { id?: number }): Product => {
    // Permitir insertar ID explícito (para restauraciones) o NULL (autoincrement)
    const stmt = db.prepare(`
            INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, image, supplier_id, created_at, updated_at)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @image, @supplier_id, @created_at, @updated_at)
    `)

    const info = stmt.run({
      ...product,
      id: product.id || null,
      description: product.description || '',
      category: product.category || '',
      cost: product.cost || 0,
      unit: product.unit || 'unidad',
      image: product.image || null,
      supplier_id: product.supplier_id || null,
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString()
    })

    const newId = Number(info.lastInsertRowid)

    return { ...product, id: newId }
  },

  createOrUpdate: (product: Omit<Product, 'id'> & { id?: number }): { product: Product; isNew: boolean } => {
    // Verificar si existe un producto con el mismo código
    const existing = db.prepare('SELECT * FROM products WHERE code = ?').get(product.code) as Product | undefined

    if (existing) {
      // Actualizar producto existente
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
    updated_at = @updated_at 
        WHERE code = @code
    `)

      updateStmt.run({
        ...product,
        image: product.image || null,
        supplier_id: product.supplier_id || null,
        updated_at: new Date().toISOString()
      })

      // Log de actualización ELIMINADO

      return {
        product: { ...existing, ...product, id: existing.id },
        isNew: false
      }
    } else {
      // Crear nuevo producto
      const insertStmt = db.prepare(`
        INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, image, supplier_id, created_at, updated_at)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @image, @supplier_id, @created_at, @updated_at)
      `)

      const info = insertStmt.run({
        ...product,
        id: product.id || null,
        description: product.description || '',
        category: product.category || '',
        cost: product.cost || 0,
        unit: product.unit || 'unidad',
        image: product.image || null,
        supplier_id: product.supplier_id || null,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || new Date().toISOString()
      })

      const newId = Number(info.lastInsertRowid)



      return {
        product: { ...product, id: newId },
        isNew: true
      }
    }
  },

  update: (id: number, productData: Partial<Product>): Product | null => {
    const fields = Object.keys(productData).filter(key => key !== 'id' && key !== 'created_at')
    if (fields.length === 0) return productQueries.getById(id) || null



    const setClause = fields.map(field => `${field} = @${field} `).join(', ')
    const stmt = db.prepare(`UPDATE products SET ${setClause}, updated_at = @updated_at WHERE id = @id`)

    stmt.run({
      ...productData,
      id,
      updated_at: new Date().toISOString()
    })

    // Registrar log si fue un ajuste de stock ELIMINADO

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

export const categoryQueries = {
  getAll: (): Category[] => {
    return db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Category[]
  },

  create: (name: string, description?: string, id?: number): Category => {
    const stmt = db.prepare('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)')
    const info = stmt.run(id || null, name, description || '', new Date().toISOString())
    return { id: Number(info.lastInsertRowid), name, description, created_at: new Date().toISOString() }
  },

  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return info.changes > 0
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

  create: (client: Omit<Client, 'id'> & { id?: number }): Client => {
    const stmt = db.prepare(`
            INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, created_at, updated_at)
            VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @created_at, @updated_at)
        `)

    const info = stmt.run({
      ...client,
      id: client.id || null,
      tax_id: client.tax_id || null,
      address: client.address || null,
      phone: client.phone || null,
      email: client.email || null,
      notes: client.notes || '',
      credit_limit: client.credit_limit || 0,
      created_at: client.created_at || new Date().toISOString(),
      updated_at: client.updated_at || new Date().toISOString()
    })

    return { ...client, id: Number(info.lastInsertRowid) }
  },

  update: (id: number, clientData: Partial<Client>): Client | null => {
    const fields = Object.keys(clientData).filter(key => key !== 'id' && key !== 'created_at')
    if (fields.length === 0) return clientQueries.getById(id) || null

    const setClause = fields.map(field => `${field} = @${field}`).join(', ')
    const stmt = db.prepare(`UPDATE clients SET ${setClause}, updated_at = @updated_at WHERE id = @id`)

    stmt.run({
      ...clientData,
      id,
      updated_at: new Date().toISOString()
    })

    return clientQueries.getById(id) || null
  },

  delete: (id: number): boolean => {
    const info = db.prepare('DELETE FROM clients WHERE id = ?').run(id)
    return info.changes > 0
  },

  // Saldo pendiente: total de ventas a crédito no canceladas del cliente
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

  create: (supplier: Omit<Supplier, 'id'> & { id?: number }): Supplier => {
    const stmt = db.prepare(`
            INSERT INTO suppliers(id, name, contact, phone, email, address, created_at)
  VALUES(@id, @name, @contact, @phone, @email, @address, @created_at)
        `)
    const info = stmt.run({
      ...supplier,
      id: supplier.id || null,
      contact: supplier.contact || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      created_at: supplier.created_at || new Date().toISOString()
    })
    return { ...supplier, id: Number(info.lastInsertRowid) }
  },

  update: (id: number, supplierData: Partial<Supplier>): Supplier | null => {
    const fields = Object.keys(supplierData).filter(key => key !== 'id' && key !== 'created_at')
    if (fields.length === 0) return supplierQueries.getById(id) || null

    const setClause = fields.map(field => `${field} = @${field} `).join(', ')
    const stmt = db.prepare(`UPDATE suppliers SET ${setClause} WHERE id = @id`)

    stmt.run({ ...supplierData, id })
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

  create: (sale: Omit<Sale, 'id'> & { id?: number }): Sale => {
    const createTx = db.transaction(() => {
      // 1. Insertar Venta (Permite restaurar ID, status y fechas originales)
      const insertSale = db.prepare(`
                INSERT INTO sales(id, subtotal, tax, discount, total, payment_method, customer_name, client_id, notes, status, created_at)
  VALUES(@id, @subtotal, @tax, @discount, @total, @payment_method, @customer_name, @client_id, @notes, @status, @created_at)
    `)

      const info = insertSale.run({
        ...sale,
        id: sale.id || null,
        client_id: sale.client_id ?? null,
        notes: sale.notes || '',
        status: sale.status || 'completed',
        created_at: sale.created_at || new Date().toISOString()
      })
      const saleId = Number(info.lastInsertRowid)

      // 2. Insertar Items y Actualizar Stock
      const insertItem = db.prepare(`
                INSERT INTO sale_items(sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
  VALUES(@sale_id, @product_id, @product_code, @product_name, @quantity, @unit_price, @subtotal)
            `)

      const updateStock = db.prepare(`UPDATE products SET stock = stock - @qty WHERE id = @id`)

      // Si estamos restaurando (es decir, proporcionamos ID), TAL VEZ no deberíamos descontar stock de nuevo
      // si el backup ya trae el stock actualizado en los productos.
      // PERO: La restauración borra todo e inserta productos (con su stock del backup) y luego ventas.
      // Si insertamos ventas y descontamos stock, podríamos "doble descontar"?
      // El backup de productos ya tiene el stock final.
      // Si restauramos una venta HISTÓRICA, no deberíamos afectar el stock actual del producto restaurado?
      // RESPUESTA CRÍTICA: Al restaurar, primero se restauran productos (con su stock snapshot del backup).
      // Luego se restauran ventas.
      // Si al restaurar ventas descontamos stock, ¡estaremos restando lo que ya estaba restado!
      // SOLUCIÓN: Si se proporciona un 'id' (significa restauración), NO tocar el stock.
      // Solo descontar stock si es una venta NUEVA (sin id).

      const isRestore = !!sale.id;

      for (const item of sale.items) {
        insertItem.run({
          sale_id: saleId,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })

        if (!isRestore) {
          // Actualizar stock
          updateStock.run({ qty: item.quantity, id: item.product_id })
        }
      }

      return { ...sale, id: saleId, status: sale.status || 'completed' } as Sale
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

export const cancelSale = (id: number): Sale | null => {
  const cancelTx = db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale
    if (!sale || sale.status === 'cancelled') return null

    db.prepare("UPDATE sales SET status = 'cancelled' WHERE id = ?").run(id)

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
    const updateStock = db.prepare('UPDATE products SET stock = stock + @qty WHERE id = @id')

    for (const item of items) {


      // Restaurar stock
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
// Inventory Logs (Kardex / Trazabilidad)
// ==========================================

// Logs de Inventario ELIMINADOS

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function restoreDatabase(data: any) {
  const restoreTx = db.transaction(() => {
    console.log('🔄 Iniciando restauración de base de datos...')

    // 1. Limpiar todo
    db.prepare('DELETE FROM sale_items').run()
    db.prepare('DELETE FROM sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM suppliers').run()
    db.prepare('DELETE FROM clients').run()
    db.prepare('DELETE FROM sqlite_sequence').run()

    // Prepared Statements
    const insertSupplier = db.prepare(`
        INSERT INTO suppliers(id, name, contact, phone, email, address, created_at)
  VALUES(@id, @name, @contact, @phone, @email, @address, @created_at)
    `)

    const insertCategory = db.prepare(`
        INSERT INTO categories(id, name, description, created_at)
  VALUES(@id, @name, @description, @created_at)
    `)

    const insertProduct = db.prepare(`
        INSERT INTO products(id, code, name, description, category, price, cost, stock, min_stock, unit, image, supplier_id, created_at, updated_at)
  VALUES(@id, @code, @name, @description, @category, @price, @cost, @stock, @min_stock, @unit, @image, @supplier_id, @created_at, @updated_at)
    `)

    const insertSale = db.prepare(`
        INSERT INTO sales(id, subtotal, tax, discount, total, payment_method, customer_name, client_id, notes, status, created_at)
  VALUES(@id, @subtotal, @tax, @discount, @total, @payment_method, @customer_name, @client_id, @notes, @status, @created_at)
    `)

    const insertSaleItem = db.prepare(`
        INSERT INTO sale_items(sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
  VALUES(@sale_id, @product_id, @product_code, @product_name, @quantity, @unit_price, @subtotal)
    `)

    // 2. Restaurar Proveedores
    if (data.suppliers) {
      for (const s of data.suppliers) {
        insertSupplier.run({
          id: s.id, name: s.name, contact: s.contact || '', phone: s.phone || '',
          email: s.email || '', address: s.address || '', created_at: s.created_at || new Date().toISOString()
        })
      }
    }

    // 3. Restaurar Categorías
    if (data.categories) {
      for (const c of data.categories) {
        insertCategory.run({
          id: c.id, name: c.name, description: c.description || '', created_at: c.created_at || new Date().toISOString()
        })
      }
    }

    // 4. Restaurar Productos
    if (data.products) {
      for (const p of data.products) {
        insertProduct.run({
          id: p.id, code: p.code, name: p.name, description: p.description || '', category: p.category || '',
          price: p.price, cost: p.cost || 0, stock: p.stock, min_stock: p.min_stock,
          unit: p.unit || 'unidad', image: p.image || null, supplier_id: p.supplier_id || null,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString()
        })
      }
    }

    // 5. Restaurar Ventas
    if (data.sales) {
      for (const s of data.sales) {
        insertSale.run({
          id: s.id, subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total,
          payment_method: s.payment_method, customer_name: s.customer_name || '',
          client_id: s.client_id ?? null,
          notes: s.notes || '', status: s.status || 'completed',
          created_at: s.created_at || new Date().toISOString()
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
    // 6. Restaurar Clientes
    if (data.clients) {
      const insertClient = db.prepare(`
        INSERT INTO clients(id, name, tax_id, address, phone, email, notes, credit_limit, created_at, updated_at)
        VALUES(@id, @name, @tax_id, @address, @phone, @email, @notes, @credit_limit, @created_at, @updated_at)
      `)

      for (const c of data.clients) {
        insertClient.run({
          id: c.id, name: c.name, tax_id: c.tax_id || null, address: c.address || null,
          phone: c.phone || null, email: c.email || null, notes: c.notes || '',
          credit_limit: c.credit_limit || 0,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString()
        })
      }
    }
  })

  restoreTx()
  console.log('✅ Restauración completada exitosamente.')
}

export function clearAll() {
  const clearTx = db.transaction(() => {
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
