/**
 * Shared data validators for TriageFlow application.
 */

/**
 * Standard email format regex.
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Vietnamese phone number regex (10 digits starting with 03, 05, 07, 08, 09 or standard 0[2-9]xxxxxxxx).
 */
export const VN_PHONE_REGEX = /^(03|05|07|08|09|02[0-9])[0-9]{8}$/;

/**
 * Username regex: alphanumeric, underscores and dots, no spaces, 3 to 50 characters.
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,50}$/;

/**
 * Vietnamese Citizen ID (CCCD) regex: exactly 12 digits (or old CMND 9 digits).
 */
export const CITIZEN_ID_REGEX = /^[0-9]{9}([0-9]{3})?$/;

export function isValidEmail(email?: string | null): boolean {
    if (!email) return false;
    return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone?: string | null): boolean {
    if (!phone) return false;
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    return VN_PHONE_REGEX.test(cleanPhone);
}

export function isValidUserName(userName?: string | null): boolean {
    if (!userName) return false;
    return USERNAME_REGEX.test(userName.trim());
}

export function isValidPassword(password?: string | null, minLength = 6): boolean {
    if (!password) return false;
    return password.length >= minLength;
}

export function isValidCitizenId(citizenId?: string | null): boolean {
    if (!citizenId) return false;
    return CITIZEN_ID_REGEX.test(citizenId.trim());
}

export function isValidExperienceYears(years?: string | number | null): boolean {
    if (years === undefined || years === null || years === '') return true; // Optional field
    const num = Number(years);
    return !isNaN(num) && num >= 0 && num <= 70;
}

export interface StaffValidationInput {
    user_name?: string;
    password?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    gender?: string;
    license_number?: string;
    experience_years?: string | number;
    specialty_id?: string;
}

export interface ValidationResult {
    isValid: boolean;
    error: string | null;
    fieldErrors: Record<string, string>;
}

/**
 * Validates staff form inputs for both create and update flows.
 */
export function validateStaffForm(
    form: StaffValidationInput,
    isEdit = false
): ValidationResult {
    const fieldErrors: Record<string, string> = {};

    // 1. Username (Required on create)
    if (!isEdit) {
        if (!form.user_name || !form.user_name.trim()) {
            fieldErrors.user_name = 'Vui lòng nhập tên tài khoản.';
        } else if (!isValidUserName(form.user_name)) {
            fieldErrors.user_name = 'Tên tài khoản từ 3-50 ký tự, không chứa dấu cách hoặc ký tự đặc biệt.';
        }
    }

    // 2. Password (Required on create, optional on edit)
    if (!isEdit) {
        if (!form.password) {
            fieldErrors.password = 'Vui lòng nhập mật khẩu.';
        } else if (!isValidPassword(form.password, 6)) {
            fieldErrors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
        }
    } else if (form.password && !isValidPassword(form.password, 6)) {
        fieldErrors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
    }

    // 3. Full name (Required)
    if (!form.full_name || !form.full_name.trim()) {
        fieldErrors.full_name = 'Vui lòng nhập họ và tên.';
    } else if (form.full_name.trim().length < 2) {
        fieldErrors.full_name = 'Họ và tên phải có ít nhất 2 ký tự.';
    }

    // 4. Email (Required)
    if (!form.email || !form.email.trim()) {
        fieldErrors.email = 'Vui lòng nhập email.';
    } else if (!isValidEmail(form.email)) {
        fieldErrors.email = 'Định dạng email không hợp lệ (Ví dụ: bacsi.an@benhvien.com).';
    }

    // 5. Phone (Required)
    if (!form.phone || !form.phone.trim()) {
        fieldErrors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isValidPhone(form.phone)) {
        fieldErrors.phone = 'Số điện thoại không hợp lệ (Phải gồm 10 chữ số, ví dụ: 0912345678).';
    }

    // 6. Experience years (Optional, but if filled must be valid)
    if (form.experience_years !== undefined && form.experience_years !== null && form.experience_years !== '') {
        if (!isValidExperienceYears(form.experience_years)) {
            fieldErrors.experience_years = 'Số năm kinh nghiệm không hợp lệ (từ 0 đến 70 năm).';
        }
    }

    // 7. Role specific checks
    if (form.role === 'DOCTOR') {
        if (!form.specialty_id) {
            fieldErrors.specialty_id = 'Bác sĩ bắt buộc phải được phân công chuyên khoa.';
        }
    }

    const firstError = Object.values(fieldErrors)[0] || null;

    return {
        isValid: Object.keys(fieldErrors).length === 0,
        error: firstError,
        fieldErrors,
    };
}

/**
 * Validates a single field of staff form on blur.
 */
export function validateStaffField(
    field: keyof StaffValidationInput,
    value: unknown,
    form?: StaffValidationInput,
    isEdit = false
): string | null {
    const strVal = typeof value === 'string' ? value.trim() : value;

    switch (field) {
        case 'user_name':
            if (!isEdit) {
                if (!strVal) return 'Vui lòng nhập tên tài khoản.';
                if (!isValidUserName(String(strVal))) {
                    return 'Tên tài khoản từ 3-50 ký tự, không chứa dấu cách hoặc ký tự đặc biệt.';
                }
            }
            return null;

        case 'password':
            if (!isEdit) {
                if (!value) return 'Vui lòng nhập mật khẩu.';
                if (!isValidPassword(String(value), 6)) {
                    return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
                }
            } else if (value && !isValidPassword(String(value), 6)) {
                return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
            }
            return null;

        case 'full_name':
            if (!strVal) return 'Vui lòng nhập họ và tên.';
            if (String(strVal).length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
            return null;

        case 'email':
            if (!strVal) return 'Vui lòng nhập email.';
            if (!isValidEmail(String(strVal))) {
                return 'Định dạng email không hợp lệ (Ví dụ: bacsi.an@benhvien.com).';
            }
            return null;

        case 'phone':
            if (!strVal) return 'Vui lòng nhập số điện thoại.';
            if (!isValidPhone(String(strVal))) {
                return 'Số điện thoại không hợp lệ (Phải gồm 10 chữ số, ví dụ: 0912345678).';
            }
            return null;

        case 'experience_years':
            if (value !== undefined && value !== null && value !== '') {
                if (!isValidExperienceYears(value as string | number)) {
                    return 'Số năm kinh nghiệm không hợp lệ (từ 0 đến 70 năm).';
                }
            }
            return null;

        case 'specialty_id':
            if (form?.role === 'DOCTOR' && !value) {
                return 'Bác sĩ bắt buộc phải được phân công chuyên khoa.';
            }
            return null;

        default:
            return null;
    }
}
