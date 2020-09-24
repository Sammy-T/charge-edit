/* jshint node: true */

const {app, BrowserWindow, Menu, shell, dialog} = require('electron');
const defaultMenu = require('electron-default-menu');

let docPath = null;

// Create the documents directory if it doesn't already exist
function initDirectory(){
    const fs = require('fs');
    const path = require('path');
    
    docPath = path.join(app.getAppPath(), '/documents');
    
    fs.mkdir(docPath, err => {
            if(err){
                console.log(`Warn: Unable to create directory at ${docPath}\n${err}`);
            }
        });
}

function createMenu(){
    // Get the default menu template
    const template = defaultMenu(app, shell);
    
    // Add to the template
    // (Splice Menu Items into the template array)
    template.splice(0, 0, {
        label: 'File',
        submenu: [{
            label: 'Test',
            click: (item, focusedWindow) => {
                console.log("Huzzah! You don't have to rebuild the whole default menu!");
            }
        }, {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: (item, focusedWindow) => {
                const options = {
                    title: 'Charge Edit - Save as',
                    defaultPath: docPath,
                    filters: [
                        {name: 'Text Documents (*.txt)', extensions: ['txt']},
                        {name: 'All Files', extensions: ['*']}
                    ]
                };
                
                dialog.showSaveDialog(focusedWindow, options)
                    .then(result => {
                    // console.log(`SaveDialogResult:\ncanceled=${result.canceled}\npath=${result.filePath}`);
                    
                    // If the file path has a value, send the path to the renderer window
                    if(result.filePath){
                        focusedWindow.webContents.send('save-as', result.filePath);
                    }
                  }).catch(err => {
                    console.log(err);
                  });
            }
        }, {
            type: 'separator'
        }, {
            label: 'Exit',
            role: 'quit'
        }]
    });
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow(){
    // Create the browser window
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });
    
    // Load the index.html of the app
    win.loadFile('index.html');
    
    // Open the DevTools
    // win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// (Some APIs can only be used after this occurs.)
app.whenReady().then(() => {
    initDirectory();
    createMenu();
    createWindow();
});

// Quit when all windows are closed, except on macOS. There,
// it's common for applications and their menu bar to stay
// active until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if(process.platform !== 'darwin'){
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app
    // when the dock icon is clicked and there are no other
    // windows open.
    if(BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
});