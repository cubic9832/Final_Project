import client from '../../shared/api/client.js';

export const getAdminAccess = async signal => (await client.get('/admin/access-profile', { signal })).data.data;
export const getPermissionCatalog = async signal => (await client.get('/admin/permission-roles', { signal })).data.data;
export const getPermissionAccounts = async signal => (await client.get('/admin/permission-accounts', { signal })).data.data;
export const savePermissionRole = async role => role.id
  ? (await client.put(`/admin/permission-roles/${role.id}`, role)).data.data
  : (await client.post('/admin/permission-roles', role)).data.data;
export const deletePermissionRole = async role => client.delete(`/admin/permission-roles/${role.id}`, { params: { version: role.version } });
export const assignPermissionRoles = async (userId, roleIds, expectedRoleIds) => client.put(`/admin/permission-accounts/${userId}/roles`, { roleIds, expectedRoleIds });
