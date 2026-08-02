import { BodyPartData } from "./commonSymptoms";

export interface MaleSymptomDataset {
    [key: string]: BodyPartData;
}

export const maleSymptomDataset: MaleSymptomDataset = {
    maleSpecificHead: {
        id: 1,
        nameEn: "Male Head Specific",
        nameVn: "Đầu (Đặc hữu Nam)",
        symptoms: [
            { id: "s_60", labelEn: "head of penis hurts", labelVn: "Đau quy đầu dương vật" },
            { id: "s_433", labelEn: "penile head redness", labelVn: "Đỏ quy đầu dương vật" },
            { id: "s_369", labelEn: "pus from the head of penis", labelVn: "Chảy mủ từ quy đầu dương vật" },
            { id: "s_2207", labelEn: "edematous head of penis", labelVn: "Phù nề quy đầu dương vật" },
            { id: "s_2206", labelEn: "Foreskin trapped behind the head of the penis", labelVn: "Nghẹt bao quy đầu (Paraphimosis)" },
            { id: "s_263", labelEn: "can't pull foreskin back to expose the penis head", labelVn: "Hẹp bao quy đầu không lộn được (Phimosis)" }
        ]
    },
    maleSpecificGenitals: {
        id: 14,
        nameEn: "Male Genitals Specific",
        nameVn: "Bộ phận sinh dục Nam",
        symptoms: [
            { id: "s_2043", labelEn: "Itching in the male genitals", labelVn: "Ngứa cơ quan sinh dục nam" },
            { id: "s_2245", labelEn: "Genital injury in male", labelVn: "Chấn thương cơ quan sinh dục ngoài ở nam giới" },
            { id: "s_2111", labelEn: "Dermatological changes, male genital area / lesion on penis", labelVn: "Thay đổi cấu trúc da hoặc tổn thương khu trú trên dương vật" },
            { id: "s_2052", labelEn: "male sterility", labelVn: "Vô sinh nam / Hiếm muộn nam" },
            { id: "s_2336", labelEn: "lactating in a male", labelVn: "Chứng tiết sữa ở nam giới (bất thường nội tiết)" },
            { id: "s_586", labelEn: "enlarged male breast / Breast enlargement in man", labelVn: "Phì đại tuyến vú ở nam giới (Gynecomastia)" },
            { id: "p_443", labelEn: "uncircumcised male", labelVn: "Nam giới chưa cắt bao quy đầu" },
            { id: "s_3220", labelEn: "premature orgasm - male", labelVn: "Xuất tinh sớm ở nam giới (Premature ejaculation)" },
            { id: "s_369", labelEn: "Discharge from male urethra", labelVn: "Tiết dịch đường niệu đạo nam" }
        ]
    }
};