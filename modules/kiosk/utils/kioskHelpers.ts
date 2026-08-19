export const calculateAgeFromDob = (dob?: string | null): number => {
  if (!dob) return 30; // Tuổi mặc định
  const dobParts = dob.split('/');
  if (dobParts.length === 3) {
    const parsedYear = parseInt(dobParts[2], 10);
    if (!isNaN(parsedYear)) {
      return new Date().getFullYear() - parsedYear;
    }
  }
  return 30;
};

export const getActivePatientId = (state: {
  patientId?: string;
  citizenId?: string;
  patientInfo?: { idNumber?: string } | null;
}): string => {
  return state.patientId || state.citizenId || state.patientInfo?.idNumber || '';
};

export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const removeVietnameseTones = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};
