import { Pencil } from 'lucide-react';

interface MedicalSectionProps {
    title: string;
    children: React.ReactNode;
    minHeight?: string;
    onEdit?: () => void;
    className?: string;
}

export function MedicalSection({ title, children, minHeight, onEdit, className = '' }: MedicalSectionProps) {
    return (
        <div
            className={`bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:translate-y-[-1px] transition-all duration-200 ${className}`}
            style={minHeight ? { minHeight } : undefined}
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-[14px] font-semibold text-[#2D2D2D]">{title}</h4>
                {onEdit !== undefined && (
                    <button
                        onClick={onEdit}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7B7B7B] hover:bg-[#F5F2FF] hover:text-[#8B7CF6] transition-all duration-150"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="text-[13px] text-[#2D2D2D] leading-relaxed">
                {children}
            </div>
        </div>
    );
}
