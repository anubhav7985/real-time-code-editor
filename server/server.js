import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import Actions from './Actions.js'
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname,"../client/dist")))
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, "client", "dist", "index.html"))
})
// app.use(express.static(path.join(_dirname,"/client/dist")))

// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, "client", "dist", "index.html"))
// })

const userSocketMap = {}
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId]
        }
    })
}

io.on('connection', (socket) => {
    console.log('socket connection ', socket.id);

    socket.on(Actions.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId)
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(Actions.JOINED, {
                clients,
                username,
                socketId: socket.id
            })
        })
    })

    socket.on(Actions.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(Actions.CODE_CHANGE, { code });
    })

    socket.on(Actions.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(Actions.CODE_CHANGE, { code });
    })

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms]
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(Actions.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave()

    })

})

const PORT = process.env.port || 3000
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);

})