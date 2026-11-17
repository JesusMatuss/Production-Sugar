# SUGAR Pedidos & Producción (TV Mode) 🥖📺

Web App profesional para la gestión operativa de panadería, optimizada para proyectarse en televisores de planta con **Dark Mode de alto contraste**, escalado dinámico de fórmulas panaderas y cálculo automatizado de ruedas para picadora industrial.

---

## 🌟 Características Principales

1. **Sección 1: Gestión de Pedidos**
   * Agrupación automática por **Cliente** y **Fecha de entrega**.
   * Filtros rápidos por buscador de clientes o productos.
   * Selección individual o masiva de pedidos pendientes.
   * Envío instantáneo a producción con persistencia en Google Sheets (`Estado_SugarApp`).

2. **Sección 2: Producción en Modo TV (Dark Mode)**
   * **3 Segmentos de Masa:**
     * 🟡 **Masa Brioche Especial** (Hamburguesas, Perros, Delis, Sandwich).
     * 🥔 **Pan de Papa Artesanal** (Hamburguesas de papa, Perros de papa).
     * 🍬 **Pan Dulce Tradicional** (Coco, Relleno Arequipe/Chocolate/Guayaba, Simple).
   * **Consolidado por Toppings y Presentaciones:**
     * Paquetes y unidades totales por topping (Ajonjolí, Orégano, Sésamo, etc.).
   * **Bloque de Ruedas (Picadora de 36 unidades):**
     * Sub-bloques para **Hamburguesas** y **Enrollados**.
     * Cálculo de ruedas enteras (`CANTIDAD`) y unidades de ajuste (`UNIDADES`) con distinción visual:
       * 🟢 Ajustes positivos (unidades sobrantes).
       * 🔴 Ajustes negativos (unidades a compensar por redondeo hacia arriba).
   * **Fórmula Panadera Dinámica (Modal Desplegable):**
     * Botón **"📐 Ver Fórmula"** que escala cada ingrediente (Harina al 100%, Agua, Azúcar, Sal, Levadura, etc.) proporcionalmente a los **kilos exactos de masa requeridos** por los pedidos en producción.
   * **Herramientas para TV:**
     * Botón de **Pantalla Completa (F11)**.
     * Modo **Carrusel TV** (auto-rotación entre Brioche, Papa y Dulce cada 45s).
     * Auto-refresco de pedidos cada 30 segundos.
     * Reloj industrial en tiempo real.

---

## 🚀 Despliegue en Google Sheets (Google Apps Script)

1. Abre tu archivo de Google Sheets **SUGAR**.
2. En el menú superior ve a **Extensiones** ➔ **Apps Script**.
3. Copia el contenido del archivo [`Code.gs`](file:///c:/Users/Jmatt/Desktop/Aplicaciones%20Ai/SugarPedidosWeb/Code.gs) y pégalo en el editor de Apps Script reemplazando el código existente.
4. Haz clic en **Guardar** (icono de disquete).
5. Haz clic en el botón azul superior **Implementar** (Deploy) ➔ **Nueva implementación**.
6. Selecciona el tipo: **Aplicación web** (Web app).
7. Configura:
   * **Descripción:** `Sugar API v1`
   * **Ejecutar como:** `Yo` (tu cuenta)
   * **Quién tiene acceso:** `Cualquier usuario` (Anyone)
8. Haz clic en **Implementar**, autoriza los permisos de Google y copia la **URL de la aplicación web** (terminada en `/exec`).

---

## 🔗 Conexión de la Web App

1. Abre [`index.html`](file:///c:/Users/Jmatt/Desktop/Aplicaciones%20Ai/SugarPedidosWeb/index.html) en tu navegador (o mediante un servidor local).
2. Haz clic en el icono de **Configuración** ⚙️ en la esquina superior derecha del encabezado.
3. Pega la URL de tu Web App de Google Apps Script.
4. El indicador cambiará a **"En vivo (Google Sheets)"** y tus pedidos se sincronizarán en tiempo real.

> **Modo Local:** Si no configuras la URL o estás sin conexión a internet, la app funciona de inmediato con pedidos de prueba para que puedas operar o mostrar la interfaz.

