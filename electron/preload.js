const {contextBridge, ipcRenderer} = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("logicStudio", {
  projects: {
    list: () => invoke("projects:list"),
    save: (project) => invoke("projects:save", project),
    delete: (id) => invoke("projects:delete", id),
    duplicate: (project, name) => invoke("projects:duplicate", project, name),
    export: (serializedProject) => invoke("projects:export", serializedProject),
    import: () => invoke("projects:import")
  },
  gates: {
    list: () => invoke("gates:list"),
    save: (definition) => invoke("gates:save", definition)
  }
});
