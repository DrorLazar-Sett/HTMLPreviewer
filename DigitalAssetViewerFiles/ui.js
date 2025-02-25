// ui.js
import { renderPage } from './asset_loading.js'; // Example import, adjust as needed

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

let currentPage = 0;
let itemsPerPage = 20;
let loadSubfolders = false;
let currentSort = { field: 'name', direction: 'asc' };
let selectedFiles = new Set();

// Function to update pagination display
function updatePagination(totalPages) {
  pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 0;
  nextPageBtn.disabled = currentPage >= totalPages - 1;
}

// Function to exit fullscreen
function exitFullscreen(currentFullscreenViewer) {
  fullscreenOverlay.style.display = 'none';
  if (currentFullscreenViewer) {
    if (currentFullscreenViewer === fullscreenVideo) {
      fullscreenVideo.pause();
      fullscreenVideo.currentTime = 0;
    } else if (currentFullscreenViewer.cleanup) {
      currentFullscreenViewer.cleanup();
    }
    return null; // Return null to indicate no current viewer
  }
  return null; // Return null if no viewer to begin with
}

// Function to update selection count in UI
function updateSelectionCount() {
  const count = selectedFiles.size;
  selectionDropdown.innerHTML =
    `${count} Selected <i class="fa fa-chevron-down"></i>`;
}

function clearSelection(renderCallback) {
  selectedFiles.clear();
  updateSelectionCount();
  if (renderCallback) renderCallback(currentPage); // Re-render current page to update tile selections
}

async function downloadSelected(modelFiles) {
  if (selectedFiles.size === 0) return;

  for (const fileName of selectedFiles) {
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


// Theme toggle handler
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Subfolder toggle handler
subfolderToggle.addEventListener("click", () => {
  loadSubfolders = !loadSubfolders;
  subfolderToggle.textContent = loadSubfolders ? "Subfolders: On" : "Subfolders: Off";
  // Need to trigger file reload here based on new subfolder setting if needed
});


prevPageBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    //renderPage(currentPage); // Render page will be handled in asset_loading or main.js
    //updatePagination(); // Update pagination will be handled here
  }
  // Trigger page render from main or asset_loading
});

nextPageBtn.addEventListener("click", () => {
  // const maxPage = Math.ceil(filteredModelFiles.length / itemsPerPage) - 1; // totalPages will come from asset_loading
  // if (currentPage < maxPage) {
  //   currentPage++;
  //   //renderPage(currentPage); // Render page will be handled in asset_loading or main.js
  //   //updatePagination(); // Update pagination will be handled here
  // }
   // Trigger page render from main or asset_loading
});

returnButton.addEventListener('click', () => {
  exitFullscreen(); // exitFullscreen will be handled here
});

document.addEventListener('keydown', function(event) {
  if (fullscreenOverlay.style.display === 'block' && event.key === 'Escape') {
    exitFullscreen(); // exitFullscreen will be handled here
  }
});

// Add click handler to close fullscreen when clicking outside content
fullscreenOverlay.addEventListener('click', function(event) {
  // Check if click was directly on the overlay (not its children)
  if (event.target === fullscreenOverlay) {
    exitFullscreen(); // exitFullscreen will be handled here
  }
});

// Selection management function for UI interaction (tile click) - to be called from tile rendering
function toggleSelectionUI(fileName, renderCallback) {
  if (selectedFiles.has(fileName)) {
    selectedFiles.delete(fileName);
  } else {
    selectedFiles.add(fileName);
  }
  updateSelectionCount();
  if (renderCallback) renderCallback(currentPage); // Re-render current page to update tile selections
}


export {
  updatePagination,
  exitFullscreen,
  updateSelectionCount,
  clearSelection,
  downloadSelected,
  toggleSelectionUI,
  currentPage,
  itemsPerPage,
  loadSubfolders,
  currentSort,
  selectedFiles,
  prevPageBtn,
  nextPageBtn,
  subfolderToggle // Export subfolderToggle for potential state updates in asset_loading
};
