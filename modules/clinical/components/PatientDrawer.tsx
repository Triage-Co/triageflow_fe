'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import {
    Dialog,
    DialogContent,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { PatientProfileCard } from './PatientProfileCard';
import { PatientVitalsGrid } from './PatientVitalsGrid';

interface PatientDrawerProps {
    patient: Patient | null;
    onClose: () => void;
}

type DrawerTab = 'process' | 'info';

export function PatientDrawer({ patient, onClose }: PatientDrawerProps) {
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('info');

    return (
        <Dialog
            open={patient !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                position="right"
                className="w-full max-w-[460px] p-0 bg-neutral-50/75 flex flex-col h-full overflow-hidden border-l border-neutral-100 shadow-2xl"
            >
                {patient && (
                    <>
                        {/* ── Drawer Header ──────────────────── */}
                        <div className="bg-white px-6 py-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">PK. Nội tổng quát 1</h2>
                                <p className="text-xs text-neutral-400 font-semibold tracking-wider uppercase mt-0.5">
                                    Phòng khám chuyên khoa
                                </p>
                            </div>
                        </div>

                        {/* ── Drawer scrollable content ───────── */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Tab switcher — using Button */}
                            <div className="flex p-1 bg-neutral-100/80 rounded-[32px] w-fit">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDrawerTab('process')}
                                    className={`px-4 py-1 text-xs font-semibold rounded-[24px] ${
                                        drawerTab === 'process'
                                            ? 'text-slate-800 bg-white shadow-sm hover:bg-white'
                                            : 'text-neutral-400 hover:text-neutral-500 hover:bg-transparent'
                                    }`}
                                >
                                    Quy trình
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDrawerTab('info')}
                                    className={`px-4 py-1 text-xs font-semibold rounded-[24px] ${
                                        drawerTab === 'info'
                                            ? 'text-slate-800 bg-white shadow-sm hover:bg-white'
                                            : 'text-neutral-400 hover:text-neutral-500 hover:bg-transparent'
                                    }`}
                                >
                                    Thông tin chung
                                </Button>
                            </div>

                            {/* ── Tab: Process ──────────────────── */}
                            {drawerTab === 'process' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quy trình khám bệnh</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-3">
                                            {[
                                                { step: 'Tiếp nhận', done: true },
                                                { step: 'Phân loại ưu tiên', done: true },
                                                { step: 'Đo sinh hiệu', done: true },
                                                { step: 'Chờ khám', done: patient.status !== 'Đang chờ' },
                                                { step: 'Đang khám', done: patient.status === 'Đã khám' },
                                                { step: 'Hoàn tất', done: patient.status === 'Đã khám' },
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div
                                                        className={`w-6 h-6 rounded-[24px] flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                            item.done
                                                                ? 'bg-brand-500 text-white'
                                                                : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                                                        }`}
                                                    >
                                                        {item.done ? '✓' : idx + 1}
                                                    </div>
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            item.done ? 'text-slate-700' : 'text-neutral-400'
                                                        }`}
                                                    >
                                                        {item.step}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* ── Tab: General Info ─────────────── */}
                            {drawerTab === 'info' && (
                                <>
                                    {/* Patient Profile — already using Card internally */}
                                    <PatientProfileCard patient={patient} />

                                    {/* Reason for Visit */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Lý do đến khám</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                                {patient.visitReason}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Allergies & Contraindications — using Badge */}
                                    {patient.allergies.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Dị ứng & chống chỉ định</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex flex-wrap gap-2">
                                                    {patient.allergies.map((tag, idx) => (
                                                        <Badge key={idx} variant="danger">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Medical History */}
                                    {patient.medicalHistory.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Tiền sử bệnh án</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <ul className="space-y-2">
                                                    {patient.medicalHistory.map((history, idx) => (
                                                        <li key={idx} className="flex items-start text-sm text-slate-700 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-[24px] bg-brand-500 mr-2.5 mt-2 shrink-0" />
                                                            <span>{history}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Vitals Grid — already using Card internally */}
                                    <PatientVitalsGrid vitals={patient.vitals} />
                                </>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
