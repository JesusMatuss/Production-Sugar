# Especificación Técnica: Aplicación de Pedidos, Producción (TV) y Entregas

## 1. Objetivo General
Construir una **Web App** en **HTML + JavaScript + Tailwind CSS**, conectada a **Google Sheets** mediante **Google Apps Script** (como backend/API REST), diseñada para gestionar el flujo operativo de panadería en tres secciones:
1. **Pedidos**
2. **Producción** (optimizada para visualizarse en un televisor de planta y dividida por tipo de masa)
3. **Entregas**

La aplicación toma los pedidos registrados en la pestaña **`Productos`** de la [Hoja de cálculo SUGAR](https://docs.google.com/spreadsheets/d/10Nx3MAg19csBRH-Ndp11TEi3g7zbSUj3eNRx9h2q0VE/edit?pli=1&gid=1644281785#gid=1644281785) y replica la lógica de consolidación y cálculo de fórmulas de las hojas **`Formula Brioche`**, **`Formula papa`** y **`Formula Pan Dulce`** (además de considerar **`Formula Jamon`**).

---

## 2. Stack Tecnológico y Arquitectura
* **Frontend:** HTML5, JavaScript (Vanilla o modular ES6), Tailwind CSS (vía CDN o build ligero).
* **Backend / Capa de datos:** Google Apps Script (`doGet` / `doPost` como Web App) conectado a Google Sheets.
* **Persistencia de estado:** Guardar el estado de cada pedido/ítem (por ejemplo: `PENDIENTE`, `EN_PRODUCCION`, `ENTREGADO`, fecha/hora de envío a producción y lote/turno) en una columna de control en `Productos` o en una hoja/tabla dedicada para que el estado persista al recargar o abrir en el TV.
* **Entorno de visualización:** Compatible con escritorio y **Televisor / Monitor en modo pantalla completa** (`F11` o botón de fullscreen), alta legibilidad a distancia y auto-actualización configurable.

---

## 3. Tipos de Masa en Producción (Segmentación Obligatoria)
En la sección de **Producción** deben existir **3 segmentos diferenciados** para trabajar cada tipo de masa/pan:
1. **Masa Brioche** (basada en la lógica y estructura de `Formula Brioche`)
2. **Pan de Papa** (basada en la lógica y estructura de `Formula papa`)
3. **Pan Dulce** (basada en la lógica y estructura de `Formula Pan Dulce`)

> **Requisito clave:** Es **imperativo** que en cada segmento de **Producción** se muestren las **fórmulas necesarias de cada masa** calculadas exactamente igual a como se hacen en el archivo de Excel/Google Sheets correspondiente, junto con el desglose consolidado de productos (por ejemplo, paquetes y unidades por familia/presentación/peso/topping).

---

## 4. Funcionalidades por Sección

### 4.1. Sección 1: Pedidos
* **Carga de datos:** Lee los pedidos desde la pestaña **`Productos`** y los ordena **cronológicamente por fecha**.
* **Agrupación visual:** Muestra los pedidos en **tarjetas agrupadas por cliente** (considerando también fecha/orden para no mezclar pedidos distintos del mismo cliente en fechas diferentes).
* **Información en tarjeta:** Cliente, fecha/hora del pedido, detalle de productos (presentación/molde, peso en gramos, topping, cantidad, etc.), datos de entrega/retiro y estado actual.
* **Selección y envío a Producción:** Permitir seleccionar uno o varios pedidos/clientes y enviarlos a **Producción** (cambiando su estado y registrando el envío).

### 4.2. Sección 2: Producción (Vista TV + 3 Segmentos de Masa)
* **Origen de datos:** Solo incluye los pedidos que fueron **enviados desde la sección `Pedidos`** (y que aún no se han cerrado/entregado, según el flujo de trabajo).
* **3 Segmentos / Pestañas / Bloques:**
  * **Brioche**
  * **Pan de Papa**
  * **Pan Dulce**
  *(Permitir ver un segmento enfocado para máxima legibilidad en TV o vista multi-segmento según resolución).*
* **Consolidación al estilo de las hojas de Fórmula:**
  * Agrupar cantidades por familia, producto, presentación/molde, peso y topping (p. ej. *Ajonjolí*, *Orégano*, *Sésamo*, combinaciones, etc.).
  * Mostrar cantidades en **Paquetes** y **Unidades** (y/o conversiones equivalentes definidas en la hoja).
  * **Cálculo de Fórmulas:** Mostrar de forma clara y exacta las fórmulas/cantidades de ingredientes o masa requeridas para los pedidos enviados a producción, replicando las reglas de cálculo de `Formula Brioche`, `Formula papa` y `Formula Pan Dulce`.
* **Diseño para Televisor:**
  * Tipografía grande, alto contraste, tarjetas/tablas limpias sin saturación.
  * Botón de refresco manual y **auto-refresh** (ej. cada 30–60 segundos).
  * Botón para activar/salir de **Pantalla Completa**.

### 4.3. Sección 3: Entregas
* **Origen de datos:** Muestra los pedidos que **ya han sido enviados a producción**.
* **Gestión de entrega:** Facilitar la consulta de órdenes en curso o listas para entregar/despachar (cliente, contacto, modalidad de entrega/retiro, detalle del pedido y opción para marcar como entregado o actualizar estado).

---

## 5. Consideraciones de Datos y Reglas de Negocio
1. **Mapeo exacto con las hojas:** Inspeccionar las columnas exactas de `Productos` y las celdas/fórmulas de `Formula Brioche`, `Formula papa` y `Formula Pan Dulce` para que los cálculos en JS coincidan al 100% con la hoja.
2. **Normalización de textos:** Unificar mayúsculas/minúsculas, espacios o variantes de nombres de productos, pesos y toppings al agrupar, evitando pérdidas o duplicados en los totales.
3. **Manejo de fechas:** Parsear correctamente las marcas de tiempo/fechas provenientes de Google Sheets para ordenar de forma fiable en `Pedidos`.
4. **Escalabilidad:** Mantener el código modular (separando conexión a Apps Script, lógica de clasificación por masa, cálculo de fórmulas y renderizado de vistas) para poder agregar fácilmente en el futuro:
   * Filtros por fecha/lote/turno.
   * Más detalles en tarjetas de pedidos o entregas.
   * Otras fórmulas o registros (`Formula Jamon`, `Logs`, etc.).

---

## 6. Entregables Esperados del Agente de IA
1. **Código de Google Apps Script (`Code.gs`):** Endpoints para leer `Productos` y las configuraciones/fórmulas de `Formula Brioche`, `Formula papa` y `Formula Pan Dulce`, y actualizar el estado de los pedidos cuando pasan a `Producción` o `Entregas`.
2. **Frontend (`index.html`, `styles.css` / Tailwind, `app.js`):** Interfaz completa con navegación entre **Pedidos**, **Producción** (con los 3 segmentos de masa y sus fórmulas) y **Entregas**, lista para probar y desplegar.
3. **Guía rápida de configuración:** Pasos para vincular el ID de la hoja de cálculo, desplegar el Web App en Google Apps Script y abrir la vista de Producción en el televisor.