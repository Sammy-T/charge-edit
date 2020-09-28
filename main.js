/* jshint node: true */

const {app, BrowserWindow, Menu, MenuItem, shell, dialog, ipcMain} = require('electron');
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
            label: 'New',
            accelerator: 'CmdOrCtrl+N',
            click: (item, focusedWindow) => {
                focusedWindow.webContents.send('new');
            }
        }, {
            label: 'New Window',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: (item, focusedWindow) => {
                createWindow();
            }
        }, {
            label: 'Open',
            accelerator: 'CmdOrCtrl+O',
            click: (item, focusedWindow) => {
                const options = {
                    title: 'Charge Edit - Open a file',
                    defaultPath: docPath
                };
                
                dialog.showOpenDialog(focusedWindow, options).then(result => {
                    if(result.filePaths.length > 0){
                        focusedWindow.webContents.send('open', result.filePaths);
                    }
                }).catch(err => {
                    console.log(err);
                });
            }
        }, {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: (item, focusedWindow) => {
                focusedWindow.webContents.send('save', focusedWindow.id);
            }
        }, {
            label: 'Save as',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: (item, focusedWindow) => {
                openSaveAsDialog(focusedWindow);
            }
        }, {
            type: 'separator'
        }, {
            label: 'Exit',
            accelerator: 'CmdOrCtrl+Q',
            role: 'quit'
        }]
    });
    
    // Remove the View->Reload menu option.
    // Reloading causes the fs module in the Renderer window to stop functioning.
    template[2].submenu.shift();
    
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
    
    addWindowListeners(win);
    
    // Load the index.html of the app
    win.loadFile('index.html');
    
    // Open the DevTools
    // win.webContents.openDevTools();
}

function addWindowListeners(win){
    win.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();
        
        /* jshint -W083 */
        // Add each spelling suggestion
        for(const suggestion of params.dictionarySuggestions){
            menu.append(new MenuItem({
                label: suggestion,
                click: () => {
                    win.webContents.replaceMisspelling(suggestion);
                }
            }));
        }
        /* jshint +W083 */
        
        // Allow users to add misspelled words to the dictionary
        if(params.misspelledWord){
            menu.append(new MenuItem({
                label: 'Add to dictionary',
                click: () => {
                    win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
                }
            }));
            menu.append(new MenuItem({ type: 'separator' }));
        }
        
        let editFlags = params.editFlags;
        if(editFlags.canUndo){
            menu.append(new MenuItem({
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                role: 'undo'
            }));
        }
        if(editFlags.canRedo){
            menu.append(new MenuItem({
                label: 'Redo',
                accelerator: 'Shift+CmdOrCtrl+Z',
                role: 'redo'
            }));
        }
        if(editFlags.canCut){
            menu.append(new MenuItem({
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                role: 'cut'
            }));
        }
        if(editFlags.canCopy){
            menu.append(new MenuItem({
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                role: 'copy'
            }));
        }
        if(editFlags.canPaste){
            menu.append(new MenuItem({
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                role: 'paste'
            }));
        }
        if(editFlags.canSelectAll){
            menu.append(new MenuItem({
                label: 'Select All',
                accelerator: 'CmdOrCtrl+A',
                role: 'selectall'
            }));
        }        
        
        if(menu.items.length > 0){
            menu.popup({window: win});
        }
    });
    
    
    win.on('close', (event) => {
        event.preventDefault();
        
        // Inform the window that we're trying to close it
        // and need a response with the window's file and file-status info.
        win.webContents.send('on-close', win.id);
    });
}

function openSaveAsDialog(targetWindow){
    const options = {
        title: 'Charge Edit - Save as',
        defaultPath: docPath,
        filters: [
            {name: 'Text Documents (*.txt)', extensions: ['txt']},
            {name: 'All Files', extensions: ['*']}
        ]
    };

    dialog.showSaveDialog(targetWindow, options).then(result => {
        // If the file path has a value, send the path to the renderer window
        if(result.filePath){
            targetWindow.webContents.send('save-as', result.filePath);
        }
      }).catch(err => {
        console.log(err);
      });
}

function openConfirmCloseDialog(targetWindow, filePath){
    const path = require('path');
    
    const options = {
        title: `Charge Edit - ${path.basename(filePath)}`,
        message: 'Do you want to save before closing?',
        buttons: ["Save", "Don't Save", "Cancel"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
    };

    dialog.showMessageBox(targetWindow, options).then(result => {
        // Respond to which dialog button was pressed
        switch(result.response){
            case 0: // Save
                targetWindow.webContents.send('save', targetWindow.id);
                break;
                
            case 1: // Don't Save
                targetWindow.destroy();
                break;
        }
    }).catch(err => {
        console.log(err);
    });
}

// Respond to a Renderer process requesting to open the save dialog.
// The Renderer will trigger a save dialog request when the user
// initiates a save (Ctrl/Cmd+S) with no open/saved file as the current file.
ipcMain.on('open-save-dialog', (event, windowId) => {
    const win = BrowserWindow.fromId(windowId);
    openSaveAsDialog(win);
});

// Respond to a Renderer process requesting to confirm closing.
// The confirm flow is initiated by Main which alerts the Renderer to the close attempt,
// the Renderer responds with the relevant file & save-state info,
// and Main determines whether to close or show the confirm dialog.
ipcMain.on('confirm-close', (event, res) => {
    const win = BrowserWindow.fromId(res.windowId);
    
    if(res.close){
        win.destroy();
    }else{
        openConfirmCloseDialog(win, res.filePath);
    }
});

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