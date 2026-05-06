import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { connectSocket, disconnectSocket } from '../lib/socket';

export default function GlobalNotifications() {
  const { currentUser } = useAuth();
  const { addNotification, fetchNotifications, fetchUnreadCount } = useNotifications();

  useEffect(() => {
    if (!currentUser?.id) return;

    fetchNotifications();
    fetchUnreadCount();

    const socket = connectSocket(currentUser.id);

    // Guard against duplicate bindings if effect fires more than once
    socket.off('notification.new');
    socket.on('notification.new', addNotification);

    return () => {
      disconnectSocket();
    };
  }, [currentUser?.id, addNotification, fetchNotifications, fetchUnreadCount]);

  return null;
}
