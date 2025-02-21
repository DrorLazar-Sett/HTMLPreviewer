// main.js
import * as AssetLoading from './asset_loading.js';
import * as UI from './ui.js';
import FBXViewer from './viewer_fbx.js';
// THREE is already imported and exposed globally in Digital_Asset_Viewer.html

// Initialize event listeners and application start

// Folder picker button event listener (moved here to connect UI with asset loading)
AssetLoading.folderPickerButton.addEventListener("click", async () => {
  console.log("Folder picker button clicked (main.js)");
  try {
    await AssetLoading.handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});

// Folder path input Enter key listener (moved here to connect UI with asset loading)
AssetLoading.folderPathInput.addEventListener("keypress", async (event) => {
  if (event.key === "Enter") {
    console.log("Enter key pressed in folder input (main.js)");
    await AssetLoading.handleFolderSelection();
  }
});

// Subfolder toggle - trigger reload if needed (example, adjust logic as necessary)
UI.subfolderToggle.addEventListener("click", async () => {
  UI.loadSubfolders = !UI.loadSubfolders;
  UI.subfolderToggle.textContent = UI.loadSubfolders ? "Subfolders: On" : "Subfolders: Off";
  if (AssetLoading.lastDirectoryHandle) {
    await AssetLoading.handleFolderPick(AssetLoading.lastDirectoryHandle); // Reload files from last directory
  }
});

// Selection dropdown actions
const selectionOptions = document.querySelectorAll('.selection-option');
selectionOptions.forEach(option => {
  const action = option.dataset.action;
  option.addEventListener('click', () => {
    switch(action) {
      case 'download':
        UI.downloadSelected(AssetLoading.modelFiles);
        break;
      case 'save':
        UI.saveSelection(AssetLoading.modelFiles);
        break;
      case 'clear':
        UI.clearSelection();
        break;
    }
  });
});


// Initial render (you might want to load a default folder or show a welcome message initially)
AssetLoading.renderPage(UI.currentPage);
UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.itemsPerPage));
UI.updateSelectionCount(); // Initialize selection count to 0

console.log("Main script initialized.");
