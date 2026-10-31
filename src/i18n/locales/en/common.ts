import type { common as es } from '../es/common'

export const common: Record<keyof typeof es, string> = {
    // Common actions & words
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.loading': 'Loading...',
    'common.na': 'N/A',
    'common.from': 'From',
    'common.to': 'To',
    'common.clearDates': 'Clear dates',
    'common.clearFilters': 'Clear filters',
    'common.walkInCustomer': 'Walk-in customer',

    // Payment methods
    'payment.cash': 'Cash',
    'payment.card': 'Card',
    'payment.transfer': 'Bank Transfer',
    'payment.other': 'Other',
    'payment.credit': 'Credit',
    'payment.cheque': 'Cheque',

    // Auto backup (App)
    'app.autoBackupStarting': 'Starting automatic backup...',
    'app.autoBackupSuccess': 'Automatic backup created successfully',
    'app.autoBackupError': 'Error creating automatic backup',

    // Product validation
    'validation.codeRequired': 'Code is required',
    'validation.nameMin': 'Name must be at least 2 characters',
    'validation.priceNegative': 'Price cannot be negative',
    'validation.costNegative': 'Cost cannot be negative',
    'validation.stockNegative': 'Stock cannot be negative',
    'validation.minStockNegative': 'Minimum stock cannot be negative',
    'validation.nameRequired': 'Name is required',
    'validation.invalidEmail': 'Invalid email',

    // Product units
    'unit.unidad': 'Unit (Piece)',
    'unit.ton': 'Ton (t)',
    'unit.kg': 'Kilogram (kg)',
    'unit.g': 'Gram (g)',
    'unit.l': 'Liter (l)',
    'unit.ml': 'Milliliter (ml)',
    'unit.m': 'Meter (m)',
    'unit.caja': 'Box',
    'unit.paquete': 'Pack',
    'unitShort.unidad': 'unit',
    'unitShort.ton': 't',
    'unitShort.kg': 'kg',
    'unitShort.g': 'g',
    'unitShort.l': 'l',
    'unitShort.ml': 'ml',
    'unitShort.m': 'm',
    'unitShort.caja': 'box',
    'unitShort.paquete': 'pack',

    // Backup service
    'backupService.needPassword': 'Encrypted file. A password is required.',
    'backupService.wrongPassword': 'Wrong password or corrupted file.',
    'backupService.invalidFile': 'Invalid backup file or unknown structure',
    'backupService.unknownRestoreError': 'Unknown error while restoring the database',
    'backupService.restoreSuccess': 'Restore successful. Recovered {products} products and {sales} sales.',
    'backupService.processError': 'Error processing the backup file',
    'backupService.readError': 'Error reading the file',

    // Encryption
    'encryption.encryptError': 'Error encrypting the data',
    'encryption.unsupportedVersion': 'Unsupported encryption version',
    'encryption.wrongPassword': 'Wrong password',
    'encryption.decryptError': 'Error decrypting the data',

    // Updater service
    'updaterService.unavailable': 'Update API not available',

    // Import service
    'importService.readExcelError': 'Error reading the Excel file',
    'importService.readCsvError': 'Error reading the CSV file',
    'importService.readError': 'Error reading the file',
    'importService.missingCode': 'Row {row}: Product code is missing',
    'importService.missingName': 'Row {row}: Product name is missing',
    'importService.missingPrice': 'Row {row}: Product price is missing',
    'importService.invalidPrice': 'Row {row}: Invalid price',
    'importService.invalidStock': 'Row {row}: Invalid stock',
    'importService.sampleName': 'Sample Product',
    'importService.sampleDescription': 'Product description',
    'importService.sampleCategory': 'Category',
    'importService.sheetName': 'Products',
    'importService.templateFile': 'nexoracloud_products_template.xlsx',
}
