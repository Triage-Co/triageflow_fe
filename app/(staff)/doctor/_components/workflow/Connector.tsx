'use client';

import { cn } from '@/lib/utils';
import type { WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import { nodeStyles } from '@/modules/clinical/workflow/nodeMap';

export function Connector({
    status,
    compact,
}: {
    status: WorkflowStepStatus;
    compact?: boolean;
}) {
    const styles = nodeStyles(status);
    return (
        <div
            className={cn(
                'mx-auto rounded-full',
                compact ? 'w-px h-3.5' : 'w-0.5 h-6',
                styles.line
            )}
        />
    );
}
