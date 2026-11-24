/**
 * SUGAR PEDIDOS WEB - APLICACIÓN PRINCIPAL
 * Gestión de Pedidos, Producción en TV (Dark Mode) y Fórmulas Panaderas
 */

// --- ESTADO GLOBAL ---
const state = {
  orders: [],
  catalog: [],
  activeTab: 'pedidos', // 'pedidos' | 'produccion' | 'entregas' | 'deliverys'
  activeDough: 'brioche',  // 'brioche' | 'papa' | 'dulce'
  selectedOrders: new Set(),
  apiUrl: localStorage.getItem('sugar_api_url') || '',
  autoRefreshInterval: null,
  autoRotateInterval: null,
  isAutoRotate: false,
  searchTerm: '',
  filterStatus: 'PENDIENTE',
  filterDelivery: 'ALL',
  filterSort: 'ASC',
  searchTermEntregas: '',
  filterDeliveryEntregas: 'ALL',
  filterStatusEntregas: 'POR_DESPACHAR',
  // Nuevos estados para Deliverys y Cierre de Jornada:
  deliveryDrivers: [],
  deliveriesMeta: {},
  localRealizados: new Set(),
  localDeliveryIndices: new Set(),
  searchTermDeliverys: '',
  filterDriverDeliverys: 'ALL',
  filterStatusDeliverys: 'ALL',
  showSettlementPanel: false,
  productionDiscounts: {}, // { [discountKey]: paquetesDescontados }
  wheelAdjustments: {}, // { [wheelKey]: unidadesAjustadas (+/-) }
  modalCategoryFilter: 'ALL',
  currentProductosConsolidados: {},
  currentTotalPanes: 0,
  currentTotalPaquetes: 0
};

// --- BASE DE FÓRMULAS PANADERAS (PORCENTAJES Y RECETAS BASE) ---
const FORMULAS_BASE = {
  brioche: {
    nombre: 'Masa Brioche Especial',
    baseHarina: 45000,
    ingredientes: [
      { nombre: 'Harina de Trigo', base: 45000, porcentaje: 100 },
      { nombre: 'Agua', base: 25600, porcentaje: 56.89 },
      { nombre: 'Azúcar', base: 3600, porcentaje: 8.00 },
      { nombre: 'Mantequilla / Manteca', base: 800, porcentaje: 1.78 },
      { nombre: 'Sal', base: 540, porcentaje: 1.20 },
      { nombre: 'Esencia', base: 400, porcentaje: 0.89 },
      { nombre: 'Propinato de Calcio', base: 240, porcentaje: 0.53 },
      { nombre: 'Levadura Fresca', base: 100, porcentaje: 0.22 }
    ]
  },
  papa: {
    nombre: 'Pan de Papa Artesanal',
    baseHarina: 45000,
    ingredientes: [
      { nombre: 'Harina de Trigo', base: 45000, porcentaje: 100 },
      { nombre: 'Agua', base: 13322, porcentaje: 29.60 },
      { nombre: 'Azúcar', base: 5868, porcentaje: 13.04 },
      { nombre: 'Puré de Papa', base: 5150, porcentaje: 11.44 },
      { nombre: 'Manteca', base: 3185, porcentaje: 7.08 },
      { nombre: 'Huevos', base: 1600, porcentaje: 3.56 },
      { nombre: 'Levadura Fresca', base: 750, porcentaje: 1.67 },
      { nombre: 'Sal', base: 680, porcentaje: 1.51 },
      { nombre: 'Esencia', base: 600, porcentaje: 1.33 },
      { nombre: 'Propinato de Calcio', base: 80, porcentaje: 0.18 },
      { nombre: 'Colorante Natural', base: 15, porcentaje: 0.03 }
    ]
  },
  dulce: {
    nombre: 'Pan Dulce Tradicional',
    baseHarina: 45000,
    ingredientes: [
      { nombre: 'Harina de Trigo', base: 45000, porcentaje: 100 },
      { nombre: 'Agua', base: 18000, porcentaje: 40.00 },
      { nombre: 'Azúcar', base: 9000, porcentaje: 20.00 },
      { nombre: 'Mantequilla / Grasa', base: 4500, porcentaje: 10.00 },
      { nombre: 'Levadura', base: 1350, porcentaje: 3.00 },
      { nombre: 'Sal', base: 450, porcentaje: 1.00 },
      { nombre: 'Esencia de Vainilla', base: 450, porcentaje: 1.00 }
    ]
  },
  jamon: {
    nombre: 'Pan de Jamón',
    baseHarina: 1511.5,
    ingredientes: [
      { nombre: 'Harina de Trigo', base: 1511.5, porcentaje: 100 },
      { nombre: 'Agua', base: 776.9, porcentaje: 51.4 },
      { nombre: 'Azúcar', base: 45.3, porcentaje: 3.0 },
      { nombre: 'Mantequilla', base: 27.2, porcentaje: 1.8 },
      { nombre: 'Sal', base: 26.9, porcentaje: 1.78 },
      { nombre: 'Levadura', base: 12.1, porcentaje: 0.8 }
    ]
  },
  burrero: {
    nombre: 'Pan Burrero Económico',
    baseHarina: 45000,
    ingredientes: [
      { nombre: 'Harina de Trigo', base: 45000, porcentaje: 100 },
      { nombre: 'Agua', base: 25600, porcentaje: 56.89 },
      { nombre: 'Azúcar', base: 3600, porcentaje: 8.00 },
      { nombre: 'Mantequilla / Manteca', base: 800, porcentaje: 1.78 },
      { nombre: 'Sal', base: 540, porcentaje: 1.20 },
      { nombre: 'Esencia', base: 400, porcentaje: 0.89 },
      { nombre: 'Propinato de Calcio', base: 240, porcentaje: 0.53 },
      { nombre: 'Levadura Fresca', base: 100, porcentaje: 0.22 }
    ]
  }
};

// Calcular masa total base de cada receta
Object.keys(FORMULAS_BASE).forEach(key => {
  FORMULAS_BASE[key].masaTotalBase = FORMULAS_BASE[key].ingredientes.reduce((sum, item) => sum + item.base, 0);
});

