export const common = {
    // Common actions & words
    'common.confirm': 'Confirmar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.loading': 'Cargando...',
    'common.na': 'N/A',
    'common.walkInCustomer': 'Cliente general',

    // Payment methods
    'payment.cash': 'Efectivo',
    'payment.card': 'Tarjeta',
    'payment.transfer': 'Transferencia',
    'payment.other': 'Otro',
    'payment.credit': 'Crédito',
    'payment.cheque': 'Cheque',

    // Auto backup (App)
    'app.autoBackupStarting': 'Iniciando respaldo automático...',
    'app.autoBackupSuccess': 'Respaldo automático generado correctamente',
    'app.autoBackupError': 'Error al generar respaldo automático',

    // Product validation
    'validation.codeRequired': 'El código es obligatorio',
    'validation.nameMin': 'El nombre debe tener al menos 2 caracteres',
    'validation.priceNegative': 'El precio no puede ser negativo',
    'validation.costNegative': 'El costo no puede ser negativo',
    'validation.stockNegative': 'El stock no puede ser negativo',
    'validation.minStockNegative': 'El stock mínimo no puede ser negativo',
    'validation.nameRequired': 'El nombre es requerido',
    'validation.invalidEmail': 'Email inválido',

    // Product units
    'unit.unidad': 'Unidad (Pieza)',
    'unit.ton': 'Tonelada (t)',
    'unit.kg': 'Kilogramo (kg)',
    'unit.g': 'Gramo (g)',
    'unit.l': 'Litro (l)',
    'unit.ml': 'Mililitro (ml)',
    'unit.m': 'Metro (m)',
    'unit.caja': 'Caja',
    'unit.paquete': 'Paquete',
    'unitShort.unidad': 'unidad',
    'unitShort.ton': 't',
    'unitShort.kg': 'kg',
    'unitShort.g': 'g',
    'unitShort.l': 'l',
    'unitShort.ml': 'ml',
    'unitShort.m': 'm',
    'unitShort.caja': 'caja',
    'unitShort.paquete': 'paquete',

    // Backup service
    'backupService.needPassword': 'Archivo encriptado. Se requiere contraseña.',
    'backupService.wrongPassword': 'Contraseña incorrecta o archivo corrupto.',
    'backupService.invalidFile': 'Archivo de backup inválido o estructura desconocida',
    'backupService.unknownRestoreError': 'Error desconocido al restaurar la base de datos',
    'backupService.restoreSuccess': 'Restauración exitosa. Se han recuperado {products} productos, {sales} ventas.',
    'backupService.processError': 'Error al procesar el archivo de backup',
    'backupService.readError': 'Error al leer el archivo',

    // Encryption
    'encryption.encryptError': 'Error al cifrar los datos',
    'encryption.unsupportedVersion': 'Versión de cifrado no soportada',
    'encryption.wrongPassword': 'Contraseña incorrecta',
    'encryption.decryptError': 'Error al descifrar los datos',

    // Updater service
    'updaterService.unavailable': 'API de actualización no disponible',

    // Import service
    'importService.readExcelError': 'Error al leer el archivo Excel',
    'importService.readCsvError': 'Error al leer el archivo CSV',
    'importService.readError': 'Error al leer el archivo',
    'importService.missingCode': 'Fila {row}: Falta el código del producto',
    'importService.missingName': 'Fila {row}: Falta el nombre del producto',
    'importService.missingPrice': 'Fila {row}: Falta el precio del producto',
    'importService.invalidPrice': 'Fila {row}: Precio inválido',
    'importService.invalidStock': 'Fila {row}: Stock inválido',
    'importService.sampleName': 'Producto Ejemplo',
    'importService.sampleDescription': 'Descripción del producto',
    'importService.sampleCategory': 'Categoría',
    'importService.sheetName': 'Productos',
    'importService.templateFile': 'plantilla_productos_nexoracloud.xlsx',
}
