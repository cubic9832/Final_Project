import client from '../../shared/api/client';

export async function getNotifications(signal) {
  return (await client.get('/notifications', { signal })).data.data;
}
export const recordSavingsEvent = (event, signal) => client.post('/notifications/savings-events', event, { signal });
export const readNotification = id => client.patch(`/notifications/${id}`);
export const deleteNotification = id => client.delete(`/notifications/${id}`);
export async function getNotificationPreferences(signal) { return (await client.get('/notifications/preferences', { signal })).data.data; }
export const setNotificationPreference = (type, enabled) => client.put(`/notifications/preferences/${type}`, { enabled });