// Configuración de subgrupos de productos y molde en planta
const SUBGRUPOS_CONFIG = {
  CON_MOLDE: { titulo: 'Con Molde', badgeClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  SIN_MOLDE: { titulo: 'Sin Molde', badgeClass: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  ENROLLADOS: { titulo: 'Enrollados / Perros', badgeClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  GENERAL: { titulo: 'General', badgeClass: 'text-slate-300 border-slate-700 bg-slate-800' }
};

// Normalizar estado para máxima tolerancia (acentos, espacios, minúsculas desde Sheets)
function normalizarEstado(estado) {
  if (!estado) return 'PENDIENTE';
  const norm = String(estado).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '_');
  if (norm.includes('PRODUC')) return 'EN_PRODUCCION';
  if (norm.includes('REALIZAD') || norm.includes('FABRICAD') || norm.includes('LISTO')) return 'REALIZADO';
  if (norm.includes('ENTREGAD') || norm.includes('DESPACHAD')) return 'ENTREGADO';
  return 'PENDIENTE';
}

// --- FUNCIÓN PURA: CÁLCULO DE RUEDAS (PICADORA DE 36 UNIDADES) ---
function calcularRuedasDesdeUnidades(totalUnidades, tamanoRueda = 36) {
  const total = Number(totalUnidades) || 0;
  if (total <= 0) {
    return { cantidad: 0, unidades: 0 };
  }

  const tamano = Number(tamanoRueda) || 36;
  const entero = Math.floor(total / tamano);
  const resto = total - (entero * tamano);
  const medioCorte = tamano / 2;

  if (resto === 0) {
    return {
      cantidad: entero,
      unidades: 0
    };
  } else if (resto >= medioCorte) {
    // Si la fracción es igual o mayor a media rueda (ej: 18 o más sobrantes de 36),
    // es más eficiente en planta picar 1 rueda completa adicional en la picadora y descontar (-)
    // las unidades sobrantes, en vez de cortar tantas unidades a mano con cuchillo (+).
    // Ejemplo: 54 un (1 rueda + 18 un) -> 2 ruedas - 18 un.
    const cantidad = entero + 1;
    const unidades = -(tamano - resto);
    return {
      cantidad,
      unidades: Math.round(unidades * 100) / 100
    };
  } else {
    // Si son menos de media rueda (ej: 1 a 17 sobrantes de 36), se cortan a mano (+)
    const cantidad = entero;
    const unidades = resto;
    return {
      cantidad,
      unidades: Math.round(unidades * 100) / 100
    };
  }
}

// Formatear fechas a formato amigable legible
function formatFriendlyDate(dateStr) {
  const parts = formatFriendlyDateParts(dateStr);
  return parts.time ? `${parts.date} ${parts.time}` : parts.date;
}

// Separar fecha y hora para diseño limpio de tarjetas (Soporta Columna I: DD/MM/YYYY o YYYY-MM-DD)
function formatFriendlyDateParts(dateStr) {
  if (!dateStr || dateStr === 'SinFecha') return { date: 'Sin fecha', time: '' };
  const str = String(dateStr).trim();

  // 1. Probar formato DD/MM/YYYY con o sin hora (ej: "15/11/2026 10:30:00", "8/11/2026, 23:56:35")
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    let time = '';
    if (dmyMatch[4] && dmyMatch[5]) {
      time = `${String(dmyMatch[4]).padStart(2, '0')}:${String(dmyMatch[5]).padStart(2, '0')}`;
    }
    return {
      date: `${day}/${month}/${year}`,
      time: time
    };
  }

  // 2. Probar formato ISO YYYY-MM-DD (ej: "2026-11-15 10:30:00" o "2026-11-15T10:30:00")
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(ymdMatch[2]).padStart(2, '0');
    const day = String(ymdMatch[3]).padStart(2, '0');
    let time = '';
    if (ymdMatch[4] && ymdMatch[5]) {
      time = `${String(ymdMatch[4]).padStart(2, '0')}:${String(ymdMatch[5]).padStart(2, '0')}`;
    }
    return {
      date: `${day}/${month}/${year}`,
      time: time
    };
  }

  // 3. Fallback a new Date() estándar
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${mins}`
      };
    }
  } catch (e) {}

  // 4. Si viene con hora separada por coma o espacio
  const clean = str.split('GMT')[0].trim();
  const spaceParts = clean.split(/[,\s]+/);
  if (spaceParts.length >= 2 && spaceParts[1].includes(':')) {
    const timeMatch = spaceParts[1].match(/^(\d{1,2}):(\d{2})/);
    return {
      date: spaceParts[0],
      time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : spaceParts[1]
    };
  }

  return { date: clean, time: '' };
}

// Convertir cadena de fecha a timestamp numérico para ordenamiento cronológico
function parseDateToTimestamp(dateStr) {
  if (!dateStr || dateStr === 'SinFecha') return 0;
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const mins = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const secs = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    return new Date(year, month, day, hours, mins, secs).getTime() || 0;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// --- CLASIFICACIÓN DE MASA SEGÚN CATEGORÍA Y PRODUCTO ---
function getTipoMasa(order) {
  const prod = (order.producto || '').trim();
  const pres = (order.presentacion || order.especificacion || '').trim();
  const cat = (order.categoria || '').trim().toLowerCase();

  // 1. Si la categoría explícita es Pan de Papa
  if (cat.includes('papa')) {
    return 'papa';
  }

  // 2. Si el nombre o presentación contiene explícitamente "papa"
  const prodLower = prod.toLowerCase();
  const presLower = pres.toLowerCase();
  if (prodLower.includes('papa') || presLower.includes('papa')) {
    return 'papa';
  }

  // 3. Regla de Sufijos para Hamburguesas / Masas de Papa: MP (Molde Papa), SP (Sésamo Papa), PP (Pan de Papa)
  // Evalúa si el nombre del producto o la presentación terminan en MP, SP o PP, o si aparecen como sufijo aislado
  const suffixPapaRegex = /(?:^|\s|[-_])(mp|sp|pp)(?:\s|[-_]|$)/i;
  if (suffixPapaRegex.test(prod) || suffixPapaRegex.test(pres)) {
    return 'papa';
  }

  // 4. Pan Dulce
  if (cat.includes('dulce') || 
      prodLower.includes('dulce') || 
      prodLower.includes('coco') || 
      prodLower.includes('arequipe') || 
      prodLower.includes('chocolate') || 
      prodLower.includes('guayaba')) {
    return 'dulce';
  }

  // 5. Pan de Jamón
  if (cat.includes('jamon') || cat.includes('jamón') || prodLower.includes('jamon') || prodLower.includes('jamón')) {
    return 'jamon';
  }

  // 6. Pan Burrero (PC-EST-01 Perro Comercial E, PC-ESTT Perro Comercial E2, o económico)
  const idLower = (order.id || '').toLowerCase();
  if (idLower === 'pc-est-01' || idLower === 'pc-estt' ||
      prodLower.includes('burrero') ||
      prodLower.includes('comercial e') ||
      (prodLower.includes('perro') && (presLower.includes('economico') || presLower.includes('económico')))) {
    return 'burrero';
  }

  // 7. Por defecto (Hamburguesa estándar, Perro estándar, Deli, Sandwich/Bimbo) es masa Brioche
  return 'brioche';
}

// Clasificar producto para separación visual en Producción (Con Molde vs Sin Molde)
function getTipoMolde(order) {
  const pres = normalizarTexto(order.presentacion || order.especificacion);
  const prod = normalizarTexto(order.producto);

  if (pres.includes('con molde') || pres.includes('c/molde') || prod.includes('con molde') || prod.includes('trenzada')) {
    return 'CON_MOLDE';
  }
  if (pres.includes('sin molde') || pres.includes('s/molde') || prod.includes('sin molde')) {
    return 'SIN_MOLDE';
  }
  if (prod.includes('hamburguesa')) {
    // MP (Molde Papa), SP (Sésamo Papa Con Molde), M (Con Molde Brioche)
    if (/(?:^|\s|[-_])(m|mp|sp)(?:\s|[-_]|$)/i.test(prod) || /(?:^|\s|[-_])(m|mp|sp)(?:\s|[-_]|$)/i.test(pres)) {
      return 'CON_MOLDE';
    }
    // PP (Pequeña Papa Sin Molde)
    return 'SIN_MOLDE';
  }
  if (
    prod.includes('perro') || prod.includes('deli') || prod.includes('pepito') || prod.includes('jumbo') ||
    prod.includes('sandw') || prod.includes('sanduch') || prod.includes('sandiw') || prod.includes('bimbo') ||
    pres.includes('perro') || pres.includes('deli') || pres.includes('pepito') || pres.includes('jumbo') ||
    pres.includes('sandw') || pres.includes('sanduch') || pres.includes('sandiw') || pres.includes('bimbo')
  ) {
    return 'ENROLLADOS';
  }
  return 'GENERAL';
}

// Sub-tipo para el bloque de ruedas: 'hamburguesa' | 'enrollado' | 'molde'
function getSubtipoRuedas(order) {
  const prod = normalizarTexto(order.producto);
  const pres = normalizarTexto(order.presentacion || order.especificacion);
  // Las hamburguesas trenzadas se pasan por la máquina que se enrolla
  if (prod.includes('trenzad') || pres.includes('trenzad')) return 'enrollado';
  if (prod.includes('hamburguesa') || pres.includes('hamburguesa')) return 'hamburguesa';
  // Perros, delis, pepitos, jumbos y panes de sandwich salen en las ruedas de enrollados
  if (
    prod.includes('perro') || prod.includes('deli') || prod.includes('pepito') || prod.includes('jumbo') ||
    prod.includes('sandw') || prod.includes('sanduch') || prod.includes('sandiw') || prod.includes('bimbo') ||
    pres.includes('perro') || pres.includes('deli') || pres.includes('pepito') || pres.includes('jumbo') ||
    pres.includes('sandw') || pres.includes('sanduch') || pres.includes('sandiw') || pres.includes('bimbo')
  ) {
    return 'enrollado';
  }
  return 'molde';
}

// Normalizar texto para búsquedas (sin tildes, minúsculas, sin espacios extra)
function normalizarTexto(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Buscar unidades por paquete con precisión absoluta (Catálogo + Reglas de Panadería)
function getUnidadesPorPaquete(order) {
  const pNorm = normalizarTexto(order.producto);
  const presNorm = normalizarTexto(order.presentacion || order.especificacion);
  const topNorm = normalizarTexto(order.topping);
  const pesoNum = parseFloat(order.peso_gr) || 0;

  // 1. REGLA MAESTRA PRIORITARIA:
  // Mini Hamburguesas (50g): SIEMPRE 24 unidades por paquete (1 pq = 24 un)
  if (
    pNorm.includes('mini hamburguesa') || 
    pNorm.includes('hamburguesa mini') || 
    pNorm.includes('mini burger') || 
    pNorm.includes('mini burguer') ||
    pNorm.includes('miniburger') ||
    pNorm.includes('miniburguer') ||
    (pNorm.includes('mini') && !pNorm.includes('perro') && (pNorm.includes('hamb') || pesoNum <= 55))
  ) {
    return 24;
  }

  // Mini Perros (50g): SIEMPRE 20 unidades por paquete (1 pq = 20 un)
  if (pNorm.includes('mini perro') || pNorm.includes('perro mini') || (pNorm.includes('mini') && pNorm.includes('perro'))) {
    return 20;
  }

  // 2. Buscar en el catálogo oficial de SUGAR
  if (state.catalog && state.catalog.length > 0) {
    const found = state.catalog.find(c => {
      const cProd = normalizarTexto(c.producto);
      const cPres = normalizarTexto(c.especificacion);
      const cTop = normalizarTexto(c.topping);
      const cPeso = parseFloat(c.peso_gr) || 0;

      const matchProd = (cProd === pNorm);
      const matchPres = (!presNorm || cPres.includes(presNorm) || presNorm.includes(cPres));
      const matchTop = (!topNorm || !cTop || cTop === topNorm);
      const matchPeso = (!pesoNum || Math.abs(cPeso - pesoNum) < 3);

      return matchProd && matchPres && matchPeso;
    });

    if (found && found.unidades_pqte) {
      return parseInt(found.unidades_pqte, 10);
    }
  }

  // 3. Reglas maestras infalibles del Catálogo SUGAR:
  // Todos los Delis / Pepitos son de 6 unidades por paquete (Standard, Mediano, Grande, Baguette, Extra G)
  if (pNorm.includes('deli') || pNorm.includes('pepito')) return 6;

  // Panes de Papa: todas las hamburguesas son de 6 unidades
  if ((pNorm.includes('papa') && pNorm.includes('hamburguesa')) || pNorm.includes('pp') || pNorm.includes('mp') || pNorm.includes('sp')) return 6;

  // Hamburguesas Pequeñas: 15 unidades por paquete (60g y 70g)
  if (pNorm.includes('hamburguesa pequena') || pNorm.includes('hamburguesa s')) return 15;

  // Perros comerciales:
  if (pNorm.includes('comercial e2') || pNorm.includes('perro papa') || pNorm.includes('comercial m') || pNorm.includes('comercial p') || presNorm.includes('pesado') || presNorm.includes('premiun')) return 20;
  if (pNorm.includes('comercial e') || pNorm.includes('perro comercial')) return 60;

  // Perros Jumbo: 12 unidades por paquete (80g)
  if (pNorm.includes('jumbo')) return 12;

  // Hamburguesas Grandes:
  // Con Molde (Grande M): 10 unidades por paquete
  if (pNorm.includes('grande m') || (pNorm.includes('grande') && presNorm.includes('con molde'))) return 10;
  // Sin Molde / Extra Grande / Trenzadas: 8 unidades por paquete
  if (pNorm.includes('trenzada') || pNorm.includes('extra grande') || (pNorm.includes('grande') && presNorm.includes('sin molde'))) return 8;

  // Hamburguesas Medianas: 12 unidades por paquete (90g)
  if (pNorm.includes('hamburguesa mediana')) return 12;

  // Pan Dulce (Coco, Relleno, Simple): 6 unidades por paquete
  if (pNorm.includes('dulce') || pNorm.includes('coco') || pNorm.includes('arequipe') || pNorm.includes('chocolate') || pNorm.includes('guayaba')) return 6;

  // Sándwich Bimbo y Pan de Jamón: 1 unidad por paquete
  if (pNorm.includes('bimbo') || pNorm.includes('sandwich') || pNorm.includes('jamon')) return 1;

  // Fallback por defecto según peso
  if (pesoNum >= 110) return 8;
  if (pesoNum >= 90) return 12;
  if (pesoNum >= 60) return 15;
  return 10;
}

// Obtener el monto en dólares ($) de un ítem (usando order.monto directo o precio de catálogo * paquetes)
function getItemMonto(order) {
  if (!order) return 0;
  const directMonto = parseFloat(order.monto);
  if (!isNaN(directMonto) && directMonto > 0) {
    return directMonto;
  }

  const paq = parseFloat(order.paquetes) || 0;
  if (paq <= 0) return 0;

  // Fallback: calcular multiplicando paquetes por el precio unitario del catálogo
  const catalogList = (state && state.catalog && state.catalog.length > 0)
    ? state.catalog
    : (typeof window !== 'undefined' && window.SUGAR_CATALOG ? window.SUGAR_CATALOG : []);

  if (Array.isArray(catalogList) && catalogList.length > 0) {
    const pNorm = normalizarTexto(order.producto);
    const topNorm = normalizarTexto(order.topping);
    const presNorm = normalizarTexto(order.presentacion || order.especificacion);

    // Búsqueda por producto + topping + presentación
    let match = catalogList.find(c => {
      const cProd = normalizarTexto(c.producto);
      const cTop = normalizarTexto(c.topping);
      const cPres = normalizarTexto(c.especificacion);
      return cProd === pNorm && (cTop === topNorm || (!order.topping && !c.topping)) && (cPres === presNorm || !presNorm);
    });

    // Búsqueda por producto + topping
    if (!match) {
      match = catalogList.find(c => {
        const cProd = normalizarTexto(c.producto);
        const cTop = normalizarTexto(c.topping);
        return cProd === pNorm && (cTop === topNorm || (!order.topping && !c.topping));
      });
    }

    // Búsqueda por coincidencia de producto
    if (!match) {
      match = catalogList.find(c => normalizarTexto(c.producto) === pNorm);
    }

    if (match && match.precio) {
      const unitPrice = parseFloat(match.precio) || 0;
      return paq * unitPrice;
    }
  }

  return 0;
}

// --- DATOS DE EJEMPLO REALISTAS (PARA PRUEBA INMEDIATA SIN CONEXIÓN) ---
const MOCK_ORDERS = [
  { rowIndex: 1, cliente: "Tabuenoburguer", producto: "Hamburguesa Grande M", presentacion: "Con Molde", peso_gr: 110, topping: "Ajonjolí", paquetes: 4, monto: 17.84, telefono: "+5804129310161", fecha1: "15/11/2026 10:30", fecha2: "2026-11-15 10:30", entrega: "Retiro en local", estado: "EN_PRODUCCION" },
  { rowIndex: 2, cliente: "Tabuenoburguer", producto: "Perro Comercial M", presentacion: "Pesado", peso_gr: 60, topping: "Orégano", paquetes: 6, monto: 20.34, telefono: "+5804129310161", fecha1: "15/11/2026 10:30", fecha2: "2026-11-15 10:30", entrega: "Retiro en local", estado: "EN_PRODUCCION" },
  { rowIndex: 3, cliente: "Gino's Food", producto: "Hamburguesa Mediana M", presentacion: "Con Molde", peso_gr: 90, topping: "AJON/SESAMO", paquetes: 5, monto: 22.95, telefono: "+5804141234567", fecha1: "15/11/2026 10:45", fecha2: "2026-11-15 10:45", entrega: "Despacho", estado: "REALIZADO" },
  { rowIndex: 4, cliente: "Gino's Food", producto: "Deli Mediano", presentacion: "Largo", peso_gr: 110, topping: "Ajonjolí", paquetes: 8, monto: 17.04, telefono: "+5804141234567", fecha1: "15/11/2026 10:45", fecha2: "2026-11-15 10:45", entrega: "Despacho", estado: "REALIZADO" },
  { rowIndex: 5, cliente: "Santos Burger", producto: "Hamburguesa pequeña PP", presentacion: "Sin Molde", peso_gr: 75, topping: "Ajonjolí", paquetes: 10, monto: 20.80, telefono: "+5804169998877", fecha1: "15/11/2026 11:00", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 6, cliente: "Santos Burger", producto: "Perro Papa Grande", presentacion: "16CM", peso_gr: 70, topping: "Sésamo Negro", paquetes: 4, monto: 28.00, telefono: "+5804169998877", fecha1: "15/11/2026 11:00", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 11, cliente: "Santos Burger", producto: "Hamburguesa Mediana MP", presentacion: "Con Molde", peso_gr: 90, topping: "Ajonjolí", paquetes: 5, monto: 19.50, telefono: "+5804169998877", fecha1: "15/11/2026 11:00", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 7, cliente: "Café París", producto: "Pan dulce Coco", presentacion: "Simple", peso_gr: 60, topping: "Coco", paquetes: 12, monto: 17.28, telefono: "+5804245551122", fecha1: "15/11/2026 11:15", fecha2: "2026-11-15 11:15", entrega: "Despacho", estado: "REALIZADO" },
  { rowIndex: 8, cliente: "Café París", producto: "Pan dulce relleno", presentacion: "Relleno", peso_gr: 60, topping: "Arequipe", paquetes: 8, monto: 11.52, telefono: "+5804245551122", fecha1: "15/11/2026 11:15", fecha2: "2026-11-15 11:15", entrega: "Despacho", estado: "REALIZADO" },
  { rowIndex: 9, cliente: "Burger House VIP", producto: "Hamburguesa Extra Grande M", presentacion: "Con Molde", peso_gr: 120, topping: "Sésamo Negro", paquetes: 6, monto: 23.16, telefono: "+5804128887766", fecha1: "15/11/2026 11:30", fecha2: "2026-11-15 11:30", entrega: "Despacho", estado: "PENDIENTE" },
  { rowIndex: 10, cliente: "Burger House VIP", producto: "Hamburguesa Mediana Trenzada", presentacion: "Con Molde", peso_gr: 90, topping: "Orégano", paquetes: 5, monto: 16.60, telefono: "+5804128887766", fecha1: "15/11/2026 11:30", fecha2: "2026-11-15 11:30", entrega: "Despacho", estado: "PENDIENTE" },
  { rowIndex: 12, cliente: "La Esquina HotDog", producto: "Perro Comercial", presentacion: "Pesado", peso_gr: 50, topping: "Sin Topping", paquetes: 3, monto: 12.00, telefono: "+5804121112233", fecha1: "15/11/2026 11:45", fecha2: "2026-11-15 11:45", entrega: "Retiro", estado: "PENDIENTE" },
  { rowIndex: 13, cliente: "Eventos & Fiestas", producto: "Perro Mini", presentacion: "Estándar", peso_gr: 50, topping: "Sin Topping", paquetes: 4, monto: 16.00, telefono: "+5804143334455", fecha1: "15/11/2026 11:45", fecha2: "2026-11-15 11:45", entrega: "Retiro", estado: "PENDIENTE" },
  { rowIndex: 14, cliente: "Monster Dog VIP", producto: "Perro Jumbo", presentacion: "22CM", peso_gr: 80, topping: "Ajonjolí", paquetes: 3, monto: 25.00, telefono: "+5804246667788", fecha1: "15/11/2026 12:00", fecha2: "2026-11-15 12:00", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 15, cliente: "Sandwich Deli Bar", producto: "Deli", presentacion: "Largo", peso_gr: 80, topping: "Orégano", paquetes: 6, monto: 18.00, telefono: "+5804167778899", fecha1: "15/11/2026 12:00", fecha2: "2026-11-15 12:00", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 16, cliente: "Club Sandwich House", producto: "Pan de Sandwich", presentacion: "Rebanado", peso_gr: 100, topping: "Sin Topping", paquetes: 18, monto: 36.00, telefono: "+5804149991122", fecha1: "15/11/2026 12:15", fecha2: "2026-11-15 12:15", entrega: "Despacho", estado: "EN_PRODUCCION" }
];

// Determinar si una orden corresponde a la modalidad Delivery
function isDeliveryOrder(order) {
  if (!order) return false;
  const ent = (order.entrega || '').toLowerCase();
  if (ent.includes('retiro') || ent.includes('no')) return false;
  if (ent.includes('delivery') || ent.includes('si') || ent.includes('sí') || ent.includes('despacho') || ent.includes('envio') || ent.includes('envío') || ent.includes('domicilio')) return true;
  return false;
}

// ==========================================
// CONTROL DE TEMA (MODO CLARO CÁLIDO vs. OSCURO)
// ==========================================
function initTheme() {
  let theme = 'light';
  try {
    const saved = localStorage.getItem('sugar_theme');
    // Modo Claro Cálido de Panadería por defecto
    theme = (saved === 'dark') ? 'dark' : 'light';
  } catch (e) {}
  applyTheme(theme);
}

function applyTheme(theme) {
  const isDark = (theme === 'dark');
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }
  try {
    localStorage.setItem('sugar_theme', theme);
  } catch (e) {}
  updateThemeButtonUI(theme);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

function updateThemeButtonUI(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  const text = document.getElementById('theme-toggle-text');
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;

  if (theme === 'dark') {
    if (icon) icon.textContent = '☀️';
    if (text) text.textContent = 'Modo Claro';
    btn.setAttribute('title', 'Cambiar a Modo Claro Cálido de Panadería');
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/90 text-amber-300 hover:text-white hover:bg-slate-700 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95";
  } else {
    if (icon) icon.textContent = '🌙';
    if (text) text.textContent = 'Modo Oscuro';
    btn.setAttribute('title', 'Cambiar a Modo Oscuro para TV');
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E3D8C6] bg-[#F2ECE1] text-[#2B1E16] hover:bg-[#EAE2D4] font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95";
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initDeliveryState();
  setupEventListeners();
  startClock();
  await loadCatalog();
  await loadOrders();
  renderApp();
  setupAutoRefresh();
});

function initDeliveryState() {
  // Purgar listas obsoletas de índices de fila de versiones previas
  try {
    localStorage.removeItem('sugar_realizados_indices');
    localStorage.removeItem('sugar_delivered_indices');
    localStorage.removeItem('sugar_delivery_indices');
  } catch (e) {}

  state.deliveryDrivers = getLocalDeliveryDrivers();
  state.deliveriesMeta = getLocalDeliveriesMeta();
  state.localRealizados = new Set();
  state.localDeliveryIndices = new Set();
  state.productionDiscounts = getLocalProductionDiscounts();
  state.wheelAdjustments = getLocalWheelAdjustments();
}

// Cargar catálogo de productos
async function loadCatalog() {
  if (window.SUGAR_CATALOG && Array.isArray(window.SUGAR_CATALOG)) {
    state.catalog = window.SUGAR_CATALOG;
    return;
  }
  try {
    const res = await fetch('./catalogo.json');
    if (res.ok) {
      state.catalog = await res.json();
    }
  } catch (err) {
    console.warn('Catálogo local cargado en modo contingencia');
  }
}

// Helpers de persistencia local (compatibilidad legacy sin corromper por número de fila)
function getLocalDeliveredIndices() {
  return new Set();
}

function saveLocalDeliveredIndices(indicesSet) {
  // Ya no se guardan índices numéricos de fila en localStorage para no corromper nuevos pedidos semanales
}

function getLocalRealizadosIndices() {
  return new Set();
}

function saveLocalRealizadosIndices(indicesSet) {
  // Ya no se guardan índices numéricos de fila en localStorage para no corromper nuevos pedidos semanales
}

function getLocalDeliveryIndices() {
  return new Set();
}

function saveLocalDeliveryIndices(indicesSet) {
  // Ya no se guardan índices numéricos de fila en localStorage para no corromper nuevos pedidos semanales
}

function getLocalDeliveriesMeta() {
  try {
    const raw = localStorage.getItem('sugar_deliveries_meta');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalDeliveriesMeta(metaObj) {
  try {
    localStorage.setItem('sugar_deliveries_meta', JSON.stringify(metaObj));
  } catch (e) {
    console.error('Error al guardar deliveries meta:', e);
  }
}

const DEFAULT_DRIVERS = ['Yonaiber', 'Slater', 'otro 1', 'otro 2'];

function getLocalDeliveryDrivers() {
  try {
    const raw = localStorage.getItem('sugar_delivery_drivers');
    if (!raw) {
      saveLocalDeliveryDrivers(DEFAULT_DRIVERS);
      return DEFAULT_DRIVERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.includes('Carlos Delivery')) {
      saveLocalDeliveryDrivers(DEFAULT_DRIVERS);
      return DEFAULT_DRIVERS;
    }
    let modified = false;
    DEFAULT_DRIVERS.forEach(d => {
      if (!parsed.includes(d)) {
        parsed.push(d);
        modified = true;
      }
    });
    if (modified) saveLocalDeliveryDrivers(parsed);
    return parsed;
  } catch (e) {
    return DEFAULT_DRIVERS;
  }
}

function saveLocalDeliveryDrivers(driversArr) {
  try {
    localStorage.setItem('sugar_delivery_drivers', JSON.stringify(driversArr));
  } catch (e) {
    console.error('Error al guardar repartidores:', e);
  }
}

// --- PERSISTENCIA Y AJUSTE DE UNIDADES EN BLOQUE DE RUEDAS ---
function getLocalWheelAdjustments() {
  try {
    const raw = localStorage.getItem('sugar_wheel_adjustments');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalWheelAdjustments(adj) {
  try {
    localStorage.setItem('sugar_wheel_adjustments', JSON.stringify(adj));
  } catch (e) {
    console.error('Error al guardar ajustes de ruedas:', e);
  }
}

// Modificar unidades manuales en el bloque de ruedas (+ muestras o - sobrantes)
function adjustRuedaUnits(category, ruedaKey, delta) {
  if (!ruedaKey) return;
  const dough = state.activeDough || 'hamburguesa';
  const adjKey = `${dough}_${category}_${ruedaKey}`;
  if (!state.wheelAdjustments) state.wheelAdjustments = {};

  if (delta === 'reset') {
    delete state.wheelAdjustments[adjKey];
    saveLocalWheelAdjustments(state.wheelAdjustments);
    renderProduccion();
    showToastNotification('↺ Ajuste de unidades restablecido.');
    return;
  }

  const current = Number(state.wheelAdjustments[adjKey]) || 0;
  const next = current + Number(delta);
  if (next === 0) {
    delete state.wheelAdjustments[adjKey];
  } else {
    state.wheelAdjustments[adjKey] = next;
  }
  saveLocalWheelAdjustments(state.wheelAdjustments);
  renderProduccion();

  const labelRueda = ruedaKey.replace(/_/g, ' ');
  if (delta > 0) {
    showToastNotification(`➕ Añadida muestra: +${delta} un a ${labelRueda}`);
  } else {
    showToastNotification(`➖ Descontado pan sobrante: ${delta} un a ${labelRueda}`);
  }
}
window.adjustRuedaUnits = adjustRuedaUnits;

// --- PERSISTENCIA Y AJUSTE DE DESCUENTO DE PAQUETES EN PRODUCCIÓN ---
function getLocalProductionDiscounts() {
  try {
    const raw = localStorage.getItem('sugar_production_discounts');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalProductionDiscounts(discounts) {
  try {
    localStorage.setItem('sugar_production_discounts', JSON.stringify(discounts));
  } catch (e) {}
}

function adjustProductDiscount(discountKey, deltaPackages, paquetesOriginal = null) {
  if (!discountKey) return;
  const current = Number(state.productionDiscounts[discountKey]) || 0;
  let next = current + deltaPackages;
  if (paquetesOriginal !== null && (paquetesOriginal + next) < 0) {
    next = -paquetesOriginal;
  }
  if (next === 0) {
    delete state.productionDiscounts[discountKey];
  } else {
    state.productionDiscounts[discountKey] = next;
  }
  saveLocalProductionDiscounts(state.productionDiscounts);
  renderProduccion();

  if (deltaPackages > 0) {
    showToastNotification(`➕ Sumado +${deltaPackages} paquete(s) a la producción`);
  } else {
    showToastNotification(`➖ Restado ${Math.abs(deltaPackages)} paquete(s) de la producción`);
  }
}

function resetProductDiscount(discountKey) {
  if (!discountKey) return;
  delete state.productionDiscounts[discountKey];
  saveLocalProductionDiscounts(state.productionDiscounts);
  renderProduccion();
}

function resetAllProductionDiscounts(dough = null) {
  if (dough) {
    const prefix = `${dough}:::`;
    Object.keys(state.productionDiscounts).forEach(k => {
      if (k.startsWith(prefix)) {
        delete state.productionDiscounts[k];
      }
    });
  } else {
    state.productionDiscounts = {};
  }
  saveLocalProductionDiscounts(state.productionDiscounts);
  renderProduccion();
  showToastNotification("↺ Descuentos de producción restablecidos.");
}

// Cargar pedidos desde Apps Script o usar Mocks
async function loadOrders() {
  if (state.apiUrl) {
    try {
      showSyncIndicator(true);
      const res = await fetch(`${state.apiUrl}?action=getOrders`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.orders)) {
        state.orders = data.orders.map(o => {
          // El estado proviene directamente de Google Sheets (Columna L) como única fuente de verdad
          let estado = normalizarEstado(o.estado);
          let entrega = o.entrega || 'Retiro en Tienda';

          // Si Google Sheets trae columnas de repartidor/costo/liquidado
          if (o.repartidor || o.costo_delivery || typeof o.liquidado !== 'undefined') {
            const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
            const cardKey = `${o.cliente}___${rawFecha}`;
            const isLiq = typeof o.liquidado === 'boolean' 
              ? o.liquidado 
              : (String(o.liquidado).toUpperCase() === 'SI' || String(o.liquidado).toUpperCase() === 'TRUE');
            const cost = parseFloat(o.costo_delivery) || 0;
            const driver = o.repartidor || '';

            state.deliveriesMeta[o.rowIndex] = {
              repartidor: driver,
              costo: cost,
              liquidado: isLiq
            };
            state.deliveriesMeta[cardKey] = state.deliveriesMeta[o.rowIndex];
          }

          return { ...o, estado, entrega };
        });
        saveLocalDeliveriesMeta(state.deliveriesMeta);
        saveLocalOrders();
        showSyncIndicator(false);
        return;
      }
    } catch (err) {
      console.error('Error al conectar con Google Sheets:', err);
    }
  }

  // Fallback a localStorage o Mock inicial
  const saved = localStorage.getItem('sugar_orders_cache');
  if (saved) {
    try {
      state.orders = JSON.parse(saved);
      state.orders.forEach(o => {
        o.estado = normalizarEstado(o.estado);
        o.entrega = o.entrega || 'Retiro en Tienda';
      });
    } catch (e) {
      state.orders = MOCK_ORDERS.map(o => ({ ...o, estado: normalizarEstado(o.estado) }));
    }
  } else {
    state.orders = MOCK_ORDERS.map(o => ({ ...o, estado: normalizarEstado(o.estado) }));
    saveLocalOrders();
  }
  showSyncIndicator(false);
}

function saveLocalOrders() {
  localStorage.setItem('sugar_orders_cache', JSON.stringify(state.orders));
}

// --- RELOJ EN VIVO ---
function startClock() {
  const clockEl = document.getElementById('tv-clock');
  function update() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
    }
  }
  setInterval(update, 1000);
  update();
}

// Indicador visual de sincronización
function showSyncIndicator(isLoading) {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (isLoading) {
    badge.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping mr-2"></span> Sincronizando...`;
    badge.className = "hidden sm:flex items-center text-xs font-medium text-amber-300 bg-amber-900/40 px-3 py-1.5 rounded-full border border-amber-500/30";
  } else {
    if (state.apiUrl) {
      badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2"></span> Google Sheets • Manual <span class="text-slate-400 font-mono text-[11px] ml-1">(${timeStr})</span>`;
      badge.className = "hidden sm:flex items-center text-xs font-medium text-emerald-300 bg-emerald-900/40 px-3 py-1.5 rounded-full border border-emerald-500/30";
    } else {
      badge.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2"></span> Modo Local • Auto-sync <span class="text-slate-400 font-mono text-[11px] ml-1">(${timeStr})</span>`;
      badge.className = "hidden sm:flex items-center text-xs font-medium text-amber-300 bg-amber-900/40 px-3 py-1.5 rounded-full border border-amber-500/30";
    }
  }
}

// Disparar actualización manual de datos (a demanda mediante el botón)
async function triggerManualRefresh() {
  const btn = document.getElementById('btn-manual-refresh');
  const icon = document.getElementById('icon-refresh-manual');
  const text = document.getElementById('text-refresh-manual');

  if (icon) icon.classList.add('animate-spin');
  if (text) text.textContent = 'Cargando...';
  if (btn) btn.disabled = true;

  showSyncIndicator(true);

  try {
    await loadOrders();
    renderApp();
    const source = state.apiUrl ? 'Google Sheets' : 'Memoria Local';
    showToastNotification(`🔄 Datos actualizados correctamente desde ${source}.`);
  } catch (err) {
    console.error("Error al actualizar manualmente:", err);
    showToastNotification("⚠️ Error al actualizar pedidos.");
  } finally {
    if (icon) icon.classList.remove('animate-spin');
    if (text) text.textContent = 'Actualizar';
    if (btn) btn.disabled = false;
    showSyncIndicator(false);
  }
}

