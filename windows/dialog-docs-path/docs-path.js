/* jshint node:true */

const {ipcRenderer} = require('electron');

const defaultPathRadio = document.querySelector('#default-path');
const customPathRadio = document.querySelector('#custom-path');
const pathTextField = document.querySelector('#path-text');
const selectDir = document.querySelector('#select-directory');

let dialogId = null;

// Respond to the dialog window being shown.
// Store the window ids of the dialog and its parent window.
ipcRenderer.on('on-show', (event, res) => {
    dialogId = res.windowId;
});

// Respond to the returned path(s) of the open directory dialog
ipcRenderer.on('selected-directory', (event, selectedPaths) => {
    if(!pathTextField.validity.valid){
        pathTextField.setCustomValidity('');
    }
    
    pathTextField.value = selectedPaths[0];
    customPathRadio.value = selectedPaths[0];
});

defaultPathRadio.addEventListener('change', function(event) {
    if(!pathTextField.validity.valid){
        pathTextField.setCustomValidity('');
    }
});

pathTextField.addEventListener('input', function(event) {
    if(!this.validity.valid) this.setCustomValidity('');
    
    // Update the radio input's value to match the text input's
    customPathRadio.value = this.value;
});

selectDir.addEventListener('click', function(event) {
    // Request the Main process to show the system's 'open' dialog
    ipcRenderer.send('open-sys-dir-dialog', dialogId);
});

window.addEventListener('keypress', (event) => {
    // Prevent submitting with the Enter key from the text input field
    if(event.key === 'Enter' && event.target.id === 'path-text'){
        event.preventDefault();
    }
});

window.addEventListener('keyup', (event) => {
    // Signal to close the dialog when Escape is pressed
    if(event.key === 'Escape') ipcRenderer.send('close-dialog', dialogId);
});

document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const pathValue = new FormData(event.target).get('docs-path');
    
    if(pathValue === 'custom' || pathValue === ''){
        pathTextField.setCustomValidity('Please enter a valid path or select one from the menu');
        pathTextField.reportValidity();
        return;
    }
    
    // Notify the Main process to update the document directory
    ipcRenderer.send('set-docs-path', {windowId: dialogId, path: pathValue});
});