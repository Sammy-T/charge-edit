/* jshint node: true */

const {ipcRenderer} = require('electron');
const fs = require('fs');

const editText = document.querySelector('#edit-text');
const title = document.querySelector('title');

let currentFile = '';
let unsavedChanges = false;

// Respond to the 'save' menu item or shortcut.
// This saves the current file or requests to open the save dialog if there's no current file.
ipcRenderer.on('save', (event, windowId) => {
    if(currentFile !== ''){
        saveFile(currentFile); // Automatically save to the current file
    }else{
        // Send a message to the main process to open the save dialog.
        // Additionally passing the window id to include in the dialog creation.
        ipcRenderer.send('open-save-dialog', windowId);
    }
});

// Respond to the returned path of the save dialog
ipcRenderer.on('save-as', (event, savePath) => {
    console.log(savePath);
    console.log(editText.value);
    
    saveFile(savePath);
});

// Respond to the returned path(s) of the open dialog
ipcRenderer.on('open', (event, openPaths) => {
    unsavedChanges = false;
    
    console.log(openPaths);
    updateCurrentFile(openPaths[0]);
    
    fs.readFile(openPaths[0], 'utf8', (err, data) => {
        if(err){
            console.error(err);
            return;
        }
        
        console.log(data);
        editText.value = data; // Display the file contents in the text area
    });
});

// Updates the current file and the window title
function updateCurrentFile(filePath){
    currentFile = filePath;
    
    let titleText = `Charge Edit - ${filePath}`;
    if(unsavedChanges){
        titleText += "*";
    }
    
    title.innerHTML = titleText;
}

function saveFile(savePath){
    fs.writeFile(savePath, editText.value, 'utf8', err => {
        if(err){
            console.error(err);
            return;
        }
        
        unsavedChanges = false;
        updateCurrentFile(savePath);
    });
}

// Listen for input changes on the text area
// and display an indication of unsaved changes
editText.addEventListener('input', (event) => {
    if(!unsavedChanges){
        unsavedChanges = true;
        updateCurrentFile(currentFile);
    }
});