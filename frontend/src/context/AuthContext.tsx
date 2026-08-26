"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { socket } from "../lib/socket";

export type User = {
  id: string;
  name: string;
  email?: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken =
          localStorage.getItem("token") || localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          localStorage.setItem("token", storedToken);

          const parsedUser: User = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          socket.auth = { token: storedToken };
          if (!socket.connected) {
            socket.connect();
          }

          try {
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok) {
              const freshData = await res.json();
              const fullUser: User = {
                id: freshData.id || freshData._id || parsedUser.id,
                name: freshData.name || parsedUser.name,
                email: freshData.email || parsedUser.email,
                username: freshData.username || parsedUser.username,
                avatarUrl:
                  freshData.avatarUrl ||
                  freshData.avatar ||
                  freshData.image ||
                  parsedUser.avatarUrl ||
                  null,
                bio: freshData.bio ?? parsedUser.bio,
              };
              setUser(fullUser);
              localStorage.setItem("user", JSON.stringify(fullUser));
            }
          } catch (e) {
            console.error("Failed to sync latest profile data:", e);
          }
        }
      } catch (error) {
        console.error("Failed to restore auth session:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    const receivedToken = data.accessToken || data.token;
    let loggedInUser: User = data.user;

    try {
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${receivedToken}` },
      });
      if (meRes.ok) {
        const fullData = await meRes.json();
        loggedInUser = {
          id: fullData.id || fullData._id || loggedInUser.id,
          name: fullData.name || loggedInUser.name,
          email: fullData.email || loggedInUser.email,
          username: fullData.username || loggedInUser.username,
          avatarUrl:
            fullData.avatarUrl ||
            fullData.avatar ||
            fullData.image ||
            loggedInUser.avatarUrl ||
            null,
          bio: fullData.bio ?? loggedInUser.bio,
        };
      }
    } catch (e) {
      console.error("Could not fetch full profile on login:", e);
    }

    localStorage.setItem("token", receivedToken);
    localStorage.setItem("accessToken", receivedToken);
    localStorage.setItem("user", JSON.stringify(loggedInUser));

    setToken(receivedToken);
    setUser(loggedInUser);

    socket.auth = { token: receivedToken };
    if (!socket.connected) {
      socket.connect();
    }
  };

  const logout = () => {
   
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);

    socket.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
