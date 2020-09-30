/* jshint node: true */

const {ipcRenderer} = require('electron');

const findField = document.querySelector('#find-field');
const findTotal = document.querySelector('#find-total');

let dialogId = null;
let parentId = null;

// Respond to the dialog window being shown.
// Store the window ids of the dialog and its parent window.
ipcRenderer.on('on-show', (event, res) => {
    dialogId = res.windowId;
    parentId = res.parentId;
});

// Respond to the results of a search.
// Update the totals text.
ipcRenderer.on('on-text-found', (event, res) => {
    findTotal.innerHTML = res.totalsText;
});

// Pass along the search text value when the form is submitted
document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    if(dialogId === null || parentId === null){
        findField.value = 'Internal Error!';
        return;
    }
    
    const res = {
        dialogId: dialogId,
        windowId: parentId,
        searchText: findField.value
    };
    
    ipcRenderer.send('find', res);
});