const express  = require('express');
const http = require('http');
const { Server } = require('socket.io')
const Actions = require('./Actions.js')
const path  = require('path');
const { dirname } = require('path');

const _dirname = path.resolve();

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(_dirname,"../client/dist")))
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"))
})

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