// --- CONFIGURACIÓN DE EVENTOS ---
function setupEventListeners() {
  // Tabs principales (Pedidos / Producción TV / Entregas / Deliverys)
  document.getElementById('nav-pedidos').addEventListener('click', () => switchTab('pedidos'));
  document.getElementById('nav-produccion').addEventListener('click', () => switchTab('produccion'));
  const navEntregas = document.getElementById('nav-entregas');
  if (navEntregas) {
    navEntregas.addEventListener('click', () => switchTab('entregas'));
  }
  const navDeliverys = document.getElementById('nav-deliverys');
  if (navDeliverys) {
    navDeliverys.addEventListener('click', () => switchTab('deliverys'));
  }

  // Buscador y filtros de Deliverys
  const searchDeliverys = document.getElementById('input-search-deliverys');
  if (searchDeliverys) {
    searchDeliverys.addEventListener('input', (e) => {
      state.searchTermDeliverys = e.target.value.toLowerCase();
      renderDeliverys();
    });
  }

  const filterDriverDeliv = document.getElementById('filter-driver-deliverys');
  if (filterDriverDeliv) {
    filterDriverDeliv.addEventListener('change', (e) => {
      state.filterDriverDeliverys = e.target.value;
      renderDeliverys();
    });
  }

  const filterStatusDeliv = document.getElementById('filter-status-deliverys');
  if (filterStatusDeliv) {
    filterStatusDeliv.addEventListener('change', (e) => {
      state.filterStatusDeliverys = e.target.value;
      renderDeliverys();
    });
  }

  // Botón para alternar tabla de liquidación de repartidores
  const btnToggleSettlement = document.getElementById('btn-toggle-settlement-panel');
  if (btnToggleSettlement) {
    btnToggleSettlement.addEventListener('click', () => {
      state.showSettlementPanel = !state.showSettlementPanel;
      const panel = document.getElementById('container-settlement-table');
      if (panel) {
        if (state.showSettlementPanel) {
          panel.classList.remove('hidden');
          btnToggleSettlement.innerHTML = `<span>🔼</span> Ocultar Tabla de Liquidación`;
          btnToggleSettlement.classList.replace('bg-purple-600/30', 'bg-purple-600/60');
        } else {
          panel.classList.add('hidden');
          btnToggleSettlement.innerHTML = `<span>📊</span> Ver Tabla de Liquidación`;
          btnToggleSettlement.classList.replace('bg-purple-600/60', 'bg-purple-600/30');
        }
      }
    });
  }

  // Modal de registro de repartidores
  const btnAddDriver = document.getElementById('btn-add-driver');
  if (btnAddDriver) btnAddDriver.addEventListener('click', openAddDriverModal);

  const btnCloseDriverModal = document.getElementById('btn-close-driver-modal');
  if (btnCloseDriverModal) btnCloseDriverModal.addEventListener('click', closeAddDriverModal);

  const btnCancelDriverModal = document.getElementById('btn-cancel-driver-modal');
  if (btnCancelDriverModal) btnCancelDriverModal.addEventListener('click', closeAddDriverModal);

  const backdropDriverModal = document.getElementById('modal-driver-backdrop');
  if (backdropDriverModal) backdropDriverModal.addEventListener('click', closeAddDriverModal);

  const btnSaveDriver = document.getElementById('btn-save-driver-modal');
  if (btnSaveDriver) btnSaveDriver.addEventListener('click', saveNewDriver);

  const inputNewDriver = document.getElementById('input-new-driver-name');
  if (inputNewDriver) {
    inputNewDriver.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveNewDriver();
    });
  }

  // Buscador y filtro de Entregas
  const searchEntregas = document.getElementById('input-search-entregas');
  if (searchEntregas) {
    searchEntregas.addEventListener('input', (e) => {
      state.searchTermEntregas = e.target.value.toLowerCase();
      renderEntregas();
    });
  }

  const filterDeliveryEntregas = document.getElementById('filter-delivery-entregas');
  if (filterDeliveryEntregas) {
    filterDeliveryEntregas.addEventListener('change', (e) => {
      state.filterDeliveryEntregas = e.target.value;
      renderEntregas();
    });
  }

  const filterStatusEntregas = document.getElementById('filter-status-entregas');
  if (filterStatusEntregas) {
    filterStatusEntregas.addEventListener('change', (e) => {
      state.filterStatusEntregas = e.target.value;
      renderEntregas();
    });
  }

  // Modal de confirmación para Vaciar Producción
  const btnCancelClear = document.getElementById('btn-cancel-clear');
  const btnConfirmClear = document.getElementById('btn-confirm-clear');
  const modalClearBackdrop = document.getElementById('modal-clear-backdrop');

  if (btnCancelClear) btnCancelClear.addEventListener('click', closeClearProductionModal);
  if (modalClearBackdrop) modalClearBackdrop.addEventListener('click', closeClearProductionModal);
  if (btnConfirmClear) btnConfirmClear.addEventListener('click', executeClearProduction);

  // Selector de masas en Producción
  document.querySelectorAll('.btn-dough').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dough = e.currentTarget.dataset.dough;
      setDough(dough);
    });
  });

  // Botón Fullscreen para TV
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  // Botón Ver Fórmula (Modal Pantalla Completa 100vw x 100vh)
  const btnFormula = document.getElementById('btn-formula');
  if (btnFormula) btnFormula.addEventListener('click', openFormulaModal);
  const btnCloseFormula = document.getElementById('btn-close-modal');
  if (btnCloseFormula) btnCloseFormula.addEventListener('click', closeFormulaModal);

  // Botón Consolidado por Productos y Toppings (Modal Pantalla Completa 100vw x 100vh)
  const btnOpenToppings = document.getElementById('btn-open-toppings-modal');
  if (btnOpenToppings) btnOpenToppings.addEventListener('click', openToppingsModal);
  const btnCloseToppings = document.getElementById('btn-close-toppings-modal');
  if (btnCloseToppings) btnCloseToppings.addEventListener('click', closeToppingsModal);
  const btnModalReset = document.getElementById('btn-modal-reset-discounts');
  if (btnModalReset) btnModalReset.addEventListener('click', resetAllProductionDiscounts);

  // Filtros rápidos por categoría en modal consolidado (Req 2.A)
  document.querySelectorAll('.btn-modal-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.modalCategoryFilter = e.currentTarget.dataset.cat || 'ALL';
      document.querySelectorAll('.btn-modal-cat').forEach(b => {
        if (b.dataset.cat === state.modalCategoryFilter) {
          b.className = "btn-modal-cat px-3 py-1 rounded-lg text-xs font-black transition-all bg-amber-500 text-slate-950 shadow-sm";
        } else {
          b.className = "btn-modal-cat px-3 py-1 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
        }
      });
      renderModalConsolidadoProductos(state.currentToppingsConsolidados, state.currentTotalPanes, state.currentTotalPaquetes);
    });
  });

  // Cierre accesible de modales con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFormulaModal();
      closeToppingsModal();
      closeClearProductionModal();
    }
  });

  // Botón Copiar Toppings para Hornero
  const btnCopyHornero = document.getElementById('btn-copy-hornero');
  if (btnCopyHornero) {
    btnCopyHornero.addEventListener('click', copyToppingsHornero);
  }

  // Botón Producción Terminada (Marcar todo lo que está en producción como Realizado)
  const btnProdTerminada = document.getElementById('btn-produccion-terminada');
  if (btnProdTerminada) {
    btnProdTerminada.addEventListener('click', markAllProductionAsRealizado);
  }

  // Botón Vaciar Producción (Abre modal de confirmación detallado)
  const btnClearProd = document.getElementById('btn-clear-production');
  if (btnClearProd) {
    btnClearProd.addEventListener('click', openClearProductionModal);
  }

  // Botón Refrescar Manual (Global en el header)
  const btnManualRefresh = document.getElementById('btn-manual-refresh');
  if (btnManualRefresh) {
    btnManualRefresh.addEventListener('click', triggerManualRefresh);
  }

  // Botón Refrescar de la barra de Producción TV
  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', triggerManualRefresh);
  }

  // Selector de rotación automática para TV
  const autoRotateBtn = document.getElementById('btn-auto-rotate');
  if (autoRotateBtn) {
    autoRotateBtn.addEventListener('click', toggleAutoRotate);
  }

  // Envío a Producción de pedidos seleccionados
  const btnSendProd = document.getElementById('btn-send-production');
  if (btnSendProd) {
    btnSendProd.addEventListener('click', sendSelectedToProduction);
  }

  // Seleccionar todos los pendientes
  const btnSelectAll = document.getElementById('btn-select-all');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', toggleSelectAllPending);
  }

  // Buscador de pedidos
  const searchInput = document.getElementById('input-search-orders');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value.toLowerCase();
      renderPedidos();
    });
  }

  // Filtros superiores
  const filterStatusEl = document.getElementById('filter-status');
  if (filterStatusEl) {
    filterStatusEl.value = state.filterStatus;
    filterStatusEl.addEventListener('change', (e) => {
      state.filterStatus = e.target.value;
      renderPedidos();
    });
  }

  const filterDeliveryEl = document.getElementById('filter-delivery');
  if (filterDeliveryEl) {
    filterDeliveryEl.value = state.filterDelivery;
    filterDeliveryEl.addEventListener('change', (e) => {
      state.filterDelivery = e.target.value;
      renderPedidos();
    });
  }

  const filterSortEl = document.getElementById('filter-sort');
  if (filterSortEl) {
    filterSortEl.value = state.filterSort;
    filterSortEl.addEventListener('change', (e) => {
      state.filterSort = e.target.value;
      renderPedidos();
    });
  }

  // Configuración de API URL
  const btnConfig = document.getElementById('btn-config-api');
  if (btnConfig) {
    btnConfig.addEventListener('click', promptApiUrl);
  }

  // Selector de Tema (Modo Claro Cálido / Modo Oscuro)
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
  }

  // Botón para restablecer todos los descuentos de paquetes en la masa activa
  const btnResetAllDiscounts = document.getElementById('btn-reset-all-discounts');
  if (btnResetAllDiscounts) {
    btnResetAllDiscounts.addEventListener('click', () => {
      resetAllProductionDiscounts(state.activeDough);
    });
  }
}

// Alternar pestañas principales
function switchTab(tab) {
  state.activeTab = tab;
  const navPedidos = document.getElementById('nav-pedidos');
  const navProduccion = document.getElementById('nav-produccion');
  const navEntregas = document.getElementById('nav-entregas');
  const navDeliverys = document.getElementById('nav-deliverys');
  const viewPedidos = document.getElementById('view-pedidos');
  const viewProduccion = document.getElementById('view-produccion');
  const viewEntregas = document.getElementById('view-entregas');
  const viewDeliverys = document.getElementById('view-deliverys');

  const activeClass = "px-4 lg:px-5 py-2.5 rounded-xl font-bold text-xs lg:text-sm bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all";
  const inactiveClass = "px-4 lg:px-5 py-2 rounded-xl font-semibold text-xs lg:text-sm text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all";
  const activeDelivClass = "px-4 lg:px-5 py-2.5 rounded-xl font-bold text-xs lg:text-sm bg-purple-600 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5";
  const inactiveDelivClass = "px-4 lg:px-5 py-2 rounded-xl font-semibold text-xs lg:text-sm text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-1.5";

  // Reset todos
  if (navPedidos) navPedidos.className = inactiveClass;
  if (navProduccion) navProduccion.className = inactiveClass;
  if (navEntregas) navEntregas.className = inactiveClass;
  if (navDeliverys) navDeliverys.className = inactiveDelivClass;

  if (viewPedidos) viewPedidos.classList.add('hidden');
  if (viewProduccion) viewProduccion.classList.add('hidden');
  if (viewEntregas) viewEntregas.classList.add('hidden');
  if (viewDeliverys) viewDeliverys.classList.add('hidden');

  if (tab === 'pedidos') {
    if (navPedidos) navPedidos.className = activeClass;
    if (viewPedidos) viewPedidos.classList.remove('hidden');
    renderPedidos();
  } else if (tab === 'produccion') {
    if (navProduccion) navProduccion.className = activeClass;
    if (viewProduccion) viewProduccion.classList.remove('hidden');
    renderProduccion();
  } else if (tab === 'entregas') {
    if (navEntregas) navEntregas.className = activeClass;
    if (viewEntregas) viewEntregas.classList.remove('hidden');
    renderEntregas();
  } else if (tab === 'deliverys') {
    if (navDeliverys) navDeliverys.className = activeDelivClass;
    if (viewDeliverys) viewDeliverys.classList.remove('hidden');
    renderDeliverys();
  }

  updateNavCounters();
}

// Seleccionar masa activa en TV
function setDough(dough) {
  state.activeDough = dough;
  document.querySelectorAll('.btn-dough').forEach(btn => {
    if (btn.dataset.dough === dough) {
      btn.className = "btn-dough px-6 py-2.5 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-105 transition-all";
    } else {
      btn.className = "btn-dough px-5 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:text-white bg-slate-800/90 border border-slate-700/60 transition-all";
    }
  });
  renderProduccion();
}

// Pantalla completa
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      document.body.classList.add('tv-kiosk-mode');
    }).catch(err => {
      console.warn("Fullscreen request error:", err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        if (!state.isAutoRotate) {
          document.body.classList.remove('tv-kiosk-mode');
        }
      });
    }
  }
}

// Rotación automática entre masas en TV
function toggleAutoRotate() {
  state.isAutoRotate = !state.isAutoRotate;
  const btn = document.getElementById('btn-auto-rotate');
  if (state.isAutoRotate) {
    btn.classList.add('bg-amber-500/20', 'text-amber-300', 'border-amber-400');
    document.body.classList.add('tv-kiosk-mode');
    const order = ['brioche', 'papa', 'dulce', 'burrero', 'jamon'];
    state.autoRotateInterval = setInterval(() => {
      const idx = order.indexOf(state.activeDough);
      const nextDough = order[(idx + 1) % order.length];
      setDough(nextDough);
    }, 45000); // Rota cada 45 segundos
  } else {
    btn.classList.remove('bg-amber-500/20', 'text-amber-300', 'border-amber-400');
    if (!document.fullscreenElement) {
      document.body.classList.remove('tv-kiosk-mode');
    }
    clearInterval(state.autoRotateInterval);
  }
}

// Auto-refresh de pedidos (solo activo si NO hay Apps Script vinculado)
function setupAutoRefresh() {
  if (state.autoRefreshInterval) {
    clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = null;
  }

  // Si Apps Script está vinculado, NO refrescar automáticamente (control manual a demanda mediante el botón)
  if (state.apiUrl) {
    console.log("Apps Script vinculado: Auto-refresh automático desactivado por solicitud del usuario. Usa el botón 'Actualizar'.");
    return;
  }

  // Si está en modo de prueba local sin API, mantener polling de demostración cada 30s
  state.autoRefreshInterval = setInterval(async () => {
    await loadOrders();
    renderApp();
  }, 30000);
}

// --- RENDERIZADO GLOBAL ---
function renderApp() {
  updateNavCounters();
  if (state.activeTab === 'pedidos') {
    renderPedidos();
  } else if (state.activeTab === 'produccion') {
    renderProduccion();
  } else if (state.activeTab === 'entregas') {
    renderEntregas();
  } else if (state.activeTab === 'deliverys') {
    renderDeliverys();
  }
}

// ==========================================
// SECCIÓN 1: PEDIDOS
// ==========================================
function renderPedidos() {
  const container = document.getElementById('orders-grid');
  if (!container) return;

  // Actualizar estadísticas superiores
  const totalOrders = state.orders.length;
  const pendingOrders = state.orders.filter(o => normalizarEstado(o.estado) === 'PENDIENTE').length;
  const prodOrders = state.orders.filter(o => normalizarEstado(o.estado) === 'EN_PRODUCCION').length;

  const statTotal = document.getElementById('stat-total-orders');
  const statPending = document.getElementById('stat-pending-orders');
  const statProd = document.getElementById('stat-prod-orders');
  const statMonto = document.getElementById('stat-total-monto');
  if (statTotal) statTotal.textContent = `Total: ${totalOrders} pedidos`;
  if (statPending) statPending.textContent = `${pendingOrders} pendientes`;
  if (statProd) statProd.textContent = `${prodOrders} en producción`;

  // Filtrado de pedidos
  const filtered = state.orders.filter(o => {
    // 1. Buscador
    const matchSearch = !state.searchTerm || 
      (o.cliente && o.cliente.toLowerCase().includes(state.searchTerm)) ||
      (o.producto && o.producto.toLowerCase().includes(state.searchTerm)) ||
      (o.telefono && o.telefono.includes(state.searchTerm)) ||
      (o.entrega && o.entrega.toLowerCase().includes(state.searchTerm));

    if (!matchSearch) return false;

    // 2. Filtro por Estado (Únicamente Pendientes y En producción - Req 2.1)
    const st = normalizarEstado(o.estado);
    if (state.filterStatus === 'PENDIENTE' && st !== 'PENDIENTE') return false;
    if (state.filterStatus === 'EN_PRODUCCION' && st !== 'EN_PRODUCCION') return false;

    // 3. Filtro por Modalidad
    if (state.filterDelivery === 'RETIRO') {
      if (isDeliveryOrder(o)) return false;
    } else if (state.filterDelivery === 'DELIVERY') {
      if (!isDeliveryOrder(o)) return false;
    }

    return true;
  });

  // Agrupar por Cliente y Marca de Tiempo del pedido, acumulando monto total
  const groups = {};
  let totalMontoFiltered = 0;

  filtered.forEach(o => {
    const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
    const key = `${o.cliente}___${rawFecha}`;
    const itemMonto = getItemMonto(o);
    totalMontoFiltered += itemMonto;

    if (!groups[key]) {
      const dateParts = formatFriendlyDateParts(rawFecha);
      groups[key] = {
        key: key,
        cliente: o.cliente,
        fechaRaw: rawFecha,
        fechaDate: dateParts.date,
        fechaTime: dateParts.time,
        telefono: o.telefono,
        entrega: o.entrega,
        items: [],
        totalMonto: 0
      };
    }
    groups[key].items.push(o);
    groups[key].totalMonto += itemMonto;
  });

  if (statMonto) statMonto.textContent = `$${totalMontoFiltered.toFixed(2)} total`;

  let groupKeys = Object.keys(groups);

  // Orden cronológico (ASC = más antiguos primero, DESC = más recientes primero)
  groupKeys.sort((a, b) => {
    const dateA = parseDateToTimestamp(groups[a].fechaRaw);
    const dateB = parseDateToTimestamp(groups[b].fechaRaw);
    return state.filterSort === 'DESC' ? dateB - dateA : dateA - dateB;
  });

  if (groupKeys.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        <p class="text-lg font-bold text-slate-300">No hay pedidos que coincidan con los filtros aplicados.</p>
        <p class="text-xs text-slate-500 mt-1">Prueba cambiando el estado a "Todos" o limpiando el buscador.</p>
      </div>`;
    updateSelectedButtonState();
    return;
  }

  container.innerHTML = groupKeys.map(key => {
    const g = groups[key];
    const allDelivered = g.items.every(i => normalizarEstado(i.estado) === 'ENTREGADO');
    const allRealizado = g.items.every(i => normalizarEstado(i.estado) === 'REALIZADO' || normalizarEstado(i.estado) === 'ENTREGADO');
    const allInProd = g.items.every(i => normalizarEstado(i.estado) === 'EN_PRODUCCION');
    const someInProd = g.items.some(i => normalizarEstado(i.estado) === 'EN_PRODUCCION');
    const hasPendingItems = g.items.some(i => normalizarEstado(i.estado) === 'PENDIENTE');

    // Estilo de la tarjeta según estado real
    let cardBorder = "border-slate-800 hover:border-amber-500/40 bg-slate-900/90";
    let badgeHtml = '';
    if (allDelivered) {
      cardBorder = "border-emerald-500/40 bg-slate-900/80 shadow-lg shadow-emerald-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">✅ ENTREGADO</span>`;
    } else if (allRealizado) {
      cardBorder = "border-cyan-500/40 bg-slate-900/80 shadow-lg shadow-cyan-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 whitespace-nowrap">🥖 FABRICADO</span>`;
    } else if (allInProd) {
      cardBorder = "border-amber-500/50 bg-slate-900/80 shadow-lg shadow-amber-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">📺 EN PRODUCCIÓN</span>`;
    } else if (someInProd) {
      cardBorder = "border-amber-500/40 bg-slate-900/90 shadow-lg shadow-amber-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap">🔄 PARCIAL</span>`;
    } else {
      cardBorder = "border-slate-800 hover:border-blue-500/40 bg-slate-900/90";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap">⏳ PENDIENTE</span>`;
    }

    // Modalidad de entrega limpia
    let entregaHtml = '';
    if (g.entrega) {
      const entLower = g.entrega.toLowerCase();
      if (entLower.includes('retiro') || entLower.includes('no')) {
        entregaHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">🏪 Retiro en Tienda</span>`;
      } else {
        const limpia = g.entrega.replace(/^sí\s*-\s*/i, '').replace(/^si\s*-\s*/i, '').trim();
        entregaHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">🛵 Delivery: ${limpia || 'A domicilio'}</span>`;
      }
    }

    // Teléfono con enlace WhatsApp
    let telHtml = '';
    if (g.telefono) {
      const cleanTel = g.telefono.replace(/[^0-9]/g, '');
      telHtml = `
        <a href="https://wa.me/${cleanTel}" target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all">
          <span>💬 ${g.telefono}</span>
        </a>`;
    }

    const rowsHtml = g.items.map(item => {
      const itemSt = normalizarEstado(item.estado);
      const isChecked = state.selectedOrders.has(item.rowIndex);
      const isProd = itemSt === 'EN_PRODUCCION';
      const isPending = itemSt === 'PENDIENTE';
      const isSelectable = isPending;
      const uPorPaq = getUnidadesPorPaquete(item);
      const totalUnits = (item.paquetes || 0) * uPorPaq;

      let badgeItem = '';
      if (itemSt === 'ENTREGADO') {
        badgeItem = `<span class="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30">✅ Entregado</span>`;
      } else if (itemSt === 'REALIZADO') {
        badgeItem = `<span class="px-2.5 py-1 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30">🥖 Fabricado</span>`;
      } else if (isProd) {
        badgeItem = `
          <button class="btn-retire-item inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black text-amber-300 hover:text-white bg-amber-500/15 hover:bg-rose-600 border border-amber-500/30 hover:border-rose-600 transition-all cursor-pointer shadow-sm group" data-row="${item.rowIndex}" title="Clic para retirar este ítem de Producción TV y devolver a Pendientes">
            <span class="group-hover:hidden">📺 En TV</span>
            <span class="hidden group-hover:inline">Devolver</span>
            <span class="text-amber-400 group-hover:text-white font-black text-[10px]">✕</span>
          </button>`;
      } else {
        badgeItem = `<span class="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-400 bg-slate-800/80 border border-slate-700/80">⏳ Pendiente</span>`;
      }

      return `
        <tr class="order-row border-b border-slate-800/70 hover:bg-slate-800/50 text-sm ${!isSelectable ? 'opacity-70' : 'cursor-pointer'}" data-row="${item.rowIndex}">
          <td class="py-3 px-3 w-8">
            <input type="checkbox" 
                   data-row="${item.rowIndex}" 
                   class="order-checkbox w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 pointer-events-auto"
                   ${isChecked ? 'checked' : ''} 
                   ${!isSelectable ? 'disabled' : ''}>
          </td>
          <td class="py-3 px-2 font-medium text-slate-200">
            ${escapeHtml(item.producto)}
            <span class="block text-xs text-slate-400 font-normal">${escapeHtml(item.presentacion || 'Estándar')} • ${item.peso_gr}g</span>
          </td>
          <td class="py-3 px-2">
            ${getToppingBadgeHtml(item.topping)}
          </td>
          <td class="py-3 px-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
            ${item.paquetes} <span class="text-xs font-normal text-slate-400">pq (${totalUnits} un)</span>
          </td>
          <td class="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
            $${getItemMonto(item).toFixed(2)}
          </td>
          <td class="py-3 px-3 text-right whitespace-nowrap">
            ${badgeItem}
          </td>
        </tr>`;
    }).join('');

    // --- ACCIONES EXCLUSIVAS DE PEDIDOS (Pendientes y En producción - Req 2.1) ---
    let actionButtonsHtml = '';

    // Selector rápido para enviar pendientes a producción
    if (hasPendingItems) {
      actionButtonsHtml += `
        <button class="btn-select-client-items text-amber-400 hover:text-amber-300 font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs" data-card-key="${encodeURIComponent(g.key)}" title="Seleccionar ítems para enviar a producción">
          <span>☑️ Seleccionar Ítems</span>
        </button>`;
    }

    // Acción para retirar tarjeta completa de producción y devolver a pendientes
    if (someInProd || allInProd) {
      actionButtonsHtml += `
        <button class="btn-retire-card text-rose-400 hover:text-white font-black px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Retirar pedido completo de Producción TV y devolver a Pendientes">
          <span>✕ Retirar de Producción</span>
        </button>`;
    }

    return `
      <div class="rounded-3xl border-2 shadow-xl overflow-hidden transition-all flex flex-col justify-between ${cardBorder}">
        
        <!-- Cabecera de la Tarjeta con Monto Total en $ -->
        <div class="p-5 border-b border-slate-800/90 bg-gradient-to-r from-slate-900 to-slate-800/40">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="flex items-center gap-2.5 flex-wrap">
                <h3 class="text-lg font-black text-white tracking-tight">${g.cliente}</h3>
                <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-black tracking-tight shadow-sm" title="Monto total del pedido">
                  $${g.totalMonto.toFixed(2)}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span class="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-amber-300 font-mono text-xs font-bold border border-slate-700/80">
                  📅 ${g.fechaDate}
                </span>
                ${g.fechaTime ? `
                  <span class="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-mono text-xs border border-slate-700/80">
                    🕒 ${g.fechaTime}
                  </span>` : ''}
              </div>
            </div>
            ${badgeHtml}
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            ${entregaHtml}
            ${telHtml}
          </div>
        </div>

        <!-- Tabla de Productos -->
        <div class="p-3 flex-1 overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                <th class="pb-2 px-3 w-8">Sel</th>
                <th class="pb-2 px-2">Producto</th>
                <th class="pb-2 px-2">Topping</th>
                <th class="pb-2 px-3 text-right">Cant.</th>
                <th class="pb-2 px-3 text-right">Monto</th>
                <th class="pb-2 px-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Pie de Tarjeta con total $ y botones de acción -->
        <div class="p-3 bg-slate-950/70 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <span>${g.items.length} ítems</span>
            <span>•</span>
            <span>Total: <strong class="text-emerald-400 font-mono text-sm font-black">$${g.totalMonto.toFixed(2)}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            ${actionButtonsHtml}
          </div>
        </div>

      </div>`;
  }).join('');

  // Vincular eventos de selección por clic en la fila completa
  container.querySelectorAll('.order-row').forEach(rowEl => {
    rowEl.addEventListener('click', (e) => {
      // Si el clic fue directamente en un enlace o botón, no alternar
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

      const rowNum = parseInt(rowEl.dataset.row, 10);
      const cb = rowEl.querySelector('.order-checkbox');
      if (cb && !cb.disabled) {
        if (e.target !== cb) {
          cb.checked = !cb.checked;
        }
        if (cb.checked) {
          state.selectedOrders.add(rowNum);
        } else {
          state.selectedOrders.delete(rowNum);
        }
        updateSelectedButtonState();
      }
    });
  });

  // Botón para seleccionar únicamente los ítems de esta tarjeta
  container.querySelectorAll('.btn-select-client-items').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.target.dataset.cardKey);
      if (groups[cardKey]) {
        groups[cardKey].items.forEach(item => {
          if (normalizarEstado(item.estado) === 'PENDIENTE') {
            state.selectedOrders.add(item.rowIndex);
          }
        });
      }
      renderPedidos();
      updateSelectedButtonState();
    });
  });

  // Botón para retirar ítem individual de producción
  container.querySelectorAll('.btn-retire-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowNum = parseInt(btn.dataset.row, 10);
      retireFromProduction([rowNum], 'ítem');
    });
  });

  // Botón para retirar tarjeta completa de producción
  container.querySelectorAll('.btn-retire-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const prodRowIndices = groups[cardKey].items
          .filter(i => normalizarEstado(i.estado) === 'EN_PRODUCCION')
          .map(i => i.rowIndex);
        if (prodRowIndices.length > 0) {
          retireFromProduction(prodRowIndices, groups[cardKey].cliente);
        }
      }
    });
  });

  // ACCIÓN 1: Marcar como Realizado / Revertir a Producción
  container.querySelectorAll('.btn-action-card-realizado').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-action-card-revert-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        revertToProduccion(rows, groups[cardKey].cliente);
      }
    });
  });

  // ACCIÓN 2: Enviar a Delivery / Cambiar a Retiro en Local
  container.querySelectorAll('.btn-action-card-delivery').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        sendToDelivery(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-action-card-pickup').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        sendToPickup(rows, groups[cardKey].cliente);
      }
    });
  });

  // ACCIÓN 3: Listo para entregar / Despachar / Revertir
  container.querySelectorAll('.btn-action-card-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'ENTREGADO', groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-action-card-revert-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(btn.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'REALIZADO', groups[cardKey].cliente);
      }
    });
  });

  updateSelectedButtonState();
}

