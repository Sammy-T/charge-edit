/* jshint node: true */

const {ipcRenderer, remote} = require('electron');
const fs = require('fs');

const editText = document.querySelector('#edit-text');
const title = document.querySelector('title');

let currentFile = null;

ipcRenderer.on('save', (event) => {
    if(currentFile === null){
        // Send a message to the main process to open the save dialog.
        // Additionally passing the window id to include in the dialog creation.
        const win = remote.getCurrentWindow();
        ipcRenderer.send('open-save-dialog', win.id);
    }else{
        saveFile(currentFile); // Automatically save to the current file
    }
});

ipcRenderer.on('save-as', (event, savePath) => {
    console.log(savePath);
    console.log(editText.value);
    
    saveFile(savePath);
});

ipcRenderer.on('open', (event, openPaths) => {
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
    title.innerHTML = `Charge Edit - ${filePath}`;
}

function saveFile(savePath){
    fs.writeFile(savePath, editText.value, 'utf8', err => {
        if(err){
            console.error(err);
            return;
        }
        
        updateCurrentFile(savePath);
    });
}