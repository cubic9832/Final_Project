import catalog from '../../../../data/vehicles/unified-managed-20261103/catalog.json' with { type: 'json' };
export default catalog.filter(vehicle => vehicle.recommendation_enabled);
