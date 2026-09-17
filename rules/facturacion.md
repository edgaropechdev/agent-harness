# Facturación — reglas que no se negocian

**Ficheros que gobierna:** `lib/invoice*.ts`, `lib/money.ts`, `app/facturas/*`

1. **El dinero no es un `number`.** Todo importe se guarda y se opera en
   centavos, como entero. Un `0.1 + 0.2` en una línea de factura es una
   diferencia de un centavo que el cliente ve y el contador persigue.

2. **Una factura emitida no se edita, se cancela y se vuelve a emitir.** El
   documento que el cliente ya recibió es un hecho, no un registro mutable.
   Cambiar el total de una factura enviada deja dos verdades distintas del mismo
   documento.

3. **El folio se asigna al emitir, nunca al crear el borrador.** Un borrador que
   reserva folio y se abandona deja un hueco en la serie, y la serie con huecos
   es justo lo que una auditoría pregunta.

4. **Redondear una sola vez, al final.** Redondear cada línea y luego sumar da un
   total distinto que sumar y luego redondear. El segundo es el correcto y el
   que espera quien revisa el papel.
