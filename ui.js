// ui.js
import { renderPage, sortFiles, activeFbxViewers, modelFiles, updateFilteredModelFiles } from './asset_loading.js';

const darkModeToggle = document.getElementById("darkModeToggle");
const subfolderToggle = document.getElementById("subfolderToggle");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const sizeSlider = document.getElementById("sizeSlider");
const sizeValue = document.getElementById("sizeValue");
const pageInfo = document.getElementById("pageInfo");
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const returnButton = document.getElementById('returnButton');
const fullscreenVideo = document.getElementById('fullscreenVideo');
const fullscreenViewer = document.getElementById('fullscreenViewer');
const selectionDropdown = document.getElementById('selectionDropdown');
const itemsPerPageBtn = document.getElementById('itemsPerPageBtn');
const sortBtn = document.getElementById('sortBtn');

// Private state
let _currentPage = 0;
let _itemsPerPage = 20;
let _loadSubfolders = false;
let _subfolderDepth = 'off';
let _currentSort = { field: 'name', direction: 'asc' };
let _selectedFiles = new Set();
let _searchTerm = '';

// Search input handler
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  _searchTerm = e.target.value.toLowerCase();
  setCurrentPage(0);
  updateFilteredModelFiles();
  renderPage(getCurrentPage());
});

// Function to check if a file matches the search criteria
export const fileMatchesSearch = (file) => {
  if (!_searchTerm) return true;
  
  const searchTerms = _searchTerm.split(' ').filter(term => term.length > 0);
  if (searchTerms.length === 0) return true;
  
  const searchableContent = [
    file.name.toLowerCase(),
    file.type.toLowerCase(),
    file.fullPath?.toLowerCase() || ''
  ].join(' ');
  
  return searchTerms.every(term => searchableContent.includes(term));
};

// Getters
export const getCurrentPage = () => _currentPage;
export const getItemsPerPage = () => _itemsPerPage;
export const getLoadSubfolders = () => _loadSubfolders;
export const getSubfolderDepth = () => _subfolderDepth;
export const getCurrentSort = () => ({ ..._currentSort });
export const getSelectedFiles = () => new Set(_selectedFiles);
export const getSearchTerm = () => _searchTerm;

// Setters
export const setCurrentPage = (page) => {
  _currentPage = page;
  return _currentPage;
};

function updateItemsDropdownState(items) {
  const itemsDropdown = document.getElementById('itemsDropdown');
  if (!itemsDropdown) return;
  
  itemsDropdown.querySelectorAll('.items-option').forEach(option => {
    const checkmark = option.querySelector('.items-check');
    if (checkmark) {
      const isActive = parseInt(option.dataset.value) === items;
      checkmark.style.visibility = isActive ? 'visible' : 'hidden';
    }
  });
}

export const setItemsPerPage = (items) => {
  _itemsPerPage = items;
  
  // Clear existing content
  while (itemsPerPageBtn.firstChild) {
    itemsPerPageBtn.removeChild(itemsPerPageBtn.firstChild);
  }
  
  // Add text node
  itemsPerPageBtn.appendChild(document.createTextNode(`${items} Items `));
  
  // Add icon
  const icon = document.createElement('i');
  icon.className = 'fa fa-chevron-down';
  itemsPerPageBtn.appendChild(icon);
  
  // Update only items dropdown state
  updateItemsDropdownState(items);
  
  return _itemsPerPage;
};

function updateSubfoldersDropdownState(depth) {
  const subfolderDropdown = document.getElementById('subfolderDropdown');
  if (!subfolderDropdown) return;
  
  subfolderDropdown.querySelectorAll('.subfolder-option').forEach(option => {
    const checkmark = option.querySelector('.subfolder-check');
    if (checkmark) {
      const isActive = option.dataset.depth === depth;
      checkmark.style.visibility = isActive ? 'visible' : 'hidden';
    }
  });
}

export const setLoadSubfolders = (value, depth = 'off') => {
  _loadSubfolders = value;
  _subfolderDepth = depth;
  
  // Clear existing content
  while (subfolderToggle.firstChild) {
    subfolderToggle.removeChild(subfolderToggle.firstChild);
  }
  
  // Add sitemap icon
  const sitemapIcon = document.createElement('i');
  sitemapIcon.className = `fa fa-sitemap${depth === 'off' ? '' : ' active'}`;
  subfolderToggle.appendChild(sitemapIcon);
  
  // Add text span
  const textSpan = document.createElement('span');
  textSpan.textContent = depth === 'off' ? '' : (depth === 'all' ? 'All' : depth);
  subfolderToggle.appendChild(textSpan);
  
  // Add chevron icon
  const chevronIcon = document.createElement('i');
  chevronIcon.className = 'fa fa-chevron-down';
  subfolderToggle.appendChild(chevronIcon);
  
  // Update only subfolders dropdown state
  updateSubfoldersDropdownState(depth);
  
  return _loadSubfolders;
};

