"use client";

export default function Topbar() {
  return (
    <header
      style={{
        height: "70px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        position: "sticky",
        top: 0,
        background: "white",
      }}
    >
      <h2>Home</h2>

      <input
        type="text"
        placeholder="Search Pulse..."
        style={{
          padding: "10px 15px",
          borderRadius: "20px",
          border: "1px solid #d1d5db",
          width: "250px",
        }}
      />
    </header>
  );
}
