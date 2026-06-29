try {
  const { useShallow } = require('zustand/react/shallow');
  console.log('useShallow:', useShallow);
} catch (e) {
  console.error('Error importing useShallow:', e);
}
