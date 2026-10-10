# Vigía

Consola para las computadoras de tus sucursales. La lista de equipos muestra cuáles están en línea y cuáles van desconectados. **Conectar** abre el escritorio: ves la pantalla, editas los archivos, reinicias, bloqueas la sesión, dejas un aviso o pides el inventario. Cada cambio queda en los registros con el nombre de quien opera.

La cadena de ejemplo es **Abarrotes Del Valle**: ocho sucursales, de Guadalajara a Mérida. Los agentes que reportan desde cada PC están simulados en el navegador, así que puedes probar la mesa sin instalar nada en una caja.

## Cómo abrirlo

En Windows, doble clic en `Abrir Vigia.bat`. En Mac o Linux:

```bash
./abrir.sh
```

Ese programa usa npm: instala lo que falte, arranca Vigía y abre el navegador en [http://localhost:3847](http://localhost:3847).

Si la computadora dice que no encuentra npm ni node, instala Node.js desde [https://nodejs.org](https://nodejs.org). Node trae npm. Después vuelve a abrir el mismo archivo.

También puedes correrlo a mano:

```bash
npm install
npm run dev
```

El nombre de quien opera se guarda en este navegador, igual que las órdenes de la demo. En **Bitácora** está **Restaurar demo** si quieres volver al estado inicial.

## Qué puedes hacer

- Ver la flota: en línea, sin señal, alerta de disco o procesador, y mantenimiento.
- Entrar a una sucursal y de ahí a cada equipo.
- Conectar: el mouse y el teclado pasan a esa computadora. Puedes escribir en la pantalla, cambiar archivos y eliminarlos. Si la sesión está bloqueada, desde ahí mismo se desbloquea.
- Reiniciar. Si no hay señal, la orden espera en cola y sale cuando el equipo vuelve.
- Bloquear la sesión de Windows del cajero.
- Dejar un aviso en pantalla.
- Pedir inventario (sistema, disco, memoria y usuario de la sesión).
- Poner un equipo en mantenimiento para que no le lleguen órdenes mientras cambian una impresora.
- Registrar que la sucursal ya tiene internet, o que ya liberó espacio en disco.

## Cómo se conectaría de verdad

En cada computadora de sucursal se instala el agente de Vigía, el programa que pones en tus propias cajas. Comparte con esta mesa si está encendido, la pantalla de la sesión y los archivos de trabajo, y anota cada cambio. Esta demo simula ese agente en el navegador, con la cadena de ejemplo, para que puedas usar el escritorio de una vez.
