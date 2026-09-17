# Correo — reglas que no se negocian

**Ficheros que gobierna:** `lib/email/*`, `lib/invoice-mail.ts`

1. **Nada se manda desde una petición web.** Todo correo se encola. Un SMTP lento
   convierte un clic del usuario en un timeout, y el reintento del usuario en un
   correo duplicado.

2. **El destinatario se resuelve una vez y se guarda con el envío.** Si el
   contacto cambia de correo mañana, el registro tiene que seguir diciendo a
   dónde se mandó, no a dónde se mandaría hoy.

3. **En entorno de desarrollo no sale nada hacia fuera.** El transporte se
   sustituye, no se confía en una lista de excepciones: la lista se olvida y el
   correo de prueba llega a un cliente real.
