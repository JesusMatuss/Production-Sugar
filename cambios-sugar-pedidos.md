# Especificación de Cambios y Mejoras UI/UX — SUGAR (Pedidos & Producción TV)

**Archivo objetivo:** `index.html` (y archivos JS/CSS asociados si los hubiera)  
**Propósito:** Documento de requerimientos técnicos y de interfaz para implementar mejoras operativas, corrección de errores y optimización visual en planta y despacho.

---

## 1. Contraste y Legibilidad Visual (Modo Claro y Modo Oscuro)

### Problema actual
Existen textos, indicadores y etiquetas con bajo contraste entre el color de fuente y el color de fondo (por ejemplo, el indicador de hora en la barra superior `19:49:27`, etiquetas de estado y textos secundarios en la sección **Entregas**), dificultando su lectura rápida en pantalla.

### Requerimientos
- Auditar todas las combinaciones de color de texto vs. fondo en toda la aplicación (barra superior, tarjetas, tablas, badges, modales y secciones `Pedidos`, `Producción TV`, `Entregas` y `Deliverys`).
- Garantizar contraste alto y legible (mínimo nivel AA/AAA de accesibilidad) tanto en **Modo Claro** como en **Modo Oscuro**.
- Corregir específicamente:
  - El contenedor de reloj/hora en la barra superior (`🕒 HH:MM:SS`).
  - Etiquetas, badges y textos de estado en la vista de **Entregas**.
  - Cualquier texto gris claro sobre fondos crema/claros o texto oscuro sobre fondos oscuros.

---

## 2. Simplificación y Flujo de Estados (`Pedidos` y `Entregas`)

### Objetivo
Reducir la cantidad de estados visibles y disponibles para evitar confusiones operativas entre producción y despacho.

### 2.1. Sección `Pedidos`
- **Opciones de filtro disponibles (únicamente):**
  1. `Todos los estados`
  2. `Pendientes`
  3. `En producción`
- **Estados seleccionables/marcables por el usuario en cada pedido:**
  - Únicamente `Pendientes` y `En producción`.
  - Eliminar/ocultar cualquier otro estado en selectores o botones de acción dentro de esta vista.

### 2.2. Sección `Entregas`
- **Opciones de filtro disponibles (únicamente):**
  1. `Todos los estados`
  2. `En producción`
  3. `Fabricados / Por despachar`
  4. `Entregados`
- **Estados seleccionables/marcables en esta vista:**
  - Únicamente los 3 estados operativos: `En producción`, `Fabricados / Por despachar` y `Entregados`.
- **Regla especial de reversión (`En producción` -> `Pendientes`):**
  - Si un pedido se encuentra marcado como `En producción`, habilitar una acción clara (botón/opción **"Retirar de producción"** o **"Devolver a Pendientes"**) que permita revertir su estado a `Pendientes` (haciendo que vuelva a gestionarse desde la bandeja de `Pedidos`).

---

## 3. Corrección de Bug en Sección `Deliverys` (Liquidación de Pagos)

### Problema actual
En la sección **Deliverys**, al intentar liquidar el pago de un delivery, la acción no se completa o no se persiste/refleja correctamente (los deliveries siguen apareciendo sin liquidar).

### Requerimientos
- Revisar el flujo completo del evento/función de liquidación de pago en `Deliverys`:
  1. Verificar el listener del botón de liquidar y la captura del ID/índice correcto del pedido o delivery.
  2. Asegurar la actualización inmediata del estado en memoria/estado local de la aplicación y el re-renderizado de la lista y contadores.
  3. Verificar la sincronización/guardado hacia el backend (Google Sheets / Google Apps Script / `localStorage`, según corresponda en el proyecto) para que el cambio no se pierda al recargar o actualizar datos.
  4. Agregar feedback visual claro (notificación/toast o cambio de estado inmediato) confirmando que el delivery fue liquidado.

---

## 4. Rediseño del Área de `Producción TV`

### 4.1. Consolidado por Toppings y Productos -> Modal a Pantalla Completa
- **Reemplazo de tarjetas en vista principal:**
  - En la sección **1. CONSOLIDADO POR TOPPINGS Y PRODUCTOS**, eliminar el listado extenso de tarjetas de productos que obliga a hacer scroll vertical.
  - En su lugar, mostrar un botón principal destacado: **`Mostrar Productos / Toppings`** (puede acompañarse de un breve resumen numérico si es útil, sin ocupar altura vertical excesiva).
