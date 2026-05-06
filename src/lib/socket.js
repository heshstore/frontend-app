import { io } from 'socket.io-client';
import { API_URL } from '../config';

let socket = null;

export function connectSocket(userId) {
  if (socket) socket.disconnect();

  const token = localStorage.getItem('access_token');

  socket = io(API_URL, {
    auth:      { token },
    query:     { userId },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  socket.on('connect_error', () => {
    setTimeout(() => socket?.connect(), 2000);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
