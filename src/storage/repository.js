import {
  createDefaultProject,
  deleteProject as deleteBrowserProject,
  duplicateProject as duplicateBrowserProject,
  listGateDefinitions as listBrowserGateDefinitions,
  listProjects as listBrowserProjects,
  saveGateDefinition as saveBrowserGateDefinition,
  saveProject as saveBrowserProject
} from './projectStorage';

const electronApi = typeof window !== "undefined" ? window.logicStudio : null;

export const isElectronRepository = Boolean(electronApi);

export const repository = {
  async listProjects() {
    return electronApi ? electronApi.projects.list() : listBrowserProjects();
  },
  async loadProject(id) {
    const projects = await this.listProjects();
    return projects.find((project) => project.id === id) || null;
  },
  async saveProject(project) {
    return electronApi
      ? electronApi.projects.save(project)
      : saveBrowserProject(project);
  },
  async deleteProject(id) {
    if (electronApi) return electronApi.projects.delete(id);
    return deleteBrowserProject(id);
  },
  async duplicateProject(project, name) {
    if (electronApi) return electronApi.projects.duplicate(project, name);
    return duplicateBrowserProject(project, name);
  },
  async exportProject(serializedProject) {
    if (electronApi) return electronApi.projects.export(serializedProject);
    return {canceled: false};
  },
  async importProject() {
    return electronApi ? electronApi.projects.import() : null;
  },
  async listGateDefinitions() {
    return electronApi ? electronApi.gates.list() : listBrowserGateDefinitions();
  },
  async saveGateDefinition(definition) {
    return electronApi
      ? electronApi.gates.save(definition)
      : saveBrowserGateDefinition(definition);
  }
};

export const loadInitialData = async () => {
  const [projects, gateDefinitions] = await Promise.all([
    repository.listProjects(),
    repository.listGateDefinitions()
  ]);
  return {
    project: projects[0] || createDefaultProject(),
    projects,
    gateDefinitions
  };
};
