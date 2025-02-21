// Import required modules
import { FBXViewer } from './FBXViewer.js';

// UI state
let currentPage = 0;
let itemsPerPage = 20;
let filteredFiles = [];
let viewers = new Map();

// Initialize UI components and event listeners
export function initializeUI() {
    setupEventListeners();
    setupDropdowns();
    setupDarkMode();
}

// Set up event listeners for UI controls
function setupEventListeners() {
    document.getElementById('folderPicker').addEventListener('click', handleFolderPick);
    document.getElementById('subfolderToggle').addEventListener('click', toggleSubfolders);
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
}

// Set up dropdown functionality
function setupDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.dropdown-btn');
        const content = dropdown.querySelector('.dropdown-content');
        
        button.addEventListener('click', () => {
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                content.style.display = 'none';
            }
        });
    });
}

// Handle folder selection
async function handleFolderPick() {
    try {
        const folderPath = document.getElementById('folderPath').value;
        if (!folderPath) return;

        // Clear existing viewers
        viewers.forEach(viewer => viewer.dispose());
        viewers.clear();

        // Update UI
        updatePagination();
        renderPage(0);
    } catch (error) {
        console.error('Error handling folder pick:', error);
        alert('Error loading folder: ' + error.message);
    }
}

// Toggle subfolder inclusion
function toggleSubfolders() {
    const button = document.getElementById('subfolderToggle');
    const isEnabled = button.textContent === 'Subfolders: On';
    button.textContent = isEnabled ? 'Subfolders: Off' : 'Subfolders: On';
    
    // Refresh view
    handleFolderPick();
}

// Update pagination controls
export function updatePagination() {
    const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
    document.getElementById('prevPage').disabled = currentPage === 0;
    document.getElementById('nextPage').disabled = currentPage >= totalPages - 1;
}

// Change current page
function changePage(delta) {
    const newPage = currentPage + delta;
    const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
    
    if (newPage >= 0 && newPage < totalPages) {
        currentPage = newPage;
        renderPage(currentPage);
        updatePagination();
    }
}

// Render current page of items
export function renderPage(page) {
    const container = document.getElementById('viewerContainer');
    container.innerHTML = '';
    
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredFiles.length);
    
    for (let i = start; i < end; i++) {
        const file = filteredFiles[i];
        const viewer = createViewer(file);
        container.appendChild(viewer);
    }
}

// Create viewer for a file
function createViewer(file) {
    const container = document.createElement('div');
    container.className = 'viewer';
    
    // Create FBX viewer instance
    const viewer = new FBXViewer(container);
    viewers.set(container, viewer);
    
    return container;
}

// Dark mode functionality
function setupDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
}

function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Export additional functions
export function setFilteredFiles(files) {
    filteredFiles = files;
    currentPage = 0;
    updatePagination();
    renderPage(0);
}
