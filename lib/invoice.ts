export function invoiceTotal(cents: number[]): number {
  return cents.reduce((a, b) => a + b, 0)
}
