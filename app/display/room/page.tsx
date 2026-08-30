'use client';

import { DisplayScreenSelector } from '@/modules/display/components/DisplayScreenSelector';

export default function RoomDisplayPage() {
  return (
    <DisplayScreenSelector
      kind="TV_CLINIC"
      title="Chọn TV phòng khám"
      emptyHint="Chưa có TV phòng khám. Mở /display/room/{roomUuid} lần đầu sẽ tự tạo, hoặc chạm 5 lần để thêm."
    />
  );
}
