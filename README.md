# Logic Studio

A desktop logic circuit editor and simulator. Build circuits on a canvas, wire
pins together, toggle inputs and watch signals propagate through the graph in
real time. Circuits can be packaged into reusable custom gates and nested inside
each other.

Built with Electron, React and SQLite.

## What it does

- **Circuit canvas** — drag gates from the hotbar onto the workspace, connect
  output pins to input pins, and route wires with draggable kink points.
- **Live simulation** — flipping an input re-evaluates the circuit immediately.
  Active wires and pins are highlighted.
- **Custom gates** — select a circuit, save it as a named gate with its own
  input/output pins and colour, then reuse it like any built-in gate. Custom
  gates can contain other custom gates.
- **Projects** — projects are saved automatically and can be duplicated,
  deleted, exported to a `.logicstudio` file and imported elsewhere.

## Built-in gates

Only two primitives ship with the app:

| Gate | Inputs | Outputs |
| ---- | ------ | ------- |
| AND  | 2      | 1       |
| NOT  | 1      | 1       |

Everything else (OR, NAND, XOR, adders, flip-flops, …) is built by composing
these and saving the result as a custom gate.

## Running it

Requires Node.js and npm.

```bash
npm install
```

Browser-only development (no desktop shell, data stored in `localStorage`):

```bash
npm start
```

Electron development, with hot reload against the React dev server:

```bash
npm run electron:start
```

Tests:

```bash
npm test
```

## Building installers

Packaging is handled by [electron-builder](https://www.electron.build/), configured
in [`electron-builder.yml`](electron-builder.yml:1). Output goes to `release/`.

```bash
npm run dist:linux   # AppImage + .deb
npm run dist:win     # NSIS installer (.exe)
npm run dist:mac     # .dmg + .zip, x64 and arm64
```

`npm run electron:build` is the same thing without a platform flag — it builds
for whatever OS you're on.

### Cross-platform caveat

electron-builder can only reliably produce installers for the OS you're running
on. Windows and macOS builds in particular need their native toolchains (and
macOS builds need a Mac, plus an Apple Developer certificate to sign and
notarise them). Building all three from one machine is not practical.

The practical route is the GitHub Actions workflow in
[`.github/workflows/release.yml`](.github/workflows/release.yml:1), which runs
the three builds on `ubuntu-latest`, `windows-latest` and `macos-latest` in
parallel and attaches the results to a GitHub release.

### Cutting a v0.1 release

1. Bump `version` in [`package.json`](package.json:3) if needed (currently
   `0.1.0`).
2. Commit, then tag and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. The workflow builds all three platforms and creates a GitHub release named
   after the tag with these files attached:

   | Platform | File |
   | -------- | ---- |
   | Windows  | `logic-studio-0.1.0-win-x64.exe` |
   | macOS    | `logic-studio-0.1.0-mac-x64.dmg`, `logic-studio-0.1.0-mac-arm64.dmg` |
   | Linux    | `logic-studio-0.1.0-linux-x86_64.AppImage`, `logic-studio-0.1.0-linux-amd64.deb` |

You can also trigger the workflow manually from the Actions tab
(`workflow_dispatch`) to get the installers as downloadable artifacts without
publishing a release.

### Signing

The workflow builds unsigned binaries (`CSC_IDENTITY_AUTO_DISCOVERY=false`).
Unsigned apps will show SmartScreen warnings on Windows and Gatekeeper will
refuse to open them on macOS without a right-click → Open. To sign, remove that
env var and add the relevant electron-builder signing secrets
(`CSC_LINK`, `CSC_KEY_PASSWORD`, and for macOS `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).

### Icons

The app icon is [`public/image.png`](public/image.png), used in three places:

- **Window and taskbar** — set via the `icon` option in
  [`electron/main.js`](electron/main.js:47).
- **Installers** — [`build-resources/icon.png`](build-resources/icon.png) is a
  512×512 upscale of the same image; electron-builder derives the `.ico` and
  `.icns` from it.
- **In-app brand mark** — the top bar loads it from `public/`.

If you replace the logo, update `public/image.png` and regenerate
`build-resources/icon.png` at 512×512 or larger. electron-builder wants a
square image for macOS icons.

## How it works

### Simulation

The circuit is compiled into a graph before it is simulated:

1. [`compileCircuit()`](src/simulation/compileCircuit.js:8) walks the gates,
   inputs, outputs and wires and produces lookup tables: pin types, pin-to-gate
   mappings, incoming/outgoing wires, and a compiled copy of every custom gate
   definition. It also reports errors such as unknown gate types, wires
   connecting the wrong pin kinds, multiple wires into one input, and circular
   gate definitions.
2. [`initializeCircuit()`](src/simulation/simulateCircuit.js:57) seeds every pin
   with a default state and propagates from the workspace input pins.
3. [`propagateCircuit()`](src/simulation/simulateCircuit.js:21) is an
   event-driven queue: a changed pin pushes its value along outgoing wires and
   re-evaluates the gate it feeds. A processed-signal set and an update cap stop
   feedback loops from spinning forever; if the cap is hit the result is flagged
   as `unstable`.

Gate behaviour lives in [`gateDefinitions.js`](src/simulation/gateDefinitions.js:1).
A custom gate is evaluated by recursively simulating its stored definition with
the instance's input values.

### Storage

The renderer talks to storage through a single interface in
[`repository.js`](src/storage/repository.js:15), which picks a backend at
runtime:

- **Electron** — [`electron/storage.js`](electron/storage.js:6) opens
  `logic-studio.db` in Electron's `userData` directory with two tables:
  `projects` (id, name, timestamps, serialized workspace) and
  `gate_definitions` (id, serialized definition). The renderer reaches it over
  IPC through [`electron/preload.js`](electron/preload.js:5); Node integration is
  disabled and context isolation is on.
- **Browser** — [`projectStorage.js`](src/storage/projectStorage.js:34) uses
  `localStorage` with the same project shape.

Projects are saved automatically whenever the workspace changes. Export and
import use the native file dialogs in Electron and the File API in the browser.

### Project format

A project is plain JSON with a `schemaVersion` (currently `1`), metadata, a
`workspace` (inputs, outputs, gates, wires, simulation states, hotbar layout)
and the project's `gateDefinitions`. [`parseProject()`](src/storage/projectStorage.js:84)
validates the shape on import and rejects anything that isn't a Logic Studio
project.

## Layout

```
electron/            Electron main process, preload bridge, SQLite store
src/
  App.js             UI: project menu, gate menu, workspace, canvas, wiring
  simulation/        Circuit compilation and signal propagation
  storage/           Repository abstraction, localStorage backend, project format
  components/        Pin and top bar components
```

## Known limitations

- Only AND and NOT are built in.
- Simulation is level-based, not clocked; there is no notion of time or
  sequential elements beyond what you can build from feedback loops.
- The browser build stores data per-browser-profile and does not share it with
  the desktop app.
