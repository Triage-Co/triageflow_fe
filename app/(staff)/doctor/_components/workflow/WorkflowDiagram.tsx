'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { asRecord, getRoomTypeValue, pickLiveRequiredStepId } from '@/modules/clinical/workflow/flowPickers';
import { pickServiceCodeByContext } from '@/modules/clinical/workflow/draftBuilder';
import { buildDynamicSteps } from '@/modules/clinical/workflow/nodeMap';
import { normalizeStepStatusForApi } from '@/modules/clinical/workflow/stepIdentity';
import type { DraftStep, FlowNode, WorkflowDiagramProps } from '@/modules/clinical/workflow/types';
import { useWorkflowCatalog } from '@/modules/clinical/hooks/useWorkflowCatalog';
import { useWorkflowFlow } from '@/modules/clinical/hooks/useWorkflowFlow';
import { useWorkflowMutations } from '@/modules/clinical/hooks/useWorkflowMutations';
import { WorkflowTimeline } from './WorkflowTimeline';
import { SelectTemplateDialog } from './SelectTemplateDialog';
import { ConfigureDraftDialog } from './ConfigureDraftDialog';
import { CustomizeFlowDialog } from './CustomizeFlowDialog';
import { StepDetailDialog } from './StepDetailDialog';

export function WorkflowDiagram({
    patientId,
    patient,
    refreshKey = 0,
    onFlowResolved,
    onFlowChanged,
}: WorkflowDiagramProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);

    const currentRole = (authUser?.role || authProfile?.role || '')
        .toUpperCase()
        .replace(/^ROLE_/, '');
    const isDoctorRole = currentRole === 'DOCTOR';

    const catalog = useWorkflowCatalog({
        accessToken,
        isDoctorRole,
        userId: authUser?.id,
        userEmail: authUser?.email,
        profileAccountId: authProfile?.account_id,
        profileEmail: authProfile?.email,
    });

    const flow = useWorkflowFlow({
        accessToken,
        patientId,
        patient,
        refreshKey,
        onFlowResolved,
    });

    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
    const [isConfiguringDraft, setIsConfiguringDraft] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingSpecialtyId, setEditingSpecialtyId] = useState('');
    const [editingRoomId, setEditingRoomId] = useState('');
    const [editingStaffId, setEditingStaffId] = useState('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [selectedServiceCode, setSelectedServiceCode] = useState('');
    const [selectedDraftServiceCode, setSelectedDraftServiceCode] = useState('');
    const [editingStepStatus, setEditingStepStatus] = useState('');
    const [editingRequiredStepId, setEditingRequiredStepId] = useState('');
    const [editingOldRequiredStepId, setEditingOldRequiredStepId] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedStepNode, setSelectedStepNode] = useState<FlowNode | null>(null);

    useEffect(() => {
        if (catalog.serviceOptions.length === 0) return;
        setSelectedServiceCode((prev) => prev || catalog.serviceOptions[0].service_code);
        setSelectedDraftServiceCode((prev) => prev || catalog.serviceOptions[0].service_code);
    }, [catalog.serviceOptions]);

    const closeStepDetail = () => {
        setSelectedStepNode(null);
        setEditingStepId(null);
        setEditingSpecialtyId('');
        setEditingRoomId('');
        setEditingStaffId('');
        setEditingStepStatus('');
        setEditingRequiredStepId('');
        setEditingOldRequiredStepId('');
    };

    const mutations = useWorkflowMutations({
        accessToken,
        patient,
        flowData: flow.flowData,
        orderedFlowSteps: flow.orderedFlowSteps,
        rooms: catalog.rooms,
        serviceOptions: catalog.serviceOptions,
        templates: flow.templates,
        draftSteps,
        selectedTemplateId,
        selectedSpecialtyId,
        selectedRoomId,
        selectedStaffId,
        selectedServiceCode,
        selectedDraftServiceCode,
        editingRoomId,
        editingStaffId,
        editingStepStatus,
        editingRequiredStepId,
        editingOldRequiredStepId,
        pickDoctorOnDutyForRoom: catalog.pickDoctorOnDutyForRoom,
        getStaffOnDutyForRoom: catalog.getStaffOnDutyForRoom,
        canCurrentDoctorEditStepStatus: catalog.canCurrentDoctorEditStepStatus,
        reloadFlow: flow.reloadFlow,
        setPendingOrders: flow.setPendingOrders,
        setError: flow.setError,
        setDraftSteps,
        setSelectedTemplateId,
        setSelectedSpecialtyId,
        setSelectedRoomId,
        setSelectedStaffId,
        setSelectedServiceCode,
        setSelectedDraftServiceCode,
        setIsConfiguringDraft,
        setIsAssigning,
        setIsActionLoading,
        closeStepDetail,
        onFlowChanged,
    });

    const dynamicSteps = useMemo(
        () =>
            buildDynamicSteps({
                selectedTemplateId,
                draftSteps,
                hasLiveSteps: flow.hasLiveSteps,
                orderedFlowSteps: flow.orderedFlowSteps,
                pendingOrders: flow.pendingOrders,
                rooms: catalog.rooms,
                isPatientDone: patient?.status === 'Đã khám',
                getStaffOnDutyForRoom: catalog.getStaffOnDutyForRoom,
                resolveLiveStepStaff: catalog.resolveLiveStepStaff,
            }),
        [
            selectedTemplateId,
            draftSteps,
            flow.hasLiveSteps,
            flow.orderedFlowSteps,
            flow.pendingOrders,
            catalog.rooms,
            catalog.getStaffOnDutyForRoom,
            catalog.resolveLiveStepStaff,
            patient?.status,
        ]
    );

    const openStepDetail = (stepId: string, fallbackNode?: FlowNode) => {
        const liveStep = flow.orderedFlowSteps
            .map((item) => asRecord(item))
            .find((s) => s && String(s.step_id || '') === stepId);
        const node = dynamicSteps.find((n) => n.id === stepId) || fallbackNode || null;
        if (!liveStep && !node) return;

        const roomInfo = (liveStep?.room_info as Record<string, unknown> | undefined) || undefined;
        const specialtyInfo =
            (liveStep?.specialty_info as Record<string, unknown> | undefined) || undefined;
        const currentRoomId =
            (typeof roomInfo?.room_id === 'string' && roomInfo.room_id) ||
            (typeof liveStep?.room_id === 'string' && liveStep.room_id) ||
            node?.detail?.roomId ||
            '';
        const currentRoom = catalog.rooms.find((r) => r.room_id === currentRoomId);
        const currentSpecialtyId =
            currentRoom?.specialty_id ||
            (typeof roomInfo?.specialty_id === 'string' && roomInfo.specialty_id) ||
            (typeof specialtyInfo?.specialty_id === 'string' && specialtyInfo.specialty_id) ||
            '';
        const stepStatus = normalizeStepStatusForApi(
            (typeof liveStep?.step_status === 'string' && liveStep.step_status) ||
                node?.detail?.stepStatus ||
                ''
        );
        const currentRequired = liveStep ? pickLiveRequiredStepId(liveStep) : '';

        setEditingStepId(stepId);
        setEditingSpecialtyId(currentSpecialtyId);
        setEditingRoomId(currentRoomId);
        setEditingStaffId(catalog.pickDoctorOnDutyForRoom(currentRoomId));
        setEditingStepStatus(stepStatus);
        setEditingRequiredStepId(currentRequired);
        setEditingOldRequiredStepId(currentRequired);
        setSelectedStepNode(
            node || {
                id: stepId,
                Icon: Stethoscope,
                label:
                    (typeof liveStep?.step_name === 'string' && liveStep.step_name) ||
                    'Bước quy trình',
                status: 'pending',
                roomName:
                    (typeof roomInfo?.room_name === 'string' && roomInfo.room_name) || undefined,
                staffName: undefined,
                detail: {
                    source: 'live',
                    stepStatus,
                    roomId: currentRoomId || undefined,
                },
            }
        );
    };

    const handleEditingRoomChange = (roomId: string) => {
        setEditingRoomId(roomId);
        setEditingStaffId(catalog.pickDoctorOnDutyForRoom(roomId));
    };

    const handleSelectedSpecialtyChange = (specialtyId: string) => {
        setSelectedSpecialtyId(specialtyId);
        setSelectedRoomId('');
        setSelectedStaffId('');
        setSelectedServiceCode('');
        setSelectedDraftServiceCode('');
    };

    const handleSelectedRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        setSelectedStaffId(catalog.pickDoctorOnDutyForRoom(roomId));

        const room = catalog.rooms.find((r) => r.room_id === roomId);
        const defaultServiceCode = pickServiceCodeByContext(
            {
                roomType: getRoomTypeValue(room),
                roomName: room?.room_name,
                specialtyName: room?.specialty?.specialty_name,
            },
            catalog.serviceOptions
        );
        if (defaultServiceCode) {
            setSelectedServiceCode(defaultServiceCode);
            setSelectedDraftServiceCode(defaultServiceCode);
        }
    };

    const activeTemplateId =
        selectedTemplateId ||
        (flow.flowData?.template_id as string) ||
        (patient?.templateId as string) ||
        '';

    if (flow.isLoading) {
        return (
            <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center min-h-[350px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                <p className="text-xs font-semibold text-neutral-500 mt-3">Đang tải quy trình...</p>
            </div>
        );
    }

    if (flow.error) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-[24px] p-5 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700">
                    <p>{flow.error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <WorkflowTimeline
                dynamicSteps={dynamicSteps}
                hasLiveSteps={flow.hasLiveSteps}
                selectedTemplateId={selectedTemplateId}
                draftSteps={draftSteps}
                onAddTemplate={() => setIsSelectingTemplate(true)}
                onOpenStep={openStepDetail}
                onConfigureDraft={() => {
                    setIsConfiguringDraft(true);
                    setSelectedSpecialtyId('');
                    setSelectedRoomId('');
                    setSelectedStaffId('');
                }}
                onCancelDraft={() => {
                    setSelectedTemplateId('');
                    setDraftSteps([]);
                }}
                onCustomize={() => {
                    setIsCustomizing(true);
                    setEditingStepId(null);
                    setEditingRequiredStepId('');
                    setEditingOldRequiredStepId('');
                    setEditingSpecialtyId('');
                    setSelectedSpecialtyId('');
                    setSelectedRoomId('');
                    setSelectedStaffId('');
                }}
            />

            <CustomizeFlowDialog
                open={isCustomizing}
                orderedFlowSteps={flow.orderedFlowSteps}
                dynamicSteps={dynamicSteps}
                unlabeledPaymentStepIds={flow.unlabeledPaymentStepIds}
                specialties={catalog.specialties}
                serviceOptions={catalog.serviceOptions}
                isLoadingServices={catalog.isLoadingServices}
                isActionLoading={isActionLoading}
                selectedSpecialtyId={selectedSpecialtyId}
                selectedRoomId={selectedRoomId}
                selectedServiceCode={selectedServiceCode}
                getRoomsBySpecialty={catalog.getRoomsBySpecialty}
                onOpenChange={setIsCustomizing}
                onOpenStep={openStepDetail}
                onSpecialtyChange={handleSelectedSpecialtyChange}
                onRoomChange={handleSelectedRoomChange}
                onServiceCodeChange={setSelectedServiceCode}
                onAddStep={() => void mutations.handleAddStep()}
            />

            <ConfigureDraftDialog
                open={isConfiguringDraft}
                draftSteps={draftSteps}
                specialties={catalog.specialties}
                serviceOptions={catalog.serviceOptions}
                isLoadingServices={catalog.isLoadingServices}
                isAssigning={isAssigning}
                selectedSpecialtyId={selectedSpecialtyId}
                selectedRoomId={selectedRoomId}
                selectedDraftServiceCode={selectedDraftServiceCode}
                getRoomsBySpecialty={catalog.getRoomsBySpecialty}
                getStaffOnDutyForRoom={catalog.getStaffOnDutyForRoom}
                pickDoctorOnDutyForRoom={catalog.pickDoctorOnDutyForRoom}
                onOpenChange={setIsConfiguringDraft}
                onSpecialtyChange={handleSelectedSpecialtyChange}
                onRoomChange={handleSelectedRoomChange}
                onDraftServiceCodeChange={setSelectedDraftServiceCode}
                onUpdateDraftStep={mutations.handleUpdateDraftStep}
                onAddDraftStep={mutations.addDraftStepFromSelection}
                onCommit={() => void mutations.handleCommitDraft()}
            />

            <SelectTemplateDialog
                open={isSelectingTemplate}
                templates={flow.templates}
                activeTemplateId={activeTemplateId}
                onOpenChange={setIsSelectingTemplate}
                onSelect={mutations.handleSelectTemplateDraft}
            />

            <StepDetailDialog
                selectedStepNode={selectedStepNode}
                editingStepId={editingStepId}
                orderedFlowSteps={flow.orderedFlowSteps}
                rooms={catalog.rooms}
                editingRoomId={editingRoomId}
                editingStaffId={editingStaffId}
                editingSpecialtyId={editingSpecialtyId}
                editingStepStatus={editingStepStatus}
                isActionLoading={isActionLoading}
                getRoomsBySpecialty={catalog.getRoomsBySpecialty}
                canCurrentDoctorEditStepStatus={catalog.canCurrentDoctorEditStepStatus}
                resolveStaffNameById={catalog.resolveStaffNameById}
                getStaffOnDutyForRoom={catalog.getStaffOnDutyForRoom}
                onClose={closeStepDetail}
                onRoomChange={handleEditingRoomChange}
                onSpecialtyIdChange={setEditingSpecialtyId}
                onStatusChange={setEditingStepStatus}
                onSave={(stepId) => void mutations.handleUpdateStep(stepId)}
                onDelete={(stepId) => void mutations.handleCancelStep(stepId)}
            />
        </>
    );
}
