"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../../lib/socket"; // 2 levels up to src/lib
import { useAuth } from "../../context/AuthContext"; // 2 levels up to src/context

interface SocketContextType {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token && user) {
      socket.auth = { token };
      socket.connect();
    } else {
      socket.disconnect();
    }

    function onConnect() {
      setIsConnected(true);
      console.log("🟢 Socket connected:", socket.id);
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log("🔴 Socket disconnected");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
