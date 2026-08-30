'use client';

import React from 'react';
import { DisplayPinModal } from '@/modules/display/components/DisplayPinModal';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** @deprecated Use DisplayPinModal — kept as a thin wrapper for existing imports. */
export const AdminPinModal: React.FC<AdminPinModalProps> = (props) => (
  <DisplayPinModal
    {...props}
    title="Cài đặt Quản trị"
    subtitle="Nhập mã PIN quản trị viên để mở Cài đặt Kiosk"
  />
);
