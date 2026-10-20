import {
  createDefaultProject,
  duplicateProject,
  parseProject,
  saveProject,
  serializeProject
} from './projectStorage';

test("serializes and validates a portable project", () => {
  const project = createDefaultProject("Half adder");
  const restored = parseProject(serializeProject(project));

  expect(restored.schemaVersion).toBe(1);
  expect(restored.name).toBe("Half adder");
  expect(restored.workspace.gates).toEqual([]);
});

test("rejects data that is not a Logic Studio project", () => {
  expect(() => parseProject(JSON.stringify({name: "not a project"})))
    .toThrow("selected file is not a Logic Studio project");
});

test("duplicates a project with a new identity", () => {
  const project = createDefaultProject("Original");
  const duplicate = duplicateProject(project, "Copy");

  expect(duplicate.id).not.toBe(project.id);
  expect(duplicate.name).toBe("Copy");
  expect(saveProject(duplicate).id).toBe(duplicate.id);
});
