// File size formatting
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Date formatting
export function formatDate(date) {
    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if file is supported
export function isSupportedFile(filename) {
    const supportedExtensions = [
        '.fbx', '.glb', '.gltf',  // 3D models
        '.mp4', '.webm', '.ogg',  // Video
        '.mp3', '.wav',           // Audio
        '.jpg', '.jpeg', '.png', '.gif', '.webp'  // Images
    ];
    const ext = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    return supportedExtensions.includes(`.${ext}`);
}

// Generate thumbnail URL
export function generateThumbnailUrl(file) {
    if (!file) return '';
    const ext = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    
    // Return object URL for images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return URL.createObjectURL(file);
    }
    
    // Return default icons for other types
    const iconMap = {
        fbx: 'model',
        glb: 'model',
        gltf: 'model',
        mp4: 'video',
        webm: 'video',
        ogg: 'video',
        mp3: 'audio',
        wav: 'audio'
    };
    
    return `assets/icons/${iconMap[ext] || 'file'}.svg`;
}

// Clean up object URLs
export function revokeObjectUrl(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

// Error handling
export function handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    alert(`Error ${context}: ${error.message}`);
}
