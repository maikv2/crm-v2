import Sidebar from "../components/sidebar";
import Header from "../components/header";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f6fb" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />

        <main
          style={{
            flex: 1,
            padding: 0,
            background: "#f3f6fb",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}