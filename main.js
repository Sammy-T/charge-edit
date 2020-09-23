/* jshint node: true */

const {app, BrowserWindow, Menu, shell} = require('electron');
const defaultMenu = require('electron-default-menu');

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

function init(){
    createMenu();
    createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// (Some APIs can only be used after this occurs.)
app.whenReady().then(init);

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