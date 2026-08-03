import { create } from 'zustand';
import { TicketData, PaymentBill, PaymentMethod, RouteStepItem } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { PendingPaymentStep, ServiceOrder, TransactionQrResult } from '../types/flow.types';

import { TicketSlice, createTicketSlice } from './ticketSlice';
import { BillPaymentSlice, createBillPaymentSlice } from './billPaymentSlice';
import { ServiceOrderSlice, createServiceOrderSlice } from './serviceOrderSlice';

export interface FlowStoreState extends TicketSlice, BillPaymentSlice, ServiceOrderSlice {
  resetFlow: () => void;
}

const initialState = {
  activeStepId: null,
  activeBookingId: null,
  paymentQrData: null,
  paymentMethod: null,
  activeBill: null,
  activeTicket: null,
  routeSteps: [],
  isPaymentChecking: false,
  pendingPaymentSteps: [],
  isFetchingPendingSteps: false,
  selectedPendingStep: null,
  pendingServiceOrders: [],
  isFetchingServiceOrders: false,
  activeTransactionQr: null,
};

export const useFlowStore = create<FlowStoreState>((set, get, store) => ({
  ...createTicketSlice(set, get, store),
  ...createBillPaymentSlice(set, get, store),
  ...createServiceOrderSlice(set, get, store),

  resetFlow: () => {
    set(initialState);
  },
}));
