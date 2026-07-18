import React, { useState, useRef, useEffect } from 'react';
import { BiChevronDown } from 'react-icons/bi';

/**
 * ExpandableCard — a reusable mobile card component.
 *
 * Usage (on any list page):
 *   <ExpandableCard
 *     compact={<CompactFields />}
 *     expanded={<ExpandedFields />}
 *   />
 *
 * The card auto-collapses on window resize > mobile breakpoint.
 */
const ExpandableCard = ({ compact, expanded, actions }) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(open ? contentRef.current.scrollHeight : 0);
    }
  }, [open, expanded]);

  // Auto-collapse when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 991.98 && open) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <div className={`expandable-card ${open ? 'expandable-card--open' : ''}`}>
      {/* Always-visible compact area */}
      <div className="expandable-card__compact" onClick={() => setOpen((prev) => !prev)}>
        <div className="expandable-card__compact-body">
          {compact}
        </div>
        <button
          className={`expandable-card__toggle ${open ? 'expandable-card__toggle--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
          aria-label={open ? 'Show less' : 'Show more'}
        >
          <BiChevronDown />
        </button>
      </div>

      {/* Expandable section with smooth height animation */}
      <div
        className="expandable-card__expanded-wrapper"
        style={{ maxHeight: open ? contentHeight : 0 }}
      >
        <div ref={contentRef} className="expandable-card__expanded">
          {expanded}
          {actions && <div className="expandable-card__actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

export default ExpandableCard;