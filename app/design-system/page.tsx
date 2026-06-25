'use client';

import { useState } from 'react';
import {
    Search, Heart, Mail, ArrowRight, Trash2, Download, Plus, Filter,
    Settings, Star, Bell, Check, X, AlertTriangle, Info, Eye, Edit,
    ChevronRight, Send, Copy, ExternalLink, Zap
} from 'lucide-react';

// ── UI Components ──────────────────────────────────────────────────────────
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table';
import {
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/shared/components/ui/Dialog';

// ── Layout Components ──────────────────────────────────────────────────────
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BottomNav } from '@/shared/components/layout/BottomNav';

// ── Section Wrapper ────────────────────────────────────────────────────────
function Section({ id, title, description, children }: {
    id: string; title: string; description: string; children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-24">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{title}</h2>
                <p className="text-sm text-neutral-400 font-medium mt-1">{description}</p>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </section>
    );
}

function DemoCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-[32px] border border-neutral-100 p-6">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">{label}</p>
            {children}
        </div>
    );
}

// ── Navigation items ───────────────────────────────────────────────────────
const NAV_ITEMS = [
    { id: 'button', label: 'Button' },
    { id: 'badge', label: 'Badge' },
    { id: 'card', label: 'Card' },
    { id: 'input', label: 'Input' },
    { id: 'table', label: 'Table' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'layout', label: 'Layout' },
];

