import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ProcessTemplate, CreateTemplateDto, UpdateTemplateDto, TemplateStep } from '../types/process.types';
import { normalizeRoomType, normalizeStepType } from '../types/process.types';
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

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) return value;
    }
    return undefined;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return fallback;
}

function normalizeTemplateSteps(rawSteps: unknown, _parentTemplateId?: string): TemplateStep[] {
    if (!Array.isArray(rawSteps)) return [];

    const normalized = rawSteps.map((rawStep, index) => {
        const record = (rawStep && typeof rawStep === 'object' ? rawStep : {}) as Record<string, unknown>;
        // BE TemplateStepDto.template_id is the step key (example: "step_1")
        const stepKey =
            pickString(record, ['template_id', 'templateId', 'template_step_id', 'step_id']) ||
            `step_${index + 1}`;
        const stepName = pickString(record, ['step_name', 'name', 'label']) || `Bước ${index + 1}`;
        const roomType = normalizeRoomType(pickString(record, ['room_type', 'roomType']));
        const stepType = normalizeStepType(pickString(record, ['step_type', 'stepType']), roomType);

        return {
            template_id: stepKey,
            template_step_id: stepKey,
            step_name: stepName,
            room_type: roomType,
            step_type: stepType,
            service_code: pickString(record, ['service_code', 'serviceCode']) || roomType,
            requires_payment: toBoolean(record.requires_payment ?? record.requiresPayment, false),
            depends_on: toStringArray(record.depends_on ?? record.dependsOn),
            sub_steps: toStringArray(record.sub_steps ?? record.subSteps),
        } satisfies TemplateStep;
    });

    const validIds = new Set(normalized.map((step) => step.template_id));
    return normalized.map((step) => ({
        ...step,
        depends_on: Array.from(new Set(step.depends_on)).filter(
            (depId) => depId !== step.template_id && validIds.has(depId)
        ),
    }));
}

function getTemplateKey(t: ProcessTemplate): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return String(t.template_id || t.id || (t as any).flow_id || t.name || '');
}

function normalizeTemplate(raw: unknown): ProcessTemplate {
    const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const templateId =
        (record.template_id as string | undefined) ||
        (record.id as string | undefined) ||
        (record.flow_id as string | undefined);
    const rawSteps = (record.steps || record.template_steps || record.flow_steps || []) as unknown;
    const normalizedSteps = normalizeTemplateSteps(rawSteps, templateId);

    return {
        ...(record as Partial<ProcessTemplate>),
        template_id: templateId,
        id: (record.id as string | undefined) || (record.template_id as string | undefined),
        name:
            (record.name as string | undefined) ||
            (record.template_name as string | undefined) ||
            (record.flow_name as string | undefined) ||
            (record.title as string | undefined) ||
            'Quy trình chưa đặt tên',
        steps: normalizedSteps,
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
        return [normalizeTemplate(record)];
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
                    // TemplateStepDto requires template_id (step key); forbids template_step_id
                    const sanitized: CreateTemplateDto = {
                        name: data.name,
                        steps: (data.steps || []).map((step, idx) => {
                            const { template_step_id: _uiOnly, ...rest } = step as TemplateStep;
                            const stepKey =
                                String(rest.template_id || _uiOnly || '').trim() || `step_${idx + 1}`;
                            return {
                                ...rest,
                                template_id: stepKey,
                                depends_on: Array.isArray(rest.depends_on) ? rest.depends_on : [],
                                sub_steps: Array.isArray(rest.sub_steps) ? rest.sub_steps : [],
                            };
                        }),
                    };
                    const res = await processService.createTemplate(sanitized, token);
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
                                const normalizedTemplate = normalizeTemplate(t);
                                const k = getTemplateKey(normalizedTemplate).toLowerCase();
                                if (k && !map.has(k)) map.set(k, normalizedTemplate);
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
                    const sanitized: UpdateTemplateDto = {
                        ...data,
                        steps: data.steps
                            ? data.steps.map((step, idx) => {
                                  const { template_step_id: _uiOnly, ...rest } = step as TemplateStep;
                                  const stepKey =
                                      String(rest.template_id || _uiOnly || '').trim() ||
                                      `step_${idx + 1}`;
                                  return {
                                      ...rest,
                                      template_id: stepKey,
                                      depends_on: Array.isArray(rest.depends_on)
                                          ? rest.depends_on
                                          : [],
                                      sub_steps: Array.isArray(rest.sub_steps) ? rest.sub_steps : [],
                                  };
                              })
                            : undefined,
                    };
                    const res = await processService.updateTemplate(id, sanitized, token);
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
