// Selection state
let selectedFiles = new Set();

// Initialize selection state
export function initializeSelection() {
    selectedFiles.clear();
    updateSelectionUI(document.getElementById('selectionDropdown'));
}

// Update selection UI
export function updateSelectionUI(dropdown) {
    if (!dropdown) return;
    dropdown.textContent = `${selectedFiles.size} Selected`;
    dropdown.innerHTML += ' <i class="fa fa-chevron-down"></i>';
}

// Toggle file selection
export function toggleSelection(file) {
    if (selectedFiles.has(file)) {
        selectedFiles.delete(file);
    } else {
        selectedFiles.add(file);
    }
    updateSelectionUI(document.getElementById('selectionDropdown'));
}

// Clear selection
export function clearSelection() {
    selectedFiles.clear();
    updateSelectionUI(document.getElementById('selectionDropdown'));
}

// Download selected files
export function downloadSelected(files) {
    if (selectedFiles.size === 0) {
        alert('No files selected');
        return;
    }

    // Create a zip file of selected files
    const selectedArray = files.filter(file => selectedFiles.has(file));
    if (selectedArray.length === 0) {
        alert('No valid files selected');
        return;
    }

    // Trigger download for each file
    selectedArray.forEach(file => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
}

// Check if file is selected
export function isSelected(file) {
    return selectedFiles.has(file);
}
