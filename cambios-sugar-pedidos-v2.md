# Especificación Técnica de Correcciones y Rediseño UI — SUGAR (Pedidos & Producción TV)

**Archivo objetivo:** `index.html` (y sus estilos/scripts asociados)  
**Enfoque:** Corrección de contrastes rotos (texto oscuro sobre fondo oscuro) y rediseño de alta densidad visual para el modal **Consolidado por Productos y Toppings** para eliminar el exceso de espacio vacío y evitar el scroll.

---

## 1. Corrección Urgente de Contraste (Texto Oscuro sobre Fondo Oscuro)

### Diagnóstico visual detectado
En la vista actual (especialmente en Modo Oscuro o en ciertos badges/contenedores), siguen apareciendo componentes con **fondo oscuro (`#1e293b` / `#27272a`) y texto negro o gris muy oscuro**, volviéndolos prácticamente ilegibles. Ejemplo crítico detectado en pantalla:
- Los **bloques oscuros de resumen de unidades/paquetes** dentro de las tarjetas (`1 UN / 1 pq`, `30 UN / 5 pq`, `144 UN / 18 pq`) tienen fondo oscuro con el número principal en negro (`#111827`).
- Etiquetas de estado, reloj superior y badges secundarios en otras pestañas (`Entregas`, etc.).

### Regla obligatoria para el agente
1. **Prohibido texto oscuro sobre fondo oscuro:** Todo contenedor con fondo oscuro (`#0f172a`, `#1e293b`, `#27272a`, `#334155`, etc.) debe tener obligatoriamente texto blanco puro (`#ffffff`) o gris muy claro (`#f8fafc`) para números principales, y gris claro (`#cbd5e1` o `#94a3b8`) para subtítulos.
2. **Prohibido texto claro sobre fondo claro:** Todo contenedor con fondo blanco o crema claro debe usar texto oscuro (`#0f172a` / `#1e293b`).
3. **Auditoría completa de CSS / Tailwind:**
   - Revisar todas las clases de color hardcodeadas (`text-gray-900`, `text-slate-900`, `text-black`, `color: #000`, `color: #111`) dentro de contenedores oscuros o con `dark:...`.
   - Verificar específicamente:
     - Cajas de totales/unidades en tarjetas y modales.
     - Reloj de la barra superior (`🕒 HH:MM:SS`).
     - Badges de estado y etiquetas en `Pedidos`, `Producción TV`, `Entregas` y `Deliverys`.

---

## 2. Rediseño de Alta Densidad: Modal "Consolidado por Productos y Toppings"

### Problema del diseño anterior
El diseño actual usa tarjetas enormes en 2 columnas con muchísimo espacio vacío en blanco entre el título del producto y el topping, lo que obliga a hacer mucho scroll vertical para ver los 16 productos.

### Nuevo Diseño Requerido (Compacto, Organizado y Sin Scroll Innecesario)

#### A. Estructura General del Modal (`100vw × 100vh`)
- **Header compacto (`48px–56px` de alto):** Título `Consolidado por Productos y Toppings`, badge de la masa activa (ej. `MASA BRIOCHE ESPECIAL`), totales globales (`2947 un • 226 pq`), filtro rápido opcional por categoría (`Todos`, `Hamburguesas`, `Perros / Delis`, `Panes`) y botón `✕ Cerrar (Esc)`.
- **Contenedor principal sin desperdicio de espacio:**
  - Utilizar un **Grid responsivo de 3 o 4 columnas** en pantallas de escritorio/TV (`grid-template-columns: repeat(auto-fill, minmax(310px, 1fr))`), con `gap: 10px` y `padding: 12px`.
  - **Agrupación visual clara por categoría/formato** (o tarjetas ordenadas por gramaje de mayor a menor dentro de su grupo: *Hamburguesas Con Molde*, *Hamburguesas Sin Molde*, *Perros / Enrollados / Delis*, *Panes Especiales*) para que el equipo de planta ubique cada producto al instante.

#### B. Anatomía Compacta de cada Tarjeta de Producto (Sin espacios vacíos)
Eliminar los espacios en blanco enormes y el pie de tarjeta redundante (`"1 topping configurados • 1 un netas"`). Cada tarjeta debe ser un bloque compacto y denso con **3 zonas bien definidas**:

