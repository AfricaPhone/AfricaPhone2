export type CustomerOrderCollection =
  | 'orders'
  | 'orderPayments'
  | 'installmentPlans'
  | 'customerDocuments'
  | 'customerNotifications';

export type CustomerPaymentMode = 'pay_on_delivery' | 'kkiapay_now' | 'shop_confirmation' | 'installment_plan';

export type CustomerFulfillmentMode = 'delivery' | 'shop_pickup' | 'representative_pickup';

export type CustomerOrderStatus =
  | 'draft'
  | 'pending_review'
  | 'profile_required'
  | 'payment_pending'
  | 'paid'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type CustomerPaymentStatus =
  | 'not_required'
  | 'pending'
  | 'provider_opened'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type InstallmentPlanStatus =
  | 'draft'
  | 'documents_required'
  | 'contract_review'
  | 'active'
  | 'late'
  | 'completed'
  | 'cancelled';

export type CustomerDocumentType =
  | 'profile_photo'
  | 'identity_card'
  | 'signed_contract'
  | 'representative_identity_card';

export type CustomerDocumentStatus = 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired';

export type CustomerNotificationType =
  | 'order_created'
  | 'profile_required'
  | 'payment_required'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'documents_required'
  | 'contract_review'
  | 'ready_for_pickup'
  | 'delivery_update';

export type FirestoreTimestampLike = unknown;

export type CustomerProfileSnapshot = {
  fullName: string;
  email: string | null;
  whatsapp: string;
  city: string | null;
  address: string | null;
  photoUrl: string | null;
};

export type CustomerRepresentativeSnapshot = {
  fullName: string;
  whatsapp: string | null;
  identityDocumentId: string | null;
  confirmationMode: 'document' | 'phone_call' | 'pending';
};

export type CustomerOrderItemSnapshot = {
  productId: string;
  productPath: string | null;
  name: string;
  imageUrl: string | null;
  tagline: string | null;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
};

export type CustomerOrderTotals = {
  itemsSubtotal: number;
  deliveryFee: number | null;
  discountTotal: number;
  totalDue: number;
  currency: 'XOF';
};

export type CustomerOrderDeliveryLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string | null;
  mapUrl: string;
  source: 'browser_geolocation';
};

export type CustomerOrderDelivery = {
  acceptedDeliveryFee: boolean;
  city: string | null;
  address: string | null;
  location: CustomerOrderDeliveryLocation | null;
  feeStatus: 'not_applicable' | 'accepted_pending_amount' | 'quoted' | 'paid';
};

export type CustomerOrder = {
  id: string;
  userId: string | null;
  guestId: string | null;
  status: CustomerOrderStatus;
  paymentMode: CustomerPaymentMode;
  paymentStatus: CustomerPaymentStatus;
  fulfillmentMode: CustomerFulfillmentMode;
  profileRequired: boolean;
  customer: CustomerProfileSnapshot;
  representative: CustomerRepresentativeSnapshot | null;
  delivery: CustomerOrderDelivery;
  documentIds: {
    identityDocumentId: string | null;
    signedContractDocumentId: string | null;
    representativeIdentityDocumentId: string | null;
  };
  items: CustomerOrderItemSnapshot[];
  totals: CustomerOrderTotals;
  source: 'web';
  localDraftId: string | null;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
};

export type CustomerOrderClientView = {
  id: string;
  status: CustomerOrderStatus;
  paymentMode: CustomerPaymentMode;
  paymentStatus: CustomerPaymentStatus;
  fulfillmentMode: CustomerFulfillmentMode;
  profileRequired: boolean;
  customer: CustomerProfileSnapshot;
  representative: CustomerRepresentativeSnapshot | null;
  delivery: CustomerOrderDelivery;
  documentIds: CustomerOrder['documentIds'];
  items: CustomerOrderItemSnapshot[];
  totals: CustomerOrderTotals;
  source: 'web';
  localDraftId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrderPaymentProvider = 'kkiapay';

export type OrderPayment = {
  id: string;
  orderId: string;
  userId: string;
  provider: OrderPaymentProvider;
  status: CustomerPaymentStatus;
  amount: number;
  currency: 'XOF';
  providerIntentId: string | null;
  providerTransactionId: string | null;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
  verifiedAt: FirestoreTimestampLike | null;
};

export type InstallmentPlanScheduleItem = {
  dueAt: FirestoreTimestampLike;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'cancelled';
  paymentId: string | null;
};

export type InstallmentPlan = {
  id: string;
  orderId: string;
  userId: string;
  status: InstallmentPlanStatus;
  productTotal: number;
  amountPaid: number;
  balanceRemaining: number;
  currency: 'XOF';
  contractDocumentId: string;
  identityDocumentId: string;
  schedule: InstallmentPlanScheduleItem[];
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
  activatedAt: FirestoreTimestampLike | null;
};

export type CustomerDocument = {
  id: string;
  userId: string;
  orderId: string | null;
  installmentPlanId: string | null;
  type: CustomerDocumentType;
  status: CustomerDocumentStatus;
  storagePath: string;
  downloadUrl: string | null;
  fileName: string;
  contentType: string;
  size: number;
  rejectionReason: string | null;
  createdAt: FirestoreTimestampLike;
  reviewedAt: FirestoreTimestampLike | null;
  reviewedBy: string | null;
};

export type CustomerNotification = {
  id: string;
  userId: string;
  orderId: string | null;
  type: CustomerNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: FirestoreTimestampLike;
};

export const CUSTOMER_ORDER_COLLECTIONS: Record<CustomerOrderCollection, CustomerOrderCollection> = {
  orders: 'orders',
  orderPayments: 'orderPayments',
  installmentPlans: 'installmentPlans',
  customerDocuments: 'customerDocuments',
  customerNotifications: 'customerNotifications',
};

export const CUSTOMER_DOCUMENT_STORAGE_ROOT = 'customer-documents';

export const buildCustomerDocumentStoragePath = (params: {
  userId: string;
  documentType: CustomerDocumentType;
  documentId: string;
  fileName: string;
}) => {
  const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${CUSTOMER_DOCUMENT_STORAGE_ROOT}/${params.userId}/${params.documentType}/${params.documentId}-${safeFileName}`;
};
