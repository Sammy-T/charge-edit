/* jshint node: true */

const {ipcRenderer} = require('electron');

const findField = document.querySelector('#find-field');

let dialogId = null;
let parentId = null;

ipcRenderer.on('on-show', (event, res) => {
    console.log(event);
    console.log(res);
    
    dialogId = res.windowId;
    parentId = res.parentId;
});

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