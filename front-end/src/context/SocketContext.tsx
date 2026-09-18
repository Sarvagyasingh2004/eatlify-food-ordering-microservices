import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { io, Socket } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../main";

interface SocketContextType {
    socket: Socket | null;
    reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, reconnect: () => { } });


export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { isAuth } = useAppData();

    // this has to be state, not a ref - consumers only receive the socket
    // if storing it triggers a re-render of the provider
    const [socket, setSocket] = useState<Socket | null>(null);

    // bumped to force a fresh connection, e.g. after the token is re-issued
    // with a restaurantId so the seller actually joins their restaurant room
    const [connectionId, setConnectionId] = useState<number>(0);

    const reconnect = useCallback(() => {
        setConnectionId((id) => id + 1);
    }, []);

    useEffect(() => {
        if (!isAuth) {
            setSocket(null);
            return;
        }

        const newSocket = io(realtimeService, {
            auth: {
                token: localStorage.getItem("token"),
            },
            transports: ["websocket"],
        });

        newSocket.on("connect", () => {
            console.log("Socket connected", newSocket.id);
        });

        newSocket.on("disconnect", () => {
            console.log("Socket disconnected", newSocket.id);
        });

        newSocket.on("connect_error", (error) => {
            console.error("Socket error", error.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };

    }, [isAuth, connectionId]);

    return <SocketContext.Provider value={{ socket, reconnect }} >
        {children}
    </ SocketContext.Provider>
};

export const useSocket = () => useContext(SocketContext);
