// Function to add log entries
function addLog(message, type = 'info') {
  const logContainer = document.getElementById('log-entries');
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  const presetSelect = document.getElementById('preset');
  const endpointInput = document.getElementById('endpoint');
  const saveButton = document.getElementById('save-btn');
  const testButton = document.getElementById('test-btn');
  const currentEndpoint = document.getElementById('current-endpoint');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');

  // Hide messages initially
  successMessage.style.display = 'none';
  errorMessage.style.display = 'none';

  // Load current endpoint
  chrome.storage.sync.get('endpoint', (data) => {
    if (data.endpoint) {
      currentEndpoint.textContent = `Current Endpoint: ${data.endpoint}`;
      addLog(`Loaded current endpoint: ${data.endpoint}`);
    } else {
      currentEndpoint.textContent = 'No endpoint set';
      addLog('No endpoint set', 'info');
    }
  });

  // Save button click event
  saveButton.addEventListener('click', () => {
    const selectedEndpoint = endpointInput.value || presetSelect.value;
    if (selectedEndpoint) {
      chrome.storage.sync.set({ endpoint: selectedEndpoint }, () => {
        currentEndpoint.textContent = `Current Endpoint: ${selectedEndpoint}`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        addLog(`Endpoint saved: ${selectedEndpoint}`, 'success');
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);
      });
    } else {
      errorMessage.style.display = 'block';
      successMessage.style.display = 'none';
      addLog('Invalid endpoint', 'error');
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 3000);
    }
  });

  // Test button click event
  testButton.addEventListener('click', () => {
    addLog('Testing endpoint...');
    chrome.runtime.sendMessage({ action: "testEndpoint" }, (response) => {
      if (chrome.runtime.lastError) {
        addLog(`Error testing endpoint: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response.success) {
        addLog(`Endpoint test successful: ${response.data}`, 'success');
      } else {
        addLog(`Endpoint test failed: ${response.error}`, 'error');
      }
    });
  });

  // Preset dropdown change event
  presetSelect.addEventListener('change', () => {
    if (presetSelect.value) {
      endpointInput.value = presetSelect.value;
      addLog(`Selected preset: ${presetSelect.value}`);
    }
  });

  // Custom endpoint input event
  endpointInput.addEventListener('input', () => {
    presetSelect.selectedIndex = -1;
    addLog(`Custom endpoint entered: ${endpointInput.value}`);
  });
});