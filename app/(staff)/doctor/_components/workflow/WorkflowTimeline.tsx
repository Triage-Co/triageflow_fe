'use client';

import type { DraftStep, FlowNode } from '@/modules/clinical/workflow/types';
import { Connector } from './Connector';
import { FlowIcon } from './FlowIcon';

interface WorkflowTimelineProps {
    dynamicSteps: FlowNode[];
    hasLiveSteps: boolean;
    selectedTemplateId: string;
    draftSteps: DraftStep[];
    onAddTemplate: () => void;
    onOpenStep: (id: string, node: FlowNode) => void;
    onConfigureDraft: () => void;
    onCancelDraft: () => void;
    onCustomize: () => void;
}

export function WorkflowTimeline({
    dynamicSteps,
    hasLiveSteps,
    selectedTemplateId,
    draftSteps,
    onAddTemplate,
    onOpenStep,
    onConfigureDraft,
    onCancelDraft,
    onCustomize,
}: WorkflowTimelineProps) {
    return (
        <div className="bg-white rounded-[24px] border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 flex flex-col items-center w-full max-w-[280px] mx-auto select-none transition-all group/workflow">
            <div className="w-full mb-4">
                <button
                    onClick={onAddTemplate}
                    className="w-full bg-[#F5F2FF] hover:bg-[#EDE8FF] text-[#6D5DE5] border border-[#DED7FF] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                    Thêm quy trình khám bệnh
                </button>
            </div>

            <div className="flex flex-col items-center w-full space-y-1">
                {dynamicSteps.map((node, idx) => (
                    <div key={node.id} className="flex flex-col items-center w-full">
                        <FlowIcon
                            node={node}
                            isFirst={idx === 0}
                            onClick={() => onOpenStep(node.id, node)}
                        />
                        {idx < dynamicSteps.length - 1 && (
                            <Connector
                                status={node.status}
                                compact={Boolean(
                                    node.isPayment || dynamicSteps[idx + 1]?.isPayment
                                )}
                            />
                        )}
                    </div>
                ))}
            </div>

            {selectedTemplateId && draftSteps.length > 0 ? (
                <div
                    className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider">
                            {hasLiveSteps ? 'Thêm sau bước mặc định:' : 'Xem trước template:'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onConfigureDraft}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            Cấu hình & Thêm
                        </button>
                        <button
                            onClick={onCancelDraft}
                            className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Quy trình:
                        </span>
                        {hasLiveSteps ? (
                            <button
                                onClick={onCustomize}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB] hover:bg-[#8B7CF6] hover:text-white transition-colors cursor-pointer"
                            >
                                Tùy chỉnh ({dynamicSteps.length} bước)
                            </button>
                        ) : (
                            <span className="text-[10px] font-medium text-neutral-400">
                                Chờ 2 bước mặc định từ đặt lịch
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
