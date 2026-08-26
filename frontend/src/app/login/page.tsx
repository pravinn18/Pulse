"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-12 text-white antialiased sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-900 bg-neutral-950/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
     
        <div className="flex flex-col items-center text-center">
          <div className="group relative flex items-center justify-center transition-transform duration-300 ease-out hover:scale-105">
  
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-white/20 via-neutral-400/10 to-transparent blur-xl opacity-50 transition-opacity duration-300 group-hover:opacity-80" />

            {!logoError ? (
              <Image
                src="/PULSE.png"
                alt="Pulse"
                width={64}
                height={64}
                className="relative h-16 w-16 object-contain drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)] filter"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <span className="relative text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                Pulse
              </span>
            )}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back!
          </h1>
         
        </div>

        
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-center text-sm font-medium text-red-400">
            {error}
          </div>
        )}

      
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Email
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3.5 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200 focus:border-white focus:bg-neutral-900 focus:ring-1 focus:ring-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3.5 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-200 focus:border-white focus:bg-neutral-900 focus:ring-1 focus:ring-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative mt-2 flex w-full items-center justify-center rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Logging in...
              </span>
            ) : (
              "Log in"
            )}
          </button>
        </form>

     
        <div className="pt-4 text-center border-t border-neutral-900">
          <p className="text-sm text-neutral-400">
            New to Pulse?{" "}
            <Link
              href="/register"
              className="font-semibold text-white transition-colors hover:text-neutral-300 hover:underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