function updateSelectedButtonState() {
  const btn = document.getElementById('btn-send-production');
  const countEl = document.getElementById('selected-count');
  const count = state.selectedOrders.size;
  if (countEl) countEl.textContent = count;
  if (btn) {
    btn.disabled = count === 0;
    if (count > 0) {
      // Calcular monto de los ítems seleccionados
      let selectedMonto = 0;
      state.orders.forEach(o => {
        if (state.selectedOrders.has(o.rowIndex)) {
          selectedMonto += getItemMonto(o);
        }
      });
      const montoInfo = selectedMonto > 0 ? ` • $${selectedMonto.toFixed(2)}` : '';
      btn.className = "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 transition-all cursor-pointer";
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        <span>Enviar a Producción (<span id="selected-count">${count}</span> ítems${montoInfo})</span>
      `;
    } else {
      btn.className = "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 transition-all";
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        <span>Enviar a Producción (<span id="selected-count">0</span> ítems)</span>
      `;
    }
  }
}

function toggleSelectAllPending() {
  const pending = state.orders.filter(o => normalizarEstado(o.estado) === 'PENDIENTE');
  if (state.selectedOrders.size === pending.length && pending.length > 0) {
    state.selectedOrders.clear();
  } else {
    pending.forEach(o => state.selectedOrders.add(o.rowIndex));
  }
  renderPedidos();
}

async function sendSelectedToProduction() {
  const rows = Array.from(state.selectedOrders);
  if (rows.length === 0) return;

  const btn = document.getElementById('btn-send-production');
  btn.disabled = true;
  btn.innerHTML = `<span>Enviando al TV...</span>`;

  // Actualizar estado local inmediato
  state.orders.forEach(o => {
    if (state.selectedOrders.has(o.rowIndex)) {
      o.estado = 'EN_PRODUCCION';
    }
  });
  saveLocalOrders();
  state.selectedOrders.clear();

  // Si hay API URL configurada, persistir en Google Apps Script
  if (state.apiUrl) {
    try {
      await fetch(state.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateOrderStatus',
          rowIndices: rows,
          status: 'EN_PRODUCCION'
        })
      });
    } catch (err) {
      console.error('Error al persistir en Sheets:', err);
    }
  }

  // Notificación toast de éxito
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (toast && toastMsg) {
    toastMsg.textContent = `${rows.length} pedido(s) enviados a Producción con éxito.`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4500);
  }

  renderPedidos();
  // Cambiar a la vista de Producción para ver el resultado
  switchTab('produccion');
}

