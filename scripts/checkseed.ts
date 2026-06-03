import { REPORTS } from '../src/data/seed';
const today = new Date().toISOString().slice(0,10);
console.log('Today:', today);
const matches = REPORTS.filter(r => r.date === today);
console.log('Reports with today date:', matches.length);
matches.forEach(r => {
  console.log(' -', r.id, 'todos=', r.todos.length, 'todo IDs:', r.todos.map(t => `${t.id}(due=${t.dueDate||'none'})`).join(','));
});
