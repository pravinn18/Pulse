"use client";

import { useEffect } from "react";
import { socket } from "../lib/socket";

export default function NotificationListener() {
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;

    if (!token) return;

    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewNotification = (notification: any) => {
      console.log("Real-time notification received:", notification);
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, []);

  return null;
}
