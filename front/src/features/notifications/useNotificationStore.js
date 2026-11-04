import { create } from 'zustand';

const useNotificationStore = create(set => ({
  notifications: [],
  error: '',
  preferences: {},
  addNotification: notification => set(state => {
    if (!notification.id || notification.memberId == null || !notification.title
      || state.notifications.some(item => item.id === notification.id && String(item.memberId) === String(notification.memberId))) return state;
    return { notifications: [{ ...notification, read: false }, ...state.notifications] };
  }),
  markRead: (memberId, id) => set(state => ({
    notifications: state.notifications.map(item => String(item.memberId) === String(memberId) && item.id === id ? { ...item, read: true } : item),
  })),
}));

export default useNotificationStore;
