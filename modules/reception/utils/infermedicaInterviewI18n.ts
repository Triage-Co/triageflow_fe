import type {

    InfermedicaQuestion,

    InfermedicaQuestionItem,

} from '@/modules/reception/types/infermedica.types';



export type InfermedicaQuestionType = 'single' | 'group_single' | 'group_multiple' | 'duration' | string;



/** Giữ nguyên câu hỏi/lựa chọn tiếng Anh từ Infermedica. */

export function localizeInfermedicaQuestion(question: InfermedicaQuestion): InfermedicaQuestion {

    if (question.text?.trim()) return question;



    const fallbackText = question.items[0]?.name?.trim();

    if (!fallbackText) return question;



    return { ...question, text: fallbackText };

}



export function getQuestionType(question: InfermedicaQuestion): InfermedicaQuestionType {

    return question.type || 'single';

}



export function isGroupSingleQuestion(question: InfermedicaQuestion): boolean {

    return getQuestionType(question) === 'group_single';

}



export function isGroupMultipleQuestion(question: InfermedicaQuestion): boolean {

    return getQuestionType(question) === 'group_multiple';

}



export function getActiveQuestionItem(

    question: InfermedicaQuestion,

    itemIndex: number,

): InfermedicaQuestionItem | null {

    return question.items[itemIndex] ?? question.items[0] ?? null;

}



/** Nhãn nút cho group_single — hiển thị tên mức/đáp án, không phải Yes/No. */

export function getGroupSingleOptionLabel(item: InfermedicaQuestionItem): string {

    return item.name?.trim() || item.id;

}



const CHOICE_LABEL_VI: Record<string, string> = {

    present: 'Có',

    absent: 'Không',

    unknown: 'Không rõ',

    Yes: 'Có',

    No: 'Không',

    "Don't know": 'Không rõ',

};



export function getChoiceButtonLabel(choiceId: string, choiceLabel: string): string {

    return CHOICE_LABEL_VI[choiceLabel] ?? CHOICE_LABEL_VI[choiceId] ?? choiceLabel;

}

