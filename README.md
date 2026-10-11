# Mini Shooter 2D — Vista Cenital

Mini juegos de disparos 2D en vista cenital hechos en **JavaScript puro** (Canvas, sin dependencias ni build).

## Jugar

👉 **https://federicomelgarejo.github.io/mini-shooter-2d/**

La portada permite elegir entre las dos versiones:

| Versión | Página | Archivos |
|---|---|---|
| **2 · Archivo único** | [`shooter-cenital.html`](shooter-cenital.html) | todo en un solo `.html` |
| **1 · Modular** | [`shooter-2d.html`](shooter-2d.html) | `shooter-2d.html` + `game.js` |

También podés clonar el repo y abrir cualquiera de los `.html` directamente en el navegador (no necesita servidor).

## Controles

| Control | Acción |
|---|---|
| `WASD` / Flechas | Moverse en cualquier dirección |
| Ratón | Apuntar |
| Clic izquierdo (mantener) | Disparar |
| Espacio / Clic derecho | Onda de choque (se carga matando enemigos) |
| `P` | Pausa |

## Reglas

- Tenés **3 vidas**.
- Los enemigos son **infinitos** y se vuelven más rápidos y resistentes con el tiempo.
- Cada kill suma puntos y carga la **habilidad**.
- El récord se guarda en `localStorage`.

## Archivos

- `index.html` — portada que enlaza a las dos versiones.
- `shooter-cenital.html` — versión 2, archivo único.
- `shooter-2d.html` — versión 1, página del juego.
- `game.js` — lógica de la versión 1.
