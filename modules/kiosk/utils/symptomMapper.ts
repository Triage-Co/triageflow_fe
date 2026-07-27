import { commonSymptomDataset, Symptom } from "../data/commonSymptoms";
import { maleSymptomDataset } from "../data/maleSymptoms";
import { femaleSymptomDataset } from "../data/femaleSymptoms";

export interface SymptomItem {
  id: string;
  labelVn: string;
  labelEn: string;
  categoryNameVn: string;
}

// Key mapping table from Body Map IDs or Vietnamese Names to Dataset keys
const PART_KEY_MAPPING: Record<string, string[]> = {
  // Head & Face
  head: ["head"],
  "Đầu": ["head"],
  "Đầu & Cổ": ["head", "neckThroat"],
  eye: ["eye"],
  "Mắt": ["eye"],
  ear: ["ear"],
  "Tai": ["ear"],
  nose: ["nose"],
  "Mũi": ["nose"],
  "oral-cavity": ["mouth"],
  "Khoang miệng": ["mouth"],
  "Miệng": ["mouth"],

  // Neck & Throat
  "neck-or-throat": ["neckThroat"],
  "Cổ / Họng": ["neckThroat"],
  "Cổ": ["neckThroat"],
  "nape-of-neck": ["napeOfNeck", "neckThroat"],
  "Gáy": ["napeOfNeck", "neckThroat"],
  "Gáy & Cổ": ["napeOfNeck", "neckThroat"],

  // Torso / Chest / Abdomen
  chest: ["chest"],
  "Ngực": ["chest"],
  "Vùng Ngực": ["chest"],
  breast: ["breast", "chest"],
  "Bầu ngực": ["breast", "chest"],
  "upper-abdomen": ["upperAbdomen"],
  "Bụng trên": ["upperAbdomen"],
  "middle-abdomen": ["midAbdomen"],
  "Bụng giữa": ["midAbdomen"],
  "Bụng": ["upperAbdomen", "midAbdomen", "lowerAbdomen"],
  "Bụng & Vùng Chậu": ["midAbdomen", "lowerAbdomen"],
  "lower-abdomen": ["lowerAbdomen"],
  "Bụng dưới": ["lowerAbdomen"],

  // Arms & Hands
  "upper-arm": ["upperArm"],
  "Bắp tay": ["upperArm"],
  "Lưng trên & Vai": ["back", "upperArm"],
  "Cánh tay trái": ["upperArm", "forearm"],
  "Cánh tay phải": ["upperArm", "forearm"],
  "Cánh tay trái (Sau)": ["upperArm", "forearm"],
  "Cánh tay phải (Sau)": ["upperArm", "forearm"],
  forearm: ["forearm"],
  "Cẳng tay": ["forearm"],
  elbow: ["elbow"],
  "Cùi chỏ": ["elbow"],
  hand: ["hand"],
  "Bàn tay": ["hand"],

  // Genitals & Pelvis
  genitals: ["maleSpecificGenitals", "femaleGenitals"],
  "Bộ phận sinh dục": ["maleSpecificGenitals", "femaleGenitals"],
  "Vùng Mông": ["buttocks", "anus"],

  // Lower Limbs
  thigh: ["thigh"],
  "Đùi": ["thigh"],
  "Đùi / Chân trái": ["thigh", "lowerLeg"],
  "Đùi / Chân phải": ["thigh", "lowerLeg"],
  "Bắp chân trái (Sau)": ["lowerLeg"],
  "Bắp chân phải (Sau)": ["lowerLeg"],
  knee: ["knee"],
  "Đầu gối": ["knee"],
  "lower-leg": ["lowerLeg"],
  "Cẳng chân": ["lowerLeg"],
  foot: ["foot"],
  "Bàn chân": ["foot"],

  // Back & Buttocks
  back: ["back"],
  "Lưng": ["back"],
  "Lưng trên": ["back"],
  "lower-back": ["lowerBack"],
  "Thắt lưng": ["lowerBack"],
  "Lưng dưới & Thắt lưng": ["lowerBack"],
  buttocks: ["buttocks"],
  "Mông": ["buttocks"],
  anus: ["anus"],
  "Hậu môn": ["anus"]
};

/**
 * Get all available symptoms for a given body part and gender
 */
export function getSymptomsForBodyPart(
  partIdOrName: string,
  gender: 'male' | 'female' = 'male'
): SymptomItem[] {
  if (!partIdOrName) return [];

  const datasetKeys = PART_KEY_MAPPING[partIdOrName] || [partIdOrName];
  const result: SymptomItem[] = [];
  const addedIds = new Set<string>();

  datasetKeys.forEach((key) => {
    // 1. Common dataset
    const commonData = commonSymptomDataset[key];
    if (commonData && commonData.symptoms) {
      commonData.symptoms.forEach((s) => {
        if (!addedIds.has(s.id)) {
          addedIds.add(s.id);
          result.push({
            id: s.id,
            labelVn: s.labelVn,
            labelEn: s.labelEn,
            categoryNameVn: commonData.nameVn
          });
        }
      });
    }

    // 2. Gender specific dataset
    if (gender === 'male') {
      let maleKey = key;
      if (key === 'head' || partIdOrName.toLowerCase().includes('đầu')) {
        maleKey = 'maleSpecificHead';
      } else if (key === 'genitals' || partIdOrName.toLowerCase().includes('sinh dục')) {
        maleKey = 'maleSpecificGenitals';
      }

      const maleData = maleSymptomDataset[maleKey];
      if (maleData && maleData.symptoms) {
        maleData.symptoms.forEach((s) => {
          if (!addedIds.has(s.id)) {
            addedIds.add(s.id);
            result.push({
              id: s.id,
              labelVn: s.labelVn,
              labelEn: s.labelEn,
              categoryNameVn: maleData.nameVn
            });
          }
        });
      }
    } else if (gender === 'female') {
      let femaleKey = key;
      if (key === 'breast' || partIdOrName.toLowerCase().includes('ngực')) {
        femaleKey = 'breast';
      } else if (key === 'genitals' || partIdOrName.toLowerCase().includes('sinh dục')) {
        femaleKey = 'femaleGenitals';
      }

      const femaleData = femaleSymptomDataset[femaleKey];
      if (femaleData && femaleData.symptoms) {
        femaleData.symptoms.forEach((s) => {
          if (!addedIds.has(s.id)) {
            addedIds.add(s.id);
            result.push({
              id: s.id,
              labelVn: s.labelVn,
              labelEn: s.labelEn,
              categoryNameVn: femaleData.nameVn
            });
          }
        });
      }
    }
  });

  // Fallback: If no exact key match, return general head/chest symptoms
  if (result.length === 0) {
    const fallbackData = commonSymptomDataset.chest || commonSymptomDataset.head;
    if (fallbackData) {
      fallbackData.symptoms.forEach((s) => {
        if (!addedIds.has(s.id)) {
          addedIds.add(s.id);
          result.push({
            id: s.id,
            labelVn: s.labelVn,
            labelEn: s.labelEn,
            categoryNameVn: fallbackData.nameVn
          });
        }
      });
    }
  }

  return result;
}
