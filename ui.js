// ui.js
import { renderPage } from './asset_loading.js';

const darkModeToggle = document.getElementById("darkModeToggle");
const subfolderToggle = document.getElementById("subfolderToggle");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const returnButton = document.getElementById('returnButton');
const fullscreenVideo = document.getElementById('fullscreenVideo');
const fullscreenViewer = document.getElementById('fullscreenViewer');
const selectionDropdown = document.getElementById('selectionDropdown');

// Private state
let _currentPage = 0;
let _itemsPerPage = 20;
let _loadSubfolders = false;
let _currentSort = { field: 'name', direction: 'asc' };
let _selectedFiles = new Set();

// Getters
export const getCurrentPage = () => _currentPage;
export const getItemsPerPage = () => _itemsPerPage;
export const getLoadSubfolders = () => _loadSubfolders;
export const getCurrentSort = () => ({ ..._currentSort });
export const getSelectedFiles = () => new Set(_selectedFiles);

// Setters
export const setCurrentPage = (page) => {
  _currentPage = page;
  return _currentPage;
};

export const setItemsPerPage = (items) => {
  _itemsPerPage = items;
  return _itemsPerPage;
};

export const setLoadSubfolders = (value) => {
  _loadSubfolders = value;
  subfolderToggle.textContent = _loadSubfolders ? "Subfolders: On" : "Subfolders: Off";
  return _loadSubfolders;
};

export const setCurrentSort = (sort) => {
  _currentSort = { ...sort };
  return _currentSort;
};

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

export function clearSelection(renderCallback) {
  _selectedFiles.clear();
  updateSelectionCount();
  if (renderCallback) renderCallback(_currentPage);
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
export function toggleSelectionUI(fileName, renderCallback) {
  if (_selectedFiles.has(fileName)) {
    _selectedFiles.delete(fileName);
  } else {
    _selectedFiles.add(fileName);
  }
  updateSelectionCount();
  if (renderCallback) renderCallback(_currentPage);
}

// Theme toggle handler
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Subfolder toggle handler
subfolderToggle.addEventListener("click", () => {
  setLoadSubfolders(!_loadSubfolders);
});

// Event listeners
returnButton.addEventListener('click', () => {
  exitFullscreen();
});

document.addEventListener('keydown', function(event) {
  if (fullscreenOverlay.style.display === 'block' && event.key === 'Escape') {
    exitFullscreen();
  }
});

fullscreenOverlay.addEventListener('click', function(event) {
  if (event.target === fullscreenOverlay) {
    exitFullscreen();
  }
});

export {
  prevPageBtn,
  nextPageBtn,
  subfolderToggle
};
