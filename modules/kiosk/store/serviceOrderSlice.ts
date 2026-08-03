import { StateCreator } from 'zustand';
import { ServiceOrder, TransactionQrResult } from '../types/flow.types';
import { FlowStoreState } from './flowStore';
import { flowService } from '../services/flowService';

export interface ServiceOrderSlice {
  pendingServiceOrders: ServiceOrder[];
  isFetchingServiceOrders: boolean;
  activeTransactionQr: TransactionQrResult | null;

  fetchPendingServiceOrders: (patientId: string) => Promise<void>;
  clearTransactionQr: () => void;
}

export const createServiceOrderSlice: StateCreator<
  FlowStoreState,
  [],
  [],
  ServiceOrderSlice
> = (set) => ({
  pendingServiceOrders: [],
  isFetchingServiceOrders: false,
  activeTransactionQr: null,

  fetchPendingServiceOrders: async (patientId) => {
    set({ isFetchingServiceOrders: true });
    try {
      const soRes = await flowService.getPendingServiceOrders(patientId);
      const soData = (soRes as any)?.data || soRes;

      set({
        pendingServiceOrders: Array.isArray(soData) ? soData : [],
      });
    } catch (error) {
      console.error('Error fetching pending service orders:', error);
      set({ pendingServiceOrders: [] });
    } finally {
      set({ isFetchingServiceOrders: false });
    }
  },

  clearTransactionQr: () => set({ activeTransactionQr: null }),
});
