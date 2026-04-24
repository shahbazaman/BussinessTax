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

// Search function: returns top 30 matches by code or description
export const searchHSN = (query) => {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const exact = HSN_CODES.filter(h => h.code.startsWith(q));
  const desc  = HSN_CODES.filter(h => !h.code.startsWith(q) && h.description.toLowerCase().includes(q));
  return [...exact, ...desc].slice(0, 30);
};

export default HSN_CODES;
