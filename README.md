# Logic Studio

Logic Studio is a React-based logic circuit editor and simulator with persistent
projects, reusable composite gates, portable project files, and an Electron
desktop shell.

## Development

```bash
npm install
npm start
```

To run the desktop shell against the React development server:

```bash
npm run electron:start
```

The packaged desktop application loads the production React build:

```bash
npm run electron:build
```

Electron stores native project data in its platform-specific `userData`
directory using an atomic JSON repository. The renderer remains browser
compatible and uses `localStorage` when opened outside Electron.

## Project files

Projects can be exported from the application as `.logicstudio` files and
imported on another machine. A project contains its workspace topology,
positions, wire routes, simulation state, and reusable gate definitions.