// Retirar pedidos o ítems específicos de producción (regresándolos a Pendientes)
function retireFromProduction(rowIndices, label = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  // 1. Actualizar estado local inmediatamente
  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'PENDIENTE';
    }
  });
  saveLocalOrders();

  // 2. Deseleccionar si estuviesen en el set de selección
  rowIndices.forEach(idx => state.selectedOrders.delete(idx));

  // 3. Sincronizar de forma asíncrona con Google Sheets (columna Estado_SugarApp)
  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        rowIndices: rowIndices,
        status: 'PENDIENTE'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar retiro en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  // 4. Re-renderizar de inmediato Pedidos, Producción TV y Entregas
  renderAllViews();

  // 5. Notificación toast de confirmación inmediata
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (toast && toastMsg) {
    const text = rowIndices.length === 1 
      ? `Ítem retirado de Producción TV y devuelto a Pendientes.`
      : `${rowIndices.length} ítems retirados de Producción TV y devueltos a Pendientes.`;
    toastMsg.textContent = `↩️ ${text}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }
}

// Escapar texto para inserción HTML segura
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Colores distintivos y badges de alta legibilidad por tipo de Topping (Req 3)
function getToppingBadgeHtml(toppingName, extraClass = '') {
  const raw = (toppingName || '').trim();
  const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let badgeClass = 'topping-badge-natural';
  let icon = '🍞';

  if (norm.includes('ajon') && norm.includes('oreg')) {
    badgeClass = 'topping-badge-ajon-oreg';
    icon = '🌿';
  } else if (norm.includes('ajon') && norm.includes('sesam')) {
    badgeClass = 'topping-badge-ajon-sesamo';
    icon = '✨';
  } else if (norm.includes('ajon') || norm.includes('sesam')) {
    badgeClass = 'topping-badge-ajonjoli';
    icon = '✨';
  } else if (norm.includes('oregan') || norm.includes('hierba')) {
    badgeClass = 'topping-badge-oregano';
    icon = '🌿';
  } else if (norm.includes('queso') || norm.includes('parmesan') || norm.includes('cheddar')) {
    badgeClass = 'topping-badge-parmesano';
    icon = '🧀';
  } else if (norm.includes('amapola') || norm.includes('semilla') || norm.includes('chia')) {
    badgeClass = 'topping-badge-amapola';
    icon = '🌱';
  } else if (!norm || norm.includes('sin') || norm.includes('natural') || norm.includes('ningun')) {
    badgeClass = 'topping-badge-natural';
    icon = '🍞';
  } else {
    badgeClass = 'topping-badge-otros';
    icon = '🥯';
  }

  const displayText = raw || 'Sin Topping';
  return `<span class="topping-badge ${badgeClass} ${extraClass}" title="Topping: ${escapeHtml(displayText)}"><span class="text-[11px] leading-none">${icon}</span><span>${escapeHtml(displayText)}</span></span>`;
}

// Actualizar contadores de las pestañas de navegación
function updateNavCounters() {
  const badgeDeliv = document.getElementById('badge-nav-deliverys');
  if (badgeDeliv) {
    const deliveryOrders = state.orders.filter(o => isDeliveryOrder(o));
    const deliveryGroups = new Set();
    deliveryOrders.forEach(o => {
      const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
      deliveryGroups.add(`${o.cliente}___${rawFecha}`);
    });
    const count = deliveryGroups.size;
    badgeDeliv.textContent = count;
    if (count > 0) {
      badgeDeliv.classList.remove('hidden');
    } else {
      badgeDeliv.classList.add('hidden');
    }
  }
}

// Re-renderizar la vista activa y contadores
function renderAllViews() {
  updateNavCounters();
  if (state.activeTab === 'pedidos') {
    renderPedidos();
  } else if (state.activeTab === 'produccion') {
    renderProduccion();
  } else if (state.activeTab === 'entregas') {
    renderEntregas();
  } else if (state.activeTab === 'deliverys') {
    renderDeliverys();
  }
}

// ACCIÓN 1: Marcar como Realizado (saca el pedido de Producción TV y lo coloca listo para despacho)
function markAsRealizado(rowIndices, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  const localRealizados = getLocalRealizadosIndices();
  const localDelivered = getLocalDeliveredIndices();

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'REALIZADO';
      localRealizados.add(o.rowIndex);
      localDelivered.delete(o.rowIndex);
      state.selectedOrders.delete(o.rowIndex);
    }
  });

  saveLocalRealizadosIndices(localRealizados);
  saveLocalDeliveredIndices(localDelivered);
  saveLocalOrders();

  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        rowIndices: rowIndices,
        status: 'REALIZADO'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar estado REALIZADO en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderAllViews();
  showToastNotification(`🥖 Pedido de "${clientName || 'Cliente'}" marcado como REALIZADO. Retirado de Producción TV.`);
}

// ACCIÓN: Producción Terminada (Marcar solo los pedidos de la masa activa en Producción como Realizados)
function markAllProductionAsRealizado() {
  const doughName = FORMULAS_BASE[state.activeDough]?.nombre || state.activeDough;
  const prodOrders = state.orders.filter(o => normalizarEstado(o.estado) === 'EN_PRODUCCION' && getTipoMasa(o) === state.activeDough);
  if (prodOrders.length === 0) {
    showToastNotification(`ℹ️ No hay pedidos en producción de "${doughName}".`);
    return;
  }

  const clientesUnicos = [...new Set(prodOrders.map(o => o.cliente))];
  const confirmMsg = `¿Deseas marcar la producción de "${doughName}" como TERMINADA?\n\n` +
    `• ${prodOrders.length} ítems en producción de ${clientesUnicos.length} cliente(s)\n` +
    `• Solo afectará a los pedidos de la masa activa (${doughName})\n` +
    `• Todos pasarán de inmediato al estado "REALIZADO" (Listos para Despacho).`;

  if (!confirm(confirmMsg)) return;

  const rowIndices = prodOrders.map(o => o.rowIndex);

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'REALIZADO';
      state.selectedOrders.delete(o.rowIndex);
    }
  });

  saveLocalOrders();

  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        rowIndices: rowIndices,
        status: 'REALIZADO'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar Producción Terminada en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderAllViews();
  showToastNotification(`🎉 ¡Producción Terminada (${doughName})! ${prodOrders.length} ítems de ${clientesUnicos.length} cliente(s) pasaron a LISTO DESPACHO.`);
}

// Revertir a Producción (vuelve a figurar en la pantalla de Producción TV)
function revertToProduccion(rowIndices, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'EN_PRODUCCION';
    }
  });

  saveLocalOrders();

  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        rowIndices: rowIndices,
        status: 'EN_PRODUCCION'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar estado EN_PRODUCCION en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderAllViews();
  showToastNotification(`🔥 Pedido de "${clientName || 'Cliente'}" devuelto a Producción TV.`);
}

// ACCIÓN 2: Enviar a Delivery (cambia modalidad a Delivery y se visualiza en pestaña Deliverys)
function sendToDelivery(rowIndices, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  const meta = getLocalDeliveriesMeta();

  rowIndices.forEach(idx => {
    if (!meta[idx]) {
      meta[idx] = { repartidor: '', costo: 0, liquidado: false };
    }
  });

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.entrega = 'Delivery: A domicilio';
    }
  });

  saveLocalDeliveriesMeta(meta);
  saveLocalOrders();

  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderDelivery',
        rowIndices: rowIndices,
        entrega: 'Delivery: A domicilio'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar Delivery en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderAllViews();
  showToastNotification(`🛵 Modalidad de "${clientName || 'Cliente'}" cambiada a Delivery (disponible en pestaña Deliverys).`);
}

// Cambiar a Retiro en Tienda
function sendToPickup(rowIndices, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.entrega = 'Retiro en Tienda';
    }
  });

  saveLocalOrders();

  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderDelivery',
        rowIndices: rowIndices,
        entrega: 'Retiro en Tienda'
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar Retiro en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderAllViews();
  showToastNotification(`🏪 Modalidad de "${clientName || 'Cliente'}" cambiada a Retiro en Tienda.`);
}

// Modal de confirmación para Vaciar Producción
function openClearProductionModal() {
  const prodOrders = state.orders.filter(o => normalizarEstado(o.estado) === 'EN_PRODUCCION');
  if (prodOrders.length === 0) {
    alert("No hay pedidos en producción para vaciar.");
    return;
  }

  let totalKg = 0;
  prodOrders.forEach(o => {
    const un = (parseFloat(o.paquetes) || 0) * getUnidadesPorPaquete(o);
    totalKg += (un * (parseFloat(o.peso_gr) || 0)) / 1000;
  });

  const countEl = document.getElementById('clear-orders-count');
  const kgEl = document.getElementById('clear-orders-kg');
  if (countEl) countEl.textContent = `${prodOrders.length} pedido(s)`;
  if (kgEl) kgEl.textContent = `${totalKg.toFixed(2)} kg`;

  const modal = document.getElementById('modal-clear-confirm');
  if (modal) modal.classList.remove('hidden');
}

function closeClearProductionModal() {
  const modal = document.getElementById('modal-clear-confirm');
  if (modal) modal.classList.add('hidden');
}

// Vaciar/Eliminar todo lo enviado a Producción tras confirmar en el modal
async function executeClearProduction() {
  closeClearProductionModal();

  const prodOrders = state.orders.filter(o => normalizarEstado(o.estado) === 'EN_PRODUCCION');
  if (prodOrders.length === 0) return;

  const btn = document.getElementById('btn-clear-production');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Vaciando...</span>`;
  }

  const rowIndices = prodOrders.map(o => o.rowIndex);

  // 1. Actualizar estado local
  prodOrders.forEach(o => {
    o.estado = 'PENDIENTE';
  });
  saveLocalOrders();

  // 2. Sincronizar con Google Sheets si hay API conectada
  if (state.apiUrl) {
    try {
      showSyncIndicator(true);
      await fetch(state.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateOrderStatus',
          rowIndices: rowIndices,
          status: 'PENDIENTE'
        })
      });
      showSyncIndicator(false);
    } catch (err) {
      console.error('Error al vaciar producción en Sheets:', err);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      <span>Vaciar Producción</span>
    `;
  }

  // Resetear descuentos de paquetes al vaciar producción
  state.productionDiscounts = {};
  saveLocalProductionDiscounts(state.productionDiscounts);

  renderProduccion();
}

// ==========================================
// SECCIÓN 2: PRODUCCIÓN (MODO TV / DARK MODE)
// ==========================================
function renderProduccion() {
  // 1. Filtrar pedidos que están EN_PRODUCCION y corresponden a la masa activa
  const allInProd = state.orders.filter(o => normalizarEstado(o.estado) === 'EN_PRODUCCION');
  const prodOrders = allInProd.filter(o => getTipoMasa(o) === state.activeDough);

  // Actualizar conteos activos en los botones superiores de masa
  const countBrioche = allInProd.filter(o => getTipoMasa(o) === 'brioche').length;
  const countPapa = allInProd.filter(o => getTipoMasa(o) === 'papa').length;
  const countDulce = allInProd.filter(o => getTipoMasa(o) === 'dulce').length;
  const countBurrero = allInProd.filter(o => getTipoMasa(o) === 'burrero').length;
  const countJamon = allInProd.filter(o => getTipoMasa(o) === 'jamon').length;

  const btnBrioche = document.querySelector('.btn-dough[data-dough="brioche"]');
  const btnPapa = document.querySelector('.btn-dough[data-dough="papa"]');
  const btnDulce = document.querySelector('.btn-dough[data-dough="dulce"]');
  const btnBurrero = document.querySelector('.btn-dough[data-dough="burrero"]');
  const btnJamon = document.querySelector('.btn-dough[data-dough="jamon"]');

  if (btnBrioche) btnBrioche.innerHTML = `🟡 Masa Brioche${countBrioche > 0 ? ` <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold ${state.activeDough === 'brioche' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-300 border border-slate-700'}">${countBrioche}</span>` : ''}`;
  if (btnPapa) btnPapa.innerHTML = `🥔 Pan de Papa${countPapa > 0 ? ` <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold ${state.activeDough === 'papa' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-300 border border-slate-700'}">${countPapa}</span>` : ''}`;
  if (btnDulce) btnDulce.innerHTML = `🍬 Pan Dulce${countDulce > 0 ? ` <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold ${state.activeDough === 'dulce' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-300 border border-slate-700'}">${countDulce}</span>` : ''}`;
  if (btnBurrero) btnBurrero.innerHTML = `🌭 Pan Burrero${countBurrero > 0 ? ` <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold ${state.activeDough === 'burrero' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-300 border border-slate-700'}">${countBurrero}</span>` : ''}`;
  if (btnJamon) btnJamon.innerHTML = `🥓 Pan de Jamón${countJamon > 0 ? ` <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold ${state.activeDough === 'jamon' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-amber-300 border border-slate-700'}">${countJamon}</span>` : ''}`;

  // 2. Título y masa activa
  const doughTitleEl = document.getElementById('tv-dough-title');
  const doughBadgeEl = document.getElementById('tv-dough-badge');
  const formulaMeta = FORMULAS_BASE[state.activeDough] || FORMULAS_BASE.brioche;
  
  if (doughTitleEl) doughTitleEl.textContent = formulaMeta.nombre;
  if (doughBadgeEl) {
    const doughLabels = {
      brioche: '🟡 Masa Brioche',
      papa: '🥔 Pan de Papa',
      dulce: '🍬 Pan Dulce',
      burrero: '🌭 Pan Burrero',
      jamon: '🥓 Pan de Jamón'
    };
    doughBadgeEl.textContent = doughLabels[state.activeDough] || formulaMeta.nombre;
  }

  // 3. Consolidar agrupando primariamente por TOPPING (Req 2)
  const toppingsConsolidados = {};

  prodOrders.forEach(o => {
    const topping = (o.topping || 'Sin Topping').trim();
    const prod = (o.producto || '').trim();
    const pres = (o.presentacion || 'Estándar').trim();
    const peso = parseFloat(o.peso_gr) || 0;
    const paq = parseFloat(o.paquetes) || 0;
    const uPorPaq = getUnidadesPorPaquete(o);
    const un = paq * uPorPaq;
    const tipoMolde = getTipoMolde(o);
    const subtipo = getSubtipoRuedas(o);
    const discountKey = `${state.activeDough}:::${topping}:::${tipoMolde}:::${prod}:::${peso}`;
    const itemKey = `${prod}___${peso}___${tipoMolde}___${pres}`;

    if (!toppingsConsolidados[topping]) {
      toppingsConsolidados[topping] = {
        topping: topping,
        totalNetPaquetes: 0,
        totalNetUnidades: 0,
        items: {}
      };
    }

    const topGroup = toppingsConsolidados[topping];
    if (!topGroup.items[itemKey]) {
      topGroup.items[itemKey] = {
        key: itemKey,
        producto: prod,
        presentacion: pres,
        peso: peso,
        tipoMolde: tipoMolde,
        subtipo: subtipo,
        discountKey: discountKey,
        uPorPaq: uPorPaq,
        paquetesOriginal: 0,
        unidadesOriginal: 0,
        descPaq: 0,
        descUn: 0,
        netPaquetes: 0,
        netUnidades: 0,
        tipos: new Set()
      };
    }

    topGroup.items[itemKey].paquetesOriginal += paq;
    topGroup.items[itemKey].unidadesOriginal += un;

    if (normalizarTexto(o.producto).includes('trenzad')) {
      topGroup.items[itemKey].tipos.add('Trenzada');
    } else {
      topGroup.items[itemKey].tipos.add('Enrollado');
    }
  });

  // 4. Calcular Valores Netos considerando Descuentos de Paquetes
  let masaTotalGramos = 0;
  let totalPanesUnidades = 0;
  let totalPaquetes = 0;
  let activeDiscountsCount = 0;

  const ruedasHamburguesas = {};
  const ruedasEnrollados = {};

  Object.values(toppingsConsolidados).forEach(topGroup => {
    topGroup.totalNetPaquetes = 0;
    topGroup.totalNetUnidades = 0;

    Object.values(topGroup.items).forEach(it => {
      // Ajuste de paquetes (+ extras sumados / - descontados por no retiro)
      const rawAdj = Number(state.productionDiscounts[it.discountKey]) || 0;
      const netPaquetes = Math.max(0, it.paquetesOriginal + rawAdj);
      if (rawAdj !== 0) activeDiscountsCount++;

      it.ajustePaq = rawAdj;
      it.ajusteUn = rawAdj * it.uPorPaq;
      it.descPaq = rawAdj < 0 ? Math.abs(rawAdj) : 0;
      it.extraPaq = rawAdj > 0 ? rawAdj : 0;
      it.netPaquetes = netPaquetes;
      it.netUnidades = netPaquetes * it.uPorPaq;
      it.netGramos = it.netUnidades * it.peso;

      // Subtotales de cada Topping
      topGroup.totalNetPaquetes += it.netPaquetes;
      topGroup.totalNetUnidades += it.netUnidades;

      // Totales generales para Producción TV
      masaTotalGramos += it.netGramos;
      totalPanesUnidades += it.netUnidades;
      totalPaquetes += it.netPaquetes;

      // Agrupar al Bloque de Ruedas basado en unidades NETAS
      if (it.netUnidades > 0) {
        if (it.subtipo === 'hamburguesa') {
          const ruedaKey = `${it.peso}g_${it.tipoMolde}`;
          if (!ruedasHamburguesas[ruedaKey]) {
            ruedasHamburguesas[ruedaKey] = {
              peso: it.peso,
              tipoMolde: it.tipoMolde,
              unidadesBase: 0,
              unidadesTotales: 0
            };
          }
          ruedasHamburguesas[ruedaKey].unidadesBase += it.netUnidades;
        } else if (it.subtipo === 'enrollado') {
          const normProd = normalizarTexto(`${it.producto || ''} ${it.presentacion || ''}`);
          let varianteKey = '';
          let displayLabel = '';
          let badgeClass = '';

          // 0. Panes de Sandwich / Bimbo / Sanduche en ruedas de enrollados
          if (normProd.includes('sandw') || normProd.includes('sanduch') || normProd.includes('sandiw') || normProd.includes('bimbo')) {
            varianteKey = 'SANDWICH';
            displayLabel = '🥪 Sandwich';
            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
          }
          // 1. Separar perros de 50g de los perros mini de 50g
          else if (it.peso === 50) {
            if (normProd.includes('mini')) {
              varianteKey = 'MINI_PERRO';
              displayLabel = '🌭 Perro Mini';
              badgeClass = 'bg-pink-500/20 text-pink-300 border-pink-500/40';
            } else {
              varianteKey = 'PERRO';
              displayLabel = '🌭 Perro';
              badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            }
          }
          // 2. Separar jumbo de 80g de los delis de 80g
          else if (it.peso === 80) {
            if (normProd.includes('jumbo')) {
              varianteKey = 'JUMBO';
              displayLabel = '🌭 Jumbo';
              badgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
            } else if (normProd.includes('deli')) {
              varianteKey = 'DELI';
              displayLabel = '🥖 Deli';
              badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
            } else {
              varianteKey = 'ENROLLADO';
              displayLabel = '🌭 Enrollado';
              badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            }
          }
          // Otros pesos de enrollados (preservar distinción clara)
          else {
            if (normProd.includes('deli')) {
              varianteKey = 'DELI';
              displayLabel = '🥖 Deli';
              badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
            } else if (normProd.includes('mini') && normProd.includes('perro')) {
              varianteKey = 'MINI_PERRO';
              displayLabel = '🌭 Perro Mini';
              badgeClass = 'bg-pink-500/20 text-pink-300 border-pink-500/40';
            } else if (normProd.includes('jumbo')) {
              varianteKey = 'JUMBO';
              displayLabel = '🌭 Jumbo';
              badgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
            } else if (normProd.includes('perro')) {
              varianteKey = 'PERRO';
              displayLabel = '🌭 Perro';
              badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            }
          }

          const ruedaKey = varianteKey ? `${it.peso}g_${varianteKey}` : `${it.peso}g`;
          if (!ruedasEnrollados[ruedaKey]) {
            ruedasEnrollados[ruedaKey] = {
              peso: it.peso,
              varianteKey: varianteKey,
              displayLabel: displayLabel,
              badgeClass: badgeClass,
              unidadesBase: 0,
              unidadesTotales: 0,
              tipos: new Set()
            };
          }
          ruedasEnrollados[ruedaKey].unidadesBase += it.netUnidades;
          it.tipos.forEach(t => ruedasEnrollados[ruedaKey].tipos.add(t));
        }
      }
    });
  });

  // Aplicar ajustes manuales de ruedas (+ muestras o - sobrantes) por cada gramaje/formato
  const wheelAdjs = state.wheelAdjustments || {};
  const currentDough = state.activeDough || 'hamburguesa';

  Object.keys(ruedasHamburguesas).forEach(k => {
    const adjKey = `${currentDough}_hb_${k}`;
    const manualAdj = Number(wheelAdjs[adjKey]) || 0;
    const base = ruedasHamburguesas[k].unidadesBase || 0;
    ruedasHamburguesas[k].manualAdj = manualAdj;
    ruedasHamburguesas[k].unidadesTotales = Math.max(0, base + manualAdj);
    ruedasHamburguesas[k].category = 'hb';
    ruedasHamburguesas[k].ruedaKey = k;
  });

  Object.keys(ruedasEnrollados).forEach(k => {
    const adjKey = `${currentDough}_en_${k}`;
    const manualAdj = Number(wheelAdjs[adjKey]) || 0;
    const base = ruedasEnrollados[k].unidadesBase || 0;
    ruedasEnrollados[k].manualAdj = manualAdj;
    ruedasEnrollados[k].unidadesTotales = Math.max(0, base + manualAdj);
    ruedasEnrollados[k].category = 'en';
    ruedasEnrollados[k].ruedaKey = k;
  });

  // 5. Actualizar métricas del header en TV
  const masaKgEl = document.getElementById('tv-total-kg');
  const panesTotalEl = document.getElementById('tv-total-panes');
  const paqTotalEl = document.getElementById('tv-total-paquetes');
  
  if (masaKgEl) masaKgEl.textContent = (masaTotalGramos / 1000).toFixed(2);
  if (panesTotalEl) panesTotalEl.textContent = totalPanesUnidades.toLocaleString();
  if (paqTotalEl) paqTotalEl.textContent = totalPaquetes.toLocaleString();

  // Guardar masa total calculada para el modal de fórmula panadera
  state.currentDoughTotalGramos = masaTotalGramos;

  // 6. Actualizar visibilidad del botón para restablecer todos los descuentos de la masa
  const btnResetAll = document.getElementById('btn-reset-all-discounts');
  const btnModalReset = document.getElementById('btn-modal-reset-discounts');
  const badgeDiscounts = document.getElementById('badge-active-discounts-count');
  if (activeDiscountsCount > 0) {
    if (btnResetAll) {
      btnResetAll.classList.remove('hidden');
      btnResetAll.classList.add('flex');
    }
    if (btnModalReset) {
      btnModalReset.classList.remove('hidden');
      btnModalReset.classList.add('flex');
    }
    if (badgeDiscounts) badgeDiscounts.textContent = activeDiscountsCount;
  } else {
    if (btnResetAll) {
      btnResetAll.classList.add('hidden');
      btnResetAll.classList.remove('flex');
    }
    if (btnModalReset) {
      btnModalReset.classList.add('hidden');
      btnModalReset.classList.remove('flex');
    }
  }

  // 7. Actualizar resumen en la barra principal de Producción TV
  const distinctToppings = Object.values(toppingsConsolidados).filter(t => t.totalNetUnidades > 0 || Object.keys(t.items).length > 0);
  const totalFormatos = distinctToppings.reduce((acc, t) => acc + Object.keys(t.items).length, 0);

  const summaryTextEl = document.getElementById('tv-toppings-summary-text');
  const badgeProdCountEl = document.getElementById('badge-toppings-products-count');
  const badgeItemsCountEl = document.getElementById('badge-toppings-items-count');
  const previewChipsEl = document.getElementById('tv-toppings-preview-chips');

  if (summaryTextEl) {
    if (distinctToppings.length === 0 && allInProd.length > 0) {
      summaryTextEl.innerHTML = `<span class="text-amber-400 font-bold">Sin pedidos en ${formulaMeta.nombre}.</span> <span class="text-slate-400">Hay ${allInProd.length} pedidos en otras masas (${countPapa > 0 ? `Pan de Papa: ${countPapa} ` : ''}${countDulce > 0 ? `Pan Dulce: ${countDulce}` : ''}${countBrioche > 0 ? `Brioche: ${countBrioche}` : ''}). Selecciona arriba para verlos.</span>`;
    } else {
      summaryTextEl.textContent = `${totalPanesUnidades.toLocaleString()} unidades netas • ${totalPaquetes.toLocaleString()} paquetes en producción (${distinctToppings.length} toppings • ${totalFormatos} formatos)`;
    }
  }
  if (badgeProdCountEl) {
    badgeProdCountEl.textContent = `${distinctToppings.length} ${distinctToppings.length === 1 ? 'topping' : 'toppings'}`;
  }
  if (badgeItemsCountEl) {
    badgeItemsCountEl.textContent = `${totalPanesUnidades.toLocaleString()} un`;
  }

  // Vista previa rápida de toppings directamente en la barra de planta
  if (previewChipsEl) {
    if (distinctToppings.length > 0) {
      previewChipsEl.classList.remove('hidden');
      previewChipsEl.innerHTML = distinctToppings.map(top => {
        return `
          <div class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            ${getToppingBadgeHtml(top.topping)}
            <span class="font-black text-amber-400 font-mono">${top.totalNetUnidades} un</span>
            <span class="text-slate-400 font-mono">(${top.totalNetPaquetes} pq)</span>
            <span class="text-slate-600 hidden sm:inline">|</span>
            <span class="text-slate-300 font-medium hidden sm:inline">${Object.keys(top.items).length} formatos</span>
          </div>
        `;
      }).join('');
    } else {
      previewChipsEl.classList.add('hidden');
      previewChipsEl.innerHTML = '';
    }
  }

  // Renderizar el contenido dentro del Modal a Pantalla Completa agrupado por Topping (Req 2)
  renderModalConsolidadoProductos(toppingsConsolidados, totalPanesUnidades, totalPaquetes);

  // 8. Renderizar Bloque 2: Ruedas (Picadora de 36 unidades con unidades netas)
  renderBloqueRuedas(ruedasHamburguesas, ruedasEnrollados);
}

// ==========================================
// MODAL CONSOLIDADO DE PRODUCTOS & TOPPINGS (Req 4.1)
// ==========================================
function openToppingsModal() {
  const modal = document.getElementById('modal-toppings-consolidado');
  if (modal) modal.classList.remove('hidden');
}

function closeToppingsModal() {
  const modal = document.getElementById('modal-toppings-consolidado');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// RENDERIZAR CONSOLIDADO POR TOPPINGS EN MODAL (REQ 2 & REQ 3 - ALTA DENSIDAD)
// ==========================================
function renderModalConsolidadoProductos(toppingsConsolidados, totalPanesUnidades, totalPaquetes) {
  // Guardar en estado para filtros reactivos
  state.currentToppingsConsolidados = toppingsConsolidados || {};
  state.currentTotalPanes = totalPanesUnidades || 0;
  state.currentTotalPaquetes = totalPaquetes || 0;

  const container = document.getElementById('modal-products-grid');
  const badgeDough = document.getElementById('modal-toppings-dough-badge');
  const metricsEl = document.getElementById('modal-toppings-metrics-text');

  if (badgeDough) {
    const metaDough = FORMULAS_BASE[state.activeDough];
    badgeDough.textContent = metaDough ? metaDough.nombre : state.activeDough;
  }

  if (metricsEl) {
    metricsEl.innerHTML = `Total en producción: <strong class="text-white font-black" style="color: #ffffff !important; font-weight: 900 !important;">${(totalPanesUnidades || 0).toLocaleString()} un</strong> • <strong class="text-white font-bold" style="color: #ffffff !important; font-weight: 800 !important;">${(totalPaquetes || 0).toLocaleString()} pq</strong>`;
  }

  if (!container) return;

  const catFilter = state.modalCategoryFilter || 'ALL';

  // Filtrar ítems de cada grupo de topping según la categoría seleccionada (Req 2.A)
  const groupsList = Object.values(toppingsConsolidados || {}).map(group => {
    let items = Object.values(group.items || {});
    if (catFilter === 'HAMBURGUESA') {
      items = items.filter(it => it.subtipo === 'hamburguesa');
    } else if (catFilter === 'ENROLLADOS') {
      items = items.filter(it => it.subtipo === 'enrollado' || it.tipoMolde === 'ENROLLADOS');
    } else if (catFilter === 'PANES') {
      items = items.filter(it => it.tipoMolde === 'GENERAL' || (!['hamburguesa', 'enrollado'].includes(it.subtipo)));
    }

    const filteredNetUnidades = items.reduce((acc, it) => acc + (it.netUnidades || 0), 0);
    const filteredNetPaquetes = items.reduce((acc, it) => acc + (it.netPaquetes || 0), 0);

    return {
      topping: group.topping,
      totalNetUnidades: filteredNetUnidades,
      totalNetPaquetes: filteredNetPaquetes,
      items: items
    };
  }).filter(g => g.items.length > 0);

  if (groupsList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800">
        <p class="text-xl font-bold text-slate-300">No hay productos ni toppings en producción para esta categoría.</p>
        <p class="text-xs text-slate-400 mt-1">Prueba seleccionando "Todos" arriba o enviando pedidos desde la sección "Pedidos".</p>
      </div>`;
    return;
  }

  // Ordenar bloques de toppings de forma predecible y lógica para planta (Req 4)
  function getToppingSortPriority(topping) {
    const norm = normalizarTexto(topping);
    if (norm.includes('ajon') && norm.includes('sesamo')) return 2;
    if (norm.includes('ajon') && norm.includes('oreg')) return 3;
    if (norm.includes('ajonjoli')) return 1;
    if (norm.includes('oregano') || norm.includes('oreg')) return 4;
    if (norm.includes('sin topping') || norm.includes('natural')) return 5;
    if (norm.includes('parmesan') || norm.includes('queso')) return 6;
    if (norm.includes('amapola') || norm.includes('semilla')) return 7;
    return 8;
  }

  groupsList.sort((a, b) => {
    const prioA = getToppingSortPriority(a.topping);
    const prioB = getToppingSortPriority(b.topping);
    if (prioA !== prioB) return prioA - prioB;
    if (b.totalNetUnidades !== a.totalNetUnidades) return b.totalNetUnidades - a.totalNetUnidades;
    return String(a.topping || '').localeCompare(String(b.topping || ''));
  });

  // Prioridad de formato dentro de la tarjeta
  function getItemPriority(it) {
    if (it.tipoMolde === 'CON_MOLDE' && it.subtipo === 'hamburguesa') return 1;
    if (it.tipoMolde === 'SIN_MOLDE' && it.subtipo === 'hamburguesa') return 2;
    if (it.subtipo === 'enrollado' || it.tipoMolde === 'ENROLLADOS') return 3;
    return 4;
  }

  // Renderizado de tarjetas agrupadas por Topping (Req 4)
  container.innerHTML = groupsList.map(topGroup => {
    // Ordenar los ítems del topping dando prioridad PROMINENTE al gramaje (Req 3)
    topGroup.items.sort((a, b) => {
      // 1. Gramaje descendente (195g -> 120g -> 110g -> 90g -> 70g -> 50g)
      if (b.peso !== a.peso) return b.peso - a.peso;
      // 2. Formato/Molde
      const pA = getItemPriority(a);
      const pB = getItemPriority(b);
      if (pA !== pB) return pA - pB;
      return String(a.producto || '').localeCompare(String(b.producto || ''));
    });

    const itemsRows = topGroup.items.map(it => {
      const cfg = SUBGRUPOS_CONFIG[it.tipoMolde] || { titulo: it.tipoMolde, badgeClass: 'text-slate-300 border-slate-700 bg-slate-800' };

      // 1. ELIMINAR REDUNDANCIAS (Req 1):
      // Limpiar 'Con Molde' / 'Sin Molde' / 'C/Molde' / 'S/Molde' del nombre para que no se repita con el badge
      let cleanProdName = String(it.producto || '').trim();
      cleanProdName = cleanProdName
        .replace(/\b(?:con\s*molde|c\/molde)\b/gi, '')
        .replace(/\b(?:sin\s*molde|s\/molde)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      // No mostrar presentación si es redundante con el molde o si es estándar
      let presExtra = '';
      if (it.presentacion) {
        const normP = normalizarTexto(it.presentacion);
        if (!normP.includes('con molde') && 
            !normP.includes('sin molde') && 
            !normP.includes('c/molde') && 
            !normP.includes('s/molde') && 
            !normP.includes('estandar')) {
          presExtra = it.presentacion.trim();
        }
      }

      return `
        <div class="modal-product-item-row flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all">
          <!-- 1. GRAMAJE PROMINENTE (Req 3) + NOMBRE & FORMATO SECUNDARIO -->
          <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div class="gramaje-badge shrink-0">
              ${it.peso}g
            </div>

            <!-- Nombre de producto y ÚNICA etiqueta de molde limpia (Req 1) -->
            <div class="flex flex-col min-w-0 justify-center">
              <span class="item-prod-name text-xs sm:text-sm font-bold truncate max-w-[140px] sm:max-w-[190px]" title="${escapeHtml(it.producto)}">
                ${escapeHtml(cleanProdName || it.producto)}
              </span>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${cfg.badgeClass} whitespace-nowrap shadow-sm">
                  ${cfg.titulo}
                </span>
                ${presExtra ? `
                  <span class="text-[10px] text-slate-400 font-mono hidden sm:inline">(${escapeHtml(presExtra)})</span>
                ` : ''}
              </div>

              <!-- Indicador de ajuste (+ suma / - resta) si existe -->
              ${it.ajustePaq !== 0 ? `
                <div class="mt-0.5">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${it.ajustePaq > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'} inline-flex items-center gap-0.5" title="${it.ajustePaq > 0 ? 'Paquetes sumados a producción' : 'Paquetes restados por no retiro'}">
                    <span>${it.ajustePaq > 0 ? '📈' : '📉'}</span> ${it.ajustePaq > 0 ? `+${it.ajustePaq}pq (+${it.ajusteUn}un)` : `${it.ajustePaq}pq (${it.ajusteUn}un)`}
                  </span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- 2. BLOQUE DERECHO: CANTIDAD NETA (ARRIBA) + CONTROLES (ABAJO) - CERO SUPERPOSICIÓN (Req 2) -->
          <div class="counter-block-right flex flex-col items-end justify-center gap-1.5 shrink-0 pl-2.5">
            <!-- Cantidad exacta neta (Unidades y Paquetes) -->
            <div class="flex items-baseline gap-1.5 font-mono text-right whitespace-nowrap">
              <span class="item-units-text text-xl sm:text-2xl font-black font-mono tracking-tight">
                ${it.netUnidades} <span class="text-xs sm:text-sm font-bold item-units-label">un</span>
              </span>
              <span class="item-packs-text text-xs sm:text-sm font-bold font-mono">(${it.netPaquetes} pq)</span>
            </div>

            <!-- Controles compactos de ajuste (− / input / + / ↺) -->
            <div class="flex items-center gap-0.5 p-0.5 rounded-lg border shadow-sm item-controls-container">
              <button type="button" 
                class="btn-pq-minus w-5 h-5 rounded flex items-center justify-center font-black text-xs transition-all disabled:opacity-25 cursor-pointer active:scale-95" 
                data-key="${escapeHtml(it.discountKey)}" 
                data-orig="${it.paquetesOriginal}" 
                title="Restar 1 paquete (−)"
                ${it.netPaquetes <= 0 ? 'disabled' : ''}>
                −
              </button>

              <input type="text" 
                value="${it.ajustePaq > 0 ? '+' + it.ajustePaq : it.ajustePaq}" 
                class="input-pq-discount w-8 text-center text-[11px] font-mono font-bold rounded py-0 focus:outline-none ${it.ajustePaq > 0 ? 'has-extra' : (it.ajustePaq < 0 ? 'has-discount' : '')}" 
                data-key="${escapeHtml(it.discountKey)}" 
                data-orig="${it.paquetesOriginal}" 
                title="Ajuste de paquetes (+ sumar / − restar)">

              <button type="button" 
                class="btn-pq-plus w-5 h-5 rounded flex items-center justify-center font-black text-xs transition-all cursor-pointer active:scale-95" 
                data-key="${escapeHtml(it.discountKey)}" 
                data-orig="${it.paquetesOriginal}" 
                title="Sumar 1 paquete (+)">
                +
              </button>

              ${it.ajustePaq !== 0 ? `
                <button type="button" 
                  class="btn-pq-reset w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center cursor-pointer transition-all active:scale-95" 
                  data-key="${escapeHtml(it.discountKey)}" 
                  title="Restablecer a pedidos originales (${it.paquetesOriginal} pq)">
                  ↺
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="modal-topping-card">
        <!-- Encabezado de la Tarjeta del Topping -->
        <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80 gap-2">
          <!-- Izquierda: Badge de Topping con su color distintivo -->
          <div class="flex items-center gap-2 min-w-0">
            ${getToppingBadgeHtml(topGroup.topping)}
            <span class="text-xs text-slate-400 font-bold hidden sm:inline">(${topGroup.items.length} ${topGroup.items.length === 1 ? 'formato' : 'formatos'})</span>
          </div>

          <!-- Derecha: Pastilla de total de alto contraste con texto blanco puro forzado (Req 2) -->
          <div class="card-total-pill badge-keep-white px-3.5 py-1.5 rounded-xl flex items-baseline gap-1.5 font-mono shrink-0 shadow-md" style="background-color: #1e3a8a !important; color: #ffffff !important; border: 1.5px solid #3b82f6 !important;">
            <span class="pill-units text-base sm:text-lg font-black text-white" style="color: #ffffff !important; font-weight: 900 !important;">${topGroup.totalNetUnidades} <span class="pill-units-label text-xs font-bold text-white" style="color: #ffffff !important; font-weight: 800 !important;">un</span></span>
            <span class="pill-divider text-xs font-bold text-white" style="color: #ffffff !important;">/</span>
            <span class="pill-packs text-xs sm:text-sm font-bold text-white" style="color: #ffffff !important; font-weight: 800 !important;">${topGroup.totalNetPaquetes} pq</span>
          </div>
        </div>

        <!-- Lista de Productos/Formatos correspondientes al Topping -->
        <div class="space-y-1.5">
          ${itemsRows}
        </div>
      </div>
    `;
  }).join('');

  // Vincular eventos interactivos para restar/sumar paquetes dentro del modal
  bindModalDiscountEvents();
}

// Vincular eventos a los controles de ajuste en el modal
function bindModalDiscountEvents() {
  const container = document.getElementById('modal-products-grid');
  if (!container) return;

  // Botón Restar 1 paquete (−)
  container.querySelectorAll('.btn-pq-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = e.currentTarget.dataset.key;
      const orig = parseInt(e.currentTarget.dataset.orig) || 0;
      adjustProductDiscount(key, -1, orig);
    });
  });

  // Botón Sumar 1 paquete (+)
  container.querySelectorAll('.btn-pq-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = e.currentTarget.dataset.key;
      const orig = parseInt(e.currentTarget.dataset.orig) || 0;
      adjustProductDiscount(key, 1, orig);
    });
  });

  // Botón Restablecer individual (↺)
  container.querySelectorAll('.btn-pq-reset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = e.currentTarget.dataset.key;
      resetProductDiscount(key);
    });
  });

  // Input directo (+ sumar o - restar)
  container.querySelectorAll('.input-pq-discount').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    
    const handleInput = (e) => {
      const key = e.target.dataset.key;
      const orig = parseInt(e.target.dataset.orig) || 0;
      const rawStr = String(e.target.value).trim().replace('+', '');
      let val = parseInt(rawStr, 10);
      if (isNaN(val)) val = 0;
      if (orig + val < 0) val = -orig;

      if (val === 0) {
        delete state.productionDiscounts[key];
      } else {
        state.productionDiscounts[key] = val;
      }
      saveLocalProductionDiscounts(state.productionDiscounts);
      renderProduccion();
    };

    input.addEventListener('change', handleInput);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });
  });
}

