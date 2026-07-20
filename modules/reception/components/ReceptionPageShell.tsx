import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface ReceptionPageShellProps {
    children: React.ReactNode;
    maxWidth?: string;
}

export function ReceptionPageShell({ children, maxWidth = 'max-w-4xl' }: ReceptionPageShellProps) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-0 md:py-6">
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-none md:rounded-tl-[48px] md:rounded-bl-[48px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                <div
                    className={`flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-5 py-5 md:px-6 md:py-6 w-full mx-auto ${maxWidth}`}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ReceptionBackLink() {
    return (
        <Link
            href="/reception"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8B7CF6] mb-5"
        >
            <ChevronLeft className="w-4 h-4" />
            Quay lại tổng quan
        </Link>
    );
}
