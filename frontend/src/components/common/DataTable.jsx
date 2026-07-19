import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiSearch, BiSortUp, BiSortDown, BiSortAlt2, BiChevronLeft, BiChevronRight } from 'react-icons/bi';

// Generic client-side table: sticky header, search, column sorting, and
// pagination. Built on top of the existing .table-container/.table-custom
// primitives so every analytics table on the Reports page (and anywhere
// else) shares one implementation instead of six bespoke ones.
//
// columns: [{ key, label, align, sortable, render(row), sortValue(row) }]
// data: array of row objects
// rowKey: (row, index) => string
const DataTable = ({
  columns,
  data,
  rowKey,
  searchPlaceholder,
  searchKeys,
  pageSize = 10,
  emptyMessage,
  title,
  icon: Icon,
  headerExtra,
  maxHeight = 360,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);

  const searchable = !!searchKeys?.length;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter(row => searchKeys.some(key => String(row[key] ?? '').toLowerCase().includes(q)));
  }, [data, query, searchKeys, searchable]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find(c => c.key === sort.key);
    const getValue = col?.sortValue || ((row) => row[sort.key]);
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va ?? '').localeCompare(String(vb ?? ''));
    });
    if (sort.direction === 'desc') copy.reverse();
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  const handleSearchChange = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleSort = (col) => {
    if (!col.sortable) return;
    setSort(prev => {
      if (prev.key !== col.key) return { key: col.key, direction: 'asc' };
      return { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortIcon = (col) => {
    if (!col.sortable) return null;
    if (sort.key !== col.key) return <BiSortAlt2 className="data-table-sort-icon" />;
    return sort.direction === 'asc' ? <BiSortUp className="data-table-sort-icon active" /> : <BiSortDown className="data-table-sort-icon active" />;
  };

  return (
    <div className="table-container data-table">
      {(title || searchable || headerExtra) && (
        <div className="table-header">
          <h5>{Icon && <Icon />} {title}</h5>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {headerExtra}
            {searchable && (
              <div className="search-box data-table-search">
                <BiSearch className="search-icon" />
                <input className="form-control" placeholder={searchPlaceholder || t('common.searchPlaceholder')} value={query} onChange={handleSearchChange} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="data-table-scroll" style={{ maxHeight }}>
        <table className="table-custom">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'data-table-th-sortable' : ''}
                  style={{ textAlign: col.align || 'left' }}
                  onClick={() => handleSort(col)}
                >
                  <span className="data-table-th-inner">{col.label} {sortIcon(col)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="data-table-empty">{emptyMessage || t('empty.noData')}</div>
                </td>
              </tr>
            ) : paged.map((row, idx) => (
              <tr key={rowKey ? rowKey(row, idx) : idx}>
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="data-table-pagination">
          <span className="data-table-pagination-info">
            {t('common.pageInfo', { current: currentPage, total: totalPages, count: sorted.length })}
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn-premium btn-premium-secondary btn-premium-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <BiChevronLeft size={16} /> {t('common.previous')}
            </button>
            <button
              type="button"
              className="btn-premium btn-premium-secondary btn-premium-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              {t('common.next')} <BiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
