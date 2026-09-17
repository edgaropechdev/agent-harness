# AGENTS.md

Este fichero se carga **entero, en cada sesión**. Por eso es corto: lo que
pertenece a un módulo vive en `rules/`, no aquí, y llega solo cuando se toca el
código que gobierna.

## Reglas transversales

Aplican siempre, y por eso sí están aquí.

1. **Leer antes de escribir.** Ningún cambio se propone sobre un fichero que no
   se ha leído en esta sesión.
2. **Nada de credenciales en el repositorio.** Ni en código, ni en pruebas, ni en
   ficheros de ejemplo.
3. **Una prueba que no puede fallar no es una prueba.** Toda prueba nueva se
   comprueba en negativo antes de darse por buena.

## Módulos y sus reglas

| Módulo | Reglas | Qué gobierna |
|---|---|---|
| Facturación | `rules/facturacion.md` | `lib/invoice*.ts`, `lib/money.ts`, `app/facturas/*` |
| Correo | `rules/correo.md` | `lib/email/*`, `lib/invoice-mail.ts` |
| Trabajos programados | `rules/trabajos-programados.md` | `lib/cron.ts`, `lib/reminders*.ts`, `app/api/cron/*` |

El enrutado tiene dos vías y las dos se comprueban en `tests/routing.test.ts`:
esta tabla, para quien lea; y `rules-map.json`, para el hook.