// Renderizar tabla del bloque de ruedas
function renderBloqueRuedas(ruedasHamburguesas, ruedasEnrollados) {
  const containerHb = document.getElementById('table-ruedas-hamburguesas');
  const containerEn = document.getElementById('table-ruedas-enrollados');

  function renderRows(ruedasObj) {
    const keys = Object.keys(ruedasObj).sort((a, b) => {
      const itemA = ruedasObj[a];
      const itemB = ruedasObj[b];
      if (itemA.peso !== itemB.peso) {
        return itemA.peso - itemB.peso;
      }
      if (itemA.displayLabel && itemB.displayLabel) {
        return itemA.displayLabel.localeCompare(itemB.displayLabel);
      }
      return (itemA.tipoMolde || '').localeCompare(itemB.tipoMolde || '');
    });

    if (keys.length === 0) {
      return `<tr><td colspan="3" class="py-4 text-center text-slate-500 text-sm italic">Sin requerimientos de ruedas</td></tr>`;
    }

    return keys.map(k => {
      const item = ruedasObj[k];
      const peso = item.peso;
      // Regla de capacidad máxima de la picadora (máx 4.000g de masa):
      // Si el peso es >= 120g (ej. 120g, 150g), la rueda se divide a la mitad (18 unidades por corte)
      // porque 36 tacos superarían los 4kg. Ruedas < 120g se pican completas a 36 unidades.
      const esRuedaMitad = peso >= 120;
      const tamanoRueda = esRuedaMitad ? 18 : 36;
      const pesoRueda = peso * tamanoRueda;
      const calc = calcularRuedasDesdeUnidades(item.unidadesTotales, tamanoRueda);

      // Estilo del ajuste de unidades con alto impacto visual para TV
      let badgeAjuste = '';
      if (calc.unidades < 0) {
        badgeAjuste = `<span class="inline-block px-3.5 py-1.5 rounded-2xl text-2xl lg:text-3xl font-black badge-negative font-mono shadow-md">${calc.unidades}</span>`;
      } else if (calc.unidades > 0) {
        badgeAjuste = `<span class="inline-block px-3.5 py-1.5 rounded-2xl text-2xl lg:text-3xl font-black badge-positive font-mono shadow-md">+${calc.unidades}</span>`;
      } else {
        badgeAjuste = `<span class="inline-block px-3.5 py-1.5 rounded-2xl text-xl lg:text-2xl font-black text-slate-500 font-mono">0</span>`;
      }

      // Distintivo para Con Molde / Sin Molde (armado en bandejas de producción)
      let badgeMolde = '';
      if (item.tipoMolde === 'CON_MOLDE') {
        badgeMolde = `<span class="text-xs uppercase font-black tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🥧 Con Molde</span>`;
      } else if (item.tipoMolde === 'SIN_MOLDE') {
        badgeMolde = `<span class="text-xs uppercase font-black tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">🍞 Sin Molde</span>`;
      }

      // Distintivo de variante específica de enrollados (Perro vs Perro Mini, Jumbo vs Deli)
      let badgeVariante = '';
      if (item.displayLabel) {
        badgeVariante = `<span class="text-xs uppercase font-black tracking-wider px-2.5 py-0.5 rounded-lg border ${item.badgeClass || 'bg-amber-500/20 text-amber-300 border-amber-500/30'}">${item.displayLabel}</span>`;
      }

      // Distintivo si contiene hamburguesas trenzadas en la enrolladora
      let badgeTrenzada = '';
      if (item.tipos && item.tipos.has('Trenzada')) {
        if (item.tipos.has('Enrollado')) {
          badgeTrenzada = `<span class="text-xs uppercase font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">🌭 Enrollados + 🥨 Trenzadas</span>`;
        } else {
          badgeTrenzada = `<span class="text-xs uppercase font-black tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">🥨 Trenzadas</span>`;
        }
      }

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 text-base">
          <td class="py-4 px-4 font-bold text-slate-200">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="text-3xl lg:text-4xl font-black text-white tracking-tight">${peso}gr</span>
              ${badgeMolde}
              ${badgeVariante}
              ${badgeTrenzada}
              ${esRuedaMitad ? `<span class="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">1/2 Rueda (${tamanoRueda} un)</span>` : ''}
            </div>
            
            <div class="flex items-center gap-2.5 mt-2 flex-wrap">
              <span class="text-xs text-slate-400 font-mono font-normal">(${pesoRueda.toLocaleString()} g masa por corte)</span>
              <span class="text-slate-600 hidden sm:inline">•</span>

              <!-- Control interactivo de unidades (+ / -) con alto contraste -->
              <div class="wheel-unit-control inline-flex items-center gap-1.5 px-2 py-1 rounded-xl shadow-sm">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Unidades:</span>
                <button type="button" 
                        onclick="adjustRuedaUnits('${item.category || 'hb'}', '${item.ruedaKey || k}', -1)" 
                        title="Restar 1 unidad (sobró pan de más)" 
                        class="wheel-btn-minus w-7 h-7 flex items-center justify-center rounded-lg font-black text-base active:scale-90 select-none cursor-pointer">
                  −
                </button>
                <span class="font-mono font-black text-white text-base px-1.5 min-w-[2.2rem] text-center" title="Total unidades requeridas: ${item.unidadesTotales} un">
                  ${item.unidadesTotales}
                </span>
                <button type="button" 
                        onclick="adjustRuedaUnits('${item.category || 'hb'}', '${item.ruedaKey || k}', 1)" 
                        title="Sumar 1 unidad (pan de muestra)" 
                        class="wheel-btn-plus w-7 h-7 flex items-center justify-center rounded-lg font-black text-base active:scale-90 select-none cursor-pointer">
                  +
                </button>
                ${item.manualAdj !== 0 ? `
                  <button type="button" 
                          onclick="adjustRuedaUnits('${item.category || 'hb'}', '${item.ruedaKey || k}', 'reset')" 
                          title="Restablecer ajuste manual (Base pedidos: ${item.unidadesBase} un)" 
                          class="wheel-btn-reset w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ml-0.5">
                    ↺
                  </button>
                ` : ''}
              </div>

              ${item.manualAdj !== 0 ? `
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-md ${item.manualAdj > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                  ${item.manualAdj > 0 ? `+${item.manualAdj} muestra` : `${item.manualAdj} sobrante`}
                </span>
              ` : ''}
            </div>
          </td>
          <td class="py-4 px-4 text-center">
            <span class="text-4xl lg:text-5xl font-black text-amber-400 tv-display-num tracking-tight">${calc.cantidad}</span>
            <span class="text-xs lg:text-sm text-slate-300 block font-bold mt-1 uppercase tracking-wider">${calc.cantidad === 1 ? 'RUEDA' : 'RUEDAS'}</span>
          </td>
          <td class="py-4 px-4 text-right">
            ${badgeAjuste}
          </td>
        </tr>`;
    }).join('');
  }

  if (containerHb) containerHb.innerHTML = renderRows(ruedasHamburguesas);
  if (containerEn) containerEn.innerHTML = renderRows(ruedasEnrollados);
}

// ==========================================
// ACCIÓN RÁPIDA: COPIAR TOPPINGS PARA HORNERO
// ==========================================
function copyToppingsHornero() {
  const prodOrders = state.orders.filter(o => {
    return o.estado === 'EN_PRODUCCION' && getTipoMasa(o) === state.activeDough;
  });

  // Agrupar productos de ENROLLADOS por clave de producto para aplicar descuentos
  const enrolladosMap = {};
  prodOrders.forEach(o => {
    const tipoMolde = getTipoMolde(o);
    if (tipoMolde === 'ENROLLADOS') {
      const top = (o.topping || 'Sin Topping').trim().toUpperCase();
      const prod = (o.producto || '').trim();
      const peso = parseFloat(o.peso_gr) || 0;
      const paq = parseFloat(o.paquetes) || 0;
      const uPorPaq = getUnidadesPorPaquete(o);
      const discountKey = `${state.activeDough}:::${(o.topping || 'Sin Topping').trim()}:::${tipoMolde}:::${prod}:::${peso}`;

      if (!enrolladosMap[discountKey]) {
        enrolladosMap[discountKey] = {
          top: top,
          paquetesOriginal: 0,
          uPorPaq: uPorPaq,
          discountKey: discountKey
        };
      }
      enrolladosMap[discountKey].paquetesOriginal += paq;
    }
  });

  // Extraer y consolidar únicamente los productos clasificados como ENROLLADOS / PERROS con unidades NETAS
  const enrolladosPorTopping = {};
  let totalEnrollados = 0;

  Object.values(enrolladosMap).forEach(it => {
    const rawAdj = Number(state.productionDiscounts[it.discountKey]) || 0;
    const netPaq = Math.max(0, it.paquetesOriginal + rawAdj);
    const netUn = netPaq * it.uPorPaq;
    if (netUn > 0) {
      enrolladosPorTopping[it.top] = (enrolladosPorTopping[it.top] || 0) + netUn;
      totalEnrollados += netUn;
    }
  });

  const toppingKeys = Object.keys(enrolladosPorTopping);
  if (toppingKeys.length === 0 || totalEnrollados === 0) {
    showToastNotification("⚠️ No hay productos enrollados en producción para esta masa.");
    return;
  }

  // Generar texto formateado exactamente según los requerimientos:
  // Toppings Enrollados para Hornero:
  // - [Topping 1]: [Total Unidades] un
  // - [Topping 2]: [Total Unidades] un
  let text = `Toppings Enrollados para Hornero:\n`;
  toppingKeys.sort().forEach(top => {
    text += `- ${top}: ${enrolladosPorTopping[top]} un\n`;
  });
  text = text.trim();

  // Copiar automáticamente al portapapeles
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToastNotification("📋 ¡Copiado para el hornero!");
    }).catch(err => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }

  // Feedback visual inmediato en el botón
  const btn = document.getElementById('btn-copy-hornero');
  if (btn) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span>✅</span> <span>¡Copiado para el hornero!</span>`;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 2200);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToastNotification("📋 ¡Copiado para el hornero!");
  } catch (err) {
    console.error('Fallback clipboard error:', err);
    prompt("Copia el texto para el hornero:", text);
  }
  document.body.removeChild(ta);
}

function showToastNotification(message) {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (toast && toastMsg) {
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }
}

// ==========================================
// MODAL DE FÓRMULA PANADERA (ESCALADO DINÁMICO)
// ==========================================
function openFormulaModal() {
  const modal = document.getElementById('formula-modal');
  const titleEl = document.getElementById('modal-dough-title');
  const meta = FORMULAS_BASE[state.activeDough];
  const masaTotalGramos = state.currentDoughTotalGramos || 0;

  if (titleEl) titleEl.textContent = `Fórmula Panadera: ${meta.nombre}`;

  // Masa Requerida
  document.getElementById('formula-target-kg').textContent = (masaTotalGramos / 1000).toFixed(2);
  
  // Calcular Factor de Escala respecto a la Masa Total Base de la receta
  let scaleFactor = 1;
  if (masaTotalGramos > 0 && meta.masaTotalBase > 0) {
    scaleFactor = masaTotalGramos / meta.masaTotalBase;
  }

  // Harina Base e Ingredientes Totales (Req 4.3)
  const flourKgEl = document.getElementById('formula-flour-kg');
  const countIngEl = document.getElementById('formula-ingredients-count');
  if (flourKgEl) {
    const baseHarina = meta.baseHarina || (meta.ingredientes && meta.ingredientes[0] ? meta.ingredientes[0].base : 45000);
    const harinaGramos = baseHarina * scaleFactor;
    flourKgEl.textContent = (harinaGramos / 1000).toFixed(2);
  }
  if (countIngEl) {
    countIngEl.textContent = (meta.ingredientes || []).length;
  }

  const tbody = document.getElementById('formula-table-body');
  if (tbody) {
    tbody.innerHTML = meta.ingredientes.map(ing => {
      const gramosEscalados = ing.base * scaleFactor;
      const kgEscalados = (gramosEscalados / 1000).toFixed(3);

      return `
        <tr class="border-b border-slate-800 text-base hover:bg-slate-800/40">
          <td class="py-3.5 px-4 font-bold text-slate-200">${ing.nombre}</td>
          <td class="py-3.5 px-4 text-center font-mono text-amber-400 font-semibold">${ing.porcentaje.toFixed(2)}%</td>
          <td class="py-3.5 px-4 text-right font-mono font-black text-white text-lg">
            ${Math.round(gramosEscalados).toLocaleString()} <span class="text-xs text-slate-400 font-normal">g</span>
          </td>
          <td class="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
            ${kgEscalados} <span class="text-xs text-slate-400 font-normal">kg</span>
          </td>
        </tr>`;
    }).join('');
  }

  modal.classList.remove('hidden');
}

function closeFormulaModal() {
  document.getElementById('formula-modal').classList.add('hidden');
}

// Configurar URL de Google Apps Script
function promptApiUrl() {
  const current = state.apiUrl || '';
  const newUrl = prompt(
    "Ingresa la URL del Web App de Google Apps Script (terminada en /exec):\n\nDeja en blanco para usar modo de prueba local.",
    current
  );

  if (newUrl !== null) {
    state.apiUrl = newUrl.trim();
    localStorage.setItem('sugar_api_url', state.apiUrl);
    setupAutoRefresh();
    loadOrders().then(() => renderApp());
  }
}

// ==========================================
// SECCIÓN 3: ENTREGAS Y DESPACHO
// ==========================================
function renderEntregas() {
  const container = document.getElementById('entregas-grid');
  const countEl = document.getElementById('stat-entregas-count');
  if (!container) return;

  // 1. Considerar pedidos que pasaron a producción, ya están realizados o entregados
  const eligibleOrders = state.orders.filter(o => o.estado === 'EN_PRODUCCION' || o.estado === 'REALIZADO' || o.estado === 'ENTREGADO');

  // Contabilizar pedidos por grupo completo (Cliente + Fecha) para los badges y selectores
  const allGroups = {};
  eligibleOrders.forEach(o => {
    const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
    const key = `${o.cliente}___${rawFecha}`;
    if (!allGroups[key]) {
      const dateParts = formatFriendlyDateParts(rawFecha);
      allGroups[key] = {
        key: key,
        cliente: o.cliente,
        fechaRaw: rawFecha,
        fechaDate: dateParts.date,
        fechaTime: dateParts.time,
        telefono: o.telefono,
        entrega: o.entrega,
        items: [],
        totalMonto: 0
      };
    }
    allGroups[key].items.push(o);
    allGroups[key].totalMonto += getItemMonto(o);
  });

  let countEnProd = 0;
  let countRealizados = 0;
  let countEntregados = 0;
  Object.values(allGroups).forEach(g => {
    if (g.items.every(i => i.estado === 'ENTREGADO')) {
      countEntregados++;
    } else if (g.items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO')) {
      countRealizados++;
    } else {
      countEnProd++;
    }
  });

  // Extraer grupos listos para despacho (Fabricados pero no entregados aún) para el carrusel
  const listoDespachoGroups = Object.values(allGroups).filter(g => {
    const isAllDelivered = g.items.every(i => i.estado === 'ENTREGADO');
    const isRealizado = g.items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO');
    return isRealizado && !isAllDelivered;
  });

  // Renderizar Carrusel Horizontal de Pedidos 'LISTO DESPACHO' (Req 1, 2, 3)
  renderCarruselListoDespacho(listoDespachoGroups);

  // Actualizar opciones del selector de estado en Entregas (Req 2.2)
  const optAll = document.querySelector('#filter-status-entregas option[value="ALL"]');
  const optProd = document.querySelector('#filter-status-entregas option[value="EN_PRODUCCION"]');
  const optReal = document.querySelector('#filter-status-entregas option[value="REALIZADO"]');
  const optEnt = document.querySelector('#filter-status-entregas option[value="ENTREGADO"]');
  if (optAll) optAll.textContent = `📋 Todos los estados (${countEnProd + countRealizados + countEntregados})`;
  if (optProd) optProd.textContent = `📺 En producción (${countEnProd})`;
  if (optReal) optReal.textContent = `🥖 Fabricados / Por despachar (${countRealizados})`;
  if (optEnt) optEnt.textContent = `✅ Entregados (${countEntregados})`;

  if (countEl) {
    countEl.textContent = `${countEnProd} en producción • ${countRealizados} fabricados • ${countEntregados} entregados`;
  }

  // 2. Filtrar según controles del usuario (Únicamente los 3 estados operativos - Req 2.2)
  const filtered = eligibleOrders.filter(o => {
    // Filtro de Estado
    if (state.filterStatusEntregas === 'EN_PRODUCCION' && o.estado !== 'EN_PRODUCCION') return false;
    if (state.filterStatusEntregas === 'REALIZADO' && o.estado !== 'REALIZADO') return false;
    if (state.filterStatusEntregas === 'ENTREGADO' && o.estado !== 'ENTREGADO') return false;

    // Filtro de Búsqueda
    if (state.searchTermEntregas) {
      const term = state.searchTermEntregas.toLowerCase();
      const matchClient = (o.cliente || '').toLowerCase().includes(term);
      const matchTel = (o.telefono || '').toLowerCase().includes(term);
      const matchDelivery = (o.entrega || '').toLowerCase().includes(term);
      const matchProd = (o.producto || '').toLowerCase().includes(term);
      if (!matchClient && !matchTel && !matchDelivery && !matchProd) return false;
    }

    // Filtro por Modalidad (Retiro vs Delivery)
    const isDeliv = isDeliveryOrder(o);
    if (state.filterDeliveryEntregas === 'RETIRO' && isDeliv) return false;
    if (state.filterDeliveryEntregas === 'DELIVERY' && !isDeliv) return false;

    return true;
  });

  // Agrupar los pedidos filtrados por Cliente y Marca de tiempo
  const groups = {};
  filtered.forEach(o => {
    const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
    const key = `${o.cliente}___${rawFecha}`;
    const itemMonto = getItemMonto(o);
    if (!groups[key]) {
      const dateParts = formatFriendlyDateParts(rawFecha);
      groups[key] = {
        key: key,
        cliente: o.cliente,
        fechaRaw: rawFecha,
        fechaDate: dateParts.date,
        fechaTime: dateParts.time,
        telefono: o.telefono,
        entrega: o.entrega,
        items: [],
        totalMonto: 0
      };
    }
    groups[key].items.push(o);
    groups[key].totalMonto += itemMonto;
  });

  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    const isFilteredDelivered = state.filterStatusEntregas === 'ENTREGADO';
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
        <span class="text-4xl block mb-2">${isFilteredDelivered ? '📦' : '🚚'}</span>
        <p class="text-lg font-bold text-slate-300">
          ${isFilteredDelivered 
            ? 'Aún no hay pedidos marcados como entregados.' 
            : 'No hay pedidos por despachar con los filtros actuales.'}
        </p>
        <p class="text-xs text-slate-500 mt-1">
          ${isFilteredDelivered
            ? 'Los pedidos que despaches con el botón "Listo para Entregar" se registrarán aquí.'
            : 'Envía pedidos a producción desde la pestaña "Pedidos" para verlos listos para despacho.'}
        </p>
      </div>`;
    return;
  }

  if (!state.expandedEntregasCards) {
    state.expandedEntregasCards = new Set();
  }

  container.innerHTML = groupKeys.map(key => {
    const g = groups[key];
    const isAllDelivered = g.items.every(i => i.estado === 'ENTREGADO');
    const isRealizado = g.items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO');
    const isDelivery = g.items.some(i => isDeliveryOrder(i));
    const isExpanded = state.expandedEntregasCards.has(key);

    // Modalidad de entrega limpia
    let entregaBadge = '';
    if (isDelivery) {
      const limpia = (g.entrega || 'A domicilio')
        .replace(/^sí\s*-\s*/i, '')
        .replace(/^si\s*-\s*/i, '')
        .replace(/^delivery:\s*/i, '')
        .trim();
      entregaBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">🛵 Delivery: ${escapeHtml(limpia || 'A domicilio')}</span>`;
    } else {
      entregaBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">🏪 Retiro en Tienda</span>`;
    }

    // Teléfono WhatsApp
    let telHtml = '';
    if (g.telefono) {
      const cleanTel = g.telefono.replace(/[^0-9]/g, '');
      telHtml = `
        <a href="https://wa.me/${cleanTel}" target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all">
          <span>💬 ${escapeHtml(g.telefono)}</span>
        </a>`;
    }

    // Filas de productos
    let totalPaq = 0;
    let totalUnidades = 0;
    const itemsHtml = g.items.map(item => {
      const paq = parseFloat(item.paquetes) || 0;
      const uPorPaq = getUnidadesPorPaquete(item);
      const un = paq * uPorPaq;
      totalPaq += paq;
      totalUnidades += un;

      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-200">${escapeHtml(item.producto)}</span>
            ${getToppingBadgeHtml(item.topping, 'text-[11px] py-0.5 px-2')}
          </div>
          <div class="text-right whitespace-nowrap flex items-center gap-2 font-mono">
            <span class="font-black text-white text-sm">${paq} pq</span>
            <span class="text-slate-400 text-xs">(${un} un)</span>
            <span class="text-emerald-400 font-bold text-xs ml-1">$${getItemMonto(item).toFixed(2)}</span>
          </div>
        </div>`;
    }).join('');

    let statusBadge = '';
    if (isAllDelivered) {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✅ ENTREGADO</span>`;
    } else if (isRealizado) {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🥖 LISTO DESPACHO</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">📺 EN PRODUCCIÓN</span>`;
    }

    const borderClass = isAllDelivered 
      ? 'border-emerald-500/40 bg-slate-900/60 shadow-lg shadow-emerald-500/5' 
      : (isRealizado ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'border-slate-800 hover:border-amber-500/40');

    return `
      <div class="entrega-card bg-slate-900/90 rounded-3xl border-2 ${borderClass} shadow-xl transition-all duration-200 overflow-hidden ${isExpanded ? 'is-expanded' : 'is-collapsed'}" data-card-key="${encodeURIComponent(g.key)}">
        
        <!-- Cabecera de la tarjeta: Información esencial siempre visible (Req 1) -->
        <div class="entrega-card-header p-4 sm:p-5 cursor-pointer select-none transition-colors" data-card-key="${encodeURIComponent(g.key)}">
          <div class="flex items-start justify-between gap-3 mb-2.5">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h4 class="text-base sm:text-lg font-black text-white tracking-tight truncate max-w-[210px] sm:max-w-[280px]" title="${escapeHtml(g.cliente)}">
                  ${escapeHtml(g.cliente)}
                </h4>
                <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-black tracking-tight shadow-sm shrink-0" title="Monto total del pedido">
                  $${g.totalMonto.toFixed(2)}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                <span>📅 ${g.fechaDate}</span>
                <span>•</span>
                <span>🕒 ${g.fechaTime}</span>
              </div>
            </div>

            <!-- Estado + Botón Desplegar/Contraer (Req 1) -->
            <div class="flex items-center gap-2 shrink-0">
              ${statusBadge}
              <button type="button" 
                class="btn-toggle-entrega-card w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95" 
                aria-expanded="${isExpanded ? 'true' : 'false'}" 
                title="${isExpanded ? 'Contraer pedido' : 'Ver detalles del pedido'}"
                data-card-key="${encodeURIComponent(g.key)}">
                <svg class="w-4 h-4 transition-transform duration-200 icon-chevron ${isExpanded ? 'rotate-180 text-amber-400' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Fila de Modalidad y WhatsApp + Resumen Rápido -->
          <div class="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-slate-800/60">
            <div class="flex items-center gap-2 flex-wrap">
              ${entregaBadge}
              ${telHtml}
            </div>

            <!-- Resumen compacto en estado colapsado -->
            <div class="text-xs text-slate-400 font-mono font-medium flex items-center gap-1.5 ml-auto">
              <span>${totalPaq} pq</span>
              <span class="text-slate-600">•</span>
              <span>${totalUnidades} un</span>
              <span class="text-slate-600 hidden sm:inline">•</span>
              <span class="text-amber-400 font-bold text-toggle-hint text-[11px] hidden sm:inline">${isExpanded ? 'Ocultar detalles ▲' : 'Ver productos ▼'}</span>
            </div>
          </div>
        </div>

        <!-- Detalle Colapsable: Desglose de productos y botones de acción (Req 2) -->
        <div class="entrega-card-body px-4 sm:px-5 pb-5 pt-1 ${isExpanded ? '' : 'hidden'} border-t border-slate-800/80">
          <!-- Lista de Ítems -->
          <div class="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 mb-3.5 mt-2">
            <div class="text-[11px] uppercase tracking-wider font-bold text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800/80 flex justify-between items-center">
              <span>Productos (${g.items.length})</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-200 font-mono font-bold">${totalPaq} pq (${totalUnidades} un)</span>
                <span>•</span>
                <span class="text-emerald-400 font-mono font-black">$${g.totalMonto.toFixed(2)}</span>
              </div>
            </div>
            <div class="divide-y divide-slate-800/40 max-h-56 overflow-y-auto pr-1">
              ${itemsHtml}
            </div>
          </div>

          <!-- Botones de Acción de Entregas (Req 2) -->
          <div class="pt-2 border-t border-slate-800 flex flex-col gap-2">
            ${isAllDelivered ? `
              <div class="flex items-center justify-between gap-3 pt-1">
                <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5 py-1">
                  <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Despachado / Entregado
                </span>
                <button class="btn-entregas-action-revert-entregar py-2 px-3.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Revertir entrega y volver a colocar como fabricado">
                  <span>↩️ Revertir Despacho</span>
                </button>
              </div>
            ` : (isRealizado ? `
              <div class="flex items-center gap-2">
                <button class="btn-entregas-action-revert-prod py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700" data-card-key="${encodeURIComponent(g.key)}" title="Devolver a la pantalla de Producción TV">
                  <span>↩️ A Producción TV</span>
                </button>
                <button class="btn-entregas-action-entregar flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:brightness-110 shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Marcar como entregado / despachado">
                  <span>📦 Listo para Entregar</span>
                </button>
              </div>
            ` : `
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <button class="btn-entregas-action-revert-pendientes flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Retirar de Producción TV y devolver a bandeja de Pendientes">
                    <span>↩️ Devolver a Pendientes</span>
                  </button>
                  <button class="btn-entregas-action-realizado flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Marcar completado en producción (fabricado)">
                    <span>🥖 Marcar Fabricado</span>
                  </button>
                </div>
                <button class="btn-entregas-action-entregar w-full py-2.5 px-4 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:brightness-110 shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Marcar directamente como entregado / despachado">
                  <span>📦 Listo para Entregar</span>
                </button>
              </div>
            `)}
          </div>
        </div>

      </div>`;
  }).join('');

  // Manejo de acordeón colapsable en Entregas (Req 3)
  function handleCardToggle(cardKey) {
    if (!state.expandedEntregasCards) state.expandedEntregasCards = new Set();
    const cardEl = container.querySelector(`.entrega-card[data-card-key="${encodeURIComponent(cardKey)}"]`);
    if (!cardEl) return;
    const bodyEl = cardEl.querySelector('.entrega-card-body');
    const toggleBtn = cardEl.querySelector('.btn-toggle-entrega-card');
    const chevron = cardEl.querySelector('.icon-chevron');
    const hintText = cardEl.querySelector('.text-toggle-hint');

    const willExpand = !state.expandedEntregasCards.has(cardKey);
    if (willExpand) {
      state.expandedEntregasCards.add(cardKey);
      cardEl.classList.add('is-expanded');
      cardEl.classList.remove('is-collapsed');
      if (bodyEl) bodyEl.classList.remove('hidden');
      if (chevron) {
        chevron.classList.add('rotate-180', 'text-amber-400');
        chevron.classList.remove('text-slate-400');
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.title = 'Contraer pedido';
      }
      if (hintText) hintText.textContent = 'Ocultar detalles ▲';
    } else {
      state.expandedEntregasCards.delete(cardKey);
      cardEl.classList.remove('is-expanded');
      cardEl.classList.add('is-collapsed');
      if (bodyEl) bodyEl.classList.add('hidden');
      if (chevron) {
        chevron.classList.remove('rotate-180', 'text-amber-400');
        chevron.classList.add('text-slate-400');
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.title = 'Ver detalles del pedido';
      }
      if (hintText) hintText.textContent = 'Ver productos ▼';
    }
  }

  // Click en el botón de toggle
  container.querySelectorAll('.btn-toggle-entrega-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      handleCardToggle(cardKey);
    });
  });

  // Click en la cabecera completa de la tarjeta
  container.querySelectorAll('.entrega-card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Ignorar si se hace clic en enlaces (ej. WhatsApp) o botones
      if (e.target.closest('a') || e.target.closest('button')) return;
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      handleCardToggle(cardKey);
    });
  });

  // Evitar que el clic en el enlace de WhatsApp propague al toggle
  container.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  // Event listeners para las acciones en Entregas (Req 2.2)
  container.querySelectorAll('.btn-entregas-action-revert-pendientes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        retireFromProduction(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-realizado').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-revert-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        revertToProduccion(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'ENTREGADO', groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-revert-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });
}

