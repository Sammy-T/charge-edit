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