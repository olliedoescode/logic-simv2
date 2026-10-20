const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const createStore = (userDataPath) => {
  const dbPath = path.join(userDataPath, "logic-studio.db");
  const db = new sqlite3.Database(dbPath);

  // Initialize tables if they don't exist
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      workspace TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS gate_definitions (
      id TEXT PRIMARY KEY,
      definition TEXT NOT NULL
    )`);
  });

  const serializeProject = (project) => JSON.stringify(project);
  const deserializeProject = (row) => JSON.parse(row.workspace);

  return {
    listProjects: () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT * FROM projects ORDER BY updated_at DESC", [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(deserializeProject));
        });
      });
    },
    saveProject: (project) => {
      const now = new Date().toISOString();
      const serialized = serializeProject(project);
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT OR REPLACE INTO projects (id, name, created_at, updated_at, workspace) VALUES (?, ?, ?, ?, ?)",
          [project.id, project.name, project.createdAt || now, now, serialized],
          (err) => {
            if (err) reject(err);
            else resolve(project);
          }
        );
      });
    },
    deleteProject: (id) => {
      return new Promise((resolve, reject) => {
        db.run("DELETE FROM projects WHERE id = ?", [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    duplicateProject: (project, name) => {
      const duplicate = {
        ...project,
        id: createId(),
        name: name || `${project.name} copy`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT OR REPLACE INTO projects (id, name, created_at, updated_at, workspace) VALUES (?, ?, ?, ?, ?)",
          [duplicate.id, duplicate.name, duplicate.createdAt, duplicate.updatedAt, serializeProject(duplicate)],
          (err) => {
            if (err) reject(err);
            else resolve(duplicate);
          }
        );
      });
    },
    listGateDefinitions: () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT * FROM gate_definitions", [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((row) => JSON.parse(row.definition)));
        });
      });
    },
    saveGateDefinition: (definition) => {
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT OR REPLACE INTO gate_definitions (id, definition) VALUES (?, ?)",
          [definition.id, JSON.stringify(definition)],
          (err) => {
            if (err) reject(err);
            else resolve(definition);
          }
        );
      });
    }
  };
};

module.exports = {createStore};
