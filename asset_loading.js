// asset_loading.js
import FBXViewer from './viewer_fbx.js';

// Keep track of active FBX viewers
export const activeFbxViewers = new Set();
import {
  getCurrentPage,
  getItemsPerPage,
  getLoadSubfolders,
  getSubfolderDepth,
  getCurrentSort,
  getSelectedFiles,
  setCurrentPage,
  setItemsPerPage,
  setLoadSubfolders,
  setCurrentSort,
  updatePagination,
  toggleSelectionUI,
  fileMatchesSearch,
  getUIElements,
  initializeUI
} from './ui.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const folderPickerButton = document.getElementById("folderPicker");
// Remove folderPathInput reference since we no longer use it
const viewerContainer = document.getElementById("viewerContainer");
const filterOptions = document.querySelectorAll('.filter-option');
const itemsOptions = document.querySelectorAll('.items-option');
const itemsBtn = document.querySelector('.dropdown-btn');
const sortOptions = document.querySelectorAll('.sort-option');
const sortDirectionBtn = document.querySelector('.sort-direction');

let modelFiles = [];
let filteredModelFiles = [];
let lastDirectoryHandle = null;
let currentFullscreenViewer = null;

// Intersection Observer setup for lazy loading
const observerOptions = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1
};

const tileObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const tile = entry.target;
      loadTileContent(tile);
      observer.unobserve(tile);
    }
  });
}, observerOptions);

// Format file size in a human-readable format
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date in a readable format
function formatDate(date) {
  return new Date(date).toLocaleString();
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function createPlaceholder(type) {
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = `<i class="fa fa-spinner fa-spin"></i><br>Loading ${type}...`;
  return placeholder;
}

// Cache for tile content
const tileCache = new Map();

// File retrieval function - Recursively collects files from selected directory
async function getFilesFromDirectory(dirHandle, recursive, currentDepth = 0) {
  let files = [];
  const depth = getSubfolderDepth();
  const maxDepth = depth === 'all' ? Infinity : depth === 'off' ? 0 : parseInt(depth);

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      files.push({ name, handle });
    } else if (handle.kind === "directory" && recursive && currentDepth < maxDepth) {
      const subFiles = await getFilesFromDirectory(handle, true, currentDepth + 1);
      files = files.concat(subFiles);
    }
  }
  return files;
}

// Sort files based on current sort settings
function sortFiles() {
  const currentSort = getCurrentSort();
  filteredModelFiles.sort((a, b) => {
    let comparison = 0;
    switch (currentSort.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.file.size - b.file.size;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'date':
        comparison = a.file.lastModified - b.file.lastModified;
        break;
    }
    return currentSort.direction === 'asc' ? comparison : -comparison;
  });
  
  // Re-render the current page with sorted files
  renderPage(getCurrentPage());
}

// Initialize active filters
const activeFilters = new Set(['fbx', 'glb', 'video', 'audio', 'image']);

// Filter management - Updates displayed assets based on active file type filters and search
function updateFilteredModelFiles() {
  const previousLength = filteredModelFiles.length;
  filteredModelFiles = modelFiles.filter(item => 
    activeFilters.has(item.type) && fileMatchesSearch(item)
  );

  // Only trigger full re-render if filter actually changed the visible items
  if (previousLength !== filteredModelFiles.length) {
    setCurrentPage(0);
    renderPage(getCurrentPage());
  }
}

// Initialize filter options
filterOptions.forEach(option => {
  const type = option.dataset.type;
  option.classList.add('active');
  
  option.addEventListener('click', () => {
    const isActive = option.classList.toggle('active');
    if (isActive) {
      activeFilters.add(type);
    } else {
      activeFilters.delete(type);
    }
    updateFilteredModelFiles();
  });
});

