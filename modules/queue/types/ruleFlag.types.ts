/** Manual priority flags staff can attach (not PIN_TOP / AGING / REBALANCE). */
export const FLAGGABLE_RULE_TYPES = [
    'PATIENT_CATEGORY',
    'QUICK_TASK',
    'RETURNING',
    'TRANSFER',
] as const;

export type FlaggableRuleType = (typeof FLAGGABLE_RULE_TYPES)[number];

export interface FlaggableRule {
    rule_code: string;
    name: string;
    rule_type: string;
    weight: number;
}

export interface ManualRulesBody {
    manual_rule_codes: string[];
}
