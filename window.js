/* jshint node: true */

const {ipcRenderer} = require('electron');
const fs = require('fs');

const title = document.querySelector('title');
const editText = document.querySelector('#edit-text');
const fileStatus = document.querySelector('#file-status');
const contentCount = document.querySelector('#content-count');
const encodingSelect = document.querySelector('#content-encoding');
const spaceSelect = document.querySelector('#tab-space-count');
const tabBackIc = document.querySelector('#tab-backspace-ic');
const autoIndentIc = document.querySelector('#auto-indent-ic');

let currentFile = '';
let unsavedChanges = false;

let tabBackspacing = true;
let autoIndenting = true;
let tabSpaces = 4;

// Respond to close events on the window
ipcRenderer.on('on-close', (event, windowId) => {
    const res = {
        windowId: windowId,
        close: !unsavedChanges,
        filePath: currentFile
    };
    
    ipcRenderer.send('confirm-close', res);
});

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
    
    // Disable the text area and show a Loading msg
    editText.disabled = true;
    editText.value = 'Loading...';
    
    fs.readFile(openPaths[0], encodingSelect.value, (err, data) => {
        editText.disabled = false; // Enable the text area
        
        if(err){
            console.error(err);
            return;
        }
        
        console.log(data);
        editText.value = data; // Display the file contents in the text area
        
        onSelectionChanged(); // Update the line count
    });
});

// Respond to search requests from the find dialog
ipcRenderer.on('find-text', (event, res) => {
    if(editText.value === '') return;
    
    // Requesing focus seems to resolve the intermittent issue where the selection occurs
    // but it isn't being highlighted
    editText.focus();
    
    console.log(`Entering select: [${editText.selectionStart}, ${editText.selectionEnd}] - ${editText.value.length}`);
    
    // Set the Search From position to the selection end
    // or the start of the text, if the cursor is at the end
    let searchFrom = (editText.selectionEnd === editText.value.length) ? 0 : editText.selectionEnd;
    
    // Find the total number of matching values and the next matching value's position
    const matches = editText.value.match(new RegExp(res.searchText, "gi")).length;
    const nextMatch = editText.value.toLowerCase().indexOf(res.searchText, searchFrom);
    
    // Select the match if one was found or reset the selection otherwise
    if(nextMatch > -1){
        editText.selectionStart = nextMatch;
        editText.selectionEnd = nextMatch + res.searchText.length;
    }else{
        editText.selectionEnd = 0;
    }
    
    // Find which match number is selected out of the total
    let matchNum = 0;
    let mIndex = 0;
    const workingText = editText.value.toLowerCase();
    
    for(let i=0; i < matches; i++){
        mIndex = workingText.indexOf(res.searchText, mIndex); // Search the text starting at the index
        
        if(mIndex <= nextMatch) matchNum++;
        
        mIndex += res.searchText.length; // Move the index to the end of the word
    }
    
    const response = {
        dialogId: res.dialogId,
        windowId: res.windowId,
        searchText: res.searchText,
        matchNum: matchNum,
        totalMatches: matches,
        totalsText: `${matchNum}/${matches}`
    };
    
    ipcRenderer.send('text-found', response);
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
    fs.writeFile(savePath, editText.value, encodingSelect.value, err => {
        if(err){
            console.error(err);
            return;
        }
        
        unsavedChanges = false;
        updateCurrentFile(savePath);
    });
}

function handleTab(event){
    event.preventDefault();
    
    const selectStart = editText.selectionStart;

    // Insert the tab spaces at the selection
    editText.value = editText.value.substr(0, editText.selectionStart) + ' '.repeat(tabSpaces) + editText.value.substr(editText.selectionEnd);

    editText.selectionEnd = selectStart + tabSpaces; // Update the selection position

    // Update the unsaved changes
    if(!unsavedChanges){
        unsavedChanges = true;
        updateCurrentFile(currentFile);
    }
}

function handleBackspace(event){
    // Get all of the text leading up to the selection
    let upToCursor = editText.value.substr(0, editText.selectionStart);

    // If we're backspacing a tab, delete the whole tab
    if(tabBackspacing && upToCursor.endsWith(' '.repeat(tabSpaces))){
        event.preventDefault();

        const selectStart = editText.selectionStart;

        editText.value = upToCursor.substr(0, editText.selectionStart - tabSpaces) + editText.value.substr(editText.selectionEnd);

        editText.selectionEnd = selectStart - tabSpaces;
    }

    // Trigger the response to the change with a delay
    // since the onkeydown function returns before the content changes and makes the data we access stale.
    setTimeout(onSelectionChanged, 30);
}

function handleEnter(event){
    if(!autoIndenting) return; // Return early if auto-indenting is off
    
    // Get all of the text leading up to the selection
    let upToCursor = editText.value.substr(0, editText.selectionStart);
    
    // If we're past the first line, start after the last newline.
    // If we're on the first line, start at the beginning.
    let lineStart = upToCursor.lastIndexOf('\n');
    lineStart = ((lineStart > -1) ? lineStart+1 : 0);
    
    let currentLine = upToCursor.substr(lineStart);
    
    // Determine the leading tabs on the line
    // (There's probably a way to do this with regex but.. yeah)
    let tabs = 0;
    while(currentLine.startsWith(' '.repeat(tabSpaces))){
        currentLine = currentLine.substr(tabSpaces-1);
        tabs++;
    }
    
    // Add any existing tabs to the new line
    if(tabs > 0){
        event.preventDefault();
        
        const selectStart = editText.selectionStart;
        
        editText.value = upToCursor + '\n' + ' '.repeat(tabSpaces).repeat(tabs) + editText.value.substr(editText.selectionEnd);
        
        editText.selectionEnd = selectStart + (tabSpaces * tabs) + 1;
    }
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
    switch(event.key){
        case 'Tab':
            handleTab(event);
            break;
            
        case 'Backspace':
            handleBackspace(event);
            break;
            
        case 'Enter':
            handleEnter(event);
            break;
    }
};

document.addEventListener('selectionchange', function(event) {
    if(document.activeElement.id !== editText.id) return; // Only respond to changes from the text area
    onSelectionChanged();
});

tabBackIc.addEventListener('click', function(event) {
    // Toggle tab backspacing
    tabBackspacing = !tabBackspacing;
    this.style.opacity = tabBackspacing ? 0.65 : 0.25;
});

autoIndentIc.addEventListener('click', function(event) {
    // Toggle auto indenting
    autoIndenting = !autoIndenting;
    this.style.opacity = autoIndenting ? 0.65 : 0.25;
});

spaceSelect.addEventListener('change', () => {
    tabSpaces = spaceSelect.valueAsNumber;
});