import { BodyPartData } from "./commonSymptoms";

export interface FemaleSymptomDataset {
    [key: string]: BodyPartData;
}

export const femaleSymptomDataset: FemaleSymptomDataset = {
    femaleGenitals: {
        id: 14,
        nameEn: "Female Genitals Exclusive",
        nameVn: "Bộ phận sinh dục Nữ",
        symptoms: [
            { id: "s_1810", labelEn: "ulcer on genitalia", labelVn: "Vết loét ở cơ quan sinh dục nữ" },
            { id: "s_7", labelEn: "female sterility", labelVn: "Vô sinh nữ / Hiếm muộn nữ" },
            { id: "s_2520", labelEn: "female pattern baldness", labelVn: "Rụng tóc kiểu hói ở nữ giới" },
            { id: "s_2246", labelEn: "Genital injury in female", labelVn: "Chấn thương cơ quan sinh dục nữ" },
            { id: "s_2110", labelEn: "Dermatological changes, female genital area", labelVn: "Thay đổi cấu trúc da vùng âm hộ/sinh dục nữ" },
            { id: "s_2010", labelEn: "Fetal membranes rupture / Water breaking", labelVn: "Hiện tượng vỡ ối / Rách màng ối thai kỳ" },
            { id: "s_3513", labelEn: "bruise on genital area after trauma", labelVn: "Vết bầm tím hoặc tụ máu vùng âm hộ" },
            { id: "s_3354", labelEn: "Low fetal movement in the third trimester", labelVn: "Thai máy yếu trong 3 tháng cuối thai kỳ" },
            { id: "s_3339", labelEn: "Low fetal movements in the second trimester", labelVn: "Thai máy yếu trong 3 tháng giữa thai kỳ" },
            { id: "s_2905", labelEn: "Fetal membranes rupture / Water breaking, before 22 weeks of gestation", labelVn: "Vỡ ối non trước tuần thứ 22 của thai kỳ" },
            { id: "s_2906", labelEn: "Fetal membranes rupture / Water breaking, after 37 weeks of gestation", labelVn: "Vỡ ối ở thai đủ tháng (từ sau tuần 37)" },
            { id: "s_2125", labelEn: "Fetal membranes rupture / Water breaking with smelly or coloured fluid", labelVn: "Vỡ ối kèm theo dịch ối có màu hoặc mùi hôi (nhiễm trùng ối)" },
            { id: "s_2892", labelEn: "Fetal membranes rupture / waters breaking, between 22 and 37 weeks of gestation", labelVn: "Vỡ ối non từ tuần 22 đến trước tuần 37" }
        ]
    },
    breast: {
        id: 25,
        nameEn: "Breast Exclusive",
        nameVn: "Bầu ngực Nữ",
        symptoms: [
            { id: "s_2060", labelEn: "breasts rash", labelVn: "Phát ban hoặc thương tổn da vùng vú" },
            { id: "s_609", labelEn: "breast hurts", labelVn: "Đau bầu ngực / Đau tuyến vú một bên" },
            { id: "s_300", labelEn: "breast lump", labelVn: "Có khối u hoặc nhân xơ ở vú" },
            { id: "p_281", labelEn: "Breastfeeding", labelVn: "Đang trong giai đoạn nuôi con bằng sữa mẹ" },
            { id: "s_1480", labelEn: "breasts are painful", labelVn: "Đau tức cả hai bên bầu ngực" },
            { id: "s_2484", labelEn: "breast erythema", labelVn: "Hồng ban hoặc sưng đỏ da vú (viêm/áp-xe vú)" },
            { id: "s_2234", labelEn: "breast asymmetry", labelVn: "Hai bên bầu ngực không cân đối bất thường" },
            { id: "s_1422", labelEn: "breast discharge", labelVn: "Tiết dịch bất thường từ núm vú" },
            { id: "s_2096", labelEn: "burning between breasts", labelVn: "Cảm giác nóng rát ở vùng kẽ giữa hai bên ngực" },
            { id: "s_219", labelEn: "breasts have gotten bigger", labelVn: "Phì đại tuyến vú / Bầu ngực to lên rõ rệt" },
            { id: "s_342", labelEn: "pits on breast", labelVn: "Da vùng vú có dấu hiệu sần sùi vỏ cam" },
            { id: "s_547", labelEn: "milky discharge from breasts not related to breastfeeding", labelVn: "Chứng tiết sữa bất thường (khi không nuôi con nhỏ)" },
            { id: "s_3247", labelEn: "Painful breastfeeding", labelVn: "Đau đớn dữ dội khi cho con bú (nứt cổ gà/tắc tia sữa)" },
            { id: "s_3049", labelEn: "pus from breast", labelVn: "Chảy mủ từ núm vú hoặc ổ áp-xe vú" },
            { id: "s_3047", labelEn: "blood from breast / blood leaking from nipple", labelVn: "Chảy máu bất thường từ núm vú" },
            { id: "s_3249", labelEn: "edema of one breast", labelVn: "Phù nề mô mềm khu trú ở một bên bầu ngực" },
            { id: "s_3506", labelEn: "PMS breast tenderness", labelVn: "Căng cứng và đau tức bầu ngực trước kỳ kinh nguyệt" },
            { id: "s_2139", labelEn: "skin changes between breasts", labelVn: "Hăm da hoặc nấm kẽ vùng dưới / giữa hai bầu ngực" },
            { id: "p_585", labelEn: "breast augmentation in the last 4 weeks", labelVn: "Tiền sử phẫu thuật nâng ngực thẩm mỹ trong vòng 4 tuần qua" },
            { id: "s_2622", labelEn: "baby breastfeeds less than usual for at least 12 hours", labelVn: "Trẻ giảm bú mẹ ít hơn bình thường trong ít nhất 12 giờ" },
            { id: "s_3051", labelEn: "watery discharge from breast", labelVn: "Tiết dịch trong như nước từ núm vú" },
            { id: "s_2398", labelEn: "skin wound after breast augmentation", labelVn: "Nhiễm trùng hoặc hở vết mổ phẫu thuật đặt túi ngực" },
            { id: "s_1973", labelEn: "bleeding from breast augmentation wound", labelVn: "Chảy máu hoặc dịch tụ từ vết mổ phẫu thuật nâng ngực" },
            { id: "p_204", labelEn: "greater chance of pregnancy outside the uterus", labelVn: "Nguy cơ cao bị thai ngoài tử cung" }
        ]
    },
    waist: {
        id: 26,
        nameEn: "Waist & Wrist (Female Context)",
        nameVn: "Thắt lưng, Vòng eo và Cổ tay",
        symptoms: [
            { id: "s_277", labelEn: "wider at the waist", labelVn: "Vòng eo phình to bất thường (béo trung tâm hoặc chướng bụng)" },
            { id: "s_1430", labelEn: "Wrist pain", labelVn: "Đau vùng cổ tay" },
            { id: "s_2266", labelEn: "rash on wrists", labelVn: "Phát ban hoặc tổn thương da vùng cổ tay" },
            { id: "s_1636", labelEn: "wrist pain during wrist movement", labelVn: "Đau cổ tay tăng lên khi vận động xoay/gập cổ tay" },
            { id: "s_1619", labelEn: "wrist tenderness", labelVn: "Ấn đau khu trú vùng cổ tay" },
            { id: "s_1431", labelEn: "wrist edema", labelVn: "Phù nề hoặc sưng to mô mềm vùng cổ tay" },
            { id: "s_1910", labelEn: "Wrist drop", labelVn: "Cổ tay rủ (dấu hiệu liệt dây thần kinh quay)" },
            { id: "p_251", labelEn: "Wrist injury", labelVn: "Chấn thương vùng cổ tay" },
            { id: "s_2551", labelEn: "wrist redness", labelVn: "Hồng ban hoặc tấy đỏ da vùng cổ tay" },
            { id: "s_2972", labelEn: "wrist skin burn", labelVn: "Bỏng da khu trú vùng cổ tay" },
            { id: "s_2684", labelEn: "bump on the wrist", labelVn: "Khối u cục hoặc nang dịch vùng cổ tay (Nang bao hoạt dịch)" },
            { id: "s_2692", labelEn: "burn around wrist", labelVn: "Bỏng vòng quanh chu vi cổ tay" },
            { id: "s_2399", labelEn: "wrist cutting wound", labelVn: "Vết thương cắt xẻ sâu vùng cổ tay" },
            { id: "s_2087", labelEn: "deformed wrist after injury", labelVn: "Biến dạng cấu trúc hình thái cổ tay sau chấn thương" },
            { id: "s_2213", labelEn: "intentionally cutting one's own wrist", labelVn: "Hành vi cố ý tự rạch hoặc cắt cổ tay" },
            { id: "s_3513", labelEn: "bruised wrist after trauma", labelVn: "Vết bầm tím hoặc tụ máu vùng cổ tay sau chấn thương" },
            { id: "s_2228", labelEn: "recent intentional wrist-cutting", labelVn: "Có hành vi tự rạch cổ tay xảy ra gần đây" },
            { id: "p_299", labelEn: "fallen on outstretched wrist", labelVn: "Cơ chế chấn thương ngã chống tay (nguy cơ gãy xương thuyền/đầu dưới xương quay)" },
            { id: "s_359", labelEn: "wrist deformation without injury", labelVn: "Biến dạng cấu trúc cổ tay tự phát tiến triển không do chấn thương" },
            { id: "s_2960", labelEn: "severe pain during wrist movement after trauma", labelVn: "Đau đớn dữ dội khi chuyển động cổ tay sau chấn thương cấp tính" }
        ]
    }
};