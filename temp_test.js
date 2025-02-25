// temp_test.js - Temporary test script for fullscreen mode
// This will be removed after testing

document.addEventListener('DOMContentLoaded', () => {
  // Create a button to trigger the test
  const testButton = document.createElement('button');
  testButton.textContent = 'Test';
  testButton.style.position = 'fixed';
  testButton.style.bottom = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '1000';
  testButton.style.padding = '5px 10px';
  testButton.style.backgroundColor = 'rgba(155, 119, 255, 0.7)';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '4px';
  testButton.style.cursor = 'pointer';
  testButton.style.fontSize = '12px';
  testButton.style.opacity = '0.7';
  
  document.body.appendChild(testButton);
  
  // Add click event to test button
  testButton.addEventListener('click', testFullscreenMode);
});

// Function to create a mock file and display it in fullscreen mode
async function testFullscreenMode() {
  console.log('Testing fullscreen mode with updated file information panel');
  
  // Create a mock image file
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  // Draw a gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#3498db');
  gradient.addColorStop(1, '#9b59b6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw some text
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Test Image', canvas.width / 2, canvas.height / 2);
  
  // Convert canvas to blob
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  
  // Create a mock file object
  const mockFile = new File([blob], 'test_image.png', { 
    type: 'image/png',
    lastModified: new Date().getTime()
  });
  
  // Create a mock model object similar to what would be in the modelFiles array
  const mockModel = {
    name: 'test_image.png',
    file: mockFile,
    type: 'image',
    fullPath: 'Test\\Folder\\test_image.png'
  };
  
  // Import the showFullscreen function from asset_loading.js
  import('./asset_loading.js').then(module => {
    // Call showFullscreen with our mock model
    module.showFullscreen(mockModel);
  }).catch(error => {
    console.error('Error importing asset_loading.js:', error);
  });
}
