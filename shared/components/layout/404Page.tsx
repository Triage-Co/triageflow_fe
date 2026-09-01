'use client';

import Image from 'next/image';
import Link from 'next/link';
import errorLogo from '@/components/image/errorLogo.gif';
import { useAuthStore } from '@/store/authStore';
import { getRoleHomePath } from '@/shared/utils/routeAccess';

export function NotFoundPage() {
    const role = useAuthStore((s) => s.user?.role);
    const homeHref = getRoleHomePath(role);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-4 py-10 text-center bg-white">
            <h1 className="text-[96px] font-black leading-none text-black tracking-tight">
                404
            </h1>

            <Image
                src={errorLogo}
                alt="404"
                width={640}
                height={640}
                className="mx-auto w-[min(420px,85vw)] h-auto"
                priority
                unoptimized
            />

            <p className="text-2xl sm:text-3xl font-bold text-[#2D2D2D] leading-tight max-w-lg">
                Có gì đó sai ở đây
            </p>

            <Link href={homeHref} className="mt-2">
                <span
                    className="inline-block rounded-[24px] bg-[#44b194] px-6 py-3 uppercase text-white text-sm font-semibold cursor-pointer transition-transform duration-300 ease-out hover:scale-95"
                >
                    Quay về trang chủ
                </span>
            </Link>
        </div>
    );
}
