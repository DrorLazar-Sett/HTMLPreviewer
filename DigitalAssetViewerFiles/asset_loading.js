// asset_loading.js
import FBXViewer from './viewer_fbx.js';
import * as UI from './ui.js'; // Import UI module
import * as THREE from 'three'; // Import three here as well, if needed for model loading in this module

const folderPickerButton = document.getElementById("folderPicker");
const folderPathInput = document.getElementById("folderPath");
const viewerContainer = document.getElementById("viewerContainer");
const filterFBX = document.getElementById('filter-fbx');
const filterGLB = document.getElementById('filter-glb');
const filterVideo = document.getElementById('filter-video');
const filterAudio = document.getElementById('filter-audio');
const filterImage = document.getElementById('filter-image');
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
  // Time formatting utility - Converts seconds to HH:MM:SS format for video/audio display
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


// Sort files based on current sort settings
function sortFiles() {
  filteredModelFiles.sort((a, b) => {
    let comparison = 0;
    switch (UI.currentSort.field) {
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
    return UI.currentSort.direction === 'asc' ? comparison : -comparison;
  });
}

// File retrieval function - Recursively collects files from selected directory
async function getFilesFromDirectory(dirHandle, recursive) {
  let files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      files.push({ name, handle });
    } else if (handle.kind === "directory" && recursive) {
      const subFiles = await getFilesFromDirectory(handle, true);
      files = files.concat(subFiles);
    }
  }
  return files;
}

// Filter management - Updates displayed assets based on active file type filters
function updateFilteredModelFiles() {
  filteredModelFiles = modelFiles.filter(item => {
    if (item.type === 'fbx' && !filterFBX.checked) return false;
    if (item.type === 'glb' && !filterGLB.checked) return false;
    if (item.type === 'video' && !filterVideo.checked) return false;
    if (item.type === 'audio' && !filterAudio.checked) return false;
    if (item.type === 'image' && !filterImage.checked) return false;
    return true;
  });
}


async function handleFolderPick(dirHandle) {
  // Folder processing - Handles the selected directory and processes its contents
  console.log("Starting folder processing");
  modelFiles = [];
  viewerContainer.innerHTML = "";
  try {
    let fileEntries = [];
    if (UI.loadSubfolders) {
      console.log("Loading files with subfolders");
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
        modelFiles.push({ name, file, type });
        console.log(`Added ${type} file: ${name}`);
      }
    }
    console.log(`Processed ${modelFiles.length} supported files`);
    modelFiles.sort((a, b) => a.name.localeCompare(b.name));
    console.log("Files sorted alphabetically");
    updateFilteredModelFiles();
    console.log(`Filtered to ${filteredModelFiles.length} files based on current filters`);
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
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
      viewer.loadModel(URL.createObjectURL(model.file));

    } else if (model.type === "video") {
      const videoPreview = document.createElement("div");
      videoPreview.className = "video-preview";
      const video = document.createElement("video");
      video.src = URL.createObjectURL(model.file);
      video.muted = true;
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
  // Page rendering - Creates and displays asset preview tiles for the current page
  viewerContainer.innerHTML = "";
  const startIndex = pageIndex * UI.itemsPerPage;
  const pageItems = filteredModelFiles.slice(startIndex, startIndex + UI.itemsPerPage);
  pageItems.forEach(model => {
    // Create tile with placeholder
    const tile = document.createElement("div");
    tile.className = "model-tile" + (UI.selectedFiles.has(model.name) ? " selected" : "");
    tile.dataset.modelType = model.type;
    tile.dataset.modelName = model.name;

    // Add selection indicator
    const selectionIndicator = document.createElement('div');
    selectionIndicator.className = 'selection-indicator';
    selectionIndicator.innerHTML = '<i class="fa fa-check"></i>';
    tile.appendChild(selectionIndicator);

    // Add click handler for selection
    tile.addEventListener('click', (e) => {
      // Don't trigger selection when clicking fullscreen button or video controls
      if (e.target.closest('.fullscreen-btn') || e.target.closest('.scrub-bar-container')) {
        return;
      }
      UI.toggleSelectionUI(model.name, renderPage); // Use toggleSelectionUI from UI module
    });

    // Add fullscreen button if not audio
    if (model.type !== "audio") {
      const fsBtn = document.createElement('button');
      fsBtn.className = 'fullscreen-btn';
      fsBtn.innerHTML = '<i class="fa fa-expand"></i>';
      fsBtn.onclick = () => showFullscreen(model);
      tile.appendChild(fsBtn);
    }

    // Add placeholder based on type
    tile.appendChild(createPlaceholder(model.type));

    // Store model data for lazy loading
    tile.model = model;
    // Add name label
    const nameDiv = document.createElement("div");
    nameDiv.className = model.type === "video" ? "video-name" : "model-name";
    nameDiv.textContent = model.name;
    tile.appendChild(nameDiv);

    // Add file info (size and date)
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `
      ${formatFileSize(model.file.size)} •
      ${formatDate(model.file.lastModified)}
    `;
    tile.appendChild(fileInfo);

    viewerContainer.appendChild(tile);

    // Start observing the tile
    tileObserver.observe(tile);
  });
  updatePagination(); // Call updatePagination after rendering page
}

