'use client';

import { cn } from '@/lib/utils';
import type { ProcessTemplate } from '@/modules/admin/types/process.types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/Dialog';
import { getTemplateName } from '@/modules/clinical/workflow/draftBuilder';

interface SelectTemplateDialogProps {
    open: boolean;
    templates: ProcessTemplate[];
    activeTemplateId: string;
    onOpenChange: (open: boolean) => void;
    onSelect: (templateId: string) => void;
}

export function SelectTemplateDialog({
    open,
    templates,
    activeTemplateId,
    onOpenChange,
    onSelect,
}: SelectTemplateDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Chọn template để thêm vào quy trình</DialogTitle>
                    <DialogDescription>
                        Template sẽ được thêm sau 2 bước mặc định (Đặt khám, Khám bệnh). Không thay
                        thế các bước đã có.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-6 grid grid-cols-1 gap-3">
                    {templates.map((tpl) => {
                        const tplId = tpl.template_id || tpl.id || '';
                        const name =
                            getTemplateName(tpl) ||
                            `Mẫu quy trình (${tpl.steps?.length || 0} bước)`;
                        const isActive = tplId === activeTemplateId;

                        return (
                            <button
                                key={tplId || name}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenChange(false);
                                    onSelect(tplId);
                                }}
                                className={cn(
                                    'w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:bg-neutral-50/50',
                                    isActive
                                        ? 'border-[#8B7CF6] bg-[#F5F2FF]/40 shadow-sm'
                                        : 'border-neutral-200 bg-white'
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-neutral-800 text-sm">
                                        {name}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                                        {tpl.steps?.length || 0} bước
                                    </span>
                                </div>
                                {tpl.steps && tpl.steps.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5 items-center text-[10px] text-neutral-400 font-medium">
                                        {tpl.steps.map((s, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                                <span>{s.step_name || s.room_type}</span>
                                                {idx < tpl.steps.length - 1 && (
                                                    <span className="text-neutral-300">→</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
