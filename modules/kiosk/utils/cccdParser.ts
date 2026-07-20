export interface CCCDParsedResult {
  citizenId: string;
  oldIdNumber?: string;
  fullName: string;
  dob: string;
  gender: string;
  address: string;
  issueDate?: string;
  isCCCDFormat: boolean;
}

const formatDateDDMMYYYY = (dateStr: string): string => {
  if (!dateStr || dateStr.length !== 8) return dateStr || '';
  const day = dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4);
  const year = dateStr.slice(4);
  return `${day}/${month}/${year}`;
};

export const parseCCCDQrCode = (qrText: string): CCCDParsedResult => {
  const cleanText = (qrText || '').trim();

  // Kiểm tra nếu là chuỗi CCCD chứa dấu phân cách '|'
  if (cleanText.includes('|')) {
    const parts = cleanText.split('|');

    const citizenId = parts[0]?.trim() || '';
    const oldIdNumber = parts[1]?.trim() || '';
    const fullName = parts[2]?.trim() || 'BỆNH NHÂN KHÁM KIOSK';
    const dobRaw = parts[3]?.trim() || '';
    const gender = parts[4]?.trim() || '';
    const address = parts[5]?.trim() || '';
    const issueDateRaw = parts[6]?.trim() || '';

    return {
      citizenId,
      oldIdNumber,
      fullName,
      dob: formatDateDDMMYYYY(dobRaw),
      gender,
      address,
      issueDate: formatDateDDMMYYYY(issueDateRaw),
      isCCCDFormat: true,
    };
  }

  // Nếu là số 12 chữ số thuần nhập tay hoặc QR chứa 12 số
  const numericOnly = cleanText.replace(/\D/g, '');
  return {
    citizenId: numericOnly,
    fullName: 'BỆNH NHÂN KHÁM KIOSK',
    dob: '',
    gender: '',
    address: '',
    isCCCDFormat: false,
  };
};
