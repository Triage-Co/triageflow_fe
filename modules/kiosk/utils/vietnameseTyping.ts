/**
 * Vietnamese Telex & Diacritics Typing Engine for Kiosk
 * Zero dependencies, highly robust, supports full Telex tone placement & direct Vietnamese vowels.
 */

// Tone types
export type VietnameseTone = 'none' | 's' | 'f' | 'r' | 'x' | 'j';

// Vowel base mapping without tone: [none, s(sắc), f(huyền), r(hỏi), x(ngã), j(nặng)]
const VOWEL_TABLE: Record<string, [string, string, string, string, string, string]> = {
  // Lowercase
  a: ['a', 'á', 'à', 'ả', 'ã', 'ạ'],
  ă: ['ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'],
  â: ['â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
  e: ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ'],
  ê: ['ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
  i: ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
  o: ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ'],
  ô: ['ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ'],
  ơ: ['ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
  u: ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ'],
  ư: ['ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
  y: ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],

  // Uppercase
  A: ['A', 'Á', 'À', 'Ả', 'Ã', 'Ạ'],
  Ă: ['Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ'],
  Â: ['Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
  E: ['E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ'],
  Ê: ['Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'],
  I: ['I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị'],
  O: ['O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ'],
  Ô: ['Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ'],
  Ơ: ['Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
  U: ['U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ'],
  Ư: ['Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'],
  Y: ['Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ'],
};

// Quick lookup: character -> { base: string, toneIndex: number }
const CHAR_TO_VOWEL_INFO = new Map<string, { base: string; toneIndex: number }>();
for (const [base, forms] of Object.entries(VOWEL_TABLE)) {
  forms.forEach((char, idx) => {
    CHAR_TO_VOWEL_INFO.set(char, { base, toneIndex: idx });
  });
}

const TONE_KEYS: Record<string, number> = {
  s: 1, // sắc
  f: 2, // huyền
  r: 3, // hỏi
  x: 4, // ngã
  j: 5, // nặng
  z: 0, // xóa dấu
};

/**
 * Remove tone mark from a single vowel character
 */
export const stripTone = (char: string): string => {
  const info = CHAR_TO_VOWEL_INFO.get(char);
  return info ? VOWEL_TABLE[info.base][0] : char;
};

/**
 * Get current tone index of a vowel character (0 = none, 1 = sắc, 2 = huyền, 3 = hỏi, 4 = ngã, 5 = nặng)
 */
export const getToneIndex = (char: string): number => {
  const info = CHAR_TO_VOWEL_INFO.get(char);
  return info ? info.toneIndex : 0;
};

/**
 * Set specific tone index on a vowel character
 */
export const setTone = (char: string, toneIdx: number): string => {
  const info = CHAR_TO_VOWEL_INFO.get(char);
  if (!info) return char;
  return VOWEL_TABLE[info.base][toneIdx] || char;
};

/**
 * Identify all vowels in a word
 */
interface VowelPosition {
  index: number;
  char: string;
  base: string;
  toneIndex: number;
}

const findVowelsInWord = (word: string): VowelPosition[] => {
  const list: VowelPosition[] = [];
  for (let i = 0; i < word.length; i++) {
    const info = CHAR_TO_VOWEL_INFO.get(word[i]);
    if (info) {
      list.push({
        index: i,
        char: word[i],
        base: info.base,
        toneIndex: info.toneIndex,
      });
    }
  }
  return list;
};

/**
 * Find the primary vowel index where tone should be placed in Vietnamese
 */
const findToneTargetIndex = (word: string, vowels: VowelPosition[]): number => {
  if (vowels.length === 0) return -1;
  if (vowels.length === 1) return vowels[0].index;

  const lastVowel = vowels[vowels.length - 1];
  const hasTrailingConsonant = lastVowel.index < word.length - 1;

  // Diphthongs / Triphthongs rules:
  // e.g. "uyên", "tiền", "toán", "khoác", "thuốc", "hoàng"
  if (hasTrailingConsonant) {
    // If ending with consonant, tone is placed on the main vowel (usually second vowel)
    // Exception: "qu", "gi" where u or i is part of initial consonant cluster
    if (vowels.length >= 2) {
      const first = vowels[0];
      const second = vowels[1];
      if (
        (first.index > 0 && word[first.index - 1].toLowerCase() === 'q' && first.base.toLowerCase() === 'u') ||
        (first.index > 0 && word[first.index - 1].toLowerCase() === 'g' && first.base.toLowerCase() === 'i')
      ) {
        return second.index;
      }
      return vowels[vowels.length - 1].index;
    }
    return lastVowel.index;
  }

  // Open syllable ending with vowel (no trailing consonant):
  // Cases: "oa", "oe", "uy": tone on second vowel (hóa, hòe, thủy)
  if (vowels.length === 2) {
    const v1 = vowels[0].base.toLowerCase();
    const v2 = vowels[1].base.toLowerCase();

    if ((v1 === 'o' && (v2 === 'a' || v2 === 'e')) || (v1 === 'u' && v2 === 'y')) {
      return vowels[1].index;
    }

    // "ua", "ưa", "ia": tone on first vowel (múa, mửa, mía)
    if (v2 === 'a' && (v1 === 'u' || v1 === 'ư' || v1 === 'i')) {
      return vowels[0].index;
    }

    // Default open diphthong: tone on first vowel
    return vowels[0].index;
  }

  // Triphthong: "oai", "uay", "ươi", "iêu": tone on middle vowel
  if (vowels.length >= 3) {
    return vowels[1].index;
  }

  return vowels[0].index;
};

/**
 * Transform current word with Vietnamese Telex rules
 */
export const transformWordTelex = (word: string, nextKey: string): { newWord: string; handled: boolean } => {
  const lowerKey = nextKey.toLowerCase();
  const isUpperKey = nextKey !== lowerKey;

  // 1. Check double 'd' -> 'đ'
  if (lowerKey === 'd') {
    const lastChar = word.slice(-1);
    if (lastChar === 'd') {
      return { newWord: word.slice(0, -1) + (isUpperKey ? 'Đ' : 'đ'), handled: true };
    }
    if (lastChar === 'D') {
      return { newWord: word.slice(0, -1) + 'Đ', handled: true };
    }
    // Escape 'đ' + 'd' -> 'dd'
    if (lastChar === 'đ') {
      return { newWord: word.slice(0, -1) + 'dd', handled: true };
    }
    if (lastChar === 'Đ') {
      return { newWord: word.slice(0, -1) + 'Dd', handled: true };
    }
  }

  // 2. Check circumflex vowel doubling ('aa' -> 'â', 'ee' -> 'ê', 'oo' -> 'ô')
  if (lowerKey === 'a' || lowerKey === 'e' || lowerKey === 'o') {
    // Search backward for matching base vowel
    for (let i = word.length - 1; i >= 0; i--) {
      const char = word[i];
      const info = CHAR_TO_VOWEL_INFO.get(char);
      if (info && info.base.toLowerCase() === lowerKey) {
        // Toggle circumflex
        let transformedBase: string | null = null;
        if (lowerKey === 'a') transformedBase = info.base === 'A' ? 'Â' : 'â';
        if (lowerKey === 'e') transformedBase = info.base === 'E' ? 'Ê' : 'ê';
        if (lowerKey === 'o') transformedBase = info.base === 'O' ? 'Ô' : 'ô';

        // If already circumflex, untransform to original base + key (escape)
        if (info.base.toLowerCase() === 'â' || info.base.toLowerCase() === 'ê' || info.base.toLowerCase() === 'ô') {
          let originalBase = 'a';
          if (lowerKey === 'e') originalBase = 'e';
          if (lowerKey === 'o') originalBase = 'o';
          if (info.base === info.base.toUpperCase()) originalBase = originalBase.toUpperCase();

          const unaccented = setTone(originalBase, info.toneIndex);
          const replaced = word.slice(0, i) + unaccented + word.slice(i + 1) + nextKey;
          return { newWord: replaced, handled: true };
        }

        if (transformedBase) {
          const transformed = setTone(transformedBase, info.toneIndex);
          const replaced = word.slice(0, i) + transformed + word.slice(i + 1);
          return { newWord: replaced, handled: true };
        }
      }
    }
  }

  // 3. Check 'w' modifier ('aw' -> 'ă', 'ow' -> 'ơ', 'uw' -> 'ư', 'uow' -> 'ươ')
  if (lowerKey === 'w') {
    // Check 'uo' + 'w' -> 'ươ'
    const lowerWord = word.toLowerCase();
    const uoIdx = lowerWord.lastIndexOf('uo');
    if (uoIdx !== -1 && uoIdx === word.length - 2) {
      const uInfo = CHAR_TO_VOWEL_INFO.get(word[uoIdx]);
      const oInfo = CHAR_TO_VOWEL_INFO.get(word[uoIdx + 1]);
      const isUUpper = word[uoIdx] === word[uoIdx].toUpperCase();
      const isOUpper = word[uoIdx + 1] === word[uoIdx + 1].toUpperCase();

      const newU = isUUpper ? 'Ư' : 'ư';
      const newO = isOUpper ? 'Ơ' : 'ơ';
      const newUWithTone = setTone(newU, uInfo?.toneIndex || 0);
      const newOWithTone = setTone(newO, oInfo?.toneIndex || 0);

      const replaced = word.slice(0, uoIdx) + newUWithTone + newOWithTone + word.slice(uoIdx + 2);
      return { newWord: replaced, handled: true };
    }

    // Check individual 'a' -> 'ă', 'o' -> 'ơ', 'u' -> 'ư'
    for (let i = word.length - 1; i >= 0; i--) {
      const char = word[i];
      const info = CHAR_TO_VOWEL_INFO.get(char);
      if (info) {
        const b = info.base.toLowerCase();
        let targetBase: string | null = null;
        if (b === 'a') targetBase = info.base === 'A' ? 'Ă' : 'ă';
        if (b === 'o') targetBase = info.base === 'O' ? 'Ơ' : 'ơ';
        if (b === 'u') targetBase = info.base === 'U' ? 'Ư' : 'ư';

        // If already modified ('ă', 'ơ', 'ư'), untransform to plain vowel + 'w'
        if (b === 'ă' || b === 'ơ' || b === 'ư') {
          let plain = 'a';
          if (b === 'ơ') plain = 'o';
          if (b === 'ư') plain = 'u';
          if (info.base === info.base.toUpperCase()) plain = plain.toUpperCase();
          const unaccented = setTone(plain, info.toneIndex);
          return { newWord: word.slice(0, i) + unaccented + word.slice(i + 1) + nextKey, handled: true };
        }

        if (targetBase) {
          const transformed = setTone(targetBase, info.toneIndex);
          const replaced = word.slice(0, i) + transformed + word.slice(i + 1);
          return { newWord: replaced, handled: true };
        }
      }
    }

    // Standalone 'w' at beginning of word or after consonant: becomes 'ư'
    if (word.length === 0 || !/[a-zA-Z]/.test(word.slice(-1))) {
      return { newWord: word + (isUpperKey ? 'Ư' : 'ư'), handled: true };
    }
  }

  // 4. Tone keys: 's', 'f', 'r', 'x', 'j', 'z'
  if (lowerKey in TONE_KEYS) {
    const targetTone = TONE_KEYS[lowerKey];
    const vowels = findVowelsInWord(word);

    if (vowels.length > 0) {
      const targetVowelIdx = findToneTargetIndex(word, vowels);
      if (targetVowelIdx !== -1) {
        const targetVowelChar = word[targetVowelIdx];
        const currentTone = getToneIndex(targetVowelChar);

        // Strip tone from all other vowels in word to prevent duplicate tones
        let cleanedWord = '';
        for (let i = 0; i < word.length; i++) {
          if (i !== targetVowelIdx) {
            cleanedWord += stripTone(word[i]);
          } else {
            cleanedWord += word[i];
          }
        }

        // Toggle tone: if same tone key pressed again, remove tone and append raw key
        if (currentTone === targetTone && targetTone !== 0) {
          const stripped = stripTone(targetVowelChar);
          const untonedWord = cleanedWord.slice(0, targetVowelIdx) + stripped + cleanedWord.slice(targetVowelIdx + 1);
          return { newWord: untonedWord + nextKey, handled: true };
        }

        // Apply new tone
        const tonedChar = setTone(targetVowelChar, targetTone);
        const replacedWord = cleanedWord.slice(0, targetVowelIdx) + tonedChar + cleanedWord.slice(targetVowelIdx + 1);
        return { newWord: replacedWord, handled: true };
      }
    }
  }

  return { newWord: word + nextKey, handled: false };
};

/**
 * Main Telex engine entry point:
 * Appends a new character to text with Vietnamese Telex transformations.
 */
export const applyTelex = (
  currentText: string,
  newChar: string,
  isVietnameseEnabled: boolean = true
): string => {
  if (!isVietnameseEnabled) {
    return currentText + newChar;
  }

  // If whitespace or punctuation, simply append
  if (/[\s\d.,!?;:()\-_\/\\@#$%^&*+=[\]{}|<>~`'"]/.test(newChar)) {
    return currentText + newChar;
  }

  // Find boundaries of the current word
  const lastDelimiterIdx = Math.max(
    currentText.lastIndexOf(' '),
    currentText.lastIndexOf('\n'),
    currentText.lastIndexOf('\t')
  );

  const prefix = lastDelimiterIdx === -1 ? '' : currentText.slice(0, lastDelimiterIdx + 1);
  const currentWord = lastDelimiterIdx === -1 ? currentText : currentText.slice(lastDelimiterIdx + 1);

  const { newWord } = transformWordTelex(currentWord, newChar);
  return prefix + newWord;
};
