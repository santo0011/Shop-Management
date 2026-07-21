import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';

// Windowed page-number list: first, last, current ± 1, with '...' gaps —
// keeps the control compact even when there are many pages.
const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const withGaps = [];
  sorted.forEach((p, idx) => {
    if (idx > 0 && p - sorted[idx - 1] > 1) withGaps.push('…');
    withGaps.push(p);
  });
  return withGaps;
};

// Server-side pagination control: page-size is fixed by the caller (the
// backend already paginates via ?page=&limit=), this just renders the
// current window and reports the page the caller should fetch next.
const Pagination = ({ page, totalPages, totalCount, pageSize, onPageChange }) => {
  const { t } = useTranslation();

  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) return null;

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="table-container pagination-bar">
      <div className="data-table-pagination">
        <span className="data-table-pagination-info">
          {t('common.pageRangeInfo', { start, end, count: totalCount })}
        </span>
        <div className="pagination-controls">
          <button
            type="button"
            className="btn-premium btn-premium-secondary btn-premium-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <BiChevronLeft size={16} /> {t('common.previous')}
          </button>
          <div className="pagination-pages">
            {pageNumbers.map((p, idx) => p === '…' ? (
              <span key={`gap-${idx}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pagination-page-btn ${p === page ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-premium btn-premium-secondary btn-premium-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('common.next')} <BiChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
