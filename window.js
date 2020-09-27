/* jshint node: true */

const {ipcRenderer} = require('electron');
const fs = require('fs');

const title = document.querySelector('title');
const editText = document.querySelector('#edit-text');
const fileStatus = document.querySelector('#file-status');
const contentCount = document.querySelector('#content-count');

let currentFile = '';
let unsavedChanges = false;

let tabSpaces = 4;

// Respond to the 'new' menu item or shortcut.
// Resets the window condition and clears the current file.
ipcRenderer.on('new', (event) => {
    editText.value = '';
    currentFile = '';
    unsavedChanges = false;
    
    updateCurrentFile(currentFile);
});

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

// Updates the current file and the save status
function updateCurrentFile(filePath){
    currentFile = filePath;
    
    let titleText = `Charge Edit - ${filePath}`;
    if(unsavedChanges){
        titleText += "*";
        fileStatus.innerHTML = "unsaved";
    }else if(filePath === ''){
        fileStatus.innerHTML = "unsaved";
    }else{
        fileStatus.innerHTML = "saved";
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

function onSelectionChanged(){
    // Get all of the text leading up to the selection
    let upToCursor = editText.value.substr(0, editText.selectionStart);
    
    // If we're past the first line, start after the last newline.
    // If we're on the first line, start at the beginning.
    let lineStart = upToCursor.lastIndexOf('\n');
    lineStart = ((lineStart > -1) ? lineStart+1 : 0);
    
    let currentLine = upToCursor.substr(lineStart);
    
    let line = (upToCursor.match(/\n/g) || []).length + 1; // Match the newlines to find the line count
    let col = currentLine.length + 1;
    
    let totalLines = (editText.value.match(/\n/g) || []).length + 1;
    
//    console.log(`[${line},${col}] - ${editText.textLength} ${currentLine.replace(/\n/, '')}`);
//    if(document.getSelection().toString().length > 0){
//        console.log(`${document.getSelection()}`);
//    }
    
    contentCount.innerHTML = `line ${line}, col ${col} -  ${totalLines} lines`;
}

// Listen for input changes on the text area
// and display an indication of unsaved changes
editText.addEventListener('input', function(event) {
    if(!unsavedChanges){
        unsavedChanges = true;
        updateCurrentFile(currentFile);
    }
});

editText.onkeydown = function(event) {
    // Listen for key events on the text area
    if(event.key === 'Tab'){
        event.preventDefault();
        
        const selectStart = this.selectionStart;
        
        // Insert the tab spaces at the selection
        this.value = this.value.substr(0, this.selectionStart) + ' '.repeat(tabSpaces) + this.value.substr(this.selectionEnd);
        
        this.selectionEnd = selectStart + tabSpaces; // Update the selection position
        
        // Update the unsaved changes
        if(!unsavedChanges){
            unsavedChanges = true;
            updateCurrentFile(currentFile);
        }
    }else if(event.key === 'Backspace'){
        // Get all of the text leading up to the selection
        let upToCursor = this.value.substr(0, this.selectionStart);
        
        // If we're backspacing a tab, delete the whole tab
        if(upToCursor.endsWith(' '.repeat(tabSpaces))){
            event.preventDefault();
            
            const selectStart = this.selectionStart;
            
            this.value = upToCursor.substr(0, this.selectionStart - tabSpaces) + this.value.substr(this.selectionEnd);
            
            this.selectionEnd = selectStart - tabSpaces;
        }
        
        // Trigger the response to the change with a delay
        // since the onkeydown function returns before the content changes and makes the data we access stale.
        setTimeout(onSelectionChanged, 30);
    }
};

document.addEventListener('selectionchange', function(event) {
    if(document.activeElement.id !== editText.id) return; // Only respond to changes from the text area
    onSelectionChanged();
});