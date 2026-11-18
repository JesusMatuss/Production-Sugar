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
  productionDiscounts: {} // { [discountKey]: paquetesDescontados }
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
  }
};

// Calcular masa total base de cada receta
Object.keys(FORMULAS_BASE).forEach(key => {
  FORMULAS_BASE[key].masaTotalBase = FORMULAS_BASE[key].ingredientes.reduce((sum, item) => sum + item.base, 0);
});

// --- FUNCIÓN PURA: CÁLCULO DE RUEDAS (PICADORA DE 36 UNIDADES) ---
function calcularRuedasDesdeUnidades(totalUnidades, tamanoRueda = 36) {
  const total = Number(totalUnidades) || 0;
  if (total <= 0) {
    return { cantidad: 0, unidades: 0 };
  }

  const cociente = total / tamanoRueda;
  const entero = Math.floor(cociente);
  const decimal = cociente - entero;

  if (decimal > 0.5) {
    const cantidad = entero + 1;
    const unidades = -((1 - decimal) * tamanoRueda);
    return {
      cantidad,
      unidades: Math.round(unidades * 100) / 100
    };
  } else {
    const cantidad = entero;
    const unidades = decimal * tamanoRueda;
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

// Separar fecha y hora para diseño limpio de tarjetas
function formatFriendlyDateParts(dateStr) {
  if (!dateStr) return { date: 'Sin fecha', time: '' };
  try {
    const d = new Date(dateStr);
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
  const clean = String(dateStr).split('GMT')[0].trim();
  return { date: clean, time: '' };
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

  // 5. Por defecto (Hamburguesa estándar, Perro, Deli, Sandwich/Bimbo) es masa Brioche
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
  if (prod.includes('perro') || prod.includes('deli') || prod.includes('pepito') || prod.includes('jumbo')) {
    return 'ENROLLADOS';
  }
  return 'GENERAL';
}

// Sub-tipo para el bloque de ruedas: 'hamburguesa' | 'enrollado' | 'molde'
function getSubtipoRuedas(order) {
  const prod = normalizarTexto(order.producto);
  // Las hamburguesas trenzadas se pasan por la máquina que se enrolla
  if (prod.includes('trenzad')) return 'enrollado';
  if (prod.includes('hamburguesa')) return 'hamburguesa';
  if (prod.includes('perro') || prod.includes('deli') || prod.includes('pepito') || prod.includes('jumbo')) return 'enrollado';
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
  { rowIndex: 1, cliente: "Tabuenoburguer", producto: "Hamburguesa Grande M", presentacion: "Con Molde", peso_gr: 110, topping: "Ajonjolí", paquetes: 4, monto: 17.84, telefono: "+5804129310161", fecha1: "15/11/2026", fecha2: "2026-11-15 10:30", entrega: "Retiro en local", estado: "EN_PRODUCCION" },
  { rowIndex: 2, cliente: "Tabuenoburguer", producto: "Perro Comercial M", presentacion: "Pesado", peso_gr: 60, topping: "Orégano", paquetes: 6, monto: 20.34, telefono: "+5804129310161", fecha1: "15/11/2026", fecha2: "2026-11-15 10:30", entrega: "Retiro en local", estado: "EN_PRODUCCION" },
  { rowIndex: 3, cliente: "Gino's Food", producto: "Hamburguesa Mediana M", presentacion: "Con Molde", peso_gr: 90, topping: "AJON/SESAMO", paquetes: 5, monto: 22.95, telefono: "+5804141234567", fecha1: "15/11/2026", fecha2: "2026-11-15 10:45", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 4, cliente: "Gino's Food", producto: "Deli Mediano", presentacion: "Largo", peso_gr: 110, topping: "Ajonjolí", paquetes: 8, monto: 17.04, telefono: "+5804141234567", fecha1: "15/11/2026", fecha2: "2026-11-15 10:45", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 5, cliente: "Santos Burger", producto: "Hamburguesa pequeña PP", presentacion: "Sin Molde", peso_gr: 75, topping: "Ajonjolí", paquetes: 10, monto: 20.80, telefono: "+5804169998877", fecha1: "15/11/2026", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 6, cliente: "Santos Burger", producto: "Perro Papa Grande", presentacion: "16CM", peso_gr: 70, topping: "Sésamo Negro", paquetes: 4, monto: 28.00, telefono: "+5804169998877", fecha1: "15/11/2026", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 11, cliente: "Santos Burger", producto: "Hamburguesa Mediana MP", presentacion: "Con Molde", peso_gr: 90, topping: "Ajonjolí", paquetes: 5, monto: 19.50, telefono: "+5804169998877", fecha1: "15/11/2026", fecha2: "2026-11-15 11:00", entrega: "Retiro", estado: "EN_PRODUCCION" },
  { rowIndex: 7, cliente: "Café París", producto: "Pan dulce Coco", presentacion: "Simple", peso_gr: 60, topping: "Coco", paquetes: 12, monto: 17.28, telefono: "+5804245551122", fecha1: "15/11/2026", fecha2: "2026-11-15 11:15", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 8, cliente: "Café París", producto: "Pan dulce relleno", presentacion: "Relleno", peso_gr: 60, topping: "Arequipe", paquetes: 8, monto: 11.52, telefono: "+5804245551122", fecha1: "15/11/2026", fecha2: "2026-11-15 11:15", entrega: "Despacho", estado: "EN_PRODUCCION" },
  { rowIndex: 9, cliente: "Burger House VIP", producto: "Hamburguesa Extra Grande M", presentacion: "Con Molde", peso_gr: 120, topping: "Sésamo Negro", paquetes: 6, monto: 23.16, telefono: "+5804128887766", fecha1: "15/11/2026", fecha2: "2026-11-15 11:30", entrega: "Despacho", estado: "PENDIENTE" },
  { rowIndex: 10, cliente: "Burger House VIP", producto: "Hamburguesa Mediana Trenzada", presentacion: "Con Molde", peso_gr: 90, topping: "Orégano", paquetes: 5, monto: 16.60, telefono: "+5804128887766", fecha1: "15/11/2026", fecha2: "2026-11-15 11:30", entrega: "Despacho", estado: "PENDIENTE" }
];

// Determinar si una orden corresponde a la modalidad Delivery
function isDeliveryOrder(order) {
  if (!order) return false;
  if (state.localDeliveryIndices && state.localDeliveryIndices.has(order.rowIndex)) {
    return true;
  }
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
  state.deliveryDrivers = getLocalDeliveryDrivers();
  state.deliveriesMeta = getLocalDeliveriesMeta();
  state.localRealizados = getLocalRealizadosIndices();
  state.localDeliveryIndices = getLocalDeliveryIndices();
  state.productionDiscounts = getLocalProductionDiscounts();
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

// Helpers de persistencia local (Entregados, Realizados, Deliverys, Repartidores)
function getLocalDeliveredIndices() {
  try {
    const raw = localStorage.getItem('sugar_delivered_indices');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveLocalDeliveredIndices(indicesSet) {
  try {
    localStorage.setItem('sugar_delivered_indices', JSON.stringify(Array.from(indicesSet)));
  } catch (e) {
    console.error('Error al guardar índices entregados locales:', e);
  }
}

function getLocalRealizadosIndices() {
  try {
    const raw = localStorage.getItem('sugar_realizados_indices');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveLocalRealizadosIndices(indicesSet) {
  try {
    localStorage.setItem('sugar_realizados_indices', JSON.stringify(Array.from(indicesSet)));
  } catch (e) {
    console.error('Error al guardar realizados locales:', e);
  }
}

function getLocalDeliveryIndices() {
  try {
    const raw = localStorage.getItem('sugar_delivery_indices');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveLocalDeliveryIndices(indicesSet) {
  try {
    localStorage.setItem('sugar_delivery_indices', JSON.stringify(Array.from(indicesSet)));
  } catch (e) {
    console.error('Error al guardar delivery indices:', e);
  }
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

function adjustProductDiscount(discountKey, deltaPackages) {
  if (!discountKey) return;
  const current = state.productionDiscounts[discountKey] || 0;
  const next = Math.max(0, current + deltaPackages);
  if (next <= 0) {
    delete state.productionDiscounts[discountKey];
  } else {
    state.productionDiscounts[discountKey] = next;
  }
  saveLocalProductionDiscounts(state.productionDiscounts);
  renderProduccion();
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
  const localDelivered = getLocalDeliveredIndices();
  const localRealizados = getLocalRealizadosIndices();
  const localDelivery = getLocalDeliveryIndices();

  if (state.apiUrl) {
    try {
      showSyncIndicator(true);
      const res = await fetch(`${state.apiUrl}?action=getOrders`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.orders)) {
        state.orders = data.orders.map(o => {
          let estado = o.estado;
          if (localDelivered.has(o.rowIndex)) {
            estado = 'ENTREGADO';
          } else if (localRealizados.has(o.rowIndex)) {
            estado = 'REALIZADO';
          }

          let entrega = o.entrega;
          if (localDelivery.has(o.rowIndex)) {
            entrega = 'Delivery: A domicilio';
          }

          // Si Google Sheets trae columnas de repartidor/costo/liquidado
          if (o.repartidor || o.costo_delivery || typeof o.liquidado !== 'undefined') {
            const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
            const cardKey = `${o.cliente}___${rawFecha}`;
            const isLiq = typeof o.liquidado === 'boolean' 
              ? o.liquidado 
              : (String(o.liquidado).toUpperCase() === 'SI' || String(o.liquidado).toUpperCase() === 'TRUE');
            const cost = parseFloat(o.costo_delivery) || 0;
            const driver = o.repartidor || '';

            if (!state.deliveriesMeta[o.rowIndex]) {
              state.deliveriesMeta[o.rowIndex] = {
                repartidor: driver,
                costo: cost,
                liquidado: isLiq
              };
            }
            if (!state.deliveriesMeta[cardKey]) {
              state.deliveriesMeta[cardKey] = state.deliveriesMeta[o.rowIndex];
            }
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
        if (localDelivered.has(o.rowIndex)) {
          o.estado = 'ENTREGADO';
        } else if (localRealizados.has(o.rowIndex)) {
          o.estado = 'REALIZADO';
        }
        if (localDelivery.has(o.rowIndex)) {
          o.entrega = 'Delivery: A domicilio';
        }
      });
    } catch (e) {
      state.orders = MOCK_ORDERS;
    }
  } else {
    state.orders = MOCK_ORDERS;
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
    const order = ['brioche', 'papa', 'dulce'];
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
  const pendingOrders = state.orders.filter(o => o.estado === 'PENDIENTE').length;
  const prodOrders = state.orders.filter(o => o.estado === 'EN_PRODUCCION').length;

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
    if (state.filterStatus === 'PENDIENTE' && o.estado !== 'PENDIENTE') return false;
    if (state.filterStatus === 'EN_PRODUCCION' && o.estado !== 'EN_PRODUCCION') return false;

    // 3. Filtro por Modalidad
    if (state.filterDelivery === 'RETIRO') {
      const ent = (o.entrega || '').toLowerCase();
      if (!ent.includes('retiro') && !ent.includes('no')) return false;
    } else if (state.filterDelivery === 'DELIVERY') {
      const ent = (o.entrega || '').toLowerCase();
      if (ent.includes('retiro') || (!ent.includes('si') && !ent.includes('sí') && !ent.includes('delivery'))) return false;
    }

    return true;
  });

  // Agrupar por Cliente y Marca de Tiempo del pedido, acumulando monto total
  const groups = {};
  let totalMontoFiltered = 0;

  filtered.forEach(o => {
    const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
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
    const dateA = new Date(groups[a].fechaRaw).getTime() || 0;
    const dateB = new Date(groups[b].fechaRaw).getTime() || 0;
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
    const allInProd = g.items.every(i => i.estado === 'EN_PRODUCCION');
    const someInProd = g.items.some(i => i.estado === 'EN_PRODUCCION');
    const hasPendingItems = g.items.some(i => i.estado === 'PENDIENTE');

    // Estilo de la tarjeta según estado (Exclusivamente Pendientes vs En producción - Req 2.1)
    let cardBorder = "border-slate-800 hover:border-amber-500/40 bg-slate-900/90";
    let badgeHtml = '';
    if (allInProd) {
      cardBorder = "border-amber-500/50 bg-slate-900/80 shadow-lg shadow-amber-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">📺 EN PRODUCCIÓN</span>`;
    } else if (someInProd) {
      cardBorder = "border-amber-500/40 bg-slate-900/90 shadow-lg shadow-amber-500/10";
      badgeHtml = `<span class="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">⏳ EN PRODUCCIÓN</span>`;
    } else {
      cardBorder = "border-slate-800 hover:border-amber-500/40 bg-slate-900/90";
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
      const isChecked = state.selectedOrders.has(item.rowIndex);
      const isProd = item.estado === 'EN_PRODUCCION';
      const isSelectable = !isProd;
      const uPorPaq = getUnidadesPorPaquete(item);
      const totalUnits = (item.paquetes || 0) * uPorPaq;

      let badgeItem = '';
      if (isProd) {
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
          if (item.estado === 'PENDIENTE') {
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
          .filter(i => i.estado === 'EN_PRODUCCION')
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
  const pending = state.orders.filter(o => o.estado === 'PENDIENTE');
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
  const localDelivered = getLocalDeliveredIndices();
  const localRealizados = getLocalRealizadosIndices();

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'PENDIENTE';
      localDelivered.delete(o.rowIndex);
      localRealizados.delete(o.rowIndex);
    }
  });
  saveLocalDeliveredIndices(localDelivered);
  saveLocalRealizadosIndices(localRealizados);
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

// Colores distintivos y badges de alta legibilidad por tipo de Topping (Req 4.2)
function getToppingBadgeHtml(toppingName, extraClass = '') {
  const raw = (toppingName || '').trim();
  const norm = raw.toLowerCase();

  let badgeClass = 'topping-badge-natural';
  let icon = '🍞';

  if (norm.includes('ajonjol') || norm.includes('sesamo') || norm.includes('sésamo')) {
    badgeClass = 'topping-badge-ajonjoli';
    icon = '✨';
  } else if (norm.includes('oregan') || norm.includes('orégan') || norm.includes('hierba')) {
    badgeClass = 'topping-badge-oregano';
    icon = '🌿';
  } else if (norm.includes('queso') || norm.includes('parmesan') || norm.includes('cheddar')) {
    badgeClass = 'topping-badge-parmesano';
    icon = '🧀';
  } else if (norm.includes('amapola') || norm.includes('semilla') || norm.includes('chia') || norm.includes('chía')) {
    badgeClass = 'topping-badge-amapola';
    icon = '🌱';
  } else if (!norm || norm.includes('sin') || norm.includes('natural') || norm.includes('ningun') || norm.includes('ningún')) {
    badgeClass = 'topping-badge-natural';
    icon = '🍞';
  } else {
    // Hash determinístico para toppings adicionales desde Google Sheets
    let hash = 0;
    for (let i = 0; i < norm.length; i++) hash = (hash << 5) - hash + norm.charCodeAt(i);
    const variantIndex = Math.abs(hash) % 3;
    badgeClass = `topping-badge-dynamic-${variantIndex}`;
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
      const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
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

// Revertir a Producción (vuelve a figurar en la pantalla de Producción TV)
function revertToProduccion(rowIndices, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  const localRealizados = getLocalRealizadosIndices();
  const localDelivered = getLocalDeliveredIndices();

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = 'EN_PRODUCCION';
      localRealizados.delete(o.rowIndex);
      localDelivered.delete(o.rowIndex);
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

  const localDeliv = getLocalDeliveryIndices();
  const meta = getLocalDeliveriesMeta();

  rowIndices.forEach(idx => {
    localDeliv.add(idx);
    if (!meta[idx]) {
      meta[idx] = { repartidor: '', costo: 0, liquidado: false };
    }
  });

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.entrega = 'Delivery: A domicilio';
    }
  });

  saveLocalDeliveryIndices(localDeliv);
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

  const localDeliv = getLocalDeliveryIndices();
  rowIndices.forEach(idx => localDeliv.delete(idx));

  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.entrega = 'Retiro en Tienda';
    }
  });

  saveLocalDeliveryIndices(localDeliv);
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
  const prodOrders = state.orders.filter(o => o.estado === 'EN_PRODUCCION');
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

  const prodOrders = state.orders.filter(o => o.estado === 'EN_PRODUCCION');
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
  const prodOrders = state.orders.filter(o => {
    return o.estado === 'EN_PRODUCCION' && getTipoMasa(o) === state.activeDough;
  });

  // 2. Título y masa activa
  const doughTitleEl = document.getElementById('tv-dough-title');
  const doughBadgeEl = document.getElementById('tv-dough-badge');
  const formulaMeta = FORMULAS_BASE[state.activeDough];
  
  if (doughTitleEl) doughTitleEl.textContent = formulaMeta.nombre;
  if (doughBadgeEl) {
    doughBadgeEl.textContent = state.activeDough === 'brioche' ? '🟡 Masa Brioche' : (state.activeDough === 'papa' ? '🥔 Pan de Papa' : '🍬 Pan Dulce');
  }

  // 3. Consolidar por Topping y Presentación
  const consolidado = {};

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
    const itemKey = `${prod}___${pres}___${peso}`;

    if (!consolidado[topping]) {
      consolidado[topping] = {
        topping: topping,
        totalPaquetes: 0,
        totalUnidades: 0,
        subgrupos: {
          CON_MOLDE: {},
          SIN_MOLDE: {},
          ENROLLADOS: {},
          GENERAL: {}
        }
      };
    }

    if (!consolidado[topping].subgrupos[tipoMolde]) {
      consolidado[topping].subgrupos[tipoMolde] = {};
    }

    if (!consolidado[topping].subgrupos[tipoMolde][itemKey]) {
      consolidado[topping].subgrupos[tipoMolde][itemKey] = {
        producto: prod,
        presentacion: pres,
        peso: peso,
        paquetesOriginal: 0,
        unidadesOriginal: 0,
        uPorPaq: uPorPaq,
        subtipo: subtipo,
        tipoMolde: tipoMolde,
        discountKey: discountKey,
        tipos: new Set()
      };
    }

    consolidado[topping].subgrupos[tipoMolde][itemKey].paquetesOriginal += paq;
    consolidado[topping].subgrupos[tipoMolde][itemKey].unidadesOriginal += un;

    if (normalizarTexto(o.producto).includes('trenzad')) {
      consolidado[topping].subgrupos[tipoMolde][itemKey].tipos.add('Trenzada');
    } else {
      consolidado[topping].subgrupos[tipoMolde][itemKey].tipos.add('Enrollado');
    }
  });

  // 4. Calcular Valores Netos considerando Descuentos de Paquetes
  let masaTotalGramos = 0;
  let totalPanesUnidades = 0;
  let totalPaquetes = 0;
  let activeDiscountsCount = 0;

  const ruedasHamburguesas = {};
  const ruedasEnrollados = {};

  Object.keys(consolidado).forEach(topKey => {
    const group = consolidado[topKey];
    group.totalPaquetes = 0;
    group.totalUnidades = 0;

    Object.keys(group.subgrupos).forEach(subKey => {
      const subObj = group.subgrupos[subKey];
      Object.keys(subObj).forEach(iKey => {
        const it = subObj[iKey];

        // Paquetes descontados por no retiro (guardados en state.productionDiscounts)
        const rawDiscount = state.productionDiscounts[it.discountKey] || 0;
        const descPaq = Math.min(it.paquetesOriginal, Math.max(0, rawDiscount));
        if (descPaq > 0) activeDiscountsCount++;

        it.descPaq = descPaq;
        it.descUn = descPaq * it.uPorPaq;
        it.netPaquetes = Math.max(0, it.paquetesOriginal - descPaq);
        it.netUnidades = it.netPaquetes * it.uPorPaq;
        it.netGramos = it.netUnidades * it.peso;

        // Propiedades unificadas para el resto del render
        it.paquetes = it.netPaquetes;
        it.unidades = it.netUnidades;

        // Subtotales de cada Topping
        group.totalPaquetes += it.netPaquetes;
        group.totalUnidades += it.netUnidades;

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
                unidadesTotales: 0
              };
            }
            ruedasHamburguesas[ruedaKey].unidadesTotales += it.netUnidades;
          } else if (it.subtipo === 'enrollado') {
            const ruedaKey = `${it.peso}g`;
            if (!ruedasEnrollados[ruedaKey]) {
              ruedasEnrollados[ruedaKey] = {
                peso: it.peso,
                unidadesTotales: 0,
                tipos: new Set()
              };
            }
            ruedasEnrollados[ruedaKey].unidadesTotales += it.netUnidades;
            it.tipos.forEach(t => ruedasEnrollados[ruedaKey].tipos.add(t));
          }
        }
      });
    });
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

  // 7. Consolidar agrupando primariamente por Tipo de Producto / Pan (Req 4.1)
  const productosConsolidados = {};
  prodOrders.forEach(o => {
    const prodName = (o.producto || '').trim();
    const peso = parseFloat(o.peso_gr) || 0;
    const pres = (o.presentacion || 'Estándar').trim();
    const tipoMolde = getTipoMolde(o);
    const subtipo = getSubtipoRuedas(o);
    const topping = (o.topping || 'Sin Topping').trim();
    const paqOrig = parseFloat(o.paquetes) || 0;
    const uPorPaq = getUnidadesPorPaquete(o);
    const unOrig = paqOrig * uPorPaq;

    const prodKey = `${prodName}___${peso}___${tipoMolde}`;
    const discountKey = `${state.activeDough}:::${topping}:::${tipoMolde}:::${prodName}:::${peso}`;

    if (!productosConsolidados[prodKey]) {
      productosConsolidados[prodKey] = {
        key: prodKey,
        producto: prodName,
        peso: peso,
        tipoMolde: tipoMolde,
        presentacion: pres,
        subtipo: subtipo,
        totalNetUnidades: 0,
        totalNetPaquetes: 0,
        toppings: {}
      };
    }

    const p = productosConsolidados[prodKey];
    if (!p.toppings[topping]) {
      p.toppings[topping] = {
        topping: topping,
        peso: peso,
        tipoMolde: tipoMolde,
        discountKey: discountKey,
        uPorPaq: uPorPaq,
        paquetesOriginal: 0,
        unidadesOriginal: 0,
        descPaq: 0,
        descUn: 0,
        netPaquetes: 0,
        netUnidades: 0
      };
    }

    const topObj = p.toppings[topping];
    topObj.paquetesOriginal += paqOrig;
    topObj.unidadesOriginal += unOrig;
  });

  // Calcular totales netos de cada producto y sus toppings
  const distinctProducts = Object.values(productosConsolidados);
  distinctProducts.forEach(prod => {
    Object.values(prod.toppings).forEach(top => {
      const rawDiscount = state.productionDiscounts[top.discountKey] || 0;
      top.descPaq = Math.min(top.paquetesOriginal, Math.max(0, rawDiscount));
      top.descUn = top.descPaq * top.uPorPaq;
      top.netPaquetes = Math.max(0, top.paquetesOriginal - top.descPaq);
      top.netUnidades = top.netPaquetes * top.uPorPaq;

      prod.totalNetPaquetes += top.netPaquetes;
      prod.totalNetUnidades += top.netUnidades;
    });
  });

  // Actualizar resumen en la barra principal de Producción TV (Req 4.1)
  const summaryTextEl = document.getElementById('tv-toppings-summary-text');
  const badgeProdCountEl = document.getElementById('badge-toppings-products-count');
  const badgeItemsCountEl = document.getElementById('badge-toppings-items-count');
  if (summaryTextEl) {
    summaryTextEl.textContent = `${totalPanesUnidades.toLocaleString()} unidades netas • ${totalPaquetes.toLocaleString()} paquetes en producción (${distinctProducts.length} productos)`;
  }
  if (badgeProdCountEl) {
    badgeProdCountEl.textContent = `${distinctProducts.length} ${distinctProducts.length === 1 ? 'producto' : 'productos'}`;
  }
  if (badgeItemsCountEl) {
    badgeItemsCountEl.textContent = `${totalPanesUnidades.toLocaleString()} un`;
  }

  // Renderizar el contenido dentro del Modal a Pantalla Completa
  renderModalConsolidadoProductos(productosConsolidados, totalPanesUnidades, totalPaquetes);

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
// RENDERIZAR CONSOLIDADO POR PRODUCTOS EN MODAL (Req 4.1)
// ==========================================
function renderModalConsolidadoProductos(productosConsolidados, totalPanesUnidades, totalPaquetes) {
  const container = document.getElementById('modal-products-grid');
  const badgeDough = document.getElementById('modal-toppings-dough-badge');
  const metricsEl = document.getElementById('modal-toppings-metrics-text');

  if (badgeDough) {
    const metaDough = FORMULAS_BASE[state.activeDough];
    badgeDough.textContent = metaDough ? metaDough.nombre : state.activeDough;
  }

  if (metricsEl) {
    metricsEl.innerHTML = `Total en producción: <strong class="text-amber-300 font-bold">${totalPanesUnidades.toLocaleString()} un</strong> • <strong class="text-slate-200 font-bold">${totalPaquetes.toLocaleString()} pq</strong>`;
  }

  if (!container) return;

  const productsList = Object.values(productosConsolidados || {});
  if (productsList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
        <p class="text-2xl font-bold text-slate-400">No hay pedidos en producción para esta masa.</p>
        <p class="text-sm text-slate-500 mt-2">Envía pedidos desde la sección "Pedidos" para visualizarlos aquí en planta.</p>
      </div>`;
    return;
  }

  // Ordenar productos: mayor gramaje primero, luego alfabéticamente
  productsList.sort((a, b) => (b.peso - a.peso) || a.producto.localeCompare(b.producto));

  container.innerHTML = productsList.map(prod => {
    const cfg = SUBGRUPOS_CONFIG[prod.tipoMolde] || { titulo: prod.tipoMolde, badgeClass: 'text-slate-300 border-slate-700 bg-slate-800' };
    const toppingsList = Object.values(prod.toppings || {});

    // Filas de toppings para este producto
    const toppingsRows = toppingsList.map(top => {
      return `
        <div class="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
          <!-- Topping badge y estado de descuento -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              ${getToppingBadgeHtml(top.topping)}
              ${top.descPaq > 0 ? `
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap shadow-sm flex items-center gap-1" title="Paquetes restados por no retiro de cliente">
                  <span>📉</span> -${top.descPaq} pq (-${top.descUn} un)
                </span>
              ` : ''}
            </div>
            ${top.descPaq > 0 ? `
              <span class="text-[11px] text-slate-400 block mt-1 font-medium">
                Pedido original: <strong class="text-slate-300">${top.paquetesOriginal} pq</strong> (${top.unidadesOriginal} un)
              </span>
            ` : ''}
          </div>

          <!-- Métricas y Controles de Ajuste (- / + / ↺) -->
          <div class="text-right whitespace-nowrap flex flex-col items-end shrink-0">
            <div class="flex items-baseline justify-end gap-1">
              <span class="text-2xl font-black tv-display-num ${top.descPaq > 0 ? 'text-amber-300' : 'text-white'}">${top.netUnidades}</span>
              <span class="text-xs font-bold text-amber-400 tracking-wider">UN</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono block -mt-1 font-semibold">
              <strong class="text-slate-200">${top.netPaquetes} pq</strong>
              ${top.descPaq > 0 ? `<span class="line-through text-slate-500 text-[10px] ml-1">(${top.paquetesOriginal} pq)</span>` : ''}
            </span>

            <!-- Control interactivo de restar/sumar paquetes -->
            <div class="flex items-center gap-1 mt-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 shadow-sm">
              <button type="button" 
                class="btn-pq-minus w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center font-black text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95" 
                data-key="${escapeHtml(top.discountKey)}" 
                title="Restar 1 paquete de producción (cliente no retiró)"
                ${top.netPaquetes <= 0 ? 'disabled' : ''}>
                −
              </button>

              <input type="number" 
                min="0" 
                max="${top.paquetesOriginal}" 
                value="${top.descPaq}" 
                class="input-pq-discount w-10 text-center text-xs font-mono font-bold bg-slate-900 border border-slate-700/80 rounded-lg py-0.5 text-slate-200 focus:outline-none focus:border-rose-500 ${top.descPaq > 0 ? 'text-rose-400 font-black border-rose-500/40 bg-rose-500/10' : ''}" 
                data-key="${escapeHtml(top.discountKey)}" 
                data-max="${top.paquetesOriginal}" 
                title="Paquetes a descontar de la producción">

              <button type="button" 
                class="btn-pq-plus w-6 h-6 rounded-lg bg-slate-800 hover:bg-emerald-900/40 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 flex items-center justify-center font-black text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95" 
                data-key="${escapeHtml(top.discountKey)}" 
                title="Sumar 1 paquete (devolver hacia el pedido original)"
                ${top.descPaq <= 0 ? 'disabled' : ''}>
                +
              </button>

              ${top.descPaq > 0 ? `
                <button type="button" 
                  class="btn-pq-reset ml-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-all cursor-pointer active:scale-95" 
                  data-key="${escapeHtml(top.discountKey)}" 
                  title="Restablecer paquetes originales">
                  ↺
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bg-slate-900/90 rounded-3xl p-5 border-2 border-slate-800 shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all">
        <div>
          <!-- Cabecera de la Tarjeta del Producto -->
          <div class="pb-3 border-b border-slate-800">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h4 class="text-base font-black text-white tracking-tight leading-snug">${escapeHtml(prod.producto)}</h4>
                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-mono font-black text-xs border border-slate-700 shadow-sm">
                    ${prod.peso}g
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${cfg.badgeClass}">
                    ${cfg.titulo}
                  </span>
                </div>
              </div>

              <!-- Total Neto del Producto -->
              <div class="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
                <div class="flex items-baseline justify-end gap-1">
                  <span class="text-2xl font-black text-white tv-display-num">${prod.totalNetUnidades}</span>
                  <span class="text-xs font-bold text-amber-400">UN</span>
                </div>
                <span class="text-[11px] text-slate-400 font-mono font-bold block -mt-1">${prod.totalNetPaquetes} pq</span>
              </div>
            </div>
          </div>

          <!-- Lista de Toppings para este Producto -->
          <div class="mt-1 divide-y divide-slate-800/50">
            ${toppingsRows}
          </div>
        </div>

        <!-- Pie de Tarjeta -->
        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>${toppingsList.length} ${toppingsList.length === 1 ? 'topping' : 'toppings'} configurados</span>
          <span class="font-mono font-medium">${prod.totalNetUnidades} un netas</span>
        </div>
      </div>
    `;
  }).join('');

  // Vincular eventos interactivos para restar/sumar paquetes dentro del modal
  bindModalDiscountEvents();
}

// Vincular eventos a los controles de descuento en el modal
function bindModalDiscountEvents() {
  const container = document.getElementById('modal-products-grid');
  if (!container) return;

  // Botón Restar 1 paquete (−)
  container.querySelectorAll('.btn-pq-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = e.currentTarget.dataset.key;
      adjustProductDiscount(key, 1);
    });
  });

  // Botón Sumar / Devolver 1 paquete (+)
  container.querySelectorAll('.btn-pq-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = e.currentTarget.dataset.key;
      adjustProductDiscount(key, -1);
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

  // Input numérico directo
  container.querySelectorAll('.input-pq-discount').forEach(input => {
    input.addEventListener('click', (e) => e.stopPropagation());
    
    const handleInput = (e) => {
      const key = e.target.dataset.key;
      const maxPaq = parseInt(e.target.dataset.max) || 0;
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > maxPaq) val = maxPaq;

      if (val <= 0) {
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
              ${badgeTrenzada}
              ${esRuedaMitad ? `<span class="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">1/2 Rueda (${tamanoRueda} un)</span>` : ''}
            </div>
            <span class="text-xs text-slate-400 font-mono font-normal block mt-1">(${pesoRueda.toLocaleString()} g masa por corte)</span>
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
    const rawDiscount = state.productionDiscounts[it.discountKey] || 0;
    const descPaq = Math.min(it.paquetesOriginal, Math.max(0, rawDiscount));
    const netPaq = it.paquetesOriginal - descPaq;
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
    const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
    const key = `${o.cliente}___${rawFecha}`;
    if (!allGroups[key]) allGroups[key] = [];
    allGroups[key].push(o);
  });

  let countEnProd = 0;
  let countRealizados = 0;
  let countEntregados = 0;
  Object.values(allGroups).forEach(items => {
    if (items.every(i => i.estado === 'ENTREGADO')) {
      countEntregados++;
    } else if (items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO')) {
      countRealizados++;
    } else {
      countEnProd++;
    }
  });

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
    const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
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

  container.innerHTML = groupKeys.map(key => {
    const g = groups[key];
    const isAllDelivered = g.items.every(i => i.estado === 'ENTREGADO');
    const isRealizado = g.items.every(i => i.estado === 'REALIZADO' || i.estado === 'ENTREGADO');
    const isDelivery = g.items.some(i => isDeliveryOrder(i));

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

    return `
      <div class="bg-slate-900/90 rounded-3xl p-5 border-2 ${isAllDelivered ? 'border-emerald-500/40 bg-slate-900/60 shadow-lg shadow-emerald-500/5' : (isRealizado ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'border-slate-800 hover:border-amber-500/40')} shadow-2xl flex flex-col justify-between transition-all">
        <div>
          <!-- Cabecera de la tarjeta con Monto Total en $ -->
          <div class="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
            <div>
              <div class="flex items-center gap-2.5 flex-wrap">
                <h4 class="text-lg font-black text-white tracking-tight">${escapeHtml(g.cliente)}</h4>
                <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-black tracking-tight shadow-sm" title="Monto total del pedido">
                  $${g.totalMonto.toFixed(2)}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                <span>📅 ${g.fechaDate}</span>
                <span>•</span>
                <span>🕒 ${g.fechaTime}</span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <!-- Contacto y Modalidad -->
          <div class="flex flex-wrap items-center gap-2 mb-3">
            ${entregaBadge}
            ${telHtml}
          </div>

          <!-- Lista de Ítems -->
          <div class="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 mb-3">
            <div class="text-[11px] uppercase tracking-wider font-bold text-slate-400 pb-1 mb-1 border-b border-slate-800/80 flex justify-between items-center">
              <span>Productos (${g.items.length})</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-200 font-mono font-bold">${totalPaq} pq (${totalUnidades} un)</span>
                <span>•</span>
                <span class="text-emerald-400 font-mono font-black">$${g.totalMonto.toFixed(2)}</span>
              </div>
            </div>
            <div class="divide-y divide-slate-800/40 max-h-48 overflow-y-auto pr-1">
              ${itemsHtml}
            </div>
          </div>
        </div>

        <!-- Botones de Acción de Entregas (Flujo Simplificado de 3 Estados - Req 2.2) -->
        <div class="pt-3 border-t border-slate-800 flex flex-col gap-2">
          
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
            <!-- Pedido En Producción: Opciones Operativas (Req 2.2) -->
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <!-- Regla Especial: Retirar de Producción / Devolver a Pendientes -->
                <button class="btn-entregas-action-revert-pendientes flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Retirar de Producción TV y devolver a bandeja de Pendientes">
                  <span>↩️ Devolver a Pendientes</span>
                </button>

                <!-- Marcar como Fabricado / Listo Despacho -->
                <button class="btn-entregas-action-realizado flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Marcar completado en producción (fabricado)">
                  <span>🥖 Marcar Fabricado</span>
                </button>
              </div>

              <!-- Listo para Entregar directo -->
              <button class="btn-entregas-action-entregar w-full py-2.5 px-4 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:brightness-110 shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95" data-card-key="${encodeURIComponent(g.key)}" title="Marcar directamente como entregado / despachado">
                <span>📦 Listo para Entregar</span>
              </button>
            </div>
          `)}

        </div>

      </div>`;
  }).join('');

  // Event listeners para las acciones en Entregas (Req 2.2)
  container.querySelectorAll('.btn-entregas-action-revert-pendientes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        retireFromProduction(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-realizado').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-revert-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        revertToProduccion(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'ENTREGADO', groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-revert-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        markAsRealizado(rows, groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'ENTREGADO', groups[cardKey].cliente);
      }
    });
  });

  container.querySelectorAll('.btn-entregas-action-revert-entregar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardKey = decodeURIComponent(e.currentTarget.dataset.cardKey);
      if (groups[cardKey]) {
        const rows = groups[cardKey].items.map(i => i.rowIndex);
        updateDeliveryStatus(rows, 'REALIZADO', groups[cardKey].cliente);
      }
    });
  });
}

// Actualizar estado de despacho/entrega
function updateDeliveryStatus(rowIndices, newStatus, clientName = '') {
  if (!rowIndices || rowIndices.length === 0) return;

  const localDelivered = getLocalDeliveredIndices();
  const localRealizados = getLocalRealizadosIndices();

  if (newStatus === 'ENTREGADO') {
    rowIndices.forEach(idx => {
      localDelivered.add(idx);
      localRealizados.delete(idx);
    });
  } else if (newStatus === 'EN_PRODUCCION') {
    rowIndices.forEach(idx => {
      localDelivered.delete(idx);
      localRealizados.delete(idx);
    });
  } else if (newStatus === 'REALIZADO') {
    rowIndices.forEach(idx => {
      localDelivered.delete(idx);
      localRealizados.add(idx);
    });
  }

  saveLocalDeliveredIndices(localDelivered);
  saveLocalRealizadosIndices(localRealizados);

  // Actualizar estado exclusivamente en memoria interna y cache local
  state.orders.forEach(o => {
    if (rowIndices.includes(o.rowIndex)) {
      o.estado = newStatus;
    }
  });
  saveLocalOrders();

  // Re-renderizar vistas activas y contadores
  renderAllViews();

  // Notificación toast de confirmación inmediata
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
    const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
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
      const rawFecha = o.fecha2 || o.fecha1 || 'SinFecha';
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

