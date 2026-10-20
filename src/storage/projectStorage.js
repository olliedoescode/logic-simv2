export const PROJECT_SCHEMA_VERSION = 1;
const PROJECTS_STORAGE_KEY = "logic-studio-projects";
const GATES_STORAGE_KEY = "logic-studio-gate-definitions";

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createDefaultProject = (name = "Untitled workspace") => ({
  schemaVersion: PROJECT_SCHEMA_VERSION,
  id: createId(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workspace: {
    inputs: [],
    outputs: [],
    gates: [],
    wires: [],
    simulationStates: {}
  },
  gateDefinitions: []
});

const isProject = (value) => (
  value &&
  value.schemaVersion === PROJECT_SCHEMA_VERSION &&
  typeof value.id === "string" &&
  value.workspace &&
  Array.isArray(value.workspace.inputs) &&
  Array.isArray(value.workspace.outputs) &&
  Array.isArray(value.workspace.gates) &&
  Array.isArray(value.workspace.wires)
);

export const listProjects = () => {
  return JSON.parse(window.localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
};

export const loadProject = (id) => {
  return listProjects().find((project) => project.id === id) || null;
};

export const saveProject = (project) => {
  const now = new Date().toISOString();
  const nextProject = {
    ...project,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    updatedAt: now
  };
  const projects = listProjects().filter((savedProject) => savedProject.id !== nextProject.id);
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([nextProject, ...projects]));
  return nextProject;
};

export const deleteProject = (id) => {
  const projects = listProjects().filter((project) => project.id !== id);
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const duplicateProject = (project, name = `${project.name} copy`) => {
  const duplicate = {
    ...project,
    id: createId(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const projects = listProjects().filter((savedProject) => savedProject.id !== duplicate.id);
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([duplicate, ...projects]));
  return duplicate;
};

export const listGateDefinitions = () => {
  return JSON.parse(window.localStorage.getItem(GATES_STORAGE_KEY) || "[]");
};

export const saveGateDefinition = (definition) => {
  const definitions = listGateDefinitions().filter((savedDefinition) => savedDefinition.id !== definition.id);
  window.localStorage.setItem(GATES_STORAGE_KEY, JSON.stringify([definition, ...definitions]));
  return definition;
};

export const serializeProject = (project) => JSON.stringify(project, null, 2);

export const parseProject = (serialized) => {
  const project = JSON.parse(serialized);
  if (!isProject(project)) {
    throw new Error("The selected file is not a Logic Studio project.");
  }
  return project;
};

export const createProjectId = createId;