function updatePagination() {
  const totalPages = Math.ceil(filteredModelFiles.length / UI.itemsPerPage);
  UI.updatePagination(totalPages); // Call updatePagination from UI module
}


async function showFullscreen(model) {
  // Fullscreen view handler - Manages expanded view of assets with type-specific display logic
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenViewer = document.getElementById('fullscreenViewer');
  const fullscreenVideo = document.getElementById('fullscreenVideo');

  fullscreenOverlay.style.display = 'flex';
  fullscreenViewer.innerHTML = '';
  fullscreenVideo.style.display = 'none';
  if (model.type === "glb") {
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
    currentFullscreenViewer = mv;
  } else if (model.type === "fbx") {
    const container = document.createElement('div');
    container.style.width = '50%';
    container.style.height = '100%';
    fullscreenViewer.appendChild(container);
    fullscreenViewer.style.display = 'block';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x3a3a3a);
    container.appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    const mixer = new THREE.AnimationMixer();
    const clock = new THREE.Clock();
    new THREE.FBXLoader().load(URL.createObjectURL(model.file), (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = 2 / maxDim;
      object.scale.set(scaleFactor, scaleFactor, scaleFactor);
      object.position.sub(center.multiplyScalar(scaleFactor));
      scene.add(object);
      if (object.animations && object.animations.length > 0) {
        mixer.clipAction(object.animations[0], object).play();
      }
      controls.target.copy(object.position);
      controls.update();
    });
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      mixer.update(delta);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', onWindowResize, false);
    currentFullscreenViewer = {
      container,
      scene,
      camera,
      renderer,
      controls,
      mixer,
      animate,
      cleanup: () => {
        window.removeEventListener('resize', onWindowResize);
        renderer.dispose();
      }
    };
    function onWindowResize() {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  } else if (model.type === "video") {
    fullscreenViewer.style.display = 'none';
    fullscreenVideo.style.display = 'block';
    fullscreenVideo.src = URL.createObjectURL(model.file);
    fullscreenVideo.play();
    currentFullscreenViewer = fullscreenVideo;
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
    currentFullscreenViewer = img;
  }
}


// Handle folder selection
async function handleFolderSelection() {
  console.log("Selecting folder");
  try {
    // Show directory picker
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    // Store for future use
    lastDirectoryHandle = dirHandle;

    // Get the full path
    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\'); // Note: double backslash for path in input
      console.log("Full path:", fullPath);
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    // Update input field with path
    folderPathInput.value = fullPath;

    // Process the directory
    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error selecting folder:", error);
    alert(`Error: ${error.message}`);
  }
}