async function handleFolderPick(dirHandle) {
  console.log("Starting folder processing");
  modelFiles = [];
  viewerContainer.innerHTML = "";
  try {
    let fileEntries = [];
    const depth = getSubfolderDepth();
    if (depth !== 'off') {
      console.log(`Loading files with subfolder depth: ${depth}`);
      fileEntries = await getFilesFromDirectory(dirHandle, true);
    } else {
      console.log("Loading files from root directory only");
      for await (const [name, handle] of dirHandle.entries()) {
        fileEntries.push({ name, handle });
      }
    }
    console.log(`Found ${fileEntries.length} total files`);
    for (const {name, handle} of fileEntries) {
      const lowerCaseName = name.toLowerCase();
      if (
        lowerCaseName.endsWith(".glb") || lowerCaseName.endsWith(".fbx") ||
        lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") ||
        lowerCaseName.endsWith(".ogg") || lowerCaseName.endsWith(".mp3") ||
        lowerCaseName.endsWith(".wav") ||
        lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") ||
        lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")
      ) {
        console.log(`Processing file: ${name}`);
        const file = await handle.getFile();
        let type = "other";
        if (lowerCaseName.endsWith(".glb")) { type = "glb"; }
        else if (lowerCaseName.endsWith(".fbx")) { type = "fbx"; }
        else if (lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") || lowerCaseName.endsWith(".ogg")) { type = "video"; }
        else if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".wav")) { type = "audio"; }
        else if (
          lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") ||
          lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")
        ) { type = "image"; }
        const getFullPath = async (handle) => {
          const relativeParts = [];
          let current = handle;
          while (current) {
            relativeParts.unshift(current.name);
            try {
              current = await current.getParent();
            } catch {
              break;
            }
          }
          return relativeParts.join('\\');
        };
        const fullPath = await getFullPath(handle);
        modelFiles.push({ name, file, type, fullPath });
        console.log(`Added ${type} file: ${name}`);
      }
    }
    console.log(`Processed ${modelFiles.length} supported files`);
    modelFiles.sort((a, b) => a.name.localeCompare(b.name));
    console.log("Files sorted alphabetically");
    updateFilteredModelFiles();
    console.log(`Filtered to ${filteredModelFiles.length} files based on current filters`);
    setCurrentPage(0);
    updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
    renderPage(getCurrentPage());
    console.log("Initial page rendered");
  } catch (error) {
    console.error("Error in handleFolderPick:", error);
    alert(`Error: ${error.message}\n\nFailed to access folder contents. Ensure you have permission.`);
  }
}

