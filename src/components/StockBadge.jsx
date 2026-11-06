import React from 'react';
import { STOCK_STATUS_STYLES, getStockStatus } from '@/lib/estoque';

export default function StockBadge({ product }) {
  const status = getStockStatus(product);
  const style = STOCK_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