// Function to handle loading folder from path
async function loadFolderFromPath(path) {
  console.log("Attempting to load folder from path:", path);
  try {
    // Try to use the last directory handle if available
    if (lastDirectoryHandle && path) {
      try {
        // Try to navigate to the specified path
        const parts = path.split('\\').filter(p => p); // Split by double backslash
        let currentHandle = lastDirectoryHandle;

        for (const part of parts) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        // Update input field with path
        folderPathInput.value = path;

        // Process the directory
        await handleFolderPick(currentHandle);
        return;
      } catch (error) {
        console.log("Failed to navigate from last handle:", error);
      }
    }

    // If no handle or navigation failed, show directory picker
    const dirHandle = await window.showDirectoryPicker({
      startIn: lastDirectoryHandle || 'downloads'
    });

    // Store for future use
    lastDirectoryHandle = dirHandle;

    // Get the full path
    let fullPath = dirHandle.name;
    try {
      const relativeParts = [];
      let current = dirHandle;
      while (current) {
        relativeParts.unshift(current.name);
        current = await current.getParent();
      }
      fullPath = relativeParts.join('\\'); // Note: double backslash for path in input
    } catch (error) {
      console.log("Could not get full path:", error);
    }

    // Update input field with path
    folderPathInput.value = fullPath;

    // Process the directory
    await handleFolderPick(dirHandle);
  } catch (error) {
    console.error("Error loading folder from path:", error);
    alert(`Error: ${error.message}`);
  }
}


// Handle Enter key in folder input
folderPathInput.addEventListener("keypress", async (event) => {
  if (event.key === "Enter") {
    console.log("Enter key pressed in folder input");
    await handleFolderSelection();
  }
});

folderPickerButton.addEventListener("click", async () => {
  // Folder selection handler
  console.log("Folder picker button clicked");
  try {
    await handleFolderSelection();
  } catch (error) {
    console.error("Error in folderPicker click:", error);
    alert(`Error: ${error.message}`);
  }
});


// Filter event setup
const filterCheckboxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]');
filterCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    updateFilteredModelFiles();
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});


// Initialize items per page controls
itemsOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Remove active class from all options
    itemsOptions.forEach(opt => opt.classList.remove('active'));
    // Add active class to clicked option
    option.classList.add('active');
    // Update items per page
    UI.itemsPerPage = parseInt(option.dataset.value);
    // Update button text
    itemsBtn.innerHTML = `${UI.itemsPerPage} Items <i class="fa fa-chevron-down"></i>`;
    // Update display
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});

// Initialize sort controls
sortOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Remove active class from all options
    sortOptions.forEach(opt => opt.classList.remove('active'));
    // Add active class to clicked option
    option.classList.add('active');
    // Update sort field
    UI.currentSort.field = option.dataset.value;
    sortFiles();
    UI.currentPage = 0;
    updatePagination();
    renderPage(UI.currentPage);
  });
});

sortDirectionBtn.addEventListener('click', () => {
  UI.currentSort.direction = UI.currentSort.direction === 'asc' ? 'desc' : 'asc';
  sortDirectionBtn.classList.toggle('desc', UI.currentSort.direction === 'desc');
  sortDirectionBtn.querySelector('span').textContent =
    UI.currentSort.direction === 'asc' ? 'Ascending' : 'Descending';
  sortFiles();
  UI.currentPage = 0;
  updatePagination();
  renderPage(UI.currentPage);
});


// Pagination button event listeners (moved to ui.js to handle UI-related events)
UI.prevPageBtn.addEventListener("click", () => {
  if (UI.currentPage > 0) {
    UI.currentPage--;
    renderPage(UI.currentPage);
    updatePagination();
  }
});

UI.nextPageBtn.addEventListener("click", () => {
  const maxPage = Math.ceil(filteredModelFiles.length / UI.itemsPerPage) - 1;
  if (UI.currentPage < maxPage) {
    UI.currentPage++;
    renderPage(UI.currentPage);
    updatePagination();
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
      UI.currentPage = 0;
      updatePagination();
      renderPage(UI.currentPage);
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
  folderPathInput,
  viewerContainer,
  filterFBX,
  filterGLB,
  filterVideo,
  filterAudio,
  filterImage,
  itemsOptions,
  itemsBtn,
  sortOptions,
  sortDirectionBtn
};