// Function to close all dropdowns
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.classList.remove('active');
  });
}

// Prevent click events on dropdown buttons (except sort button)
document.querySelectorAll('.dropdown-btn:not(#sortBtn)').forEach(button => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
});

// Add hover handlers for dropdowns
document.querySelectorAll('.dropdown').forEach(dropdown => {
  let closeTimeout;
  
  dropdown.addEventListener('mouseenter', () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    closeAllDropdowns();
    dropdown.classList.add('active');
  });
  
  dropdown.addEventListener('mouseleave', () => {
    closeTimeout = setTimeout(() => {
      dropdown.classList.remove('active');
    }, 150); // Small delay to improve usability when moving to submenu
  });
});

// Keep dropdown open when hovering over content
document.querySelectorAll('.dropdown-content').forEach(content => {
  content.addEventListener('mouseenter', () => {
    const dropdown = content.closest('.dropdown');
    if (dropdown) {
      dropdown.classList.add('active');
    }
  });
});

// Add event listeners for subfolder options
document.querySelectorAll('.subfolder-option').forEach(option => {
  option.addEventListener('click', (event) => {
    event.stopPropagation();
    const depth = option.dataset.depth;
    setLoadSubfolders(depth !== 'off', depth);
    closeAllDropdowns();
    renderPage(getCurrentPage());
  });
});

// Add event listeners for items per page options
document.querySelectorAll('.items-option').forEach(option => {
  option.addEventListener('click', (event) => {
    event.stopPropagation();
    const value = parseInt(option.dataset.value);
    setItemsPerPage(value);
    setCurrentPage(0);
    closeAllDropdowns();
    renderPage(getCurrentPage());
  });
});

function updateSortDropdownState(field) {
  const sortDropdown = document.getElementById('sortDropdown');
  if (!sortDropdown) return;
  
  // Update sort options
  sortDropdown.querySelectorAll('.sort-option').forEach(option => {
    const checkmark = option.querySelector('.fa-check');
    if (checkmark) {
      const isActive = option.dataset.value === field;
      checkmark.style.visibility = isActive ? 'visible' : 'hidden';
    }
  });
}

export const setCurrentSort = (sort) => {
  _currentSort = { ...sort };
  
  // Update sort button text and icon
  if (sortBtn) {
    // Clear existing content
    while (sortBtn.firstChild) {
      sortBtn.removeChild(sortBtn.firstChild);
    }
    
    // Add text showing field and direction
    const directionIcon = document.createElement('i');
    directionIcon.className = _currentSort.direction === 'asc' ? 'fa fa-sort-down' : 'fa fa-sort-up';
    sortBtn.appendChild(directionIcon);
    
    // Add text showing field with capitalized first letter
    const capitalizedField = _currentSort.field.charAt(0).toUpperCase() + _currentSort.field.slice(1);
    sortBtn.appendChild(document.createTextNode(` ${capitalizedField} `));
    
    // Add dropdown icon
    const dropdownIcon = document.createElement('i');
    dropdownIcon.className = 'fa fa-chevron-down';
    sortBtn.appendChild(dropdownIcon);

    // Update button title
    sortBtn.title = `Sort by ${_currentSort.field} (${_currentSort.direction === 'asc' ? 'ascending' : 'descending'})`;
  }
  
  // Update dropdown state
  updateSortDropdownState(_currentSort.field);
  
  return _currentSort;
};

// Add event listeners for sort options
document.querySelectorAll('.sort-option').forEach(option => {
  option.addEventListener('click', (event) => {
    event.stopPropagation();
    const field = option.dataset.value;
    setCurrentSort({ field, direction: _currentSort.direction });
    
    // Call sortFiles directly
    sortFiles();
    closeAllDropdowns();
  });
});

// Add click handler for sort button to toggle direction
sortBtn.addEventListener('click', (event) => {
  // Only toggle direction if we didn't click the dropdown icon
  if (!event.target.classList.contains('fa-chevron-down')) {
    event.preventDefault();
    event.stopPropagation();
    
    const newDirection = _currentSort.direction === 'asc' ? 'desc' : 'asc';
    setCurrentSort({ ..._currentSort, direction: newDirection });
    
    // Call sortFiles directly
    sortFiles();
    closeAllDropdowns();
  }
});

