import { io } from 'socket.io-client';
const env = import.meta.env
const node_env = env.NODE_ENV || 'development';
const backendUrl = node_env.REACT_APP_BACKEND_URL;

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    }
    return io(backendUrl, options)
};