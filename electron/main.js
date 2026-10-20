const {app, BrowserWindow, dialog, ipcMain, Menu} = require("electron");
const path = require("path");
const {createStore} = require("./storage");

let mainWindow;
let store;

const registerHandlers = () => {
  ipcMain.handle("projects:list", () => store.listProjects());
  ipcMain.handle("projects:save", (_event, project) => store.saveProject(project));
  ipcMain.handle("projects:delete", (_event, id) => store.deleteProject(id));
  ipcMain.handle("projects:duplicate", (_event, project, name) => store.duplicateProject(project, name));
  ipcMain.handle("gates:list", () => store.listGateDefinitions());
  ipcMain.handle("gates:save", (_event, definition) => store.saveGateDefinition(definition));
  ipcMain.handle("projects:export", async (_event, serializedProject) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Logic Studio project",
      defaultPath: "logic-studio-project.logicstudio",
      filters: [{name: "Logic Studio project", extensions: ["logicstudio"]}]
    });
    if (result.canceled || !result.filePath) return {canceled: true};
    require("fs").writeFileSync(result.filePath, serializedProject, "utf8");
    return {canceled: false, filePath: result.filePath};
  });
  ipcMain.handle("projects:import", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Logic Studio project",
      properties: ["openFile"],
      filters: [{name: "Logic Studio project", extensions: ["logicstudio", "json"]}]
    });
    if (result.canceled || !result.filePaths[0]) return {canceled: true};
    return {
      canceled: false,
      filePath: result.filePaths[0],
      serializedProject: require("fs").readFileSync(result.filePaths[0], "utf8")
    };
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Logic Studio",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  store = createStore(app.getPath("userData"));
  registerHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
