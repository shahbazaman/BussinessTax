import hsnData1 from './hsnData_1';
import hsnData2 from './hsnData_2';
import hsnData3 from './hsnData_3';

// Merge all parts and deduplicate by code
const rawList = [...hsnData1, ...hsnData2, ...hsnData3];
const seen = new Set();
export const HSN_CODES = rawList.filter(item => {
  if (seen.has(item.code)) return false;
  seen.add(item.code);
  return true;
});

// Extract unique sorted categories
export const HSN_CATEGORIES = [...new Set(
  HSN_CODES.map(h => h.category).filter(Boolean)
)].sort();

/**
 * Search HSN codes by code prefix or description keyword
 * @param {string} query - search term
 * @param {string} category - optional category filter
 * @returns top 30 matches
 */
export const searchHSN = (query, category = '') => {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  
  let pool = HSN_CODES;
  if (category) {
    pool = pool.filter(h => h.category === category);
  }

  const exact = pool.filter(h => h.code.startsWith(q));
  const desc  = pool.filter(
  h => !h.code.startsWith(q) && (
    h.description.toLowerCase().includes(q) ||
    h.category?.toLowerCase().includes(q)
  )
);
  return [...exact, ...desc].slice(0, 30);
};

/**
 * Search HSN codes by category alone (for browsing)
 */
export const searchByCategory = (category) => {
  if (!category) return [];
  return HSN_CODES.filter(h => h.category === category).slice(0, 50);
};

export default HSN_CODES;