'use client';

import { DisplayScreenSelector } from '@/modules/display/components/DisplayScreenSelector';

export default function PharmacyDisplayIndexPage() {
    return (
        <DisplayScreenSelector
            kind="TV_PHARMACY"
            title="Chọn quầy TV nhà thuốc"
            emptyHint="Chưa có quầy TV nhà thuốc. Chạm 5 lần tiêu đề, nhập PIN, rồi thêm quầy."
        />
    );
}
