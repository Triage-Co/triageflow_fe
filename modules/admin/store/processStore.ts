import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ProcessTemplate, CreateTemplateDto, UpdateTemplateDto } from '../types/process.types';
import { processService } from '../services/processService';

export interface ProcessState {
    templates: ProcessTemplate[];
    isLoading: boolean;
    error: string | null;
}

export interface ProcessActions {
    fetchTemplates: (token: string) => Promise<void>;
    createTemplate: (data: CreateTemplateDto, token: string) => Promise<ProcessTemplate>;
    updateTemplate: (id: string, data: UpdateTemplateDto, token: string) => Promise<ProcessTemplate>;
    deleteTemplate: (id: string, token: string) => Promise<void>;
    addOrUpdateTemplate: (template: ProcessTemplate) => void;
    clearError: () => void;
}

type ProcessStore = ProcessState & ProcessActions;

const initialState: ProcessState = {
    templates: [],
    isLoading: false,
    error: null,
};

function getTemplateKey(t: ProcessTemplate): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return String(t.template_id || t.id || (t as any).flow_id || t.name || '');
}

function normalizeTemplate(raw: ProcessTemplate): ProcessTemplate {
    const record = raw as unknown as Record<string, unknown>;
    const rawSteps = (raw.steps || record.template_steps || record.flow_steps || []) as TemplateStep[];

    return {
        ...raw,
        template_id: raw.template_id || (record.id as string | undefined) || raw.id,
        name:
            raw.name ||
            (record.template_name as string | undefined) ||
            (record.flow_name as string | undefined) ||
            (record.title as string | undefined) ||
            'Quy trình chưa đặt tên',
        steps: Array.isArray(rawSteps) ? rawSteps : [],
    };
}

function extractTemplateList(rawData: unknown): ProcessTemplate[] {
    if (Array.isArray(rawData)) {
        return (rawData as ProcessTemplate[]).map(normalizeTemplate);
    }

    if (rawData && typeof rawData === 'object') {
        const record = rawData as Record<string, unknown>;
        if (Array.isArray(record.data)) return (record.data as ProcessTemplate[]).map(normalizeTemplate);
        if (Array.isArray(record.templates)) return (record.templates as ProcessTemplate[]).map(normalizeTemplate);
        if (Array.isArray(record.result)) return (record.result as ProcessTemplate[]).map(normalizeTemplate);
        if (Array.isArray(record.items)) return (record.items as ProcessTemplate[]).map(normalizeTemplate);
        if (record.data && typeof record.data === 'object') {
            return [normalizeTemplate(record.data as ProcessTemplate)];
        }
        return [normalizeTemplate(record as ProcessTemplate)];
    }

    return [];
}

function mergeTemplates(currentTemplates: ProcessTemplate[], incomingTemplates: ProcessTemplate[]): ProcessTemplate[] {
    const mergedMap = new Map<string, ProcessTemplate>();

    currentTemplates.forEach((t) => {
        const key = getTemplateKey(t);
        if (key) mergedMap.set(key.toLowerCase(), t);
    });

    incomingTemplates.forEach((t) => {
        const key = getTemplateKey(t);
        if (key) mergedMap.set(key.toLowerCase(), t);
    });

    return Array.from(mergedMap.values());
}

export const useProcessStore = create<ProcessStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            fetchTemplates: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchTemplates/pending');
                try {
                    const res = await processService.getTemplates(token);
                    const fetchedList = extractTemplateList(res.data);

                    const currentTemplates = get().templates;
                    const finalTemplates = mergeTemplates(currentTemplates, fetchedList);
                    set({ templates: finalTemplates, isLoading: false }, false, 'fetchTemplates/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách quy trình khám bệnh.',
                        isLoading: false,
                    }, false, 'fetchTemplates/failure');
                }
            },

            createTemplate: async (data: CreateTemplateDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'createTemplate/pending');
                try {
                    const res = await processService.createTemplate(data, token);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rawObj = res.data as any;
                    const candidate: ProcessTemplate = (rawObj && typeof rawObj === 'object' && rawObj.data)
                        ? rawObj.data
                        : (rawObj && typeof rawObj === 'object' ? rawObj : { name: data.name, steps: data.steps });
                    const newTemplate = normalizeTemplate(candidate);

                    if (!newTemplate.name) newTemplate.name = data.name;
                    if (!newTemplate.steps || newTemplate.steps.length === 0) newTemplate.steps = data.steps;

                    const currentTemplates = get().templates;
                    const newKey = getTemplateKey(newTemplate).toLowerCase();

                    // Prepend new template to list immediately
                    const updatedList = [
                        newTemplate,
                        ...currentTemplates.filter((t) => getTemplateKey(t).toLowerCase() !== newKey),
                    ];

                    set({ templates: updatedList, isLoading: false }, false, 'createTemplate/success');

                    // Non-blocking background sync
                    processService.getTemplates(token).then((r) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const fetched = (r.data as any)?.data || r.data;
                        if (Array.isArray(fetched)) {
                            const map = new Map<string, ProcessTemplate>();
                            [newTemplate, ...fetched, ...get().templates].forEach((t) => {
                                const k = getTemplateKey(t).toLowerCase();
                                if (k && !map.has(k)) map.set(k, t);
                            });
                            set({ templates: Array.from(map.values()) });
                        }
                    }).catch(() => { });

                    return newTemplate;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tạo quy trình mới.',
                        isLoading: false,
                    }, false, 'createTemplate/failure');
                    throw err;
                }
            },

            updateTemplate: async (id: string, data: UpdateTemplateDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'updateTemplate/pending');
                try {
                    const res = await processService.updateTemplate(id, data, token);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rawObj = res.data as any;
                    const updatedTemplate = normalizeTemplate(
                        (rawObj && typeof rawObj === 'object' && rawObj.data) ? rawObj.data : rawObj
                    );

                    const current = get().templates;
                    const updatedList = current.map((t) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const templateId = t.template_id || t.id || (t as any).flow_id;
                        return templateId === id ? { ...t, ...data, ...updatedTemplate } : t;
                    });

                    set({ templates: updatedList, isLoading: false }, false, 'updateTemplate/success');
                    return updatedTemplate;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể cập nhật quy trình.',
                        isLoading: false,
                    }, false, 'updateTemplate/failure');
                    throw err;
                }
            },

            deleteTemplate: async (id: string, token: string) => {
                set({ isLoading: true, error: null }, false, 'deleteTemplate/pending');
                try {
                    await processService.deleteTemplate(id, token);
                    const updatedList = get().templates.filter((t) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const templateId = t.template_id || t.id || (t as any).flow_id;
                        return templateId !== id;
                    });
                    set({ templates: updatedList, isLoading: false }, false, 'deleteTemplate/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể xóa quy trình.',
                        isLoading: false,
                    }, false, 'deleteTemplate/failure');
                    throw err;
                }
            },

            addOrUpdateTemplate: (template: ProcessTemplate) => {
                const normalized = normalizeTemplate(template);
                const current = get().templates;
                const key = getTemplateKey(normalized).toLowerCase();
                if (!key) return;
                const map = new Map<string, ProcessTemplate>();
                map.set(key, normalized);
                current.forEach((t) => {
                    const k = getTemplateKey(t).toLowerCase();
                    if (k && !map.has(k)) map.set(k, t);
                });
                set({ templates: Array.from(map.values()) });
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'ProcessStore' }
    )
);