// ==========================================
// CARRUSEL HORIZONTAL: PEDIDOS 'LISTO DESPACHO' (REQ 1, 2, 3)
// ==========================================
function renderCarruselListoDespacho(groups) {
  const section = document.getElementById('section-carrusel-despacho');
  const track = document.getElementById('carrusel-despacho-track');
  const countBadge = document.getElementById('badge-count-carrusel');
  const wrapper = document.getElementById('carrusel-despacho-container');
  if (!section || !track) return;

  if (!groups || groups.length === 0) {
    section.classList.add('hidden');
    track.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');
  if (countBadge) {
    countBadge.textContent = `${groups.length}`;
  }

  // REQ 1: Cada tarjeta dentro del carrusel debe mostrar ÚNICAMENTE dos bloques:
  // 1) Nombre del Cliente en grande
  // 2) Listado de productos que lleva en ese pedido
  // Elimina cualquier otro dato (como modalidad de entrega o resumen de paquetes).
  const renderCard = (g, isClone = false) => `
    <div class="carrusel-card flex-shrink-0 w-72 sm:w-80 bg-slate-900/95 border-2 border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 shadow-lg shadow-cyan-500/10 cursor-pointer select-none transition-all hover:scale-[1.02] flex flex-col justify-between" 
         data-card-key="${encodeURIComponent(g.key)}" 
         ${isClone ? 'aria-hidden="true"' : ''}
         title="Clic para ver detalle de ${escapeHtml(g.cliente)}">
      
      <!-- Bloque 1: Nombre del Cliente en grande -->
      <div class="border-b border-cyan-500/30 pb-2 mb-2.5">
        <h4 class="text-base sm:text-lg font-black text-white tracking-tight truncate" title="${escapeHtml(g.cliente)}">
          ${escapeHtml(g.cliente)}
        </h4>
      </div>

      <!-- Bloque 2: Listado de los productos que lleva en ese pedido -->
      <div class="space-y-1.5 flex-1 overflow-y-auto max-h-32 pr-1 custom-scrollbar">
        ${g.items.map(item => `
          <div class="flex items-center justify-between gap-2 text-xs py-0.5 border-b border-slate-800/40 last:border-0">
            <span class="font-semibold text-slate-200 truncate">
              ${escapeHtml(item.producto)}${item.topping && item.topping !== 'Sin Topping' && item.topping !== '-' ? ` <span class="text-amber-300 font-normal">(${escapeHtml(item.topping)})</span>` : ''}
            </span>
            <span class="font-mono font-bold text-cyan-300 shrink-0">
              ${item.paquetes} pq
            </span>
          </div>
        `).join('')}
      </div>

    </div>`;

  // Animación continua sin saltos: Si hay al menos 2 pedidos duplicamos los elementos para loop infinito
  let cardsHtml = '';
  if (groups.length >= 2) {
    cardsHtml = groups.map(g => renderCard(g, false)).join('') + groups.map(g => renderCard(g, true)).join('');
    track.classList.add('is-animating');
    const duration = Math.max(20, groups.length * 8);
    track.style.setProperty('--carrusel-duration', `${duration}s`);
  } else {
    cardsHtml = groups.map(g => renderCard(g, false)).join('');
    track.classList.remove('is-animating');
  }

  track.innerHTML = cardsHtml;

  // REQ 2: Hover para pausar desplazamiento automático (JS listener + CSS)
  if (wrapper && !wrapper.dataset.hoverBound) {
    wrapper.dataset.hoverBound = 'true';
    wrapper.addEventListener('mouseenter', () => {
      const activeTrack = document.getElementById('carrusel-despacho-track');
      if (activeTrack) activeTrack.style.animationPlayState = 'paused';
    });
    wrapper.addEventListener('mouseleave', () => {
      const activeTrack = document.getElementById('carrusel-despacho-track');
      if (activeTrack) activeTrack.style.animationPlayState = 'running';
    });
  }

  // REQ 3: Al hacer clic en una tarjeta, realizar scroll-into-view hacia la tarjeta detallada
  track.querySelectorAll('.carrusel-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      scrollToEntregaCard(cardKey);
    });
  });
}

// REQ 3: Navegación scroll-into-view con apertura automática de tarjeta y destello visual
function scrollToEntregaCard(cardKey) {
  if (!cardKey) return;

  // 1. Si los filtros de estado o búsqueda ocultan la tarjeta, restablecerlos
  const filterStatus = document.getElementById('filter-status-entregas');
  const searchInput = document.getElementById('input-search-entregas');
  let needsReRender = false;

  if (state.filterStatusEntregas && state.filterStatusEntregas !== 'ALL' && state.filterStatusEntregas !== 'REALIZADO') {
    state.filterStatusEntregas = 'ALL';
    if (filterStatus) filterStatus.value = 'ALL';
    needsReRender = true;
  }

  if (state.searchTermEntregas) {
    state.searchTermEntregas = '';
    if (searchInput) searchInput.value = '';
    needsReRender = true;
  }

  if (needsReRender) {
    renderEntregas();
  }

  // 2. Localizar la tarjeta en el grid principal de entregas
  const targetCard = document.querySelector(`#entregas-grid .entrega-card[data-card-key="${encodeURIComponent(cardKey)}"]`);
  if (!targetCard) return;

  // 3. Si estaba colapsada, expandirla para que el usuario vea todos los detalles de inmediato
  if (!state.expandedEntregasCards) state.expandedEntregasCards = new Set();
  state.expandedEntregasCards.add(cardKey);

  targetCard.classList.remove('is-collapsed');
  targetCard.classList.add('is-expanded');
  const body = targetCard.querySelector('.entrega-card-body');
  if (body) body.classList.remove('hidden');
  const btn = targetCard.querySelector('.btn-toggle-entrega-card');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const chevron = targetCard.querySelector('.icon-chevron');
  if (chevron) {
    chevron.classList.add('rotate-180', 'text-amber-400');
    chevron.classList.remove('text-slate-400');
  }

  // 4. Scroll suave centrado en la pantalla
  targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 5. Destello luminoso temporal de alta visibilidad
  targetCard.classList.remove('carrusel-target-highlight');
  void targetCard.offsetWidth; // Forzar reflow para reiniciar la animación
  targetCard.classList.add('carrusel-target-highlight');
  setTimeout(() => {
    targetCard.classList.remove('carrusel-target-highlight');
  }, 2500);
}

// Actualizar estado de despacho/entrega
function updateDeliveryStatus(rowIndices, newStatus, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  // 1. Actualizar estado en memoria interna
  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = newStatus;
    }
  });
  saveLocalOrders();

  // 2. Sincronizar de forma asíncrona con Google Sheets (Columna L)
  if (state.apiUrl) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        rowIndices: rowIndices,
        status: newStatus
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar estado de entrega en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  // 3. Re-renderizar vistas activas y contadores
  renderAllViews();

  // 4. Notificación toast de confirmación inmediata
  let toastText = '';
  if (newStatus === 'ENTREGADO') {
    toastText = `✅ Pedido de "${clientName || 'Cliente'}" marcado como ENTREGADO / DESPACHADO.`;
  } else if (newStatus === 'REALIZADO') {
    toastText = `🥖 Pedido de "${clientName || 'Cliente'}" marcado como REALIZADO (listo para entrega).`;
  } else {
    toastText = `↩️ Pedido de "${clientName || 'Cliente'}" devuelto a "En Producción TV".`;
  }
  showToastNotification(toastText);
}

