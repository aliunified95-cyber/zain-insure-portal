
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QuoteRequest, QuoteStatus, InsuranceType, CustomerType, QuoteAssignment, AssignmentStatus, AssignmentHistoryEntry, RejectionReason } from '../types';

interface QuoteState {
  currentQuote: Partial<QuoteRequest>;
  updateQuote: (data: Partial<QuoteRequest>) => void;
  resetQuote: () => void;
  setQuoteFromExisting: (quote: QuoteRequest) => void;
  assignQuote: (quoteId: string, assignment: QuoteAssignment) => void;
  claimQuote: (quoteId: string, agentId: string, agentName: string) => void;
  rejectQuote: (quoteId: string, agentId: string, agentName: string, reason: RejectionReason, note?: string) => void;
}

const initialState: Partial<QuoteRequest> = {
  insuranceType: InsuranceType.MOTOR,
  status: QuoteStatus.DRAFT,
  riskFactors: { ageUnder24: false, licenseUnder1Year: false },
  vehicle: { plateNumber: '', chassisNumber: '', make: '', model: '', year: new Date().getFullYear().toString(), value: 0 },
  customer: {
    cpr: '', fullName: '', mobile: '', email: '', type: CustomerType.NEW,
    isEligibleForZain: true, isEligibleForInstallments: false, creditScore: 0, activeLines: []
  }
};

export const useQuoteStore = create<QuoteState>()(
  persist(
    (set) => ({
      currentQuote: initialState,
      updateQuote: (data) => set((state) => ({ 
        currentQuote: { ...state.currentQuote, ...data } 
      })),
      setQuoteFromExisting: (quote) => set({ currentQuote: quote }),
      resetQuote: () => set({ currentQuote: initialState }),
      
      assignQuote: (quoteId: string, assignment: QuoteAssignment) => set((state) => {
        if (state.currentQuote.id === quoteId) {
          const historyEntry: AssignmentHistoryEntry = {
            id: `hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'ASSIGNED',
            performedBy: assignment.assignedByAgentId,
            performedByName: assignment.assignedByAgentName,
            details: `Assigned to ${assignment.assignedToAgentName}`
          };
          
          return {
            currentQuote: {
              ...state.currentQuote,
              assignment,
              assignmentHistory: [...(state.currentQuote.assignmentHistory || []), historyEntry]
            }
          };
        }
        return state;
      }),
      
      claimQuote: (quoteId: string, agentId: string, agentName: string) => set((state) => {
        if (state.currentQuote.id === quoteId && state.currentQuote.assignment) {
          const historyEntry: AssignmentHistoryEntry = {
            id: `hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CLAIMED',
            performedBy: agentId,
            performedByName: agentName,
            details: 'Quote claimed by agent'
          };
          
          return {
            currentQuote: {
              ...state.currentQuote,
              assignment: {
                ...state.currentQuote.assignment,
                status: AssignmentStatus.CLAIMED,
                claimedAt: new Date().toISOString()
              },
              assignmentHistory: [...(state.currentQuote.assignmentHistory || []), historyEntry]
            }
          };
        }
        return state;
      }),
      
      rejectQuote: (quoteId: string, agentId: string, agentName: string, reason: RejectionReason, note?: string) => set((state) => {
        if (state.currentQuote.id === quoteId && state.currentQuote.assignment) {
          const historyEntry: AssignmentHistoryEntry = {
            id: `hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'REJECTED',
            performedBy: agentId,
            performedByName: agentName,
            details: `Quote rejected: ${reason}${note ? ' - ' + note : ''}`
          };
          
          return {
            currentQuote: {
              ...state.currentQuote,
              assignment: {
                ...state.currentQuote.assignment,
                status: AssignmentStatus.REJECTED,
                rejectionReason: reason,
                rejectionNote: note,
                rejectedAt: new Date().toISOString()
              },
              assignmentHistory: [...(state.currentQuote.assignmentHistory || []), historyEntry]
            }
          };
        }
        return state;
      })
    }),
    {
      name: 'zain-quote-storage', // name of the item in the storage (must be unique)
    }
  )
);
