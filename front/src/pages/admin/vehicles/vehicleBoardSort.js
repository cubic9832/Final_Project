
import { sortTableRows } from '../adminTableData.js';
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
  return sortTableRows(numbered, sort, values);
}
