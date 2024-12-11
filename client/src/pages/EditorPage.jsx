import React, { useEffect, useRef, useState } from "react"
import Client from "../components/Client"
import Editor from "../components/Editor"
import { initSocket } from "../socket"
import Actions from "../../Actions"
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom"
import toast from "react-hot-toast"



const EditorPage = () => {

    const [clients, setClients] = useState([])

    const socketRef = useRef(null)
    const codeRef = useRef(null)
    const location = useLocation()
    const reactNavigator = useNavigate()
    const params = useParams()


    function handleErrors(e) {
        console.log('socket error', e)
        toast.error('Socket connection failed, try again later.')
        reactNavigator('/')
    }

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket()
            socketRef.current.on('connect_error', (err) => handleErrors(err))
            socketRef.current.on('connect_failed', (err) => handleErrors(err))
            socketRef.current.emit(Actions.JOIN, {
                roomId: params.roomId,
                username: location.state?.username,
            })

            //listening for joined event
            socketRef.current.on(Actions.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`)

                    }
                    setClients(clients);
                    socketRef.current.emit(Actions.SYNC_CODE, {
                        code: codeRef.current,
                        socketId
                    })
                })

            //Listening for disconnected
            socketRef.current.on(Actions.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left the room.`)
                setClients((prev) => {
                    return prev.filter(
                        client => client.socketId !== socketId
                    )
                })
            })
        };
        init()
        return () => {
            socketRef.current?.off(Actions.JOINED)
            socketRef.current?.off(Actions.DISCONNECTED)
            socketRef.current?.disconnect()
        }
    }, [])

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(params.roomId);
            toast.success('Room Id has been copy to your clipboard.')
        } catch (err) {
            toast.error('Could not copy Room Id')
            console.log(err)
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }


    if (!location.state) {
        return <Navigate to="/" />
    }

    return <div className="mainWrap">
        <div className="aside">
            <div className="asideInner">
                <div className="logo">
                    <h4>CodeSync</h4>
                </div>
                <h3>Connected</h3>
                <div className="clientsList">
                    {
                        clients.map(client => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))
                    }
                </div>
            </div>
            <button className="btn copyBtn" onClick={copyRoomId}>Copy Room ID</button>
            <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
        </div>
        <div className="editorWrap">
            <Editor
                socketRef={socketRef}
                roomId={params.roomId}
                onCodeChange={(code) => {
                    codeRef.current = code
                }}
            />
        </div>
    </div>
}
export default EditorPage