import { create } from 'zustand';
import { applyTelex } from '../utils/vietnameseTyping';

export interface VirtualKeyboardConfig {
  inputId: string;
  title?: string;
  initialValue: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}

interface VirtualKeyboardStoreState {
  isOpen: boolean;
  activeInputId: string | null;
  title: string;
  value: string;
  placeholder: string;
  isVietnameseMode: boolean;
  isCapsLock: boolean;
  onChangeCallback: ((val: string) => void) | null;
  onSubmitCallback: ((val: string) => void) | null;

  openKeyboard: (config: VirtualKeyboardConfig) => void;
  closeKeyboard: () => void;
  setValue: (value: string) => void;
  appendChar: (char: string) => void;
  toggleVietnameseMode: () => void;
  toggleCapsLock: () => void;
  backspace: () => void;
  clear: () => void;
  submit: () => void;
}

export const useVirtualKeyboardStore = create<VirtualKeyboardStoreState>((set, get) => ({
  isOpen: false,
  activeInputId: null,
  title: 'Nhập nội dung tìm kiếm',
  value: '',
  placeholder: 'Chạm để gõ phím...',
  isVietnameseMode: true, // Mặc định bật gõ tiếng Việt Telex
  isCapsLock: false,
  onChangeCallback: null,
  onSubmitCallback: null,

  openKeyboard: (config) => {
    set({
      isOpen: true,
      activeInputId: config.inputId,
      title: config.title || 'Nhập nội dung tìm kiếm',
      value: config.initialValue || '',
      placeholder: config.placeholder || 'Chạm để gõ phím...',
      onChangeCallback: config.onChange,
      onSubmitCallback: config.onSubmit || null,
    });
  },

  closeKeyboard: () => {
    set({
      isOpen: false,
      activeInputId: null,
      onChangeCallback: null,
      onSubmitCallback: null,
    });
  },

  setValue: (value) => {
    set({ value });
    const cb = get().onChangeCallback;
    if (typeof cb === 'function') {
      cb(value);
    }
  },

  appendChar: (char) => {
    const isVn = get().isVietnameseMode;
    const isCaps = get().isCapsLock;
    const formattedChar = isCaps ? char.toUpperCase() : char.toLowerCase();
    const current = get().value;

    const nextVal = applyTelex(current, formattedChar, isVn);
    get().setValue(nextVal);
  },

  toggleVietnameseMode: () => {
    set((state) => ({ isVietnameseMode: !state.isVietnameseMode }));
  },

  toggleCapsLock: () => {
    set((state) => ({ isCapsLock: !state.isCapsLock }));
  },

  backspace: () => {
    const current = get().value;
    if (current.length > 0) {
      // Use Array.from to correctly remove unicode surrogate pairs/diacritics if any
      const chars = Array.from(current);
      chars.pop();
      const nextVal = chars.join('');
      get().setValue(nextVal);
    }
  },

  clear: () => {
    get().setValue('');
  },

  submit: () => {
    const val = get().value;
    const onChangeCb = get().onChangeCallback;
    if (typeof onChangeCb === 'function') {
      onChangeCb(val);
    }
    const submitCb = get().onSubmitCallback;
    if (typeof submitCb === 'function') {
      submitCb(val);
    }
    get().closeKeyboard();
  },
}));
