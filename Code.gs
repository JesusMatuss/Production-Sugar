/**
 * SUGAR - BACKEND UNIFICADO (GOOGLE APPS SCRIPT)
 * 
 * Este script combina de forma 100% segura:
 * 1. La recepción de pedidos de los clientes desde tu Web App actual.
 * 2. La lectura, consolidación y actualización de estados para la App de Producción / TV.
 */

const SHEET_NAME = "Productos";
const STATUS_COL_INDEX = 12; // Columna L (Estado del pedido: PENDIENTE, EN_PRODUCCION, etc.)

// ==============================================================
// 1. ENDPOINT GET (Lectura de pedidos para la App de Producción/TV)
// ==============================================================
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // Petición desde la nueva App de Producción / TV
    if (action === "getOrders") {
      var orders = getOrdersFromSheet();
      return ContentService.createTextOutput(JSON.stringify({ success: true, orders: orders }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // Respuesta original por defecto (mantiene compatibilidad intacta)
    return ContentService.createTextOutput("Servicio activo y funcionando correctamente.")
                         .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================================
// 2. ENDPOINT POST (Recepción de clientes + Actualización a Producción)
// ==============================================================
function doPost(e) {
  // Intentar parsear si viene como JSON en postData o por parámetro
  var payload = null;
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (ignore) {}
  }

  // --- CASO A: Actualizar estado desde la App de Producción (pasar a TV / Realizado / Entregado) ---
  if ((payload && payload.action === "updateOrderStatus") || (e && e.parameter && e.parameter.action === "updateOrderStatus")) {
    var rowIndices = (payload && payload.rowIndices) ? payload.rowIndices : (e.parameter.rowIndices ? JSON.parse(e.parameter.rowIndices) : []);
    var newStatus = (payload && payload.status) || (e.parameter && e.parameter.status) || "EN_PRODUCCION";

    try {
      var updatedCount = updateStatusInSheet(rowIndices, newStatus);
      return ContentService.createTextOutput(JSON.stringify({ success: true, updatedCount: updatedCount, newStatus: newStatus }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- CASO A1: Actualizar modalidad de entrega (Enviar a Delivery o Retiro en Local) ---
  if ((payload && payload.action === "updateOrderDelivery") || (e && e.parameter && e.parameter.action === "updateOrderDelivery")) {
    var rowIndices = (payload && payload.rowIndices) ? payload.rowIndices : (e.parameter.rowIndices ? JSON.parse(e.parameter.rowIndices) : []);
    var entregaVal = (payload && payload.entrega) || (e.parameter && e.parameter.entrega) || "Delivery: A domicilio";

    try {
      var updatedCount = updateEntregaInSheet(rowIndices, entregaVal);
      return ContentService.createTextOutput(JSON.stringify({ success: true, updatedCount: updatedCount, entrega: entregaVal }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- CASO A2: Actualizar información de Delivery (Repartidor, Costo de Envío, Liquidación) ---
  if ((payload && payload.action === "updateDeliveryInfo") || (e && e.parameter && e.parameter.action === "updateDeliveryInfo")) {
    var rowIndices = (payload && payload.rowIndices) ? payload.rowIndices : (e.parameter.rowIndices ? JSON.parse(e.parameter.rowIndices) : []);
    var repartidor = (payload && typeof payload.repartidor !== "undefined") ? payload.repartidor : null;
    var costo = (payload && typeof payload.costo_delivery !== "undefined") ? payload.costo_delivery : null;
    var liquidado = (payload && typeof payload.liquidado !== "undefined") ? (payload.liquidado ? "SI" : "NO") : null;

    try {
      var updatedCount = updateDeliveryInfoInSheet(rowIndices, repartidor, costo, liquidado);
      return ContentService.createTextOutput(JSON.stringify({ success: true, updatedCount: updatedCount }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- CASO B: Tu App Web original de clientes (Creación de nuevos pedidos) ---
  return procesarPedidoOriginalCliente(e);
}

// ==============================================================
// 3. FUNCIÓN ORIGINAL DE RECEPCIÓN DE PEDIDOS DE CLIENTES
// ==============================================================
function procesarPedidoOriginalCliente(e) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Logs").appendRow(["¡Petición recibida!", new Date()]);
  } catch(err) {
    console.warn("No se pudo escribir en la pestaña 'Logs': " + err.toString());
  }

  var lock = LockService.getScriptLock();
  var rawData = "No asignada aún"; 
  var clienteAfectado = "Desconocido (Error antes de procesar data)";
  
  try { 
    if (!lock.tryLock(30000)) {
      throw new Error("No se pudo obtener el bloqueo de script (Tiempo de espera agotado).");
    }
    
    Logger.log("Petición POST recibida correctamente.");
    console.log("Petición POST recibida correctamente."); 
    
    if (!e || !e.parameter) {
      throw new Error("El objeto de evento 'e' o sus parámetros son nulos o inválidos.");
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error("No se encontró la pestaña '" + SHEET_NAME + "' en la hoja de cálculo.");
    }

    rawData = e.parameter.data;
    if (!rawData) {
      throw new Error("El parámetro 'data' llegó vacío o no se envió correctamente.");
    }
    
    Logger.log("Data cruda recibida con éxito: " + rawData);
    console.log("Data cruda recibida con éxito:", rawData);
    
    var pedidos = JSON.parse(rawData);
    if (!Array.isArray(pedidos)) {
      pedidos = [pedidos];
    }

    if (pedidos.length > 0 && pedidos[0].Cliente) {
      clienteAfectado = pedidos[0].Cliente;
    }
    
    var filasParaInsertar = [];
    
    pedidos.forEach(function(p, index) {
      var infoCliente = `Procesando pedido #${index + 1} - Cliente: ${p.Cliente || "Anónimo"} - Teléfono: ${p.Numero_Telefono || "N/A"}`;
      Logger.log(infoCliente);
      console.log(infoCliente);
      
      if (p.Cliente) {
        clienteAfectado = p.Cliente;
      }
      
      // Filas columnas A hasta L (incluyendo Estado inicial 'PENDIENTE' en columna 12)
      filasParaInsertar.push([
        p.Cliente || "",
        p.Producto || "",
        p.Especificacion || "",
        p.Peso || "",
        p.Topping || "",
        p.Cantidad || 0,
        p.Subtotal || 0,
        p.Numero_Telefono || "",
        p.Fecha || "",
        p.Fecha_Entrega || "",
        p.Delivery || "",
        "PENDIENTE" // Columna L: Estado_SugarApp
      ]);
    });
    
    if (filasParaInsertar.length > 0) {
      var ultimaFila = sheet.getLastRow();
      sheet.getRange(ultimaFila + 1, 1, filasParaInsertar.length, 12)
           .setValues(filasParaInsertar);
      
      SpreadsheetApp.flush();
      
      Logger.log(`Éxito: Se insertaron ${filasParaInsertar.length} filas en la hoja.`);
      console.log(`Éxito: Se insertaron ${filasParaInsertar.length} filas en la hoja.`);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    var textoError = `[CLIENTE AFECTADO: ${clienteAfectado}] - Error crítico: ${error.toString()} | Contexto data: ${rawData}`;
    Logger.log(textoError);
    console.error(textoError);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      "result": "error", 
      "message": error.toString(),
      "cliente": clienteAfectado
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

// ==============================================================
// 4. FUNCIONES DE LECTURA Y ACTUALIZACIÓN PARA SUGAR PEDIDOS WEB
// ==============================================================
function getOrdersFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error("No se encontró la pestaña '" + SHEET_NAME + "'");
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return [];
  }

  var range = sheet.getRange(1, 1, lastRow, Math.max(12, sheet.getLastColumn()));
  var values = range.getValues();
  var orders = [];

  var startRow = 0;
  var firstCellA = String(values[0][0] || "").trim().toLowerCase();
  if (firstCellA === "cliente" || firstCellA === "no_header" || firstCellA === "name") {
    startRow = 1;
  }

  for (var i = startRow; i < values.length; i++) {
    var row = values[i];
    var client = String(row[0] || "").trim();
    var product = String(row[1] || "").trim();

    if (!client && !product) {
      continue;
    }

    var rowNumber = i + 1;
    var currentStatus = String(row[STATUS_COL_INDEX - 1] || "").trim().toUpperCase();
    if (!currentStatus) {
      currentStatus = "PENDIENTE";
    }

    orders.push({
      rowIndex: rowNumber,
      cliente: client,
      producto: product,
      presentacion: String(row[2] || "").trim(),
      peso_gr: parseFloat(row[3]) || 0,
      topping: String(row[4] || "").trim(),
      paquetes: parseFloat(row[5]) || 0,
      monto: parseFloat(row[6]) || 0,
      telefono: String(row[7] || "").trim(),
      fecha1: formatCellDate(row[8]),
      fecha2: formatCellDate(row[9]),
      entrega: String(row[10] || "").trim(),
      estado: currentStatus,
      repartidor: String(row[12] || "").trim(),
      costo_delivery: parseFloat(row[13]) || 0,
      liquidado: String(row[14] || "").toUpperCase() === "SI" || String(row[14] || "").toUpperCase() === "TRUE"
    });
  }

  return orders;
}

function updateStatusInSheet(rowIndices, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error("No se encontró la pestaña '" + SHEET_NAME + "'");
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return 0;
  }

  // Actualización masiva por lote (100x más rápida que setValue en bucle)
  var range = sheet.getRange(1, STATUS_COL_INDEX, lastRow, 1);
  var values = range.getValues();
  var count = 0;
  var set = {};
  for (var k = 0; k < rowIndices.length; k++) {
    set[parseInt(rowIndices[k], 10)] = true;
  }

  for (var i = 0; i < values.length; i++) {
    var rowNum = i + 1;
    if (set[rowNum]) {
      values[i][0] = newStatus;
      count++;
    }
  }

  range.setValues(values);
  SpreadsheetApp.flush();
  return count;
}

function updateEntregaInSheet(rowIndices, entregaVal) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la pestaña '" + SHEET_NAME + "'");
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return 0;

  var range = sheet.getRange(1, 11, lastRow, 1); // Columna K (Entrega)
  var values = range.getValues();
  var count = 0;
  var set = {};
  for (var k = 0; k < rowIndices.length; k++) {
    set[parseInt(rowIndices[k], 10)] = true;
  }

  for (var i = 0; i < values.length; i++) {
    var rowNum = i + 1;
    if (set[rowNum]) {
      values[i][0] = entregaVal;
      count++;
    }
  }

  range.setValues(values);
  SpreadsheetApp.flush();
  return count;
}

function updateDeliveryInfoInSheet(rowIndices, repartidor, costo, liquidado) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la pestaña '" + SHEET_NAME + "'");
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return 0;

  var maxCols = sheet.getMaxColumns();
  if (maxCols < 15) {
    sheet.insertColumnsAfter(maxCols, 15 - maxCols);
    sheet.getRange(1, 13).setValue("Repartidor");
    sheet.getRange(1, 14).setValue("Costo_Delivery");
    sheet.getRange(1, 15).setValue("Liquidado");
  }

  var count = 0;
  var set = {};
  for (var k = 0; k < rowIndices.length; k++) {
    set[parseInt(rowIndices[k], 10)] = true;
  }

  var range = sheet.getRange(1, 13, lastRow, 3);
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    var rowNum = i + 1;
    if (set[rowNum]) {
      if (repartidor !== null && typeof repartidor !== "undefined") values[i][0] = repartidor;
      if (costo !== null && typeof costo !== "undefined") values[i][1] = costo;
      if (liquidado !== null && typeof liquidado !== "undefined") values[i][2] = liquidado;
      count++;
    }
  }

  range.setValues(values);
  SpreadsheetApp.flush();
  return count;
}

function formatCellDate(cellVal) {
  if (!cellVal) return "";
  if (cellVal instanceof Date) {
    return Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }
  return String(cellVal).trim();
}