// Add click handler for sort button dropdown icon
const sortBtnDropdownIcon = sortBtn.querySelector('.fa-chevron-down');
if (sortBtnDropdownIcon) {
  sortBtnDropdownIcon.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = sortBtn.closest('.dropdown');
    if (dropdown) {
      if (dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
      } else {
        closeAllDropdowns();
        dropdown.classList.add('active');
      }
    }
  });
}

// Function to update pagination display
export function updatePagination(totalPages) {
  totalPages = Math.max(1, totalPages || 1);
  pageInfo.textContent = `Page ${_currentPage + 1} of ${totalPages}`;
  prevPageBtn.disabled = _currentPage === 0;
  nextPageBtn.disabled = _currentPage >= totalPages - 1;
}

// Function to exit fullscreen
export function exitFullscreen(currentFullscreenViewer) {
  fullscreenOverlay.style.display = 'none';
  if (currentFullscreenViewer) {
    if (currentFullscreenViewer === fullscreenVideo || currentFullscreenViewer.type === 'video') {
      // Stop both fullscreen video and any preview video
      fullscreenVideo.pause();
      fullscreenVideo.currentTime = 0;
      fullscreenVideo.src = '';
      if (currentFullscreenViewer.previewVideo) {
        currentFullscreenViewer.previewVideo.pause();
        currentFullscreenViewer.previewVideo.currentTime = 0;
      }
    } else if (currentFullscreenViewer.cleanup) {
      currentFullscreenViewer.cleanup();
    }
    return null;
  }
  return null;
}

// Function to update selection count in UI
export function updateSelectionCount() {
  const count = _selectedFiles.size;
  selectionDropdown.innerHTML = `${count} Selected <i class="fa fa-chevron-down"></i>`;
}

export function clearSelection() {
  _selectedFiles.clear();
  updateSelectionCount();
  // Update selection state without full re-render
  document.querySelectorAll('.model-tile').forEach(tile => {
    tile.classList.remove('selected');
  });
}

export function saveSelection(modelFiles) {
  if (_selectedFiles.size === 0) return;
  
  const content = Array.from(_selectedFiles)
    .map(fileName => {
      const model = modelFiles.find(m => m.name === fileName);
      return model ? model.fullPath : fileName;
    })
    .join('\n');
    
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'selected_files.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadSelected(modelFiles) {
  if (_selectedFiles.size === 0) return;

  for (const fileName of _selectedFiles) {
    const model = modelFiles.find(m => m.name === fileName);
    if (model) {
      const blob = new Blob([await model.file.arrayBuffer()]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = model.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

// Selection management function for UI interaction
export function toggleSelectionUI(fileName) {
  const isSelected = _selectedFiles.has(fileName);
  const tile = document.querySelector(`.model-tile[data-model-name="${fileName}"]`);
  
  if (isSelected) {
    _selectedFiles.delete(fileName);
    tile?.classList.remove('selected');
  } else {
    _selectedFiles.add(fileName);
    tile?.classList.add('selected');
  }
  updateSelectionCount();
}

// Add event listeners for selection options
document.querySelectorAll('.selection-option').forEach(option => {
  option.addEventListener('click', () => {
    const action = option.dataset.action;
    if (action === 'download') {
      downloadSelected(modelFiles);
    } else if (action === 'save') {
      saveSelection(modelFiles);
    } else if (action === 'clear') {
      clearSelection();
    }
    closeAllDropdowns();
  });
});

// Theme toggle handler
darkModeToggle.addEventListener("click", () => {
  const isDarkMode = document.body.classList.toggle("dark-mode");
  // Update all active FBX viewers
  activeFbxViewers.forEach(viewer => {
    viewer.setDarkMode(isDarkMode);
  });
});

// Initialize UI states
document.documentElement.style.setProperty('--tile-size', `${sizeSlider.value}px`);
sizeValue.textContent = `${sizeSlider.value}px`;
setCurrentSort(_currentSort); // Initialize sort button state

// Size slider handler
sizeSlider.addEventListener("input", (e) => {
  const size = e.target.value;
  document.documentElement.style.setProperty('--tile-size', `${size}px`);
  sizeValue.textContent = `${size}px`;
});

// Import currentFullscreenViewer from asset_loading.js
import { currentFullscreenViewer } from './asset_loading.js';

// Event listeners
returnButton.addEventListener('click', () => {
  exitFullscreen(currentFullscreenViewer);
});

document.addEventListener('keydown', function(event) {
  if (fullscreenOverlay.style.display === 'block' && event.key === 'Escape') {
    exitFullscreen(currentFullscreenViewer);
  }
});

fullscreenOverlay.addEventListener('click', function(event) {
  if (event.target === fullscreenOverlay) {
    exitFullscreen(currentFullscreenViewer);
  }
});

export {
  prevPageBtn,
  nextPageBtn,
  subfolderToggle
};
