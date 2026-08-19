import { create } from 'zustand';

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
  onChangeCallback: ((val: string) => void) | null;
  onSubmitCallback: ((val: string) => void) | null;

  openKeyboard: (config: VirtualKeyboardConfig) => void;
  closeKeyboard: () => void;
  setValue: (value: string) => void;
  appendChar: (char: string) => void;
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
    const nextVal = get().value + char;
    get().setValue(nextVal);
  },

  backspace: () => {
    const current = get().value;
    if (current.length > 0) {
      const nextVal = current.slice(0, -1);
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
