// main.js
import * as AssetLoading from './asset_loading.js';
import * as UI from './ui.js';
import FBXViewer from './viewer_fbx.js';

// Initialize UI and set up event listeners
UI.initializeUI().then(() => {
  // Initial render
  AssetLoading.renderPage(UI.getCurrentPage());
  UI.updatePagination(Math.ceil(AssetLoading.filteredModelFiles.length / UI.getItemsPerPage()));
  UI.updateSelectionCount();

  console.log("Main script initialized.");
});
