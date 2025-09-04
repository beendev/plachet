// lib/orderRef.ts
export function generateOrderRef(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;               // date inversée (YYYYMMDD)
  const seq = (Date.now() % 100000).toString().padStart(5, '0'); // 00000..99999
  return `PLA-${datePart}-${seq}`;
}
