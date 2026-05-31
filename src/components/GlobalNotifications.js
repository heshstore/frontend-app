// Socket connection and notification fetching are fully managed by NotificationContext.
// This component was previously creating a second independent socket via lib/socket.js
// while NotificationContext already created its own — causing duplicate connections.
// All functionality (fetchNotifications, fetchUnreadCount, notification.new handler) is
// handled inside NotificationProvider; this component is kept as a no-op mount point.
export default function GlobalNotifications() {
  return null;
}
