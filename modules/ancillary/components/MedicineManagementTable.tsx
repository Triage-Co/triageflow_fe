'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Pill,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Eye,
    Power,
    PowerOff,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter,
    LayoutGrid,
    Table as TableIcon,
    AlertCircle,
    PackageCheck,
    Building2,
    Tag,
    Layers,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { Medicine } from '@/shared/types/prescription.types';
import { medicineService } from '../services/medicineService';
import { MedicineFormModal } from './MedicineFormModal';
import { MedicineDetailModal } from './MedicineDetailModal';

export function MedicineManagementTable() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Search, Filter & Sort States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
    const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'medicine_name' | 'medicine_code' | 'active_ingredient' | 'unit_price' | 'created_at'>('medicine_name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [viewingMedicine, setViewingMedicine] = useState<Medicine | null>(null);

    const [toggleTarget, setToggleTarget] = useState<Medicine | null>(null);
    const [isToggling, setIsToggling] = useState(false);

    const loadMedicines = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const list = await medicineService.getMedicines({
                is_active: undefined // Load all including active & inactive
            });
            setMedicines(list);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Không thể tải danh mục dược phẩm.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedicines();
    }, []);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3500);
    };

    // Extract unique units and routes for filter dropdowns
    const availableUnits = useMemo(() => {
        const set = new Set<string>();
        medicines.forEach((m) => m.unit && set.add(m.unit));
        return Array.from(set).sort();
    }, [medicines]);

    const availableRoutes = useMemo(() => {
        const set = new Set<string>();
        medicines.forEach((m) => m.usage_route && set.add(m.usage_route));
        return Array.from(set).sort();
    }, [medicines]);

    // Statistics calculations
    const stats = useMemo(() => {
        const total = medicines.length;
        const activeCount = medicines.filter((m) => m.is_active !== false).length;
        const inactiveCount = total - activeCount;
        const totalUnits = availableUnits.length;
        return { total, activeCount, inactiveCount, totalUnits };
    }, [medicines, availableUnits]);

    // Filter & Sort Logic
    const processedMedicines = useMemo(() => {
        let result = [...medicines];

        // Status Filter
        if (statusFilter === 'ACTIVE') {
            result = result.filter((m) => m.is_active !== false);
        } else if (statusFilter === 'INACTIVE') {
            result = result.filter((m) => m.is_active === false);
        }

        // Unit Filter
        if (selectedUnit !== 'ALL') {
            result = result.filter((m) => m.unit === selectedUnit);
        }

        // Route Filter
        if (selectedRoute !== 'ALL') {
            result = result.filter((m) => m.usage_route === selectedRoute);
        }

        // Free text search across code, name, active ingredient, manufacturer
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (m) =>
                    m.medicine_code.toLowerCase().includes(q) ||
                    m.medicine_name.toLowerCase().includes(q) ||
                    (m.active_ingredient && m.active_ingredient.toLowerCase().includes(q)) ||
                    (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
            );
        }

        // Sorting
        result.sort((a, b) => {
            let valA: any = a[sortBy] ?? '';
            let valB: any = b[sortBy] ?? '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [medicines, statusFilter, selectedUnit, selectedRoute, searchQuery, sortBy, sortOrder]);

    // Pagination calculations
    const totalPages = Math.ceil(processedMedicines.length / itemsPerPage) || 1;
    const paginatedMedicines = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedMedicines.slice(start, start + itemsPerPage);
    }, [processedMedicines, currentPage, itemsPerPage]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, selectedUnit, selectedRoute, sortBy, sortOrder]);

    // Handle column header click for fast sorting
    const handleHeaderSort = (column: 'medicine_code' | 'medicine_name' | 'active_ingredient' | 'unit_price' | 'created_at') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const renderSortIcon = (column: 'medicine_code' | 'medicine_name' | 'active_ingredient' | 'unit_price' | 'created_at') => {
        if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-50" />;
        return sortOrder === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
        ) : (
            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
        );
    };

    // Toggle Active Status
    const confirmToggleActive = async () => {
        if (!toggleTarget) return;
        setIsToggling(true);
        try {
            const isCurrentlyActive = toggleTarget.is_active !== false;
            if (isCurrentlyActive) {
                await medicineService.deleteMedicine(toggleTarget.medicine_id);
                showToast(`Đã ngưng lưu hành thuốc "${toggleTarget.medicine_name}"`);
            } else {
                await medicineService.restoreMedicine(toggleTarget.medicine_id);
                showToast(`Đã khôi phục hoạt động cho thuốc "${toggleTarget.medicine_name}"`);
            }
            setToggleTarget(null);
            loadMedicines();
        } catch (err: any) {
            alert(err?.message || 'Không thể thay đổi trạng thái thuốc');
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Toast Message */}
            {toastMsg && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-emerald-900 dark:text-emerald-100 shadow-xl flex items-center gap-3 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">{toastMsg}</span>
                </div>
            )}

            {/* Dashboard Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <Pill className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-neutral-400 block">Tổng Danh Mục</span>
                        <span className="text-xl font-extrabold text-neutral-900 dark:text-white">{stats.total}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-neutral-400 block">Đang Hoạt Động</span>
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.activeCount}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-neutral-400 block">Đã Tạm Ngừng</span>
                        <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{stats.inactiveCount}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-neutral-400 block">Đơn Vị Tính</span>
                        <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{stats.totalUnits} loại</span>
                    </div>
                </div>
            </div>

            {/* Header & Quick Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                        <PackageCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Quản Lý Danh Mục Dược Phẩm & Thuốc
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Tra cứu, lọc danh mục, chỉnh sửa đơn giá và quản lý trạng thái lưu hành thuốc toàn hệ thống
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={loadMedicines}
                        disabled={loading}
                        className="px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setEditingMedicine(null);
                            setIsFormOpen(true);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Thêm Thuốc Mới</span>
                    </button>
                </div>
            </div>

            {/* Toolbar: Search, Filters, Sort & View Mode */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo mã thuốc, tên thuốc, hoạt chất, nhà sản xuất..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-600 cursor-pointer"
                            >
                                Xóa
                            </button>
                        )}
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl shrink-0 self-end lg:self-auto">
                        <button
                            onClick={() => setViewMode('TABLE')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                viewMode === 'TABLE'
                                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span>Bảng CRUD</span>
                        </button>
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                viewMode === 'GRID'
                                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Dạng Thẻ</span>
                        </button>
                    </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 dark:text-neutral-400 mr-1">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Bộ lọc:</span>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="ALL">Trạng thái: Tất cả ({medicines.length})</option>
                        <option value="ACTIVE">Đang hoạt động ({stats.activeCount})</option>
                        <option value="INACTIVE">Đã ngưng ({stats.inactiveCount})</option>
                    </select>

                    {/* Unit Filter */}
                    <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="ALL">Đơn vị: Tất cả</option>
                        {availableUnits.map((u) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>

                    {/* Route Filter */}
                    <select
                        value={selectedRoute}
                        onChange={(e) => setSelectedRoute(e.target.value)}
                        className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="ALL">Đường dùng: Tất cả</option>
                        {availableRoutes.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>

                    {/* Quick Sort Selector */}
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-400 hidden sm:inline">Sắp xếp:</span>
                        <select
                            value={`${sortBy}_${sortOrder}`}
                            onChange={(e) => {
                                const [col, ord] = e.target.value.split('_');
                                setSortBy(col as any);
                                setSortOrder(ord as any);
                            }}
                            className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="medicine_name_asc">Tên thuốc (A-Z)</option>
                            <option value="medicine_name_desc">Tên thuốc (Z-A)</option>
                            <option value="medicine_code_asc">Mã thuốc (A-Z)</option>
                            <option value="unit_price_asc">Giá (Thấp đến Cao)</option>
                            <option value="unit_price_desc">Giá (Cao đến Thấp)</option>
                            <option value="created_at_desc">Mới nhất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error state */}
            {errorMsg && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs font-bold">Đang tải dữ liệu dược phẩm hệ thống...</p>
                </div>
            ) : paginatedMedicines.length === 0 ? (
                <div className="py-20 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Pill className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        Không tìm thấy thuốc nào phù hợp với bộ lọc
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc đặt lại các bộ lọc
                    </p>
                </div>
            ) : viewMode === 'TABLE' ? (
                /* CRUD TABLE VIEW */
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider select-none">
                                <tr>
                                    <th
                                        onClick={() => handleHeaderSort('medicine_code')}
                                        className="px-4 py-3.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Mã Thuốc</span>
                                            {renderSortIcon('medicine_code')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleHeaderSort('medicine_name')}
                                        className="px-4 py-3.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Tên Biệt Dược</span>
                                            {renderSortIcon('medicine_name')}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleHeaderSort('active_ingredient')}
                                        className="px-4 py-3.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Hoạt Chất</span>
                                            {renderSortIcon('active_ingredient')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5">Đơn Vị & Đường Dùng</th>
                                    <th
                                        onClick={() => handleHeaderSort('unit_price')}
                                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span>Đơn Giá</span>
                                            {renderSortIcon('unit_price')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5">Nhà Sản Xuất</th>
                                    <th className="px-4 py-3.5">Trạng Thái</th>
                                    <th className="px-4 py-3.5 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                                {paginatedMedicines.map((med) => {
                                    const active = med.is_active !== false;

                                    return (
                                        <tr
                                            key={med.medicine_id}
                                            className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors"
                                        >
                                            {/* Code */}
                                            <td className="px-4 py-3.5">
                                                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block">
                                                    {med.medicine_code}
                                                </span>
                                            </td>

                                            {/* Trade Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                                        <Pill className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-neutral-900 dark:text-white text-sm block leading-snug">
                                                            {med.medicine_name}
                                                        </span>
                                                        {med.description && (
                                                            <span className="text-[11px] text-neutral-400 line-clamp-1">
                                                                {med.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Active Ingredient */}
                                            <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                                                {med.active_ingredient || '—'}
                                            </td>

                                            {/* Unit & Route */}
                                            <td className="px-4 py-3.5">
                                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                    {med.unit}
                                                </span>
                                                <span className="text-neutral-400 ml-1.5 text-[11px]">
                                                    ({med.usage_route})
                                                </span>
                                            </td>

                                            {/* Price */}
                                            <td className="px-4 py-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                                {med.unit_price?.toLocaleString('vi-VN')} đ
                                            </td>

                                            {/* Manufacturer */}
                                            <td className="px-4 py-3.5 text-neutral-500 dark:text-neutral-400">
                                                {med.manufacturer || '—'}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5">
                                                {active ? (
                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold inline-flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold inline-flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" />
                                                        Ngừng
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setViewingMedicine(med);
                                                            setIsDetailOpen(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingMedicine(med);
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setToggleTarget(med)}
                                                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                            active
                                                                ? 'text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                                                : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                        }`}
                                                        title={active ? 'Ngưng lưu hành' : 'Khôi phục hoạt động'}
                                                    >
                                                        {active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* BENTO GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedMedicines.map((med) => {
                        const active = med.is_active !== false;

                        return (
                            <div
                                key={med.medicine_id}
                                className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 hover:border-indigo-500 shadow-xs transition-all space-y-3 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                                            {med.medicine_code}
                                        </span>
                                        {active ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                Hoạt động
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                Tạm ngưng
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="text-base font-extrabold text-neutral-900 dark:text-white mt-2 leading-tight">
                                        {med.medicine_name}
                                    </h4>

                                    <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400 font-medium pt-2">
                                        <p className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                            <span>Hoạt chất: <strong className="text-neutral-800 dark:text-neutral-200">{med.active_ingredient || '—'}</strong></span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                            <span>Đường {med.usage_route} {med.manufacturer ? `· NSX: ${med.manufacturer}` : ''}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {med.unit_price?.toLocaleString('vi-VN')} đ <span className="text-xs font-normal text-neutral-400">/ {med.unit}</span>
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setViewingMedicine(med);
                                                setIsDetailOpen(true);
                                            }}
                                            className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                            title="Xem"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingMedicine(med);
                                                setIsFormOpen(true);
                                            }}
                                            className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                            title="Sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && processedMedicines.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        <span>
                            Hiển thị {Math.min(processedMedicines.length, (currentPage - 1) * itemsPerPage + 1)}
                            {' - '}
                            {Math.min(processedMedicines.length, currentPage * itemsPerPage)} trong số {processedMedicines.length} thuốc
                        </span>

                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            <option value={5}>5 / trang</option>
                            <option value={10}>10 / trang</option>
                            <option value={20}>20 / trang</option>
                            <option value={50}>50 / trang</option>
                        </select>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>Trước</span>
                            </button>

                            <span className="px-3 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                Trang {currentPage} / {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <span>Sau</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal 1: Add / Edit Form */}
            <MedicineFormModal
                isOpen={isFormOpen}
                medicine={editingMedicine}
                onClose={() => setIsFormOpen(false)}
                onSuccess={(saved) => {
                    showToast(editingMedicine ? `Đã cập nhật thuốc "${saved.medicine_name}"` : `Đã thêm thuốc "${saved.medicine_name}" mới!`);
                    loadMedicines();
                }}
            />

            {/* Modal 2: View Details */}
            <MedicineDetailModal
                isOpen={isDetailOpen}
                medicine={viewingMedicine}
                onClose={() => setIsDetailOpen(false)}
                onEdit={(med) => {
                    setEditingMedicine(med);
                    setIsFormOpen(true);
                }}
            />

            {/* Modal 3: Confirm Toggle Active */}
            {toggleTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">
                                {toggleTarget.is_active !== false ? 'Ngưng Lưu Hành Thuốc?' : 'Khôi Phục Hoạt Động Thuốc?'}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Bạn có chắc chắn muốn {toggleTarget.is_active !== false ? 'tạm ngưng lưu hành' : 'khôi phục hoạt động cho'} loại thuốc <strong className="text-neutral-800 dark:text-neutral-200">"{toggleTarget.medicine_name}"</strong> (Mã: {toggleTarget.medicine_code})?
                            </p>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setToggleTarget(null)}
                                className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="button"
                                onClick={confirmToggleActive}
                                disabled={isToggling}
                                className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                                    toggleTarget.is_active !== false
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {isToggling && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>Xác Nhận</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
