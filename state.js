// state.js
export let modelFiles = [];
export let filteredModelFiles = [];
export const activeFilters = new Set(['fbx', 'glb', 'video', 'audio', 'image']);

export function updateFilteredModelFiles() {
  const previousLength = filteredModelFiles.length;
  filteredModelFiles.length = 0;
  filteredModelFiles.push(...modelFiles.filter(item => activeFilters.has(item.type)));
  return previousLength !== filteredModelFiles.length;
}
