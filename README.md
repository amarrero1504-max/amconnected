# Vigía

Mesa de control para las computadoras de tus sucursales. Ves cuáles están en línea, cuáles perdieron la señal y cuáles traen el disco lleno. Desde el mismo panel puedes reiniciar un equipo, bloquear la sesión, dejar un aviso en pantalla o pedir el inventario.

Vigía no abre el escritorio ni mira lo que escribe el cajero. Las órdenes son solo esas.

La cadena de ejemplo es **Abarrotes Del Valle**: ocho sucursales, de Guadalajara a Mérida. Los agentes que reportan desde cada PC están simulados en el navegador, así que puedes probar la mesa sin instalar nada en una caja.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:3847](http://localhost:3847).

El nombre de quien opera se guarda en este navegador, igual que las órdenes de la demo. En **Bitácora** está **Restaurar demo** si quieres volver al estado inicial.

## Qué puedes hacer

- Ver la flota: en línea, sin señal, alerta de disco o procesador, y mantenimiento.
- Entrar a una sucursal y de ahí a cada equipo.
- Reiniciar. Si no hay señal, la orden espera en cola y sale cuando el equipo vuelve.
- Bloquear la sesión de Windows del cajero.
- Dejar un aviso en pantalla.
- Pedir inventario (sistema, disco, memoria y usuario de la sesión).
- Poner un equipo en mantenimiento para que no le lleguen órdenes mientras cambian una impresora.
- Registrar que la sucursal ya tiene internet, o que ya liberó espacio en disco.

## Cómo se conectaría de verdad

En cada computadora de sucursal se instala un programa que tú controlas. Ese programa avisa si está encendido y solo ejecuta la lista de órdenes de arriba. Esta demo simula esos reportes en el navegador para que la mesa se pueda usar de una vez. No incluye acceso remoto a la pantalla, al teclado ni a los archivos.
