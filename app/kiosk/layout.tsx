export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }`}</style>
      <div className="antialiased h-screen overflow-hidden">{children}</div>
    </>
  );
}
