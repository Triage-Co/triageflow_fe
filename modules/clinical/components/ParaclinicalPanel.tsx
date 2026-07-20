'use client';

import { useState } from 'react';
import { Printer, Plus } from 'lucide-react';
import type { LabOrder } from '@/modules/clinical/types/clinical.types';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/Table';
import { cn } from '@/lib/utils';

interface ParaclinicalPanelProps {
    orders: LabOrder[];
}

export function ParaclinicalPanel({ orders }: ParaclinicalPanelProps) {
    const [selectedId, setSelectedId] = useState(orders[orders.length - 1]?.id ?? '');

    const selected = orders.find((o) => o.id === selectedId) ?? orders[0];

    return (
        <div className="space-y-5">
            {/* Lab orders card */}
            <div className="bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-800">Yêu cầu cận lâm sàng</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            {orders.length} xét nghiệm đã được chỉ định
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-[14px] gap-1.5 h-9 text-xs">
                            <Printer className="w-3.5 h-3.5" />
                            In CĐ
                        </Button>
                        <Button size="sm" className="rounded-[14px] gap-1.5 h-9 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            Thêm chỉ định
                        </Button>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent cursor-default">
                            <TableHead className="h-11 px-5">Tên xét nghiệm</TableHead>
                            <TableHead className="h-11">Nhóm</TableHead>
                            <TableHead className="h-11">Trạng thái</TableHead>
                            <TableHead className="h-11 pr-5">Giờ nhận/trả</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow
                                key={order.id}
                                data-state={selectedId === order.id ? 'selected' : undefined}
                                onClick={() => setSelectedId(order.id)}
                                className={cn(
                                    selectedId === order.id && 'bg-brand-50/50 hover:bg-brand-50/60'
                                )}
                            >
                                <TableCell className="px-5 font-medium text-neutral-800 text-sm">
                                    {order.name}
                                </TableCell>
                                <TableCell className="text-sm text-neutral-500">{order.group}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" size="sm">
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="pr-5 text-sm text-neutral-400">
                                    {order.receivedAt && order.returnedAt
                                        ? `${order.receivedAt} / ${order.returnedAt}`
                                        : '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Detail card */}
            {selected && (
                <div className="bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5">
                    <h3 className="text-sm font-bold text-neutral-800 mb-4">
                        Chi tiết cận lâm sàng
                    </h3>
                    <p className="text-sm font-semibold text-neutral-700 mb-4">
                        {selected.name}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Ghi chú', 'Ghi chú'].map((label, idx) => (
                            <div key={idx}>
                                <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                                    {label}
                                </label>
                                <textarea
                                    className="w-full min-h-[140px] rounded-[14px] border border-neutral-200 bg-neutral-50/50 px-3.5 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                                    placeholder="Nhập ghi chú..."
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