1. **Cabecera de tarjeta en una sola línea (compacta):**
   - **Izquierda:** Nombre del producto en negrita (`14px–15px`) + badge de gramaje (`110g`) + badge de molde (`CON MOLDE` / `SIN MOLDE` / `ENROLLADO`).
   - **Derecha:** Pastilla de total de alto contraste (ej. fondo azul oscuro `#1e3a8a` o verde `#065f46` con **texto blanco `#ffffff`**) mostrando **`730 un`** y **`73 pq`**.

2. **Lista compacta de Toppings (filas densas de `32px–36px` de alto):**
   - Cada topping del producto ocupa **una sola fila horizontal** (`display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 6px;`), sin separadores gigantes ni saltos de línea innecesarios:
     - **Izquierda:** Badge con **color propio del topping** (ver sección 3).
     - **Centro-Derecha:** Cantidad exacta en negrita (`700 un` / `70 pq`) bien legible.
     - **Extremo Derecho:** Controles compactos de ajuste rápido `[ - ] [ 0 ] [ + ]` en tamaño reducido (`height: 24px`) para que no inflen la altura de la fila.

3. **Sin footer redundante:**
   - Eliminar la línea inferior de `"X toppings configurados • X un netas"` porque ese dato ya está en la cabecera de la tarjeta. Esto ahorra ~35px de altura por tarjeta y permite ver **todos o casi todos los productos de un solo vistazo sin hacer scroll**.

---

## 3. Paleta de Colores Propios por Topping (Alto Contraste Garantizado)

Cada topping debe renderizarse con una combinación fija de **fondo + borde + texto de alto contraste** para identificarlo visualmente en menos de un segundo:

| Topping | Color de Fondo | Color de Texto | Borde |
| :--- | :--- | :--- | :--- |
| **Ajonjolí** | `#FEF3C7` (Ámbar claro) | `#92400E` (Marrón ámbar oscuro) | `#F59E0B` |
| **Orégano** | `#DCFCE7` (Verde hoja claro) | `#166534` (Verde bosque oscuro) | `#22C55E` |
| **AJON/OREG** (Mix) | `#CCFBF1` (Turquesa/Menta claro) | `#115E59` (Teal oscuro) | `#14B8A6` |
| **AJON/SESAMO** | `#FFEDD5` (Naranja suave) | `#9A3412` (Terracota oscuro) | `#F97316` |
| **Sin Topping** | `#F1F5F9` (Gris pizarra claro) | `#334155` (Gris pizarra oscuro) | `#94A3B8` |
| **Parmesano / Queso** | `#FEF9C3` (Amarillo crema) | `#854D0E` (Mostaza oscuro) | `#EAB308` |
| **Amapola / Semillas** | `#E0E7FF` (Índigo suave) | `#3730A3` (Índigo profundo) | `#6366F1` |
| **Grande / Tradicional / Otros** | `#FCE7F3` (Rosa suave) o paleta hash | `#9D174D` (Borgoña oscuro) | `#EC4899` |

> **Nota para el agente:** Aplicar esta misma función `getToppingBadgeStyle(toppingName)` tanto en el modal de **Consolidado por Productos y Toppings** como en las listas de **Pedidos** y **Entregas** para mantener coherencia visual en toda la app.

---

## 4. Checklist de Validación Visual para el Agente
- [ ] **Cero texto oscuro sobre fondo oscuro:** Verificar cajas como `144 UN / 18 pq`, reloj superior y badges de estado; todo fondo oscuro tiene texto blanco/claro.
- [ ] **Densidad alta en el modal de Consolidado:** Al abrir `Mostrar Productos / Toppings`, se muestran 3–4 tarjetas por fila, sin espacios en blanco vacíos ni footers repetitivos, permitiendo ver la gran mayoría de productos en pantalla sin hacer scroll.
- [ ] **Filas de toppings compactas:** Cada topping muestra `[Badge Colorizado] + [Unidades / Paquetes] + [- 0 +]` en una sola línea limpia.
- [ ] **Colores consistentes por topping:** `Ajonjolí`, `Orégano`, `AJON/OREG`, `AJON/SESAMO` y `Sin Topping` se diferencian al instante por color.
