export default function DisplayLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Khóa scroll toàn trang cho màn hình hiển thị TV/kiosk */}
            <style>{`html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }`}</style>
            <div className="antialiased h-screen overflow-hidden">
                {children}
            </div>
        </>
    );
}
