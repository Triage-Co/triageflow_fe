'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    roomService,
    type RoomCategoryGroup,
    type SpecialtyGroup,
    type BackendRoom
} from '../services/roomService';
import {
    Building2,
    DoorOpen,
    ChevronLeft,
    RefreshCw,
    Sparkles,
    Monitor,
    Stethoscope,
    Syringe,
    FlaskConical,
    Activity,
    Pill,
    FileImage,
    UserCheck,
    FolderKanban
} from 'lucide-react';

export function RoomSelector() {
    const router = useRouter();
    const [categories, setCategories] = useState<RoomCategoryGroup[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<RoomCategoryGroup | null>(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRoomId, setLastRoomId] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('tv_display_last_room_id');
        if (saved) {
            setLastRoomId(saved);
        }

        roomService.getRoomsByCategory()
            .then((data) => setCategories(data))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectRoom = (room: BackendRoom) => {
        localStorage.setItem('tv_display_last_room_id', room.room_id);
        router.push(`/display/room/${room.room_id}`);
    };

    const handleRejoinLastRoom = () => {
        if (lastRoomId) {
            router.push(`/display/room/${lastRoomId}`);
        }
    };

    const handleBack = () => {
        if (selectedSpecialty) {
            setSelectedSpecialty(null);
        } else if (selectedCategory) {
            setSelectedCategory(null);
        }
    };

    const getCategoryIcon = (key: string) => {
        switch (key) {
            case 'CLINICAL_ROOM':
                return <Stethoscope className="w-7 h-7 text-indigo-600" />;
            case 'PROCEDURE_ROOM':
                return <Syringe className="w-7 h-7 text-rose-600" />;
            case 'LABORATORY':
                return <FlaskConical className="w-7 h-7 text-amber-600" />;
            case 'FUNCTIONAL_EXPLORATION':
                return <Activity className="w-7 h-7 text-emerald-600" />;
            case 'PHARMACY':
                return <Pill className="w-7 h-7 text-purple-600" />;
            case 'IMAGING_ROOM':
                return <FileImage className="w-7 h-7 text-cyan-600" />;
            case 'RECEPTION_CASHIER':
                return <UserCheck className="w-7 h-7 text-blue-600" />;
            default:
                return <Building2 className="w-7 h-7 text-slate-600" />;
        }
    };

    return (
        <div className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden" style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}>
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-[#709CE4] via-[#7DA7EC] to-[#709CE4] text-white px-8 py-6 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-white" />
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">
                        HỆ THỐNG MÀN HÌNH CHỜ PHÒNG KHÁM (TV DISPLAY)
                    </h1>
                </div>
                {lastRoomId && (
                    <button
                        onClick={handleRejoinLastRoom}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
                    >
                        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                        Mở phòng gần nhất ({lastRoomId.slice(0, 8)}...)
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
                    {/* Navigation Subheader */}
                    <div className="flex items-center justify-between mb-6">
                        {(selectedCategory || selectedSpecialty) ? (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-indigo-950 hover:text-indigo-700 text-lg font-bold transition bg-white/60 hover:bg-white px-4 py-2 rounded-xl border border-indigo-200 shadow-sm"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                {selectedSpecialty ? 'Quay lại danh sách Chuyên khoa' : 'Quay lại chọn Loại phòng'}
                            </button>
                        ) : (
                            <div className="text-indigo-950 text-xl font-extrabold tracking-wide">
                                DANH SÁCH LOẠI PHÒNG
                            </div>
                        )}

                        {selectedCategory && !selectedSpecialty && selectedCategory.specialtyGroups && (
                            <div className="text-indigo-950 text-xl font-extrabold tracking-wide">
                                DANH SÁCH CHUYÊN KHOA KHÁM BỆNH
                            </div>
                        )}

                        {selectedCategory && !selectedSpecialty && !selectedCategory.specialtyGroups && (
                            <div className="text-indigo-950 text-xl font-extrabold tracking-wide">
                                DANH SÁCH PHÒNG KHÁM THUỘC &quot;{selectedCategory.categoryName.toUpperCase()}&quot;
                            </div>
                        )}

                        {selectedSpecialty && (
                            <div className="text-indigo-950 text-xl font-extrabold tracking-wide">
                                📍 BƯỚC 3: CHỌN PHÒNG THUỘC KHOA &quot;{selectedSpecialty.specialtyName.toUpperCase()}&quot;
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center flex-col gap-3">
                            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                            <span className="text-indigo-900 font-bold text-lg">Đang tải danh sách loại phòng & khoa...</span>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Select Room Category */}
                            {!selectedCategory && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {categories.map((cat) => (
                                        <div
                                            key={cat.categoryKey}
                                            onClick={() => setSelectedCategory(cat)}
                                            className="bg-white/80 backdrop-blur-md hover:bg-white border border-indigo-100/60 hover:border-indigo-300 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                                        >
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                                    {getCategoryIcon(cat.categoryKey)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-extrabold text-lg text-indigo-950 group-hover:text-indigo-600 transition-colors leading-snug">
                                                        {cat.categoryName}
                                                    </h3>
                                                    <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">
                                                        {cat.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-indigo-50 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-500 bg-indigo-50/80 px-2.5 py-1 rounded-lg">
                                                    {cat.rooms.length} phòng
                                                </span>
                                                <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                                                    Chọn loại &rarr;
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 2A: Category has Specialty Groups (e.g., CLINICAL_ROOM) */}
                            {selectedCategory && !selectedSpecialty && selectedCategory.specialtyGroups && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {selectedCategory.specialtyGroups.map((spec) => (
                                        <div
                                            key={spec.specialtyId}
                                            onClick={() => setSelectedSpecialty(spec)}
                                            className="bg-white/80 backdrop-blur-md hover:bg-white border border-indigo-100/60 hover:border-indigo-300 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FolderKanban className="w-7 h-7" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-extrabold text-xl text-indigo-950 group-hover:text-indigo-600 transition-colors truncate">
                                                        {spec.specialtyName}
                                                    </h3>
                                                    <span className="text-sm font-medium text-slate-500">
                                                        {spec.rooms.length} phòng khám
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                                                Xem danh sách phòng &rarr;
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 2B: Category without Specialty Groups -> Display Rooms Directly */}
                            {selectedCategory && !selectedSpecialty && !selectedCategory.specialtyGroups && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {selectedCategory.rooms.map((room) => (
                                        <div
                                            key={room.room_id}
                                            onClick={() => handleSelectRoom(room)}
                                            className="bg-white/90 backdrop-blur-md hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group text-center"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                                <DoorOpen className="w-8 h-8" />
                                            </div>
                                            <h4 className="font-black text-2xl text-indigo-950 uppercase tracking-tight mb-2">
                                                {room.room_name}
                                            </h4>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                                                {selectedCategory.categoryName}
                                            </span>
                                            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm">
                                                Mở màn hình TV
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 3: Room selection inside a Specialty */}
                            {selectedSpecialty && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {selectedSpecialty.rooms.map((room) => (
                                        <div
                                            key={room.room_id}
                                            onClick={() => handleSelectRoom(room)}
                                            className="bg-white/90 backdrop-blur-md hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group text-center"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                                <DoorOpen className="w-8 h-8" />
                                            </div>
                                            <h4 className="font-black text-2xl text-indigo-950 uppercase tracking-tight mb-2">
                                                {room.room_name}
                                            </h4>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                                                Khoa: {selectedSpecialty.specialtyName}
                                            </span>
                                            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm">
                                                Mở màn hình TV
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}