async function loadTileContent(tile) {
  const model = tile.model;
  const placeholder = tile.querySelector('.placeholder');

  try {
    if (model.type === "glb") {
      if (!customElements.get('model-viewer')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      const mv = document.createElement("model-viewer");
      mv.src = URL.createObjectURL(model.file);
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("animation-name", "*");
      placeholder.replaceWith(mv);

    } else if (model.type === "fbx") {
      const viewerDiv = document.createElement("div");
      viewerDiv.className = "three-viewer";
      placeholder.replaceWith(viewerDiv);
      const viewer = new FBXViewer(viewerDiv);
      activeFbxViewers.add(viewer);
      viewer.loadModel(URL.createObjectURL(model.file));

    } else if (model.type === "video") {
      const videoPreview = document.createElement("div");
      videoPreview.className = "video-preview";
      const video = document.createElement("video");
      video.src = URL.createObjectURL(model.file);
      video.muted = true;
      video.className = 'preview-video'; // Add class for easy selection
      videoPreview.appendChild(video);

      const scrubBarContainer = document.createElement("div");
      scrubBarContainer.className = "scrub-bar-container";
      const scrubBar = document.createElement("div");
      scrubBar.className = "scrub-bar";
      scrubBarContainer.appendChild(scrubBar);
      const timeMarker = document.createElement("div");
      timeMarker.className = "time-marker";
      scrubBar.appendChild(timeMarker);
      videoPreview.appendChild(scrubBarContainer);

      let isDragging = false;

      scrubBarContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateVideoTime(e);
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        updateVideoTime(e);
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      function updateVideoTime(e) {
        if (!video.duration) return;
        const rect = scrubBarContainer.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * video.duration;
        video.currentTime = newTime;
        scrubBar.style.width = `${percentage * 100}%`;
        timeMarker.textContent = formatTime(newTime);
        timeMarker.style.left = `${percentage * 100}%`;
      }

      scrubBarContainer.addEventListener('mousemove', updateVideoTime);
      placeholder.replaceWith(videoPreview);

    } else if (model.type === "audio") {
      const audioTile = document.createElement("div");
      audioTile.className = "audio-tile";
      const audioHeader = document.createElement("div");
      audioHeader.className = "audio-header";
      const ext = model.name.split('.').pop().toUpperCase();
      audioHeader.innerHTML = '<i class="fa fa-music"></i> ' + ext;
      const audioControls = document.createElement("div");
      audioControls.className = "audio-controls";
      const audioElem = document.createElement("audio");
      audioElem.src = URL.createObjectURL(model.file);
      audioElem.controls = true;
      
      // Add event listener to stop other audio when this one starts playing
      audioElem.addEventListener('play', () => {
        // Stop all other audio elements
        document.querySelectorAll('audio').forEach(audio => {
          if (audio !== audioElem && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      });
      
      audioControls.appendChild(audioElem);
      audioTile.appendChild(audioHeader);
      audioTile.appendChild(audioControls);
      placeholder.replaceWith(audioTile);

    } else if (model.type === "image") {
      const imagePreview = document.createElement("div");
      imagePreview.className = "image-preview";
      const imgElem = document.createElement("img");
      imgElem.src = URL.createObjectURL(model.file);
      imagePreview.appendChild(imgElem);
      placeholder.replaceWith(imagePreview);
    }
  } catch (error) {
    console.error(`Error loading ${model.type} content:`, error);
    placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><br>Error loading ${model.type}`;
  }
}

function renderPage(pageIndex) {
  viewerContainer.innerHTML = "";
  const startIndex = pageIndex * getItemsPerPage();
  const pageItems = filteredModelFiles.slice(startIndex, startIndex + getItemsPerPage());
  const selectedFiles = getSelectedFiles();
  
  pageItems.forEach(model => {
    const tile = document.createElement("div");
    tile.className = "model-tile" + (selectedFiles.has(model.name) ? " selected" : "");
    tile.dataset.modelType = model.type;
    tile.dataset.modelName = model.name;

    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'selection-indicator';
    selectionIndicator.innerHTML = '<i class="fa fa-check"></i>';
    tile.appendChild(selectionIndicator);

    tile.addEventListener('click', (e) => {
      if (e.target.closest('.fullscreen-btn') || e.target.closest('.scrub-bar-container')) {
        return;
      }
      if (e.target.closest('.selection-indicator')) {
        toggleSelectionUI(model.name);
      }
    });

    if (model.type !== "audio") {
      const fsBtn = document.createElement('button');
      fsBtn.className = 'fullscreen-btn';
      fsBtn.innerHTML = '<i class="fa fa-expand"></i>';
      fsBtn.onclick = () => showFullscreen(model);
      tile.appendChild(fsBtn);
    }

    tile.appendChild(createPlaceholder(model.type));
    tile.model = model;

    const nameDiv = document.createElement("div");
    nameDiv.className = model.type === "video" ? "video-name" : "model-name";
    nameDiv.textContent = model.name;
    tile.appendChild(nameDiv);

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `
      ${formatFileSize(model.file.size)} •
      ${formatDate(model.file.lastModified)}
    `;
    tile.appendChild(fileInfo);

    viewerContainer.appendChild(tile);
    tileObserver.observe(tile);
  });
  
  updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
}

async function showFullscreen(model) {
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenViewer = document.getElementById('fullscreenViewer');
  const fullscreenVideo = document.getElementById('fullscreenVideo');

  fullscreenOverlay.style.display = 'flex';
  fullscreenOverlay.style.opacity = '1';
  fullscreenViewer.innerHTML = '';
  fullscreenVideo.style.display = 'none';
  
  if (model.type === "glb") {
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }
    
    const mv = document.createElement("model-viewer");
    mv.src = URL.createObjectURL(model.file);
    mv.setAttribute("camera-controls", "");
    mv.setAttribute("auto-rotate", "");
    mv.setAttribute("environment-image", "neutral");
    mv.setAttribute("animation-name", "*");
    mv.style.width = "100%";
    mv.style.height = "100%";
    fullscreenViewer.appendChild(mv);
    fullscreenViewer.style.display = 'block';
    currentFullscreenViewer = { ...mv, fileName: model.name };
    
  } else if (model.type === "fbx") {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.className = 'three-viewer';
    fullscreenViewer.appendChild(container);
    fullscreenViewer.style.display = 'block';
    
    const viewer = new FBXViewer(container);
    activeFbxViewers.add(viewer);
    viewer.loadModel(URL.createObjectURL(model.file));
    
    currentFullscreenViewer = {
      cleanup: () => {
        activeFbxViewers.delete(viewer);
      },
      fileName: model.name
    };
    
  } else if (model.type === "video") {
    fullscreenViewer.style.display = 'none';
    fullscreenVideo.style.display = 'block';
    fullscreenVideo.src = URL.createObjectURL(model.file);
    fullscreenVideo.play();
    // Store reference to preview video for cleanup
    const previewVideo = viewerContainer.querySelector(`[data-model-name="${model.name}"] video`);
    currentFullscreenViewer = {
      type: 'video',
      previewVideo: previewVideo,
      fileName: model.name
    };
    
  } else if (model.type === "image") {
    fullscreenViewer.style.display = 'block';
    fullscreenVideo.style.display = 'none';
    const img = document.createElement("img");
    img.src = URL.createObjectURL(model.file);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    fullscreenViewer.innerHTML = "";
    fullscreenViewer.appendChild(img);
    currentFullscreenViewer = { ...img, fileName: model.name };
  }
}

let isDirectoryPickerActive = false;

async function handleFolderSelection() {
  console.log("Selecting folder");
  if (isDirectoryPickerActive) {
    console.log("Directory picker is already active");
    return;
  }
  
  try {
    isDirectoryPickerActive = true;
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    lastDirectoryHandle = dirHandle;

    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\');
      console.log("Full path:", fullPath);
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error selecting folder:", error);
    if (error.name !== 'AbortError') {
      alert(`Error: ${error.message}`);
    }
  } finally {
    isDirectoryPickerActive = false;
  }
}

async function loadFolderFromPath(path) {
  console.log("Attempting to load folder from path:", path);
  if (isDirectoryPickerActive) {
    console.log("Directory picker is already active");
    return;
  }
  
  try {
    isDirectoryPickerActive = true;
    if (lastDirectoryHandle && path) {
      try {
        const parts = path.split('\\').filter(p => p);
        let currentHandle = lastDirectoryHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        await handleFolderPick(currentHandle);
        return;
      } catch (error) {
        console.log("Failed to navigate from last handle:", error);
      }
    }

    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    lastDirectoryHandle = dirHandle;

    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\');
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error loading folder from path:", error);
    if (error.name !== 'AbortError') {
      alert(`Error: ${error.message}`);
    }
  } finally {
    isDirectoryPickerActive = false;
  }
}


folderPickerButton.addEventListener("click", async () => {
  console.log("Folder picker button clicked");
  try {
    await handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});


itemsOptions.forEach(option => {
  option.addEventListener('click', () => {
    itemsOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    setItemsPerPage(parseInt(option.dataset.value));
    itemsBtn.innerHTML = `${getItemsPerPage()} Items <i class="fa fa-chevron-down"></i>`;
    setCurrentPage(0);
    updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
    renderPage(getCurrentPage());
  });
});

sortOptions.forEach(option => {
  option.addEventListener('click', () => {
    sortOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    const currentSort = getCurrentSort();
    setCurrentSort({ ...currentSort, field: option.dataset.value });
    sortFiles();
    setCurrentPage(0);
    updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
    renderPage(getCurrentPage());
  });
});

// Sort direction is now handled in ui.js

// Initialize UI and add pagination event listeners
initializeUI().then(() => {
  const { prevPageBtn, nextPageBtn } = getUIElements();

  if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      const currentPage = getCurrentPage();
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
        renderPage(getCurrentPage());
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
      }
    });

    nextPageBtn.addEventListener("click", () => {
      const currentPage = getCurrentPage();
      const maxPage = Math.ceil(filteredModelFiles.length / getItemsPerPage()) - 1;
      if (currentPage < maxPage) {
        setCurrentPage(currentPage + 1);
        renderPage(getCurrentPage());
        updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
      }
    });
  }
});

// Drag and Drop Handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  viewerContainer.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.target === viewerContainer) {
    viewerContainer.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  viewerContainer.classList.remove('drag-over');

  console.log("Drop event triggered");

  try {
    const droppedFiles = e.dataTransfer.files;
    console.log("Number of dropped files:", droppedFiles.length);

    // Clear existing files
    modelFiles = [];
    viewerContainer.innerHTML = "";

    // Process each dropped file
    for (const file of droppedFiles) {
      console.log("Processing file:", file.name, "size:", file.size, "type:", file.type);

      const lowerCaseName = file.name.toLowerCase();
      let type = null;

      // Determine file type
      if (lowerCaseName.endsWith(".glb")) type = "glb";
      else if (lowerCaseName.endsWith(".fbx")) type = "fbx";
      else if (lowerCaseName.endsWith(".mp4") || lowerCaseName.endsWith(".webm") || lowerCaseName.endsWith(".ogg")) type = "video";
      else if (lowerCaseName.endsWith(".mp3") || lowerCaseName.endsWith(".wav")) type = "audio";
      else if (lowerCaseName.endsWith(".jpg") || lowerCaseName.endsWith(".jpeg") || lowerCaseName.endsWith(".png") || lowerCaseName.endsWith(".gif")) type = "image";

      if (type) {
        console.log("Adding file:", file.name, "as type:", type);
        modelFiles.push({ name: file.name, file, type });
      }
    }

    console.log("Total files added:", modelFiles.length);

    if (modelFiles.length > 0) {
      // Sort and display files
      modelFiles.sort((a, b) => a.name.localeCompare(b.name));
      updateFilteredModelFiles();
      setCurrentPage(0);
      updatePagination(Math.ceil(filteredModelFiles.length / getItemsPerPage()));
      renderPage(getCurrentPage());
      console.log("View updated with new files");
    } else {
      console.log("No supported files found in drop");
      alert("No supported files found. Please drop GLB, FBX, video, audio, or image files.");
    }

  } catch (error) {
    console.error("Error processing dropped files:", error);
    alert(`Error processing files: ${error.message}`);
  }
}

// Add event listener to stop all preview videos when returning to grid
document.getElementById('returnButton').addEventListener('click', () => {
  document.querySelectorAll('.preview-video').forEach(video => {
    video.pause();
    video.currentTime = 0;
  });
});

// Add drag and drop event listeners
viewerContainer.addEventListener('dragenter', handleDragOver);
viewerContainer.addEventListener('dragover', handleDragOver);
viewerContainer.addEventListener('dragleave', handleDragLeave);
viewerContainer.addEventListener('drop', handleDrop);

export {
  getFilesFromDirectory,
  handleFolderPick,
  loadTileContent,
  renderPage,
  handleFolderSelection,
  loadFolderFromPath,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  modelFiles,
  filteredModelFiles,
  updateFilteredModelFiles,
  sortFiles,
  updatePagination,
  showFullscreen,
  formatFileSize,
  formatDate,
  formatTime,
  createPlaceholder,
  lastDirectoryHandle,
  currentFullscreenViewer,
  tileObserver,
  observerOptions,
  folderPickerButton,
  viewerContainer,
  itemsOptions,
  itemsBtn,
  sortOptions,
  sortDirectionBtn
};
