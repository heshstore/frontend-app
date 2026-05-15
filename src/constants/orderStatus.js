// Order status values — must match backend OrderStatus enum exactly.
export const ORDER_STATUS = {
  DRAFT:            'DRAFT',
  GENERATED:        'GENERATED',
  CANCELLED:        'CANCELLED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED:         'APPROVED',
  IN_PRODUCTION:    'IN_PRODUCTION',
  READY:            'READY',
  READY_FOR_DISPATCH: 'READY_FOR_DISPATCH',
  PARTIAL_DISPATCHED: 'PARTIAL_DISPATCHED',
  DISPATCHED:       'DISPATCHED',
  PARTIAL_DELIVERED: 'PARTIAL_DELIVERED',
  COMPLETED:        'COMPLETED',
  REJECTED:         'REJECTED',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.DRAFT]:            'Draft',
  [ORDER_STATUS.GENERATED]:        'Generated',
  [ORDER_STATUS.CANCELLED]:        'Cancelled',
  [ORDER_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [ORDER_STATUS.APPROVED]:         'Approved',
  [ORDER_STATUS.IN_PRODUCTION]:    'In Production',
  [ORDER_STATUS.READY]:            'Ready',
  [ORDER_STATUS.READY_FOR_DISPATCH]: 'Ready for dispatch',
  [ORDER_STATUS.PARTIAL_DISPATCHED]: 'Partially dispatched',
  [ORDER_STATUS.DISPATCHED]:       'Dispatched',
  [ORDER_STATUS.PARTIAL_DELIVERED]: 'Partially delivered',
  [ORDER_STATUS.COMPLETED]:        'Completed',
  [ORDER_STATUS.REJECTED]:         'Rejected',
};
