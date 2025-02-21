// File state
let modelFiles = [];

// File type filters
const fileTypes = {
    fbx: ['.fbx'],
    glb: ['.glb', '.gltf'],
    video: ['.mp4', '.webm', '.ogg'],
    audio: ['.mp3', '.wav', '.ogg'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

// Get file extension
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

// Check if file matches current filters
function matchesFilters(file) {
    const ext = getFileExtension(file.name);
    for (const [type, extensions] of Object.entries(fileTypes)) {
        if (document.getElementById(`filter-${type}`).checked && extensions.includes(`.${ext}`)) {
            return true;
        }
    }
    return false;
}

// Sort files based on current sort settings
function sortFiles(files) {
    const sortBy = document.querySelector('.sort-option.active').dataset.value;
    const ascending = document.querySelector('.sort-direction i').classList.contains('fa-sort-up');
    
    return [...files].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'type':
                comparison = getFileExtension(a.name).localeCompare(getFileExtension(b.name));
                break;
            case 'date':
                comparison = a.lastModified - b.lastModified;
                break;
        }
        return ascending ? comparison : -comparison;
    });
}

// Filter and sort files
function filterAndSortFiles() {
    const filtered = modelFiles.filter(matchesFilters);
    return sortFiles(filtered);
}

// Export functions
export function getModelFiles() {
    return modelFiles;
}

export function setFilteredFiles(files) {
    modelFiles = files;
    return filterAndSortFiles();
}
