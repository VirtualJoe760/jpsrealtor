// Test combined filter output
const { combineFilters } = require('./src/lib/queries/filters/index.ts');

const filters = {
  city: "Palm Desert",
  listedAfter: "2025-12-07",
  limit: 10,
  sort: "newest"
};

console.log('Input filters:', JSON.stringify(filters, null, 2));
console.log();

const query = combineFilters(filters);

console.log('Generated MongoDB query:', JSON.stringify(query, null, 2));
