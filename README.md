# Mini Shooter 2D — Vista Cenital

Mini juego de disparos 2D en vista cenital hecho en **JavaScript puro** (Canvas, sin dependencias ni build).

## Jugar

👉 **https://federicomelgarejo.github.io/mini-shooter-2d/**

O clonando el repo y abriendo `index.html` en el navegador (no necesita servidor).

## Controles

| Control | Acción |
|---|---|
| `WASD` / Flechas | Moverse en cualquier dirección |
| Ratón | Apuntar |
| Clic izquierdo (mantener) | Disparar |
| Espacio / Clic derecho | Onda de choque (se carga matando enemigos) |

## Reglas

- Tenés **3 vidas**.
- Los enemigos son **infinitos** y se vuelven más rápidos y resistentes con el tiempo.
- Cada kill suma puntos y carga la **habilidad** (8 kills = onda de choque lista).
- El récord se guarda en `localStorage`.

## Archivos

- `index.html` — página con el canvas.
- `game.js` — toda la lógica del juego.