// ==========================================
// SECCIÓN 4: DELIVERYS & LIQUIDACIÓN
// ==========================================
function renderDeliverys() {
  const container = document.getElementById('deliverys-grid');
  if (!container) return;

  // 1. Filtrar pedidos que corresponden a la modalidad Delivery
  const deliveryOrders = state.orders.filter(o => isDeliveryOrder(o));

  // 2. Agrupar por Cliente + Fecha (un grupo por pedido)
  const groups = {};
  deliveryOrders.forEach(o => {
    const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
    const key = `${o.cliente}___${rawFecha}`;
    const itemMonto = getItemMonto(o);
    const paq = parseFloat(o.paquetes) || 0;
    const un = paq * getUnidadesPorPaquete(o);

    if (!groups[key]) {
      const dateParts = formatFriendlyDateParts(rawFecha);
      const meta = state.deliveriesMeta[o.rowIndex] || {};
      const repartidor = meta.repartidor || o.repartidor || '';
      const costo = typeof meta.costo !== 'undefined' ? parseFloat(meta.costo) : (parseFloat(o.costo_delivery) || 0);
      const liquidado = typeof meta.liquidado !== 'undefined' ? Boolean(meta.liquidado) : (Boolean(o.liquidado) || false);

      groups[key] = {
        key: key,
        cliente: o.cliente,
        fechaRaw: rawFecha,
        fechaDate: dateParts.date,
        fechaTime: dateParts.time,
        telefono: o.telefono,
        entrega: o.entrega,
        repartidor: repartidor,
        costoDelivery: costo,
        liquidado: liquidado,
        items: [],
        totalMonto: 0,
        totalPaquetes: 0,
        totalUnidades: 0
      };
    }
    groups[key].items.push(o);
    groups[key].totalMonto += itemMonto;
    groups[key].totalPaquetes += paq;
    groups[key].totalUnidades += un;
  });

  const allGroupList = Object.values(groups);

  // 3. Métricas Globales de Delivery
  let totalDelivCount = allGroupList.length;
  let totalDelivUnidades = 0;
  let totalDelivCost = 0;
  let pendingPayoutCost = 0;
  let pendingPayoutCount = 0;
  let paidPayoutCost = 0;
  let paidPayoutCount = 0;

  allGroupList.forEach(g => {
    totalDelivUnidades += g.totalUnidades;
    totalDelivCost += g.costoDelivery;
    if (g.liquidado) {
      paidPayoutCost += g.costoDelivery;
      paidPayoutCount++;
    } else {
      pendingPayoutCost += g.costoDelivery;
      pendingPayoutCount++;
    }
  });

  const statDelivTotalCount = document.getElementById('stat-deliv-total-count');
  const statDelivTotalUnidades = document.getElementById('stat-deliv-total-unidades');
  const statDelivTotalCost = document.getElementById('stat-deliv-total-cost');
  const statDelivPendingCost = document.getElementById('stat-deliv-pending-cost');
  const statDelivPendingCount = document.getElementById('stat-deliv-pending-count');
  const statDelivPaidCost = document.getElementById('stat-deliv-paid-cost');
  const statDelivPaidCount = document.getElementById('stat-deliv-paid-count');
  const statDeliverysBadgeCount = document.getElementById('stat-deliverys-badge-count');

  if (statDelivTotalCount) statDelivTotalCount.textContent = totalDelivCount;
  if (statDelivTotalUnidades) statDelivTotalUnidades.textContent = `${totalDelivUnidades} panes`;
  if (statDelivTotalCost) statDelivTotalCost.textContent = `$${totalDelivCost.toFixed(2)}`;
  if (statDelivPendingCost) statDelivPendingCost.textContent = `$${pendingPayoutCost.toFixed(2)}`;
  if (statDelivPendingCount) statDelivPendingCount.textContent = `${pendingPayoutCount} envíos por liquidar`;
  if (statDelivPaidCost) statDelivPaidCost.textContent = `$${paidPayoutCost.toFixed(2)}`;
  if (statDelivPaidCount) statDelivPaidCount.textContent = `${paidPayoutCount} envíos liquidados`;
  if (statDeliverysBadgeCount) statDeliverysBadgeCount.textContent = `${totalDelivCount} pedidos en delivery`;

  // 4. Poblar selector de repartidores para filtro
  const filterDriverEl = document.getElementById('filter-driver-deliverys');
  if (filterDriverEl) {
    const curVal = state.filterDriverDeliverys;
    const driverSet = new Set(state.deliveryDrivers);
    allGroupList.forEach(g => {
      if (g.repartidor && g.repartidor.trim()) driverSet.add(g.repartidor.trim());
    });
    const sortedDrivers = Array.from(driverSet).sort();

    filterDriverEl.innerHTML = `
      <option value="ALL">🛵 Todos los repartidores</option>
      <option value="UNASSIGNED">⚠️ Sin Asignar</option>
      ${sortedDrivers.map(d => `<option value="${escapeHtml(d)}" ${curVal === d ? 'selected' : ''}>🛵 ${escapeHtml(d)}</option>`).join('')}
    `;
    filterDriverEl.value = curVal;
  }

  // 5. Tabla de Liquidación por Repartidor
  renderSettlementTable(allGroupList);

  // 6. Filtrar pedidos a mostrar en las tarjetas de Deliverys
  const filteredGroups = allGroupList.filter(g => {
    // Filtro por Repartidor
    if (state.filterDriverDeliverys === 'UNASSIGNED') {
      if (g.repartidor && g.repartidor.trim() !== '') return false;
    } else if (state.filterDriverDeliverys !== 'ALL') {
      if (g.repartidor !== state.filterDriverDeliverys) return false;
    }

    // Filtro por Estado
    const isAllDelivered = g.items.every(i => i.estado === 'ENTREGADO');
    if (state.filterStatusDeliverys === 'POR_DESPACHAR' && isAllDelivered) return false;
    if (state.filterStatusDeliverys === 'ENTREGADO' && !isAllDelivered) return false;
    if (state.filterStatusDeliverys === 'PENDIENTE_PAGO' && g.liquidado) return false;
    if (state.filterStatusDeliverys === 'LIQUIDADO' && !g.liquidado) return false;

    // Buscador
    if (state.searchTermDeliverys) {
      const term = state.searchTermDeliverys.toLowerCase();
      const matchClient = (g.cliente || '').toLowerCase().includes(term);
      const matchTel = (g.telefono || '').toLowerCase().includes(term);
      const matchEntrega = (g.entrega || '').toLowerCase().includes(term);
      const matchRep = (g.repartidor || '').toLowerCase().includes(term);
      const matchProd = g.items.some(i => (i.producto || '').toLowerCase().includes(term));
      if (!matchClient && !matchTel && !matchEntrega && !matchRep && !matchProd) return false;
    }

    return true;
  });

  // 7. Renderizar Tarjetas en el Grid
  if (filteredGroups.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
        <span class="text-4xl block mb-2">🛵</span>
        <p class="text-lg font-bold text-slate-300">No hay pedidos de delivery con los filtros actuales.</p>
        <p class="text-xs text-slate-500 mt-1">Puedes enviar pedidos a Delivery desde la pestaña "Pedidos" o "Entregas".</p>
      </div>`;
    return;
  }

  const driverOptions = state.deliveryDrivers;

  container.innerHTML = filteredGroups.map(g => {
    const isAllDelivered = g.items.every(i => i.estado === 'ENTREGADO');
    const isRealizado = g.items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO');
    const isProduccion = g.items.some(i => i.estado === 'EN_PRODUCCION');

    let statusBadge = '';
    if (isAllDelivered) {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✅ ENTREGADO</span>`;
    } else if (isRealizado) {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">🥖 LISTO DESPACHO</span>`;
    } else if (isProduccion) {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">🔥 EN PRODUCCIÓN</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-slate-800 text-slate-400 border border-slate-700">⏳ PENDIENTE</span>`;
    }

    // Teléfono WhatsApp
    let telHtml = '';
    if (g.telefono) {
      const cleanTel = g.telefono.replace(/[^0-9]/g, '');
      telHtml = `
        <a href="https://wa.me/${cleanTel}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all">
          <span>💬 ${escapeHtml(g.telefono)}</span>
        </a>`;
    }

    // Dirección limpia
    const direccionLimpia = (g.entrega || 'Dirección no especificada')
      .replace(/^sí\s*-\s*/i, '')
      .replace(/^si\s*-\s*/i, '')
      .replace(/^delivery:\s*/i, '')
      .trim();

    // Desglose de productos compacto
    const itemsHtml = g.items.map(item => {
      const paq = parseFloat(item.paquetes) || 0;
      const un = paq * getUnidadesPorPaquete(item);
      return `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0 text-xs">
          <div class="flex items-center gap-2 truncate pr-2">
            <span class="font-bold text-slate-200 truncate">${escapeHtml(item.producto)}</span>
            ${item.topping ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">${escapeHtml(item.topping)}</span>` : ''}
          </div>
          <div class="text-right whitespace-nowrap flex items-center gap-2 font-mono">
            <span class="font-bold text-white text-xs">${paq} pq</span>
            <span class="text-slate-400 text-[11px]">(${un} un)</span>
            <span class="text-emerald-400 font-bold text-xs">$${getItemMonto(item).toFixed(2)}</span>
          </div>
        </div>`;
    }).join('');

    const totalCobrar = g.totalMonto + g.costoDelivery;

    return `
      <div class="bg-slate-900/90 rounded-3xl p-5 border-2 ${g.liquidado ? 'border-emerald-500/40 bg-slate-900/60' : 'border-purple-500/30 hover:border-purple-500/60'} shadow-2xl flex flex-col justify-between transition-all" data-card-key="${encodeURIComponent(g.key)}">
        
        <div>
          <!-- Cabecera de la Tarjeta -->
          <div class="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-lg font-black text-white tracking-tight">${escapeHtml(g.cliente)}</h4>
                ${statusBadge}
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span>📅 ${g.fechaDate}</span>
                <span>•</span>
                <span>🕒 ${g.fechaTime}</span>
              </div>
            </div>
            <!-- Total a Cobrar Destacado -->
            <div class="text-right">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Total a Cobrar</span>
              <span class="text-lg font-black font-mono text-emerald-400 block card-total-cobrar">
                $${totalCobrar.toFixed(2)}
              </span>
            </div>
          </div>

          <!-- Contacto & Dirección -->
          <div class="space-y-2 mb-3">
            <div class="flex flex-wrap items-center gap-2">
              ${telHtml}
              <button class="btn-deliv-to-pickup text-slate-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs transition-all flex items-center gap-1 cursor-pointer" data-card-key="${encodeURIComponent(g.key)}" title="Cambiar a Retiro en Tienda">
                <span>🏪 Pasar a Retiro</span>
              </button>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
              <span class="text-purple-400 text-sm mt-0.5">📍</span>
              <span class="flex-1 font-medium leading-relaxed">${escapeHtml(direccionLimpia)}</span>
            </div>
          </div>

          <!-- Asignación de Repartidor y Costo de Envío Editable -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20 mb-3">
            <!-- Repartidor -->
            <div>
              <label class="block text-[10px] uppercase font-bold text-purple-300 mb-1">Repartidor Asignado</label>
              <select class="select-deliv-driver w-full px-2.5 py-1.5 bg-slate-950 border border-purple-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer" data-card-key="${encodeURIComponent(g.key)}">
                <option value="">⚠️ Sin Asignar</option>
                ${driverOptions.map(d => `<option value="${escapeHtml(d)}" ${g.repartidor === d ? 'selected' : ''}>🛵 ${escapeHtml(d)}</option>`).join('')}
              </select>
            </div>

            <!-- Costo de Delivery -->
            <div>
              <label class="block text-[10px] uppercase font-bold text-purple-300 mb-1">Costo Envío ($)</label>
              <div class="relative">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input type="number" step="0.5" min="0" class="input-deliv-cost w-full pl-6 pr-2 py-1.5 bg-slate-950 border border-purple-500/30 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-purple-400" value="${g.costoDelivery.toFixed(2)}" data-card-key="${encodeURIComponent(g.key)}">
              </div>
            </div>
          </div>

          <!-- Resumen Matemático del Pedido -->
          <div class="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between mb-3 font-mono">
            <span>Productos: <strong class="text-white">$${g.totalMonto.toFixed(2)}</strong></span>
            <span>+</span>
            <span>Envío: <strong class="text-amber-300 card-envio-cost">$${g.costoDelivery.toFixed(2)}</strong></span>
            <span>=</span>
            <span class="text-emerald-400 font-black card-total-formula">$${totalCobrar.toFixed(2)}</span>
          </div>

          <!-- Lista de Productos -->
          <div class="bg-slate-950/40 rounded-2xl p-3 border border-slate-800/80 mb-3">
            <div class="text-[11px] uppercase tracking-wider font-bold text-slate-400 pb-1 mb-1 border-b border-slate-800/80 flex justify-between items-center">
              <span>Productos (${g.items.length})</span>
              <span class="text-slate-300 font-mono text-xs">${g.totalPaquetes} pq (${g.totalUnidades} un)</span>
            </div>
            <div class="divide-y divide-slate-800/40 max-h-36 overflow-y-auto pr-1">
              ${itemsHtml}
            </div>
          </div>

        </div>

        <!-- Acciones Inferiores de la Tarjeta -->
        <div class="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
          
          <!-- Fila de Liquidación al Repartidor -->
          <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-[11px] font-bold text-slate-400">Pago Repartidor:</span>
              ${g.liquidado 
                ? `<span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">✅ Liquidado</span>` 
                : `<span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">⏳ Pendiente</span>`
              }
            </div>
            <button class="btn-toggle-paid-group px-2.5 py-1 rounded-lg text-xs font-bold ${g.liquidado ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30'} transition-all cursor-pointer" data-card-key="${encodeURIComponent(g.key)}" data-liquidado="${g.liquidado ? '1' : '0'}">
              ${g.liquidado ? '↩️ Desmarcar' : '💵 Liquidar Pago'}
            </button>
          </div>

          <!-- Acciones de Estado del Pedido -->
          <div class="flex items-center gap-2">
            ${!isRealizado ? `
              <button class="btn-deliv-realizado flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/20 cursor-pointer" data-card-key="${encodeURIComponent(g.key)}">
                🥖 Marcar Realizado
              </button>
            ` : ''}

            ${!isAllDelivered ? `
              <button class="btn-deliv-entregar flex-1 py-2 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 transition-all shadow-md shadow-emerald-500/25 cursor-pointer" data-card-key="${encodeURIComponent(g.key)}">
                📦 Listo para Despachar
              </button>
            ` : `
              <button class="btn-deliv-revert-entregar flex-1 py-2 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer" data-card-key="${encodeURIComponent(g.key)}">
                ↩️ Revertir Despacho
              </button>
            `}
          </div>

        </div>

      </div>`;
  }).join('');

  // 8. Vincular eventos de las tarjetas en Deliverys
  bindDeliveryCardEvents(groups);
}

// Renderizar tabla resumida de liquidación por repartidor
function renderSettlementTable(allGroupList) {
  const tbody = document.getElementById('table-settlement-rows');
  if (!tbody) return;

  const byDriver = {};
  allGroupList.forEach(g => {
    const driverName = (g.repartidor && g.repartidor.trim()) ? g.repartidor.trim() : 'Sin Asignar';
    if (!byDriver[driverName]) {
      byDriver[driverName] = {
        name: driverName,
        totalEnvios: 0,
        entregados: 0,
        totalFee: 0,
        pendingFee: 0,
        paidFee: 0,
        keys: []
      };
    }
    byDriver[driverName].totalEnvios++;
    if (g.items.every(i => i.estado === 'ENTREGADO')) {
      byDriver[driverName].entregados++;
    }
    byDriver[driverName].totalFee += g.costoDelivery;
    if (g.liquidado) {
      byDriver[driverName].paidFee += g.costoDelivery;
    } else {
      byDriver[driverName].pendingFee += g.costoDelivery;
    }
    byDriver[driverName].keys.push(g.key);
  });

  const driverNames = Object.keys(byDriver);
  if (driverNames.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No hay repartidores con envíos asignados hoy.</td></tr>`;
    return;
  }

  tbody.innerHTML = driverNames.map(name => {
    const d = byDriver[name];
    const isSinAsignar = name === 'Sin Asignar';
    const isAllPaid = d.totalEnvios > 0 && d.pendingFee === 0;

    let statusHtml = '';
    if (isAllPaid) {
      statusHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">✅ Todo Liquidado</span>`;
    } else if (d.paidFee > 0) {
      statusHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">⏳ Parcial ($${d.pendingFee.toFixed(2)} pend.)</span>`;
    } else {
      statusHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold text-[11px] border border-slate-700">⏳ Pendiente de Pago</span>`;
    }

    let actionBtnHtml = '';
    if (!isSinAsignar && d.pendingFee > 0) {
      actionBtnHtml = `
        <button class="btn-liquidar-repartidor px-3 py-1.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap active:scale-95" data-driver="${escapeHtml(name)}">
          💵 Liquidar $${d.pendingFee.toFixed(2)}
        </button>`;
    } else if (!isSinAsignar && isAllPaid && d.totalFee > 0) {
      actionBtnHtml = `
        <button class="btn-revertir-liquidacion px-3 py-1.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer whitespace-nowrap" data-driver="${escapeHtml(name)}">
          ↩️ Reabrir Turno
        </button>`;
    } else {
      actionBtnHtml = `<span class="text-slate-500 text-xs">—</span>`;
    }

    return `
      <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
        <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
          <span>${isSinAsignar ? '⚠️' : '🛵'}</span>
          <span>${escapeHtml(name)}</span>
        </td>
        <td class="py-3 px-3 text-center font-mono font-bold text-slate-300">${d.totalEnvios}</td>
        <td class="py-3 px-3 text-center font-mono font-bold ${d.entregados === d.totalEnvios ? 'text-emerald-400' : 'text-amber-400'}">
          ${d.entregados} / ${d.totalEnvios}
        </td>
        <td class="py-3 px-4 text-right font-mono font-black text-amber-300 text-sm">
          $${d.totalFee.toFixed(2)}
          ${d.pendingFee > 0 ? `<span class="block text-[10px] text-amber-400/80 font-normal">($${d.pendingFee.toFixed(2)} pendiente)</span>` : ''}
        </td>
        <td class="py-3 px-4 text-center">${statusHtml}</td>
        <td class="py-3 px-4 text-right">${actionBtnHtml}</td>
      </tr>`;
  }).join('');

  // Eventos de liquidación por repartidor
  tbody.querySelectorAll('.btn-liquidar-repartidor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const driver = e.currentTarget.dataset.driver;
      liquidarJornadaRepartidor(driver, true);
    });
  });

  tbody.querySelectorAll('.btn-revertir-liquidacion').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const driver = e.currentTarget.dataset.driver;
      liquidarJornadaRepartidor(driver, false);
    });
  });
}

// Vincular eventos de interacción en las tarjetas de Deliverys
function bindDeliveryCardEvents(groups) {
  const container = document.getElementById('deliverys-grid');
  if (!container) return;

  // 1. Selector de Repartidor
  container.querySelectorAll('.select-deliv-driver').forEach(select => {
    select.addEventListener('change', (e) => {
      const cardKey = decodeURIComponent(e.target.dataset.cardKey);
      const newDriver = e.target.value.trim();
      if (!groups[cardKey]) return;

      const meta = getLocalDeliveriesMeta();
      const rows = groups[cardKey].items.map(i => i.rowIndex);

      rows.forEach(idx => {
        if (!meta[idx]) meta[idx] = { costo: groups[cardKey].costoDelivery, liquidado: groups[cardKey].liquidado };
        meta[idx].repartidor = newDriver;
      });
      meta[cardKey] = {
        costo: groups[cardKey].costoDelivery,
        liquidado: groups[cardKey].liquidado,
        repartidor: newDriver
      };
      groups[cardKey].items.forEach(i => i.repartidor = newDriver);
      groups[cardKey].repartidor = newDriver;

      state.deliveriesMeta = meta;
      saveLocalDeliveriesMeta(meta);
      saveLocalOrders();

      if (state.apiUrl) {
        showSyncIndicator(true);
        fetch(state.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updateDeliveryInfo',
            rowIndices: rows,
            repartidor: newDriver
          })
        }).then(() => showSyncIndicator(false)).catch(() => showSyncIndicator(false));
      }

      renderSettlementTable(Object.values(groups));
      updateDeliveryTotalsOnly(Object.values(groups));
      showToastNotification(`🛵 Pedido de "${groups[cardKey].cliente}" asignado a ${newDriver || 'Sin Asignar'}.`);
    });
  });

  // 2. Modificación reactiva del costo de envío
  container.querySelectorAll('.input-deliv-cost').forEach(input => {
    input.addEventListener('input', (e) => {
      const cardKey = decodeURIComponent(e.target.dataset.cardKey);
      const newCost = parseFloat(e.target.value) || 0;
      if (!groups[cardKey]) return;

      groups[cardKey].costoDelivery = newCost;
      const cardEl = container.querySelector(`[data-card-key="${encodeURIComponent(cardKey)}"]`);
      if (cardEl) {
        const totalCobrar = groups[cardKey].totalMonto + newCost;
        const totalEl = cardEl.querySelector('.card-total-cobrar');
        const formulaTotalEl = cardEl.querySelector('.card-total-formula');
        const envioCostEl = cardEl.querySelector('.card-envio-cost');
        if (totalEl) totalEl.textContent = `$${totalCobrar.toFixed(2)}`;
        if (formulaTotalEl) formulaTotalEl.textContent = `$${totalCobrar.toFixed(2)}`;
        if (envioCostEl) envioCostEl.textContent = `$${newCost.toFixed(2)}`;
      }

      // Actualizar metadata local
      const meta = getLocalDeliveriesMeta();
      const rows = groups[cardKey].items.map(i => i.rowIndex);
      rows.forEach(idx => {
        if (!meta[idx]) meta[idx] = { repartidor: groups[cardKey].repartidor, liquidado: groups[cardKey].liquidado };
        meta[idx].costo = newCost;
      });
      meta[cardKey] = {
        repartidor: groups[cardKey].repartidor,
        liquidado: groups[cardKey].liquidado,
        costo: newCost
      };
      groups[cardKey].items.forEach(i => i.costo_delivery = newCost);
      state.deliveriesMeta = meta;
      saveLocalDeliveriesMeta(meta);

      updateDeliveryTotalsOnly(Object.values(groups));
      renderSettlementTable(Object.values(groups));
    });

    input.addEventListener('change', (e) => {
      const cardKey = decodeURIComponent(e.target.dataset.cardKey);
      const newCost = parseFloat(e.target.value) || 0;
      if (!groups[cardKey]) return;
      const rows = groups[cardKey].items.map(i => i.rowIndex);

      if (state.apiUrl) {
        showSyncIndicator(true);
        fetch(state.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updateDeliveryInfo',
            rowIndices: rows,
            costo_delivery: newCost
          })
        }).then(() => showSyncIndicator(false)).catch(() => showSyncIndicator(false));
      }
    });
  });

  // 3. Liquidar / Desmarcar pago individual
  container.querySelectorAll('.btn-toggle-paid-group').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      const curPaid = e.currentTarget.dataset.liquidado === '1';
      const newPaid = !curPaid;
      if (!groups[cardKey]) return;

      const meta = getLocalDeliveriesMeta();
      const rows = groups[cardKey].items.map(i => i.rowIndex);

      rows.forEach(idx => {
        if (!meta[idx]) meta[idx] = { repartidor: groups[cardKey].repartidor, costo: groups[cardKey].costoDelivery };
        meta[idx].liquidado = newPaid;
      });
      meta[cardKey] = {
        repartidor: groups[cardKey].repartidor,
        costo: groups[cardKey].costoDelivery,
        liquidado: newPaid
      };

      state.orders.forEach(o => {
        if (rows.includes(o.rowIndex)) {
          o.liquidado = newPaid;
        }
      });
      groups[cardKey].items.forEach(i => i.liquidado = newPaid);
      groups[cardKey].liquidado = newPaid;

      state.deliveriesMeta = meta;
      saveLocalDeliveriesMeta(meta);
      saveLocalOrders();

      if (state.apiUrl) {
        showSyncIndicator(true);
        fetch(state.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updateDeliveryInfo',
            rowIndices: rows,
            liquidado: newPaid
          })
        }).then(() => showSyncIndicator(false)).catch(() => showSyncIndicator(false));
      }

      renderDeliverys();
      showToastNotification(newPaid ? `💵 Pago de delivery de "${groups[cardKey].cliente}" marcado como LIQUIDADO.` : `↩️ Pago de delivery desmarcado.`);
    });
  });

  // 4. Cambiar a Retiro
  container.querySelectorAll('.btn-deliv-to-pickup').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        sendToPickup(rows, groups[cardKey].cliente);
      }
    });
  });

  // 5. Marcar Realizado desde Delivery
  container.querySelectorAll('.btn-deliv-realizado').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });

  // 6. Listo para despachar / revertir desde Delivery
  container.querySelectorAll('.btn-deliv-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'ENTREGADO', groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-deliv-revert-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'REALIZADO', groups[cardKey].cliente);
      }
    });
  });
}

// Actualizar totales de métricas de Delivery sin reconstruir el DOM completo
function updateDeliveryTotalsOnly(groups) {
  let totalCost = 0;
  let pendingCost = 0;
  let pendingCount = 0;
  let paidCost = 0;
  let paidCount = 0;

  groups.forEach(g => {
    totalCost += g.costoDelivery;
    if (g.liquidado) {
      paidCost += g.costoDelivery;
      paidCount++;
    } else {
      pendingCost += g.costoDelivery;
      pendingCount++;
    }
  });

  const statTotalCost = document.getElementById('stat-deliv-total-cost');
  const statPendingCost = document.getElementById('stat-deliv-pending-cost');
  const statPendingCount = document.getElementById('stat-deliv-pending-count');
  const statPaidCost = document.getElementById('stat-deliv-paid-cost');
  const statPaidCount = document.getElementById('stat-deliv-paid-count');

  if (statTotalCost) statTotalCost.textContent = `$${totalCost.toFixed(2)}`;
  if (statPendingCost) statPendingCost.textContent = `$${pendingCost.toFixed(2)}`;
  if (statPendingCount) statPendingCount.textContent = `${pendingCount} envíos por liquidar`;
  if (statPaidCost) statPaidCost.textContent = `$${paidCost.toFixed(2)}`;
  if (statPaidCount) statPaidCount.textContent = `${paidCount} envíos liquidados`;
}

// Liquidar o reabrir la jornada completa de un repartidor
function liquidarJornadaRepartidor(driverName, marcarLiquidado = true) {
  if (!driverName) return;

  const meta = getLocalDeliveriesMeta();
  const affectedRowIndices = [];

  state.orders.forEach(o => {
    if (isDeliveryOrder(o)) {
      const rawFecha = o.fecha1 || o.fecha2 || 'SinFecha';
      const cardKey = `${o.cliente}___${rawFecha}`;
      const m = meta[o.rowIndex] || meta[cardKey] || {};
      const currentDriver = m.repartidor || o.repartidor || '';
      if (currentDriver.trim() === driverName.trim()) {
        m.liquidado = marcarLiquidado;
        meta[o.rowIndex] = m;
        meta[cardKey] = m;
        o.liquidado = marcarLiquidado;
        affectedRowIndices.push(o.rowIndex);
      }
    }
  });

  state.deliveriesMeta = meta;
  saveLocalDeliveriesMeta(meta);
  saveLocalOrders();

  // Sincronizar con Google Sheets
  if (state.apiUrl && affectedRowIndices.length > 0) {
    showSyncIndicator(true);
    fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateDeliveryInfo',
        rowIndices: affectedRowIndices,
        liquidado: marcarLiquidado
      })
    })
      .then(() => showSyncIndicator(false))
      .catch(err => {
        console.error('Error al sincronizar liquidación en Sheets:', err);
        showSyncIndicator(false);
      });
  }

  renderDeliverys();

  const msg = marcarLiquidado 
    ? `💵 Jornada de repartidor "${driverName}" liquidada y marcada como pagada.`
    : `↩️ Liquidación de repartidor "${driverName}" reabierta.`;
  showToastNotification(msg);
}

// --- MODAL DE REPARTIDORES ---
function openAddDriverModal() {
  const modal = document.getElementById('modal-add-driver');
  const input = document.getElementById('input-new-driver-name');
  if (input) input.value = '';
  if (modal) modal.classList.remove('hidden');
  if (input) setTimeout(() => input.focus(), 50);
}

function closeAddDriverModal() {
  const modal = document.getElementById('modal-add-driver');
  if (modal) modal.classList.add('hidden');
}

function saveNewDriver() {
  const input = document.getElementById('input-new-driver-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    alert("Por favor ingresa el nombre del repartidor.");
    return;
  }
  if (!state.deliveryDrivers.includes(name)) {
    state.deliveryDrivers.push(name);
    saveLocalDeliveryDrivers(state.deliveryDrivers);
  }
  closeAddDriverModal();
  renderDeliverys();
  showToastNotification(`🛵 Repartidor "${name}" agregado con éxito.`);
}