- **Vista a Pantalla Completa (`100vw` × `100vh`):**
  - Al hacer clic en **`Mostrar Productos / Toppings`**, abrir un modal/panel que cubra **toda la pantalla** (`inset: 0`, `width: 100vw`, `height: 100vh`) con botón de cierre visible (`✕ Cerrar` y tecla `Esc`).
  - **Arquitectura de la información:**
    - Agrupar los ítems primero por **Tipo de Producto / Pan** (ej. *Hamburguesa Grande 110g*, *Perro Caliente*, etc.).
    - Dentro de cada producto, presentar de forma compacta y tabular/grid los **Toppings**, **Unidades** y **Paquetes**, además de los controles operativos necesarios (`+` / `-`, ajustes) sin requerir scroll excesivo.
    - Optimizar el aprovechamiento horizontal (columnas / grid responsivo de alta densidad visual) ideal para monitores o pantallas de producción.

### 4.2. Colores Distintivos por Tipo de Topping
- Asignar un **color propio y consistente** (badge/etiqueta con fondo + texto de alto contraste) a cada topping para identificarlos a simple vista en toda la interfaz (tanto en el modal de consolidado como en listas o etiquetas de pedidos):
  - Ejemplos sugeridos (extensible dinámicamente para nuevos toppings):
    - **Ajonjolí:** Dorado / Ámbar cálido
    - **Orégano:** Verde hierba / Oliva
    - **Parmesano / Queso:** Amarillo crema / Naranja suave
    - **Sin Topping / Natural:** Gris pizarra neutro
    - **Amapola / Semillas:** Azul pizarra / Índigo
    - *(Generar un hash/paleta determinística de colores de alto contraste para cualquier topping adicional que venga desde Google Sheets).*

### 4.3. Modal "Ver Fórmula" a Pantalla Completa
- Modificar la ventana/pestaña que se abre al presionar **`📐 Ver Fórmula`** para que ocupe **toda la pantalla** (`100vw` × `100vh`).
- Organizar los ingredientes, porcentajes panaderos, pesos calculados y notas de preparación en columnas o tarjetas compactas para evitar scrolls largos cuando la receta tenga muchos ingredientes.

### 4.4. Simplificación del Bloque de Ruedas para Producción
En la sección **2. BLOQUE DE RUEDAS PARA PRODUCCIÓN** (tanto en *Hamburguesas en Ruedas* como en *Enrollados*):
- **Título de gramaje:**
  - Cambiar el texto `"Rueda 110 gr"` (y equivalentes de otros gramajes) para que muestre únicamente el gramaje: **`110gr`** (sin la palabra `"Rueda"`).
  - Aumentar considerablemente el **tamaño de fuente y peso tipográfico** de **`110gr`** para que sea el dato protagonista y se lea a distancia en planta.
- **Limpieza de datos redundantes:**
  - Eliminar la línea `"Total: 32 unidades"` (y equivalentes) debajo del peso de masa por corte, ya que no es información necesaria en este bloque.
  - Mantener limpia la tarjeta mostrando: el gramaje grande (`110gr`), la etiqueta de molde (`SIN MOLDE` / con molde), el peso de masa por corte (`3960 g masa por corte`), la cantidad de ruedas (`1 RUEDA`) y el ajuste (`-4`).

---

## Checklist de Verificación Final para el Agente
- [ ] Todos los textos y relojes tienen contraste óptimo en Modo Claro y Modo Oscuro.
- [ ] `Pedidos` filtra y marca únicamente `Pendientes` y `En producción`.
- [ ] `Entregas` filtra y marca únicamente `En producción`, `Fabricados / Por despachar` y `Entregados`, y permite devolver de `En producción` a `Pendientes`.
- [ ] Liquidar pago en `Deliverys` actualiza el estado correctamente y persiste tras recargar.
- [ ] `Consolidado por Toppings y Productos` usa el botón `Mostrar Productos / Toppings` con modal full-screen agrupado por producto.
- [ ] Cada topping tiene su propio color distintivo de alta legibilidad.
- [ ] `Ver Fórmula` se despliega a pantalla completa sin scroll innecesario.
- [ ] En `Bloque de Ruedas`, el gramaje dice solo `110gr` en tamaño grande y se eliminó `Total: XX unidades`.
