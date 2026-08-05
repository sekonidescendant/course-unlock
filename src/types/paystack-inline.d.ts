declare module "@paystack/inline-js" {
  export interface PaystackTransaction {
    reference: string;
    status?: string;
    trans?: string;
    transaction?: string;
  }

  export interface ResumeTransactionCallbacks {
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: unknown) => void;
    onLoad?: (response: unknown) => void;
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: ResumeTransactionCallbacks): void;
    cancelTransaction(id: string): void;
  }
}
