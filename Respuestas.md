1. Estructura de la hoja ProductosNombres exactos de las columnas: En la lectura de la tabla de Productos (A1:K277), la primera fila arranca directamente con los registros de pedidos (sin fila de encabezados formal en A1:K1, por lo que aparecen como NO_HEADER). Según los datos de cada columna de izquierda a derecha (A a K), corresponden a:   Columna A: Cliente (ej. Tabuenoburgue7, Gino's food, Santos).   Columna B: Producto (ej. Hamburguesa Grande M, Perro Comercial M, Pan dulce Coco).   Columna C: Presentación / Molde / Tipo (ej. Con Molde, Sin Molde, Pesado, Regular, Simple, 14.5CM, Largo, Economico).   Columna D: Gramos / Peso (ej. 110, 120, 90, 60, 70, 50, 55, 80, 100, 1000).   Columna E: Topping (ej. Ajonjolí, Orégano, AJON/SESAMO, AJON/OREG, Coco, Sin Topping, Premiun).   Columna F: Cantidad / Paquetes (ej. 4, 6, 5, 3, 10).   Columna G: Monto / Total (ej. 17.84, 20.34, 18.9, 11.7).   Columna H: Teléfono (ej. +5804129310161).   Columna I: Fecha / Marca de tiempo 1 (ej. 8/11/2026, 23:56:35).   Columna J: Fecha / Marca de tiempo 2 (ej. 2026-11-09 23:56:35).   Columna K: Entrega / Retiro (ej. No, retiro en local, Sí -, Sí - El retiro, Sí - A media cuadra...).
(Nota para el agente: si se añaden encabezados en la fila 1 o se leen por índice de columna A–K, hay que contemplar que actualmente la fila 1 ya contiene datos).   Columna de Estado: No se observa una columna designada para el estado del flujo de la app (Pedidos / Producción / Entregas). Sí se puede crear una nueva columna (por ejemplo, Estado_SugarApp en la columna L o en una hoja/tabla auxiliar) para guardar el estado y evitar perderlo al recargar o abrir en el televisor.   2. Lógica de las hojas de Fórmulas (Formula Brioche, Formula papa, Formula Pan Dulce)Cómo calculan las fórmulas: Combinan porcentajes panaderos sobre harina base (por ejemplo, tomando un saco base de 45000 g de harina al 100% y calculando los porcentajes de agua, azúcar, sal, propinato, manteca/mantequilla, esencia, levadura, etc.) junto con cálculos de masa total / peso de pastón y conversiones entre paquetes y unidades. También aparecen ajustes/restas en producción (como celdas con valores negativos para restar o ajustar unidades/ruedos).   Estructura y ejemplos reales extraídos de las hojas:Formula Brioche: Organiza bloques por topping (AJONJOLI, OREGANO, SESAMO, AJON/SESAMO, AJON/OREGANO, MIXTO, Ruedas) y subsecciones como HAMBURGUESAS, Perros y Delis, mostrando columnas de Paquetes y Unidades. En su bloque de fórmula base figuran ingredientes como HARINA (45000, 100%), AGUA (25600), AZUCAR (3600), SAL (540), PROPINATO (240), MANTE (800), ESENCIA (400), LEVADURA (100), Porcentaje Total y Masa total.   Formula papa: Incluye secciones de productos de papa (como hamburguesas sin molde, con molde, perros de papa y producción de enrollados/hamburguesas en ruedas y unidades) junto a una tabla de fórmula base con Harina (45000, 100%), Agua (13322), Sal (680), Azucar (5868), Papa (5150), Huevos (1600), Manteca (3185), Propinato (80), Esencia (600), Levadura (750), Colorante (15) y Masa Total (38890).   Formula Pan Dulce: Agrupa variantes como Sencillo, Chocolate, Arequipe, Guayaba y Coco (Paquetes, Cantidad), y muestra una tabla con columnas Ingrediente, Base (g), Porcentaje (%) y Cantidad a pesar (kg) (Harina, Agua, Azúcar, Mantequilla, Esencia, Levadura, Sal, Total y Cantidad nesesaria de masa).   (Sugerencia para el agente: como el texto extraído de las hojas contiene celdas combinadas o desplazadas, lo ideal es que el agente inspeccione o lea los rangos exactos de cada pestaña en tu Google Sheets/Apps Script para clavar cada celda de fórmula sin margen de error).3. Formula JamonEn la hoja existe la pestaña Formula Jamon (con ingredientes como Harina al 100%, Agua al 51.4%, Azúcar al 3%, Mantequilla al 1.8%, Sal al 1.78%, Levadura al 0.8% y tipos como Pan tradicional, Pan Grande, Pan Premiun).   Respuesta para el agente: Por ahora la producción se centra en los 3 segmentos de masa que definiste (Brioche, Pan de Papa y Pan Dulce); Formula Jamon puede dejarse para una fase posterior (o estructurada de forma modular para sumarla después sin alterar la primera versión).

Experiencia de Usuario:

El televisor sera operativo la aplicacion se trasmitira por pantalla desde una laptop

Si un dark mode de alto contraste

En las seccion de produccion solo nesecito los panes agrupados por su topping y cantidad de panes, y una ventana desplegable para ver la formula panadera de cada masa alli no importa nada del cliento solo los pedidos enviados a produccion igualmente dejare un archivo llamado "catalogo.json" que es el que utliza la aplicacion web donde los clientes hacen los pedidos para que tengas mas informacion de cuanto pesa cada pan los de molde o sin molde etc esos detalles son importantes

Ademas Apartado de Ruedas en Producción
En la sección de **Producción** (vista optimizada para televisor, dividida en los segmentos de masa **Brioche**, **Pan de Papa** y **Pan Dulce**), debe incluirse el bloque de **Ruedas** siguiendo la estructura visual de la hoja de cálculo[cite: 1]:

1. **Dos sub-bloques principales:**
   - **Enrrollados**[cite: 1]
   - **Hamburguesas**[cite: 1]
2. **Columnas / Campos de cada sub-bloque:**
   - **Ruedas** (gramaje y peso de rueda/referencia, por ejemplo: `Rueda 45 gr (1630)`, `Rueda 50 gr (1800)`, `Rueda 60 gr (2160)`, `Rueda 70 gr (2520)`, `Rueda 80 gr (2880)`, `Rueda 90 gr (3240)`, `Rueda 100 gr (3600)`, `Rueda 110 gr (3960)`, `Rueda 120 gr (2160)`, `Rueda 150 gr (2700)`, `Rueda 195 gr (3510)`, según corresponda al tipo de masa y producto)[cite: 1].
   - **CANTIDAD** (número entero de ruedas calculado según la regla de redondeo)[cite: 1].
   - **UNIDADES** (ajuste en unidades respecto a las ruedas completas, pudiendo ser positivo o negativo según el decimal)[cite: 1].
3. **Visualización para TV:**
   - Tipografía grande, alto contraste y clara distinción entre valores positivos y ajustes negativos (por ejemplo, `-12`, `-6`, `-16`, `-8`)[cite: 1].
   - Actualización automática al cambiar los pedidos enviados a producción o al refrescar los datos desde `Productos`[cite: 1].

---

## 3. Instrucciones Exactas del Cálculo (Picadora de 36 Unidades)
La máquina que pica la masa saca **36 unidades** por rueda[cite: 1]. Para cualquier total acumulado de unidades `T` (`totalUnidades`) sumado desde los pedidos en producción para una variante/gramaje y un tamaño de rueda `tamanoRueda = 36` (configurable):

1. Calcular el cociente y sus componentes:
   - `cociente = T / 36`
   - `entero = Math.floor(cociente)` (equivalente a `ENTERO(DIVIDE(SUMA(...), 36))`)[cite: 1]
   - `decimal = cociente - entero` (equivalente a `(DIVIDE(SUMA(...), 36)) - (ENTERO(DIVIDE(SUMA(...), 36)))`)[cite: 1]

2. **Cálculo de `CANTIDAD` (ruedas a picar):**
   - Si `decimal > 0.5`: `cantidad = entero + 1`
   - Si `decimal <= 0.5`: `cantidad = entero`

3. **Cálculo de `UNIDADES` (ajuste de unidades):**
   - Si `decimal > 0.5`: `unidades = -((1 - decimal) * 36)` (resulta negativo, indicando las unidades a compensar/restar por haber redondeado hacia arriba a una rueda completa más)[cite: 1].
   - Si `decimal <= 0.5`: `unidades = decimal * 36` (resulta positivo, indicando las unidades sobrantes/restantes respecto a las ruedas enteras)[cite: 1].

---

## 4. Implementación Requerida en JavaScript
Implementa una función pura y reutilizable en JavaScript que replique exactamente esta lógica para cada fila de **Enrrollados** y **Hamburguesas** a partir de las unidades consolidadas desde `Productos`[cite: 1]:

```javascript
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