# Trabajos programados — reglas que no se negocian

**Ficheros que gobierna:** `lib/cron.ts`, `lib/reminders*.ts`, `app/api/cron/*`

1. **Un fallo individual no detiene el recorrido.** Si el elemento 3 de 200
   revienta, los 197 restantes se procesan igual y el fallo se registra. Un
   trabajo que se cae al primer error deja el resto sin hacer y nadie lo nota
   hasta que alguien reclama.

2. **El lote que trunca lo dice.** Si se procesan 100 de 340 pendientes, la
   ejecución lo registra explícitamente. Un recorrido que termina «bien» sin
   decir que dejó 240 fuera es peor que uno que falla.

3. **Idempotencia por clave de negocio, no por marca de tiempo.** El mismo
   recordatorio no se manda dos veces porque la clave ya existe, no porque el
   reloj diga que ya pasó.
