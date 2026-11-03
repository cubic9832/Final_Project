
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
const values = {
  number: vehicle => vehicle.listNumber,
  vehicle: vehicle => [vehicle.brand, vehicle.model, vehicle.trim].join(' '),
  year: vehicle => vehicle.year === '' || vehicle.year == null ? null : Number(vehicle.year),
  fuel: vehicle => vehicle.fuel,
  price: vehicle => vehicle.price === '' || vehicle.price == null ? null : Number(vehicle.price),
  status: vehicle => vehicle.status,
};

export function sortVehicleRows(rows, sort) {
  const numbered = rows.map((vehicle, index) => ({ ...vehicle, listNumber: rows.length - index }));
  const valueOf = values[sort.column];
  if (!valueOf) return numbered;
  return numbered.sort((a, b) => {
    const left = valueOf(a), right = valueOf(b);
    if (left == null && right == null) return b.listNumber - a.listNumber;
    if (left == null) return 1;
    if (right == null) return -1;
    const compared = typeof left === 'number' ? left - right : collator.compare(left, right);
    return (sort.direction === 'ASC' ? compared : -compared) || b.listNumber - a.listNumber;
  });
}
