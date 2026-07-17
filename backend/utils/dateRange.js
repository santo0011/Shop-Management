// "Today" for stats/dashboard queries must always mean the shop's local
// (IST) calendar day, not whatever timezone the Node process happens to be
// running in. Deploy hosts commonly default to UTC, which — since IST is
// UTC+5:30 — shifts the midnight boundary and makes "today's" numbers read
// as 0 for the first ~5.5 hours of the actual local day. Anchoring to a
// fixed IST offset (India has no DST) makes this correct regardless of the
// server's own TZ setting.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getTodayRangeIST = () => {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const year = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const date = nowIST.getUTCDate();

  const start = new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { start, end };
};

module.exports = { getTodayRangeIST };