// ── Page Component ─────────────────────────────────────────────────────────
export default function DesignSystemPage() {
    const [loadingBtn, setLoadingBtn] = useState(false);

    const handleLoadingDemo = () => {
        setLoadingBtn(true);
        setTimeout(() => setLoadingBtn(false), 2000);
    };

    return (
        <div className="flex min-h-screen bg-neutral-50/50">
            {/* ── Sticky Sidebar Nav ──────────────────────── */}
            <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-screen border-r border-neutral-100 bg-white py-8 px-5">
                <div className="mb-8">
                    <div className="w-9 h-9 rounded-[24px] bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 mb-3">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-sm font-bold text-neutral-900">Design System</h1>
                    <p className="text-[11px] text-neutral-400 font-medium mt-0.5">shared/components/ui</p>
                </div>
                <nav className="flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="text-sm font-medium text-neutral-500 hover:text-brand-600 hover:bg-brand-50/60 px-3 py-2 rounded-[24px] transition-colors"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="mt-auto pt-6 border-t border-neutral-100">
                    <p className="text-[10px] text-neutral-300 font-semibold uppercase tracking-wider">TriageFlow UI</p>
                </div>
            </aside>

            {/* ── Main Content ────────────────────────────── */}
            <main className="flex-1 max-w-4xl mx-auto py-12 px-8 space-y-16">
                {/* Hero */}
                <div className="pb-8 border-b border-neutral-100">
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                        Component Library
                    </h1>
                    <p className="text-base text-neutral-400 font-medium mt-2 max-w-lg">
                        Tất cả shared UI components trong dự án TriageFlow. Mỗi component có demo đầy đủ variants, sizes, và states.
                    </p>
                </div>

                {/* ════════════════════════════════════════════════════════════
                    BUTTON
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="button"
                    title="Button"
                    description="Interactive button component with 6 variants, 4 sizes, icon support, and loading state."
                >
                    {/* Variants */}
                    <DemoCard label="Variants">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="brand">Brand</Button>
                            <Button variant="default">Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="destructive">Destructive</Button>
                        </div>
                    </DemoCard>

                    {/* Sizes */}
                    <DemoCard label="Sizes">
                        <div className="flex flex-wrap items-end gap-3">
                            <Button size="sm">Small</Button>
                            <Button size="md">Medium</Button>
                            <Button size="lg">Large</Button>
                            <Button size="xl">Extra Large</Button>
                        </div>
                    </DemoCard>

                    {/* With Icons */}
                    <DemoCard label="With Icons">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button startIcon={<Plus className="w-4 h-4" />}>Thêm mới</Button>
                            <Button variant="outline" endIcon={<ArrowRight className="w-4 h-4" />}>Tiếp tục</Button>
                            <Button variant="secondary" startIcon={<Download className="w-4 h-4" />}>Tải xuống</Button>
                            <Button variant="destructive" startIcon={<Trash2 className="w-4 h-4" />}>Xoá</Button>
                            <Button variant="ghost" startIcon={<Settings className="w-4 h-4" />}>Cài đặt</Button>
                        </div>
                    </DemoCard>

                    {/* States */}
                    <DemoCard label="States">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button disabled>Disabled</Button>
                            <Button isLoading={loadingBtn} onClick={handleLoadingDemo}>
                                {loadingBtn ? 'Đang xử lý...' : 'Click to Load'}
                            </Button>
                            <Button variant="outline" disabled>Outline Disabled</Button>
                        </div>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    BADGE
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="badge"
                    title="Badge"
                    description="Status and label badges with 7 semantic variants, dot indicator, and 2 sizes."
                >
                    {/* Variants */}
                    <DemoCard label="Variants">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="default">Default</Badge>
                            <Badge variant="secondary">Secondary</Badge>
                            <Badge variant="success">Success</Badge>
                            <Badge variant="warning">Warning</Badge>
                            <Badge variant="danger">Danger</Badge>
                            <Badge variant="info">Info</Badge>
                            <Badge variant="outline">Outline</Badge>
                        </div>
                    </DemoCard>

                    {/* With Dot */}
                    <DemoCard label="With Status Dot">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="success" dot>Đã khám</Badge>
                            <Badge variant="info" dot>Đang khám</Badge>
                            <Badge variant="warning" dot>Đang chờ</Badge>
                            <Badge variant="danger" dot>Khẩn cấp</Badge>
                            <Badge variant="default" dot>Mặc định</Badge>
                        </div>
                    </DemoCard>

                    {/* Sizes */}
                    <DemoCard label="Sizes">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge size="sm" variant="success" dot>Small</Badge>
                            <Badge size="md" variant="success" dot>Medium</Badge>
                            <Badge size="sm" variant="info">SM Info</Badge>
                            <Badge size="md" variant="info">MD Info</Badge>
                        </div>
                    </DemoCard>

                    {/* Use Cases */}
                    <DemoCard label="Use Cases">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Priority Labels</p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="success" dot>Bình thường</Badge>
                                    <Badge variant="warning" dot>Ngồi xe lăn</Badge>
                                    <Badge variant="info" dot>Khám sức khỏe</Badge>
                                    <Badge variant="danger" dot>Quay lại phòng khám</Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Allergy Tags</p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="danger">Aspirin</Badge>
                                    <Badge variant="danger">Penicillin</Badge>
                                    <Badge variant="danger">NSAIDs</Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Patient Info</p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" size="sm">Nam • 45 tuổi</Badge>
                                    <Badge variant="success" size="sm">BHYT: Có (100%)</Badge>
                                    <Badge variant="info" size="sm">Tái khám</Badge>
                                </div>
                            </div>
                        </div>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    CARD
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="card"
                    title="Card"
                    description="Container component with compound sub-components: CardHeader, CardTitle, CardDescription, CardContent, CardFooter."
                >
                    {/* Basic */}
                    <DemoCard label="Basic Card">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-neutral-900">Thông tin bệnh nhân</CardTitle>
                                <CardDescription>Chi tiết hồ sơ y tế và lịch sử khám bệnh.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-neutral-600">Đây là nội dung chính của card. Card component hỗ trợ compound pattern với Header, Title, Description, Content và Footer.</p>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button size="sm">Lưu</Button>
                                <Button variant="outline" size="sm">Huỷ</Button>
                            </CardFooter>
                        </Card>
                    </DemoCard>

                    {/* Compact */}
                    <DemoCard label="Compact Card (Custom Padding)">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { value: '45', label: 'LỊCH HẸN', color: 'text-brand-500' },
                                { value: '12', label: 'ĐANG CHỜ', color: 'text-amber-500' },
                                { value: '5', label: 'ĐÃ KHÁM', color: 'text-emerald-500' },
                            ].map((stat, i) => (
                                <Card key={i} className="flex flex-col items-center px-4 py-3 border-neutral-200/80">
                                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mt-0.5">{stat.label}</span>
                                </Card>
                            ))}
                        </div>
                    </DemoCard>

                    {/* Card with sections */}
                    <DemoCard label="Card with Clinical Content">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sinh hiệu hiện tại</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Nhịp tim', value: '78', unit: 'nhịp/phút', icon: Heart, color: 'text-rose-500 bg-rose-50/50' },
                                        { label: 'SpO2', value: '97', unit: '%', icon: Check, color: 'text-emerald-500 bg-emerald-50/50' },
                                    ].map(({ label, value, unit, icon: Icon, color }) => (
                                        <div key={label} className={`p-3 rounded-[24px] border flex items-center gap-3 ${color}`}>
                                            <Icon className="w-5 h-5" />
                                            <div>
                                                <p className="text-xs font-semibold">{label}</p>
                                                <p className="text-lg font-bold text-slate-800">{value} <span className="text-[10px] text-slate-400 font-medium">{unit}</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    INPUT
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="input"
                    title="Input"
                    description="Text input with 2 variants (default, pill), icon support, and error state."
                >
                    {/* Variants */}
                    <DemoCard label="Variants">
                        <div className="space-y-4 max-w-md">
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Default</p>
                                <Input placeholder="Nhập thông tin..." />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Pill</p>
                                <Input variant="pill" placeholder="Tìm kiếm..." />
                            </div>
                        </div>
                    </DemoCard>

                    {/* With Icons */}
                    <DemoCard label="With Icons">
                        <div className="space-y-4 max-w-md">
                            <Input
                                startIcon={<Search className="w-4 h-4" />}
                                variant="pill"
                                placeholder="Tìm kiếm tên hoặc mã bệnh nhân..."
                            />
                            <Input
                                startIcon={<Mail className="w-4 h-4" />}
                                placeholder="email@example.com"
                            />
                            <Input
                                endIcon={<Eye className="w-4 h-4" />}
                                type="password"
                                placeholder="Mật khẩu"
                            />
                        </div>
                    </DemoCard>

                    {/* States */}
                    <DemoCard label="States">
                        <div className="space-y-4 max-w-md">
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Error</p>
                                <Input error placeholder="Trường bắt buộc" />
                                <p className="text-xs text-destructive font-medium mt-1.5">Vui lòng nhập thông tin bắt buộc.</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 font-semibold mb-2">Disabled</p>
                                <Input disabled placeholder="Không thể chỉnh sửa" value="Nguyễn Văn A" />
                            </div>
                        </div>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    TABLE
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="table"
                    title="Table"
                    description="Compound table component: Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter, TableCaption."
                >
                    <DemoCard label="Full Table Example">
                        <div className="rounded-[24px] border border-neutral-200/60 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent cursor-default border-none">
                                        <TableHead className="w-16 pl-6 py-4 bg-neutral-50/85 rounded-l-[24px]">STT</TableHead>
                                        <TableHead className="py-4 bg-neutral-50/85">Bệnh nhân</TableHead>
                                        <TableHead className="py-4 bg-neutral-50/85">Ưu tiên</TableHead>
                                        <TableHead className="py-4 bg-neutral-50/85">Trạng thái</TableHead>
                                        <TableHead className="py-4 bg-neutral-50/85 rounded-r-[24px] text-right pr-6">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[
                                        { stt: '01', name: 'Nguyễn Văn A', sub: '45 tuổi • Nam', priority: 'success' as const, pLabel: 'Bình thường', status: 'success' as const, sLabel: 'Đã khám' },
                                        { stt: '02', name: 'Trần Thị B', sub: '32 tuổi • Nữ', priority: 'warning' as const, pLabel: 'Ngồi xe lăn', status: 'info' as const, sLabel: 'Đang khám' },
                                        { stt: '03', name: 'Lê Hoàng C', sub: '67 tuổi • Nam', priority: 'info' as const, pLabel: 'Khám sức khỏe', status: 'warning' as const, sLabel: 'Đang chờ' },
                                        { stt: '04', name: 'Phạm Thu D', sub: '28 tuổi • Nữ', priority: 'danger' as const, pLabel: 'Quay lại PK', status: 'warning' as const, sLabel: 'Đang chờ' },
                                    ].map((row) => (
                                        <TableRow key={row.stt}>
                                            <TableCell className="text-neutral-400 font-medium pl-6">{row.stt}</TableCell>
                                            <TableCell>
                                                <p className="font-semibold text-neutral-800 text-sm">{row.name}</p>
                                                <p className="text-xs text-neutral-400 mt-0.5">{row.sub}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={row.priority} dot>{row.pLabel}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={row.status} dot>{row.sLabel}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="inline-flex gap-1">
                                                    <Button variant="ghost" size="sm" className="w-8 h-8 px-0"><Eye className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="sm" className="w-8 h-8 px-0"><Edit className="w-4 h-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    DIALOG
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="dialog"
                    title="Dialog"
                    description="Modal dialog built on Base UI with 4 positions: center, right, left, bottom. Includes animated backdrop, close button, and compound sub-components."
                >
                    {/* Positions */}
                    <DemoCard label="Positions">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Center */}
                            <Dialog>
                                <DialogTrigger render={<Button variant="brand" startIcon={<Info className="w-4 h-4" />}>Center Dialog</Button>} />
                                <DialogContent position="center">
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-bold text-neutral-900">Xác nhận thao tác</DialogTitle>
                                        <DialogDescription>Bạn có chắc chắn muốn tiếp tục thực hiện thao tác này không?</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <p className="text-sm text-neutral-600">Đây là nội dung dialog ở vị trí <strong>center</strong>. Hỗ trợ fade + zoom animation.</p>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose render={<Button variant="outline">Huỷ</Button>} />
                                        <Button variant="brand">Xác nhận</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Right */}
                            <Dialog>
                                <DialogTrigger render={<Button variant="outline" startIcon={<ChevronRight className="w-4 h-4" />}>Right Drawer</Button>} />
                                <DialogContent position="right" className="max-w-md">
                                    <div className="p-6">
                                        <DialogHeader>
                                            <DialogTitle className="text-base font-bold text-neutral-900">Panel bên phải</DialogTitle>
                                            <DialogDescription>Slide-in drawer từ bên phải, thường dùng cho detail view.</DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-6 space-y-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Thông tin chi tiết</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <p className="text-sm text-neutral-600">Drawer position right, slide animation.</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Bottom */}
                            <Dialog>
                                <DialogTrigger render={<Button variant="secondary" startIcon={<Bell className="w-4 h-4" />}>Bottom Sheet</Button>} />
                                <DialogContent position="bottom">
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-bold text-neutral-900">Bottom Sheet</DialogTitle>
                                        <DialogDescription>Slide-up panel, thường dùng trên mobile.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <p className="text-sm text-neutral-600">Content slides up from the bottom edge.</p>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose render={<Button variant="outline" className="w-full">Đóng</Button>} />
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </DemoCard>

                    {/* Use Case: Confirm Delete */}
                    <DemoCard label="Use Case — Confirm Delete">
                        <Dialog>
                            <DialogTrigger render={<Button variant="destructive" startIcon={<Trash2 className="w-4 h-4" />}>Xoá bệnh nhân</Button>} />
                            <DialogContent position="center" className="max-w-sm">
                                <DialogHeader>
                                    <div className="w-12 h-12 rounded-[24px] bg-rose-50 flex items-center justify-center mb-2">
                                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <DialogTitle className="text-base font-bold text-neutral-900">Xác nhận xoá</DialogTitle>
                                    <DialogDescription>
                                        Hành động này không thể hoàn tác. Dữ liệu bệnh nhân sẽ bị xoá vĩnh viễn.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4">
                                    <DialogClose render={<Button variant="outline">Huỷ bỏ</Button>} />
                                    <Button variant="destructive" className="bg-rose-500 text-white hover:bg-rose-600">Xoá</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </DemoCard>
                </Section>

                {/* ════════════════════════════════════════════════════════════
                    LAYOUT SYSTEM
                   ════════════════════════════════════════════════════════════ */}
                <Section
                    id="layout"
                    title="Layout System"
                    description="Standardized layout components implementing the responsive and floating modern style hierarchy."
                >
                    {/* Page Header */}
                    <DemoCard label="Page Header">
                        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100/50">
                            <PageHeader 
                                title="Hồ sơ bệnh án" 
                                description="Quản lý chi tiết sinh hiệu, lịch sử khám bệnh và toa thuốc của bệnh nhân." 
                                actions={
                                    <>
                                        <Button variant="outline" size="sm" startIcon={<Plus className="w-4 h-4" />}>Tạo bệnh án mới</Button>
                                        <Button variant="brand" size="sm">Lưu thông tin</Button>
                                    </>
                                }
                            />
                        </div>
                    </DemoCard>

                    {/* Bottom Nav Mockup */}
                    <DemoCard label="Bottom Navigation (Mobile Only)">
                        <div className="relative h-28 bg-neutral-50 rounded-4xl border border-neutral-100 flex items-center justify-center overflow-hidden">
                            <p className="text-[10px] text-neutral-400 font-bold absolute top-2">Khung mô phỏng điện thoại</p>
                            <div className="w-full max-w-sm mt-4">
                                <div className="h-14 bg-white border border-neutral-200/60 shadow-sm rounded-3xl flex items-center justify-around px-4">
                                    <span className="text-[10px] font-bold text-brand-500 flex flex-col items-center cursor-pointer"><Zap className="w-4 h-4" /> Home</span>
                                    <span className="text-[10px] font-medium text-neutral-400 flex flex-col items-center cursor-pointer"><Plus className="w-4 h-4" /> Appts</span>
                                    <span className="text-[10px] font-medium text-neutral-400 flex flex-col items-center cursor-pointer"><Settings className="w-4 h-4" /> Settings</span>
                                </div>
                            </div>
                        </div>
                    </DemoCard>

                    {/* Complete Page Mockup */}
                    <DemoCard label="Complete Page Layout Mockup (AppShell Preview)">
                        <div className="relative border border-neutral-200/80 rounded-[48px] bg-neutral-50 h-[480px] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.03)] flex flex-col select-none">
                            {/* Inner Header / TopBar mockup */}
                            <div className="h-14 bg-white border-b border-neutral-100 px-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-[24px] bg-brand-500 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-800">TriageFlow</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[24px] bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-600 font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Hệ thống ổn định
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-6 h-6 rounded-[24px] bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-[9px] border border-brand-200">
                                            HA
                                        </div>
                                        <span className="text-[10px] font-bold text-neutral-600">Bác sĩ Hạnh</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inner Body (Sidebar + Content) */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Miniature Sidebar */}
                                <div className="w-16 bg-white border-r border-neutral-100 py-4 flex flex-col items-center justify-between shrink-0">
                                    <div className="flex flex-col items-center gap-3 w-full">
                                        <div className="w-9 h-9 rounded-[24px] bg-brand-500 text-white flex items-center justify-center shadow-sm"><Zap className="w-4 h-4" /></div>
                                        <div className="w-9 h-9 rounded-[24px] bg-neutral-50 text-neutral-400 hover:text-brand-500 hover:bg-brand-50 flex items-center justify-center transition-colors cursor-pointer"><Heart className="w-4 h-4" /></div>
                                        <div className="w-9 h-9 rounded-[24px] bg-neutral-50 text-neutral-400 hover:text-brand-500 hover:bg-brand-50 flex items-center justify-center transition-colors cursor-pointer"><Settings className="w-4 h-4" /></div>
                                    </div>
                                    <div className="w-8 h-8 rounded-[24px] bg-neutral-100 flex items-center justify-center text-neutral-500 text-[10px] font-bold">N</div>
                                </div>

                                {/* Content Scroll Area */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {/* AppShell Page Content Wrapper Mockup (bo góc 32px) */}
                                    <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-full space-y-4">
                                        {/* Page Header mockup */}
                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-neutral-800">Quản lý hàng đợi</h3>
                                                <p className="text-[10px] text-neutral-400 font-medium">Theo dõi và phân phối bệnh nhân đến phòng khám</p>
                                            </div>
                                            <Button size="sm" variant="brand">Thêm ca mới</Button>
                                        </div>

                                        {/* Content Grid mockup (using Cards bo góc 24px) */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <Card className="rounded-2xl p-4 border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] bg-neutral-50/30">
                                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Bệnh nhân đợi</p>
                                                <p className="text-xl font-black text-brand-600 mt-1">12 ca</p>
                                            </Card>
                                            <Card className="rounded-2xl p-4 border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] bg-neutral-50/30">
                                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Đã tiếp nhận</p>
                                                <p className="text-xl font-black text-neutral-800 mt-1">45 ca</p>
                                            </Card>
                                        </div>

                                        {/* Patient List Card (bo góc 24px) */}
                                        <Card className="rounded-2xl p-4 border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] bg-neutral-50/30">
                                            <p className="text-[10px] font-bold text-neutral-800 mb-3">Hàng đợi khám</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-[24px] border border-neutral-100/50">
                                                    <span className="font-bold text-neutral-700">Nguyễn Văn An</span>
                                                    <Badge variant="success" className="text-[9px] px-2.5 py-0.5 rounded-[24px]">Đang đợi</Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-[24px] border border-neutral-100/50">
                                                    <span className="font-bold text-neutral-700">Trần Thị Bình</span>
                                                    <Badge variant="secondary" className="text-[9px] px-2.5 py-0.5 rounded-[24px]">Đang khám</Badge>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DemoCard>
                </Section>

                {/* Footer */}
                <div className="pt-8 border-t border-neutral-100 text-center pb-8">
                    <p className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
                        TriageFlow Design System • shared/components/ui
                    </p>
                </div>
            </main>
        </div>
    );
}
