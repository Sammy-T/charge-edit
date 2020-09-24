/* jshint node: true */

const {ipcRenderer} = require('electron');
const fs = require('fs');

const editText = document.querySelector('#edit-text');

ipcRenderer.on('save-as', (event, savePath) => {
    console.log(savePath);
    console.log(editText.value);
    
    fs.writeFile(savePath, editText.value, 'utf8', err => {
        if(err){
            console.error(err);
        }
    });
});

ipcRenderer.on('open', (event, openPaths) => {
    console.log(openPaths);
    
    fs.readFile(openPaths[0], 'utf8', (err, data) => {
        if(err){
            console.error(err);
            return;
        }
        
        console.log(data);
        editText.value = data;
    });
});