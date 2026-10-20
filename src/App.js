import React, { useMemo, useState, useEffect, useRef } from 'react';
import uniqueId from 'lodash/uniqueId';
import {useXarrow, Xwrapper} from 'react-xarrows';
import './App.css';
import {compileCircuit} from './simulation/compileCircuit';
import {initializeCircuit, propagateCircuit} from './simulation/simulateCircuit';
import {createDefaultProject, createProjectId, parseProject, serializeProject} from './storage/projectStorage';
import {loadInitialData, repository} from './storage/repository';

const TopBar = ({openGateDialog, projectName, projects, onNewProject, onSaveProject, onOpenProject, onRenameProject, onExportProject, onImportProject, onImportFile, onDuplicateProject, onDeleteProject, onBackToGates}) => {
  const importInputRef = useRef(null);
  return (
  <div className="topbar" style={{display: "flex", flexDirection: "row", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "8%", backgroundColor: "transparent"}}>
    <div className="brand-lockup"><span className="brand-mark">∿</span><span className="brand-name">Logic Studio</span><span className="brand-context">/ workspace</span></div>
    {onBackToGates ? <button className="group-button" onClick={onBackToGates} type="button">Menu</button> : null}
    <input className="project-name-input" value={projectName} onChange={(event) => onRenameProject(event.target.value)} aria-label="Project name" />
    <div className="topbar-spacer"></div>
    <button className="group-button" onClick={onNewProject} type="button">New</button>
    <button className="group-button" onClick={onSaveProject} type="button">Save</button>
    <select className="project-select" value="" onChange={(event) => onOpenProject(event.target.value)} aria-label="Open saved project">
      <option value="" disabled>Open project</option>
      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select>
    <button className="group-button" onClick={onDuplicateProject} type="button">Duplicate</button>
    <button className="group-button group-button-danger" onClick={onDeleteProject} type="button">Delete project</button>
    <button className="group-button" onClick={onExportProject} type="button">Export</button>
    <button className="group-button" onClick={onImportProject} type="button">Import</button>
    <input className="project-import-input" ref={importInputRef} type="file" accept=".logicstudio,.json,application/json" hidden onChange={onImportFile} />
    <button className="group-button" onClick={openGateDialog} type="button">Save gate</button>
  </div>
  );
};

const ProjectMenu = ({projects, onNewProject, onOpenProject, onDeleteProject, onDuplicateProject, onImportProject}) => (
  <main className="library-screen">
    <div className="library-heading">
      <span className="dialog-eyebrow">LOGIC STUDIO</span>
      <h1>Projects</h1>
      <p>Open a saved circuit or start a new project.</p>
    </div>
    <div className="library-actions">
      <button className="library-create-card" type="button" onClick={onNewProject}>
        <span className="library-plus">+</span>
        <strong>New project</strong>
      </button>
      <button className="library-action-button" type="button" onClick={onImportProject}>Import project</button>
    </div>
    <div className="library-grid">
      {projects.map((project) => (
        <article className="library-card" key={project.id}>
          <button className="library-card-open" type="button" onClick={() => onOpenProject(project.id)}>
            <span className="library-card-preview"><span>{project.gateDefinitions?.length || 0}</span> saved gates</span>
            <strong>{project.name}</strong>
            <small>Updated {new Date(project.updatedAt).toLocaleString()}</small>
          </button>
          <div className="library-card-actions">
            <button type="button" onClick={() => onDuplicateProject(project)}>Duplicate</button>
            <button type="button" onClick={() => onDeleteProject(project)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  </main>
);

const GateMenu = ({projectName, gates, onCreateGate, onOpenGate, onDeleteGate, onBackToProjects}) => (
  <main className="library-screen">
    <div className="library-heading">
      <button className="library-back-button" type="button" onClick={onBackToProjects}>← Projects</button>
      <span className="dialog-eyebrow">PROJECT</span>
      <h1>{projectName}</h1>
      <p>Choose a gate workspace or create a new one.</p>
    </div>
    <div className="library-grid gate-library-grid">
      <button className="library-create-card" type="button" onClick={onCreateGate}>
        <span className="library-plus">+</span>
        <strong>Create new gate</strong>
      </button>
      {gates.map((gate) => (
        <article className="library-card gate-preview-card" key={gate.id}>
          <button type="button" className="gate-preview-open" onClick={() => onOpenGate(gate)}>
            <span className="gate-preview-chip" style={{backgroundColor: gate.color}} />
            <strong>{gate.name}</strong>
            <small>{gate.inputs} inputs · {gate.outputs} outputs</small>
          </button>
          <div className="gate-preview-actions">
            <button type="button" onClick={() => onOpenGate(gate)}>Edit</button>
            <button type="button" onClick={() => onDeleteGate(gate)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  </main>
);

const DraftWire = ({draft, x, y}) => {
  const start = getPinPoint(draft.startPin);
  if (!start) return null;
  const path = createSmoothPath([start, ...draft.points, {x, y}]);
  return <svg className="wire-layer wire-layer-draft" aria-hidden="true"><path d={path} className="wire-path wire-path-draft" /></svg>;
};

const Input = ({id, pinId, selected, isOn, onToggle, setPinHover, handleMouseDownOnPin, openContextMenu}) => {
  
  const handleMouseEnter = (e) => {
    e.preventDefault();
    setPinHover({isTrue: true, pinId: pinId, pinType: "output", parentGate: "grid"});
  };
  
  const handleMouseLeave = (e) => {
    e.preventDefault();
    setPinHover({isTrue: false, pinId: null, pinType: null, parentGate: null});
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseDownOnPin(pinId, "output", "grid", e.shiftKey, e.button);
  };

  const handleMouseClick = (e) => {
    e.preventDefault();
    if (e.button !== 0 || e.shiftKey) return;
    onToggle(pinId);
  };

  return (
    <div className={`boundary-pin-row input-row${selected ? " boundary-pin-selected" : ""}`} id={id} onContextMenu={(e) => openContextMenu(e, id, pinId, "input")} style={{display: "flex", flexDirection: "row", width: "100%", height: "7%"}}>
      <div className="boundary-pin-body input-body" style={{display: "flex", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "100%", justifyContent: "flex-end", alignItems: "center", backgroundColor: "#323640"}}>
        <div className="pin-stem">
          <div className={`boundary-pin${isOn ? " boundary-pin-on" : ""}`} id={pinId} data-wire-pin-id={pinId} data-wire-pin-type="output" data-wire-pin-parent="grid" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={handleMouseDown} onClick={handleMouseClick}></div>
        </div>
      </div>

    </div>
  )
};

const InputBar = ({inputs, setInputs, setWires, simulationStates, onToggleInput, setPinHover, handleMouseDownOnPin, openContextMenu, selectedIds = []}) => {

  const addInput = () => {
    setInputs([...inputs, {id: uniqueId(), pinId: uniqueId()}]);
  };

  return (
    <div className="side-panel input-panel" style={{display: "flex", flexDirection: "column", width: "5%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "space-evenly"}}>
      <button className="add-pin-button" onClick={addInput} type="button">Add input</button>
      <div style={{width: "100%", height: "6.5%"}}></div>
      <div style={{display: "flex", flexDirection: "column", width: "100%", height: "93.5%", justifyContent: "space-evenly"}}>
      {inputs.map(input=>(
        <Input key={input.id} id={input.id} pinId={input.pinId} isOn={Boolean(simulationStates[input.pinId])} onToggle={onToggleInput} selected={selectedIds.includes(input.id)} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openContextMenu}/>
      ))}
      </div>
    </div>
  );
};

const MainGrid = ({draggedPinActive, setMouseOverGrid, x, y, gates, simulationStates, setGateHover, handleMouseDownOnPin, setPinHover, wires, deleteWire, deleteWirePoint, selectedIds, onDragStart, onContextMenu, wireDraft, addWirePoint, addWirePointToWire, moveWirePoint, finishWirePoint}) => {

  const handleMouseEnter = (e) => {
    e.preventDefault();
    setMouseOverGrid(true);
  };

  const handleMouseLeave = (e) => {
    e.preventDefault();
    setMouseOverGrid(false);
  };

  return (
  <div className="canvas" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={(event) => wireDraft && !event.target.closest(".gate-pin, .boundary-pin") && addWirePoint(event)} style={{width: "90%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px"}}>
    {gates.map(gate=>(
      <Gate key={gate.id} id={gate.id} name={gate.name} color={gate.color} pins={gate.pins} simulationStates={simulationStates} selected={selectedIds.includes(gate.id)} handleMouseDownOnPin={handleMouseDownOnPin} setGateHover={setGateHover} setPinHover={setPinHover} xOffset={gate.xOffset} yOffset={gate.yOffset} onDragStart={onDragStart} onContextMenu={onContextMenu}/>
    ))}
    {wires.map(wire=>(
      <Wire key={wire.id} id={wire.id} start={wire.start} end={wire.end} isActive={Boolean(simulationStates[wire.start])} points={wire.points} deleteWire={deleteWire} deleteWirePoint={deleteWirePoint} addWirePoint={addWirePointToWire} moveWirePoint={moveWirePoint} finishWirePoint={finishWirePoint}/>
    ))}
    {wireDraft ? <DraftWire draft={wireDraft} x={x} y={y}/> : null}
  </div>
  );
};

const Output = ({id, pinId, isOn, selected, setPinHover, handleMouseDownOnPin, openContextMenu}) => {
  
  const handleMouseEnter = (e) => {
    e.preventDefault();
    setPinHover({isTrue: true, pinId: pinId, pinType: "input", parentGate: "grid"});
  };
  
  const handleMouseLeave = (e) => {
    e.preventDefault();
    setPinHover({isTrue: false, pinId: null, pinType: null, parentGate: null});
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseDownOnPin(pinId, "input", "grid", e.shiftKey, e.button);
  };
  return (
    <div className={`boundary-pin-row output-row${selected ? " boundary-pin-selected" : ""}`} id={id} onContextMenu={(e) => openContextMenu(e, id, pinId, "output")} style={{display: "flex", flexDirection: "row", width: "100%", height: "7%"}}>
      <div className="boundary-pin-body output-body" style={{display: "flex", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", backgroundColor: "#323640"}}>
        <div className="pin-stem">
        <div className={`boundary-pin${isOn ? " boundary-pin-on" : ""}`} id={pinId} data-wire-pin-id={pinId} data-wire-pin-type="input" data-wire-pin-parent="grid" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={handleMouseDown}></div>
        </div>
      </div>
    </div>
  )
};

const OutputBar = ({outputs, setOutputs, setWires, simulationStates, setPinHover, handleMouseDownOnPin, openContextMenu, selectedIds = []}) => {

  const addOutput = (e) => {
    e.preventDefault();
    setOutputs([...outputs, {id: uniqueId(), pinId: uniqueId()}]);
  };

  return (
    <div className="side-panel output-panel" style={{display: "flex", flexDirection: "column", width: "5%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "space-evenly"}}>
      <button className="add-pin-button" onClick={addOutput} type="button">Add output</button>
      {outputs.map(output=>(
        <Output key={output.id} id={output.id} pinId={output.pinId} isOn={Boolean(simulationStates[output.pinId])} selected={selectedIds.includes(output.id)} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openContextMenu}/>
      ))}
    </div>
  );
};

const BottomBar = ({gateList, handleMouseDownOnGate, openGateDefinition}) => {

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleMouseDownOnGate(e.target.id, e.shiftKey);
  }

  return (
    <div className="gate-library" style={{display: "flex", flexDirection: "row",width: "100%", height: "12%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "start"}}>
      {gateList.map(gate=>(
        <div className="gate-library-item" id={gate.id} onMouseDown={handleMouseDown} onDoubleClick={() => openGateDefinition(gate)} key={gate.id} title={gate.builtIn ? "Drag to place" : "Drag to place, double-click to open"} style={{border: "2px solid grey", borderRadius: "15px", padding: "10px", backgroundColor: "transparent", marginLeft: "5px", marginTop: "8px", marginBottom: "8px", fontSize: "medium"}}>{gate.name}</div>
      ))}
    </div>  
  );
};

const Pin = ({id, pinType, parentGate, isOn, setDisabled, handleMouseDownOnPin, setPinHover}) => {

  const handleMouseEnter = (e) => {
    e.preventDefault();
    setDisabled(true);
    setPinHover({isTrue: true, pinId: id, pinType: pinType, parentGate: parentGate});
  };
  
  const handleMouseLeave = (e) => {
    e.preventDefault();
    setDisabled(false);
    setPinHover({isTrue: false, pinId: null, pinType: null, parentGate: null});
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseDownOnPin(id, pinType, parentGate, e.shiftKey, e.button);
  };

  return (
    <div className={`gate-pin${isOn ? " gate-pin-on" : ""}`} id={id} data-wire-pin-id={id} data-wire-pin-type={pinType} data-wire-pin-parent={parentGate} style={{}} onMouseOver={handleMouseEnter} onMouseOut={handleMouseLeave} onMouseDown={handleMouseDown}></div>
  );
};


const getGateTextColor = (color) => {
  const hex = color.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? "#11161a" : "#ffffff";
};

const Gate = ({ id, name, color, pins, simulationStates, selected, handleMouseDownOnPin, setGateHover, setPinHover, xOffset, yOffset, onDragStart, onContextMenu }) => {
  const [disabled, setDisabled] = useState(false);
  


  const handleMouseDown = (event) => {
    if (disabled || event.button !== 0 || event.target.closest(".gate-pin")) return;
    event.preventDefault();
    onDragStart(id, event);
  };

  return (
      <div className={`logic-gate${selected ? " logic-gate-selected" : ""}`} id={id} onMouseDown={handleMouseDown} onContextMenu={(event) => onContextMenu(event, id)} style={{position: "fixed", top: yOffset, left: xOffset, display: "flex", flexDirection: "row", backgroundColor: color, color: getGateTextColor(color), fontSize: "medium", zIndex: "5"}}>
        <div style={{position: "relative", left: "-12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
          {pins.map(pin=>(
            pin.pinType === "input" ? <Pin key={pin.id} id={pin.id} isOn={Boolean(simulationStates[pin.id])} pinType={"input"} parentGate={id} setDisabled={setDisabled} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover}/> : null
          ))}
        </div>
        <div style={{width: "100%", height: "100x"}}>{name}</div>
        <div style={{position: "relative", left: "12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
          {pins.map(pin=>(
            pin.pinType === "output" ? <Pin key={pin.id} id={pin.id} isOn={Boolean(simulationStates[pin.id])} pinType={"output"} parentGate={id} setDisabled={setDisabled} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover}/> : null
          ))}
        </div>
      </div>
  );
};

const DraggedGate = ({id, name, color, pins, xOffset, yOffset, count = 1}) => {
  const stackOffset = -(60 + ((count - 1) * 66)) / 2;
  return (
    <div className="dragged-gate-stack" id={id} style={{position: "fixed", top: yOffset, left: xOffset, zIndex: "5", cursor: "grabbing"}}>
      {count > 1 ? <div className="dragged-gate-count">x{count}</div> : null}
      {Array.from({length: count}, (_, index) => <div key={index} className="logic-gate dragged-gate" style={{position: "absolute", top: stackOffset + (index * 66), left: "-54px", backgroundColor: color, color: getGateTextColor(color), fontSize: "medium"}}>
      <div style={{position: "relative", left: "-12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
        {pins.map(pin=>(
          pin.pinType === "input" ? <Pin key={pin.id} id={pin.id} pinType={"input"}/> : null
        ))}
      </div>
      <div style={{width: "100%", height: "100x"}}>{name}</div>
      <div style={{position: "relative", left: "12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
        {pins.map(pin=>(
          pin.pinType === "output" ? <Pin key={pin.id} id={pin.id} pinType={"output"}/> : null
        ))}
      </div>
      </div>)}
    </div>
  );
};

const getPinPoint = (id) => {
  const element = document.getElementById(id);
  if (!element) return null;
  const bounds = element.getBoundingClientRect();
  return {x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2};
};

const createSmoothPath = (points) => {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const radius = Math.min(12, Math.hypot(current.x - previous.x, current.y - previous.y) / 3, Math.hypot(next.x - current.x, next.y - current.y) / 3);
    const incomingLength = Math.hypot(current.x - previous.x, current.y - previous.y) || 1;
    const outgoingLength = Math.hypot(next.x - current.x, next.y - current.y) || 1;
    const before = {x: current.x - ((current.x - previous.x) / incomingLength) * radius, y: current.y - ((current.y - previous.y) / incomingLength) * radius};
    const after = {x: current.x + ((next.x - current.x) / outgoingLength) * radius, y: current.y + ((next.y - current.y) / outgoingLength) * radius};
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`;
  }
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
};

const Wire = ({ id, start, end, isActive, points = [], deleteWire, addWirePoint, moveWirePoint, finishWirePoint, deleteWirePoint }) => {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const update = () => setVersion((value) => value + 1);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const startPoint = getPinPoint(start);
  const endPoint = getPinPoint(end);
  if (!startPoint || !endPoint) return null;
  const path = createSmoothPath([startPoint, ...points, endPoint]);
  const handlePathClick = (event) => {
    event.stopPropagation();
    addWirePoint(id, {x: event.clientX, y: event.clientY});
  };
  return (
    <svg className="wire-layer" aria-hidden="true">
      <path d={path} className={`wire-path${isActive ? " wire-path-active" : ""}`} onClick={handlePathClick} onContextMenu={(event) => { event.preventDefault(); deleteWire(id); }} />
      <path d={path} className={`wire-path-inner${isActive ? " wire-path-active" : ""}`} />
      {points.map((point, index) => (
        <circle
          key={`${id}-${index}`}
          className="wire-kink-handle"
          cx={point.x}
          cy={point.y}
          r="7"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            let currentPoint = point;
            const move = (moveEvent) => {
              currentPoint = {x: moveEvent.clientX, y: moveEvent.clientY};
              moveWirePoint(id, index, currentPoint);
            };
            const up = () => {
              finishWirePoint(id, index, currentPoint);
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteWirePoint(id, index);
          }}
        />
      ))}
    </svg>
  );
};

const PinContextMenu = ({menu, onDelete, onClose}) => (
  <div className="pin-context-menu" style={{top: menu.y, left: menu.x}} onMouseDown={(e) => e.stopPropagation()}>
    <div className="context-menu-label">{menu.type === "input" ? "Input" : "Output"}</div>
    <button type="button" onClick={() => { onDelete(menu.id, menu.pinId, menu.type); onClose(); }}>Delete {menu.type}</button>
  </div>
);

const GateContextMenu = ({menu, onDelete, onClose}) => (
  <div className="pin-context-menu" style={{top: menu.y, left: menu.x}} onMouseDown={(e) => e.stopPropagation()}>
    <div className="context-menu-label">Gate</div>
    <button type="button" onClick={() => { onDelete(menu.id); onClose(); }}>Delete selected</button>
  </div>
);

const GateDialog = ({name, setName, color, setColor, onCancel, onSave}) => (
  <div className="dialog-backdrop">
    <form className="gate-dialog" onSubmit={onSave}>
      <div className="dialog-heading">
        <div>
          <span className="dialog-eyebrow">CUSTOM COMPONENT</span>
          <h2>Save gate</h2>
        </div>
        <button className="dialog-close" type="button" onClick={onCancel} aria-label="Close dialog">×</button>
      </div>
      <label className="dialog-label">Gate name
        <input className="dialog-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Half adder" autoFocus />
      </label>
      <div className="colour-preview" style={{backgroundColor: color}}><span>{name || "Your gate"}</span></div>
      <div className="rgb-controls">
        {["R", "G", "B"].map((channel, index) => (
          <label className="slider-row" key={channel}>
            <span>{channel}</span>
            <input type="range" min="0" max="255" value={parseInt(color.slice(index * 2 + 1, index * 2 + 3), 16)} onChange={(e) => {
              const rgb = [0, 1, 2].map((channelIndex) => channelIndex === index ? Number(e.target.value) : parseInt(color.slice(channelIndex * 2 + 1, channelIndex * 2 + 3), 16));
              setColor(`#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
            }} />
            <output>{parseInt(color.slice(index * 2 + 1, index * 2 + 3), 16)}</output>
          </label>
        ))}
      </div>
      <div className="dialog-actions">
        <button className="dialog-cancel" type="button" onClick={onCancel}>Cancel</button>
        <button className="dialog-save" type="submit">Save gate</button>
      </div>
    </form>
  </div>
);

export default function App() {
  const initialProject = useMemo(() => createDefaultProject(), []);
  const [x, setX] = useState();
  const [y, setY] = useState();
  const [projectId, setProjectId] = useState(initialProject.id);
  const [projectName, setProjectName] = useState(initialProject.name);
  const [inputs, setInputs] = useState(initialProject.workspace.inputs);
  const [outputs, setOutputs] = useState(initialProject.workspace.outputs);
  const [name, setName] = useState("");
  const [gateList, setGateList] = useState([]);
  const [gates, setGates] = useState(initialProject.workspace.gates);
  const [wires, setWires] = useState(initialProject.workspace.wires);
  const [draggedGate, setDraggedGate] = useState({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, definitionId: null, count: 1})
  const [mouseOverGrid, setMouseOverGrid] = useState(false);
  const [draggedPinActive, setDraggedPinActive] = useState(false);
  const [pinHover, setPinHover] = useState({isTrue: false, pinId: null, pinType: null, parentGate: null});
  const [startPin, setStartPin] = useState({pinId: null, pinType: null, parentGate: null});
  const [gateHover, setGateHover] = useState({id: null});
  const [binHover, setBinHover] = useState(false);
  const [delayedGateHover, setDelayedGateHover] = useState({id: null})
  const [isGateDialogOpen, setIsGateDialogOpen] = useState(false);
  const [gateColor, setGateColor] = useState("#e05c7a");
  const [pinContextMenu, setPinContextMenu] = useState(null);
  const [gateContextMenu, setGateContextMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selection, setSelection] = useState(null);
  const [wireDraft, setWireDraft] = useState(null);
  const [simulation, setSimulation] = useState({
    states: initialProject.workspace.simulationStates || {},
    unstable: false
  });
  const gateDragRef = useRef(null);
  const batchPlacementRef = useRef(false);
  const batchPlacedRef = useRef(0);
  const [batchPreviewVisible, setBatchPreviewVisible] = useState(true);
  const [projects, setProjects] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [screen, setScreen] = useState("project-menu");
  const [editingGateId, setEditingGateId] = useState(null);

  useEffect(() => {
    loadInitialData().then(({project, projects: savedProjects}) => {
      setProjectId(project.id);
      setProjectName(project.name);
      setInputs(project.workspace.inputs);
      setOutputs(project.workspace.outputs);
      setGates(project.workspace.gates);
      setWires(project.workspace.wires);
      setSimulation({states: project.workspace.simulationStates || {}, unstable: false});
      setProjects(savedProjects);
      setGateList([
        {id: "0", name: "AND", color: "#d95773", inputs: 2, outputs: 1, builtIn: true},
        {id: "1", name: "NOT", color: "#5b8def", inputs: 1, outputs: 1, builtIn: true},
        ...(project.gateDefinitions || [])
      ]);
      setScreen("project-menu");
      setIsStorageReady(true);
    }).catch((error) => {
      console.error("Unable to load Logic Studio storage.", error);
      setIsStorageReady(true);
    });
  }, []);

  const topologyKey = JSON.stringify({
    gates: gates.map(({id, name, pins}) => ({id, name, pins})),
    inputs: inputs.map(({id, pinId}) => ({id, pinId})),
    outputs: outputs.map(({id, pinId}) => ({id, pinId})),
    wires: wires.map(({id, start, end}) => ({id, start, end})),
    definitions: gateList.filter((gate) => !gate.builtIn)
  });
  // The logical snapshot intentionally ignores gate positions and wire kink coordinates.
  const topology = useMemo(() => ({
    gates: gates.map(({id, name, pins}) => ({id, name, pins})),
    inputs: inputs.map(({id, pinId}) => ({id, pinId})),
    outputs: outputs.map(({id, pinId}) => ({id, pinId})),
    wires: wires.map(({id, start, end}) => ({id, start, end})),
    definitions: gateList.filter((gate) => !gate.builtIn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [topologyKey]);
  const compiledCircuit = useMemo(
    () => compileCircuit(topology.gates, topology.inputs, topology.outputs, topology.wires, topology.definitions),
    [topology]
  );

  useEffect(() => {
    setSimulation((currentSimulation) => initializeCircuit(compiledCircuit, currentSimulation.states));
  }, [compiledCircuit]);

  const toggleInput = (pinId) => {
    setSimulation((currentSimulation) => {
      const nextStates = {
        ...currentSimulation.states,
        [pinId]: !currentSimulation.states[pinId]
      };
      return propagateCircuit(compiledCircuit, nextStates, [pinId]);
    });
  };
  useEffect(() => {
    if (!isStorageReady) return;
    repository.saveProject({
      ...initialProject,
      id: projectId,
      name: projectName,
      workspace: {inputs, outputs, gates, wires, simulationStates: simulation.states},
      gateDefinitions: gateList.filter((gate) => !gate.builtIn)
    }).then(() => repository.listProjects()).then(setProjects);
  }, [projectId, projectName, inputs, outputs, gates, wires, simulation.states, gateList, initialProject, isStorageReady]);
  
  useEffect(
    () => {
      const update = (e) => {
        setX(e.x);
        setY(e.y);
        if (batchPlacementRef.current) {
          setBatchPreviewVisible(true);
        }
      };
      window.addEventListener('mousemove', update);
      window.addEventListener('touchmove', update);
      return () => {
        window.removeEventListener('mousemove', update);
        window.removeEventListener('touchmove', update);
      };
    },
    [setX, setY]
  );

  useEffect(
    () => {
      console.log("startPin changed, new startPin: ", startPin);
    }, [startPin, setStartPin]
  );

  useEffect(
    () => {
      console.log("draggedGate chaged, new draggedGate: ", draggedGate);
    }, [draggedGate, setDraggedGate]
  );

  useEffect(
    () => {
      console.log("gates changed, new gates: ", gates);
    }, [gates, setGates]
  );

  useEffect(
    () => {
      console.log("pinHover changed, new pinHover: ", pinHover);
    }, [pinHover, setPinHover]
  );

  useEffect(
    () => {
      console.log("binHover changed, new binHover: ", binHover);
    }, [binHover, setBinHover]
  );

  useEffect(
    () => {
      console.log("gateHover changed, new binHover: ", gateHover);
    }, [gateHover, setGateHover]
  );

  useEffect(
    () => {
      setDelayedGateHover(gateHover);
    }, [gateHover, setGateHover]
  )

  const generatePins = (inputs, outputs) => {
    var newPins = [];
    for (var i=0; i<inputs; i++) {
      newPins.push({id: uniqueId(), pinType: "input"});
    };
    for (var i=0; i<outputs; i++) {
      newPins.push({id: uniqueId(), pinType: "output"});
    };
    return(newPins);
  };

  const groupGate = () => {
    if (name === "") {
      console.log("invalid gate: no name");
    } else if (false){
      // test for pins
    } else {
      const existingGate = editingGateId
        ? gateList.find((gate) => gate.id === editingGateId)
        : null;
      const definitionId = existingGate?.id || createProjectId();
      const definition = {
        id: definitionId,
        name,
        color: gateColor,
        inputs: inputs.length,
        outputs: outputs.length,
        version: (existingGate?.version || 0) + 1,
        definition: {
          inputs,
          outputs,
          gates,
          wires
        }
      };
      setGateList((currentGates) => existingGate
        ? currentGates.map((gate) => gate.id === definition.id ? definition : gate)
        : [...currentGates, definition]);
      setGates([]);
      setInputs([]);
      setOutputs([]);
      setName("");
      setGateColor("#e05c7a");
      setIsGateDialogOpen(false);
      setEditingGateId(null);
      setScreen("gate-menu");
    };
  };

  const handleMouseDownOnGate = (id, isBatch) => {
    const gate = gateList.find((item) => String(item.id) === String(id));
    if (!gate) return;
    if (draggedGate.isBatch && draggedGate.sourceId === id) {
      setDraggedGate((current) => ({...current, count: Math.min(current.count + 1, 12)}));
      return;
    }
    if (!isBatch && draggedGate.isBatch) {
      setDraggedGate((current) => ({...current, count: Math.min(current.count + 1, 12)}));
      return;
    }
    batchPlacementRef.current = isBatch;
    batchPlacedRef.current = 0;
    setBatchPreviewVisible(true);
    setDraggedGate({
      isTrue: true,
      isBatch,
      sourceId: id,
      name: gate.name,
      color: gate.color,
      pins: generatePins(gate.inputs, gate.outputs),
      definitionId: gate.definitionId || gate.id,
      count: 1
    });
  }; 

  const placeDraggedGateAt = (xOffset, yOffset, count = 1) => {
    const stackHeight = (count - 1) * 66 + 60;
    const firstGateY = yOffset - (stackHeight / 2);
    const gateX = xOffset - 44;
    setGates((currentGates) => [
      ...currentGates,
      ...Array.from({length: count}, (_, index) => ({
        id: uniqueId(),
        name: draggedGate.name,
        color: draggedGate.color,
        definitionId: draggedGate.definitionId,
        pins: count > 1
          ? generatePins(
            draggedGate.pins.filter((pin) => pin.pinType === "input").length,
            draggedGate.pins.filter((pin) => pin.pinType === "output").length
          )
          : draggedGate.pins,
        xOffset: gateX,
        yOffset: firstGateY + (index * 66)
      }))
    ]);
  };

  const canConnectWirePins = (startType, startParent, endType, endParent) => (
    startType !== endType &&
    (startParent !== endParent || (startParent === "grid" && endParent === "grid"))
  );

  const addWireFromDraft = (draft, destinationPinId, destinationPinType, destinationParent) => {
    if (!canConnectWirePins(draft.startType, draft.startParent, destinationPinType, destinationParent)) {
      return false;
    }
    const inputPinId = draft.startType === "output" ? destinationPinId : draft.startPin;
    const wire = {
      id: uniqueId(),
      start: draft.startType === "output" ? draft.startPin : destinationPinId,
      end: draft.startType === "output" ? destinationPinId : draft.startPin,
      points: draft.points
    };
    setWires((currentWires) => [
      ...currentWires.filter((currentWire) => currentWire.end !== inputPinId),
      wire
    ]);
    return true;
  };

  const handleMouseDownOnPin = (id, pinType, parentGate, persistent = false, button = 0) => {
    if (button !== 0) {
      setWireDraft(null);
      return;
    }
    if (!wireDraft) {
      setWireDraft({startPin: id, startType: pinType, startParent: parentGate, points: [], persistent});
      return;
    }
    if (addWireFromDraft(wireDraft, id, pinType, parentGate)) {
      setWireDraft(null);
    }
  };

  const addWirePoint = (event) => {
    if (!wireDraft || !wireDraft.persistent) return;
    event.stopPropagation();
    setWireDraft((currentDraft) => ({
      ...currentDraft,
      points: [...currentDraft.points, {x: event.clientX, y: event.clientY}]
    }));
  };

  const addWirePointToWire = (id, point) => {
    setWires((currentWires) => currentWires.map((wire) => {
      if (wire.id !== id) return wire;
      const existingPoints = wire.points || [];
      const route = [getPinPoint(wire.start), ...existingPoints, getPinPoint(wire.end)].filter(Boolean);
      let closestSegment = 0;
      let closestDistance = Infinity;

      for (let index = 0; index < route.length - 1; index += 1) {
        const start = route[index];
        const end = route[index + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        const projection = lengthSquared === 0
          ? 0
          : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
        const projected = {x: start.x + projection * dx, y: start.y + projection * dy};
        const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSegment = index;
        }
      }

      const updatedPoints = [
        ...existingPoints.slice(0, closestSegment),
        point,
        ...existingPoints.slice(closestSegment)
      ];
      return {...wire, points: updatedPoints};
    }));
  };

  const moveWirePoint = (id, pointIndex, point) => {
    setWires((currentWires) => currentWires.map((wire) => (
      wire.id === id
        ? {...wire, points: wire.points.map((item, index) => index === pointIndex ? point : item)}
        : wire
    )));
  };

  const finishWirePoint = (id, pointIndex, point) => {
    setWires((currentWires) => currentWires.map((wire) => {
      if (wire.id !== id) return wire;
      const matchingPoint = wire.points.find((item, index) => (
        index !== pointIndex && Math.hypot(item.x - point.x, item.y - point.y) <= 14
      ));
      if (!matchingPoint) return wire;
      return {...wire, points: wire.points.filter((_, index) => index !== pointIndex)};
    }));
  };

  const deleteWirePoint = (id, pointIndex) => {
    setWires((currentWires) => currentWires.map((wire) => (
      wire.id === id
        ? {...wire, points: wire.points.filter((_, index) => index !== pointIndex)}
        : wire
    )));
  };

  const handleWireContextMenu = (event) => {
    if (!wireDraft) return;
    event.preventDefault();
    event.stopPropagation();
    setWireDraft(null);
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    if (e.button !== 0) {
      if (wireDraft) setWireDraft(null);
      return;
    }
    const destinationPin = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-wire-pin-id]");
    if (wireDraft && destinationPin) {
      const pinId = destinationPin.getAttribute("data-wire-pin-id");
      const pinType = destinationPin.getAttribute("data-wire-pin-type");
      const parentGate = destinationPin.getAttribute("data-wire-pin-parent");
      if (addWireFromDraft(wireDraft, pinId, pinType, parentGate)) {
        setWireDraft(null);
        return;
      }
    }
    if (wireDraft) {
      if (!wireDraft.persistent) {
        setWireDraft(null);
      }
    }
    const gridBounds = document.querySelector(".canvas")?.getBoundingClientRect();
    const releasedOnGrid = gridBounds &&
      e.clientX >= gridBounds.left &&
      e.clientX <= gridBounds.right &&
      e.clientY >= gridBounds.top &&
      e.clientY <= gridBounds.bottom;
    if (draggedGate.isTrue && releasedOnGrid && !batchPlacementRef.current && !draggedGate.isBatch) {
      const xOff = e.clientX;
      const yOff = e.clientY;
      placeDraggedGateAt(xOff, yOff);
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
    };

    if (!batchPlacementRef.current) {
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
    }
    if (binHover) {
      const deleteId = selectedIds[0] || delayedGateHover.id;
      if (deleteId) deleteSelectedItems(deleteId);
    };
  };

  const tryConnection = () => {
    console.log("startPin.pinType: ", startPin.pinType);
    console.log("pinHover.pinType: ", pinHover.pinType);
    console.log("startPin.parentGate: ", startPin.parentGate);
    console.log("pinHover.parentGate: ", pinHover.parentGate);
    if (startPin.pinType !== pinHover.pinType && startPin.parentGate !== pinHover.parentGate) {
      if (startPin.pinType === "input") {
        if ((wires.filter(wire => wire.start === startPin.pinId).length) > 1 ) {
          replaceWire();
        } else {
          connectWires();
        };
      } else {
        if ((wires.filter(wire => wire.start === pinHover.pinId).length) > 0 ) {
          replaceWire();
        } else {
          connectWires();
        };
      };
    } else {
      if (startPin.pinType === "input") {
        setWires((wires) => wires.filter((wire) => wire.end !== "dragged-pin"));
      } else {
        console.log(wires.filter((wire) => wire.end !== "dragged-pin"))
        setWires(wires=>wires.filter(wire => wire.start !== "dragged-pin"));
      };
      setStartPin({pinId: null, pinType: null})
      console.log("Connection Invalid!")
    };
  };

  const connectWires = () => {
    var newWires = wires;
    if (startPin.pinType === "input") {
      newWires[newWires.length - 1].end = pinHover.pinId;
      setWires(newWires);

    } else {
      newWires[newWires.length - 1].start = pinHover.pinId;
      setWires(newWires);
    };
  };

  const replaceWire = () => {
    var newWires = wires;
    if (startPin.pinType === "input") {
      newWires = newWires.filter(wire=>wire.end !== "dragged-pin");
      const correctWire = (wire) => wire.start === startPin.pinId;
      newWires[newWires.findIndex(correctWire)].end = pinHover.pinId;
    } else {
      newWires = newWires.filter(wire=>wire.start !== "dragged-pin");
      const correctWire = (wire) => wire.start === pinHover.pinId;
      newWires[newWires.findIndex(correctWire)].end = startPin.pinId;
    };
    setWires(newWires);
  };

  const deleteWire = (id) => {
    setWires(wires=>wires.filter(wire => wire.id !== id))
  }

  const startGateDrag = (id, event) => {
    const movingIds = selectedIds.includes(id)
      ? selectedIds
      : event.shiftKey
        ? [...selectedIds, id]
        : [id];
    setSelectedIds(movingIds);
    const originalPositions = new Map(
      gates
        .filter((gate) => movingIds.includes(gate.id))
        .map((gate) => [gate.id, {x: gate.xOffset, y: gate.yOffset}])
    );
    gateDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      movingIds,
      originalPositions
    };

    const handleMouseMove = (moveEvent) => {
      const drag = gateDragRef.current;
      if (!drag) return;
      const deltaX = moveEvent.clientX - drag.startX;
      const deltaY = moveEvent.clientY - drag.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        drag.moved = true;
      }
      setGates((currentGates) => currentGates.map((gate) => {
        const original = drag.originalPositions.get(gate.id);
        return original
          ? {...gate, xOffset: original.x + deltaX, yOffset: original.y + deltaY}
          : gate;
      }));
    };

    const handleMouseUp = () => {
      gateDragRef.current = null;
      setGateHover({id: null});
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const openGateContextMenu = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    setPinContextMenu(null);
    setGateContextMenu({x: Math.min(event.clientX, window.innerWidth - 160), y: Math.min(event.clientY, window.innerHeight - 70), id});
  };

  const deleteSelectedItems = (targetId) => {
    const idsToDelete = selectedIds.includes(targetId) ? selectedIds : [targetId];
    const selectedGates = gates.filter((gate) => idsToDelete.includes(gate.id));
    const gatePinIds = selectedGates.flatMap((gate) => gate.pins.map((pin) => pin.id));
    const selectedInputs = inputs.filter((input) => idsToDelete.includes(input.id));
    const selectedOutputs = outputs.filter((output) => idsToDelete.includes(output.id));
    const boundaryPinIds = [
      ...selectedInputs.map((input) => input.pinId),
      ...selectedOutputs.map((output) => output.pinId)
    ];
    setGates((currentGates) => currentGates.filter((gate) => !idsToDelete.includes(gate.id)));
    setInputs((currentInputs) => currentInputs.filter((input) => !idsToDelete.includes(input.id)));
    setOutputs((currentOutputs) => currentOutputs.filter((output) => !idsToDelete.includes(output.id)));
    setWires((currentWires) => currentWires.filter((wire) => (
      !gatePinIds.includes(wire.start) &&
      !gatePinIds.includes(wire.end) &&
      !boundaryPinIds.includes(wire.start) &&
      !boundaryPinIds.includes(wire.end)
    )));
    setSelectedIds((currentIds) => currentIds.filter((selectedId) => !idsToDelete.includes(selectedId)));
  };

  const completeSelection = (rect) => {
    const ids = gates.filter((gate) => {
      const element = document.getElementById(gate.id);
      if (!element) return false;
      const bounds = element.getBoundingClientRect();
      return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
    }).map((gate) => gate.id);
    const boundaryIds = [...inputs, ...outputs].filter((pin) => {
      const element = document.getElementById(pin.id);
      if (!element) return false;
      const bounds = element.getBoundingClientRect();
      return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
    }).map((pin) => pin.id);
    setSelectedIds([...ids, ...boundaryIds]);
  };

  useEffect(() => {
    const removeSelected = (event) => {
      if (event.key === "Escape" && batchPlacementRef.current) {
        batchPlacementRef.current = false;
        batchPlacedRef.current = 0;
        setBatchPreviewVisible(false);
        setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) {
        deleteSelectedItems(selectedIds[0]);
      }
    };
    window.addEventListener("keydown", removeSelected);
    return () => window.removeEventListener("keydown", removeSelected);
  }, [selectedIds]);

  useEffect(() => {
    const handleSelectionMove = (event) => {
      if (!selection) return;
      setSelection((current) => ({...current, end: {x: event.clientX, y: event.clientY}}));
    };
    const handleSelectionEnd = () => {
      if (!selection) return;
      completeSelection({
        left: Math.min(selection.start.x, selection.end.x),
        top: Math.min(selection.start.y, selection.end.y),
        right: Math.max(selection.start.x, selection.end.x),
        bottom: Math.max(selection.start.y, selection.end.y)
      });
      setSelection(null);
    };
    window.addEventListener("mousemove", handleSelectionMove);
    window.addEventListener("mouseup", handleSelectionEnd);
    return () => {
      window.removeEventListener("mousemove", handleSelectionMove);
      window.removeEventListener("mouseup", handleSelectionEnd);
    };
  }, [selection, gates, inputs, outputs]);

  const beginSelection = (event) => {
    if (wireDraft && event.target.closest(".canvas")) {
      event.preventDefault();
      return;
    }
    if (draggedGate.isBatch && event.target.closest(".canvas") && draggedGate.isTrue) {
      event.preventDefault();
      placeDraggedGateAt(event.clientX, event.clientY, draggedGate.count);
      batchPlacementRef.current = false;
      batchPlacedRef.current = 0;
      setBatchPreviewVisible(false);
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
      return;
    }
    if (event.button !== 0 || event.target.closest(".logic-gate, .gate-pin, .boundary-pin, button")) return;
    setPinContextMenu(null);
    setSelectedIds([]);
    setSelection({start: {x: event.clientX, y: event.clientY}, end: {x: event.clientX, y: event.clientY}});
  };

  const openPinContextMenu = (event, id, pinId, type) => {
    event.preventDefault();
    event.stopPropagation();
    setPinContextMenu({x: Math.min(event.clientX, window.innerWidth - 160), y: Math.min(event.clientY, window.innerHeight - 70), id, pinId, type});
  };

  const deleteBoundaryPin = (id) => deleteSelectedItems(id);

  const saveCurrentProject = () => {
    repository.saveProject({
      ...initialProject,
      id: projectId,
      name: projectName,
      workspace: {inputs, outputs, gates, wires, simulationStates: simulation.states},
      gateDefinitions: gateList.filter((gate) => !gate.builtIn)
    });
    repository.listProjects().then(setProjects);
  };

  const startNewProject = () => {
    const project = createDefaultProject("Untitled workspace");
    setProjectId(project.id);
    setProjectName(project.name);
    setInputs([]);
    setOutputs([]);
    setGates([]);
    setWires([]);
    setGateList([
      {id: "0", name: "AND", color: "#d95773", inputs: 2, outputs: 1, builtIn: true},
      {id: "1", name: "NOT", color: "#5b8def", inputs: 1, outputs: 1, builtIn: true}
    ]);
    setSimulation({states: {}, unstable: false});
    setSelectedIds([]);
    setScreen("gate-menu");
  };

  const duplicateCurrentProject = () => {
    const project = {
      ...initialProject,
      id: projectId,
      name: projectName || "Untitled workspace",
      workspace: {inputs, outputs, gates, wires, simulationStates: simulation.states},
      gateDefinitions: gateList.filter((gate) => !gate.builtIn)
    };
    repository.duplicateProject(project).then((duplicate) => {
      setProjectId(duplicate.id);
      setProjectName(duplicate.name);
      return repository.listProjects();
    }).then(setProjects);
  };

  const deleteCurrentProject = () => {
    if (!window.confirm(`Delete "${projectName}"?`)) return;
    repository.deleteProject(projectId).then(() => {
      const remaining = repository.listProjects();
      return remaining;
    }).then((remaining) => {
      if (remaining.length) {
        openSavedProject(remaining[0].id);
      } else {
        startNewProject();
      }
      setProjects(remaining);
    });
  };

  const openSavedProject = (id, openWorkspace = false) => {
    repository.loadProject(id).then((project) => {
    if (!project) return;
    setProjectId(project.id);
    setProjectName(project.name);
    setInputs(project.workspace.inputs);
    setOutputs(project.workspace.outputs);
    setGates(project.workspace.gates);
    setWires(project.workspace.wires);
    setSimulation({states: project.workspace.simulationStates || {}, unstable: false});
    setGateList([
      {id: "0", name: "AND", color: "#d95773", inputs: 2, outputs: 1, builtIn: true},
      {id: "1", name: "NOT", color: "#5b8def", inputs: 1, outputs: 1, builtIn: true},
      ...(project.gateDefinitions || [])
    ]);
    setSelectedIds([]);
    setScreen(openWorkspace ? "gate-workspace" : "gate-menu");
    });
  };

  const renameProject = (nextName) => {
    setProjectName(nextName.slice(0, 80));
  };

  const exportCurrentProject = async () => {
    const project = {
      ...initialProject,
      id: projectId,
      name: projectName || "Untitled workspace",
      workspace: {inputs, outputs, gates, wires, simulationStates: simulation.states},
      gateDefinitions: gateList.filter((gate) => !gate.builtIn)
    };
    const serializedProject = serializeProject(project);
    if (repository.importProject) {
      const nativeResult = await repository.exportProject(serializedProject);
      if (nativeResult?.canceled === false && nativeResult.filePath) return;
    }
    const blob = new Blob([serializedProject], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(project.name || "logic-studio").replace(/[^a-z0-9-_]+/gi, "-")}.logicstudio`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProject = async (event) => {
    const nativeResult = await repository.importProject();
    if (nativeResult && !nativeResult.canceled) {
      try {
        const project = parseProject(nativeResult.serializedProject);
        await repository.saveProject(project);
        await openSavedProject(project.id);
        setProjects(await repository.listProjects());
      } catch (error) {
        console.error("Unable to import Logic Studio project.", error);
        window.alert(error.message);
      }
      return;
    }
    if (!event) {
      document.querySelector(".project-import-input")?.click();
      return;
    }
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = parseProject(String(reader.result));
        repository.saveProject(project).then(() => openSavedProject(project.id)).then(() => repository.listProjects()).then(setProjects);
      } catch (error) {
        console.error("Unable to import Logic Studio project.", error);
        window.alert(error.message);
      }
    };
    reader.onerror = () => window.alert("Unable to read the selected project file.");
    reader.readAsText(file);
  };

  const openGateDefinition = (gate) => {
    if (gate.builtIn || !gate.definition) return;
    setEditingGateId(gate.id);
    setName(gate.name);
    setGateColor(gate.color);
    setInputs(gate.definition.inputs || []);
    setOutputs(gate.definition.outputs || []);
    setGates(gate.definition.gates || []);
    setWires(gate.definition.wires || []);
    setSimulation({states: {}, unstable: false});
    setSelectedIds([]);
    setScreen("gate-workspace");
  };

  const openNewGate = () => {
    setEditingGateId(null);
    setGates([]);
    setInputs([]);
    setOutputs([]);
    setWires([]);
    setSimulation({states: {}, unstable: false});
    setName("");
    setScreen("gate-workspace");
  };

  const deleteGateFromMenu = (gate) => {
    if (!window.confirm(`Delete "${gate.name}" from this project?`)) return;
    setGateList((currentGates) => currentGates.filter((item) => item.id !== gate.id));
  };

  const duplicateProjectFromMenu = (project) => {
    repository.duplicateProject(project).then((duplicate) => {
      setProjects((currentProjects) => [...currentProjects, duplicate]);
    });
  };

  const deleteProjectFromMenu = (project) => {
    if (!window.confirm(`Delete "${project.name}" permanently?`)) return;
    repository.deleteProject(project.id).then(() => repository.listProjects()).then(setProjects);
  };

  const openProjectFromMenu = (id) => openSavedProject(id, false);

  if (!isStorageReady) {
    return <div className="library-screen library-loading">Loading Logic Studio…</div>;
  }

  if (screen === "project-menu") {
    return (
      <div className="App app-library">
        <ProjectMenu
          projects={projects}
          onNewProject={startNewProject}
          onOpenProject={openProjectFromMenu}
          onDeleteProject={deleteProjectFromMenu}
          onDuplicateProject={duplicateProjectFromMenu}
          onImportProject={importProject}
        />
      </div>
    );
  }

  if (screen === "gate-menu") {
    return (
      <div className="App app-library">
        <GateMenu
          projectName={projectName}
          gates={gateList.filter((gate) => !gate.builtIn)}
          onCreateGate={openNewGate}
          onOpenGate={openGateDefinition}
          onDeleteGate={deleteGateFromMenu}
          onBackToProjects={() => setScreen("project-menu")}
        />
      </div>
    );
  }

  return (
    <div className="App" onContextMenu={handleWireContextMenu} onMouseDown={(event) => { setPinContextMenu(null); setGateContextMenu(null); if (event.target.closest(".workspace")) beginSelection(event); }} onMouseUp={handleMouseUp}>
      <header className="App-header">
        <TopBar
          openGateDialog={() => setIsGateDialogOpen(true)}
          projectName={projectName}
          projects={projects}
          onNewProject={startNewProject}
          onSaveProject={saveCurrentProject}
          onOpenProject={openSavedProject}
          onRenameProject={renameProject}
          onExportProject={exportCurrentProject}
          onImportProject={importProject}
          onImportFile={importProject}
          onDuplicateProject={duplicateCurrentProject}
          onDeleteProject={deleteCurrentProject}
          onBackToGates={() => setScreen("gate-menu")}
        />
        <div className="workspace" style={{display: "flex", flexDirection: "row", width: "100%", height: "80%"}}>
          <Xwrapper>
            <InputBar inputs={inputs} setInputs={setInputs} setWires={setWires} simulationStates={simulation.states} onToggleInput={toggleInput} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openPinContextMenu} selectedIds={selectedIds}/>
            <MainGrid draggedPinActive={draggedPinActive} setMouseOverGrid={setMouseOverGrid} x={x} y={y} gates={gates} simulationStates={simulation.states} setGateHover={setGateHover} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover} wires={wires} deleteWire={deleteWire} deleteWirePoint={deleteWirePoint} selectedIds={selectedIds} onDragStart={startGateDrag} onContextMenu={openGateContextMenu} wireDraft={wireDraft} addWirePoint={addWirePoint} addWirePointToWire={addWirePointToWire} moveWirePoint={moveWirePoint} finishWirePoint={finishWirePoint} />
            <OutputBar outputs={outputs} setOutputs={setOutputs} setWires={setWires} simulationStates={simulation.states} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openPinContextMenu} selectedIds={selectedIds}/>
          </Xwrapper>
        </div>
        <BottomBar gateList={gateList} handleMouseDownOnGate={handleMouseDownOnGate} openGateDefinition={openGateDefinition}/>
        <div className={`delete-zone${binHover ? " delete-zone-active" : ""}`} onMouseEnter={()=>setBinHover(true)} onMouseLeave={()=>{setBinHover(false)}} style={{position: "fixed", top: "88%", left: "88%", width: "12%", height: "12%", border: "2px solid red" , zIndex: "6"}}>
          <div className="delete-zone-icon" aria-hidden="true">⌫</div>
          <span>Delete</span>
        </div>
        {draggedGate.isTrue && (!draggedGate.isBatch || batchPreviewVisible) ? <DraggedGate id={"dragged-gate"} name={draggedGate.name} color={draggedGate.color} pins={draggedGate.pins} count={draggedGate.count} xOffset={x} yOffset={y}/> : null}
        {isGateDialogOpen ? <GateDialog name={name} setName={setName} color={gateColor} setColor={setGateColor} onCancel={() => setIsGateDialogOpen(false)} onSave={(e) => { e.preventDefault(); groupGate(); }} /> : null}
        {selection ? <div className="selection-rectangle" style={{left: Math.min(selection.start.x, selection.end.x), top: Math.min(selection.start.y, selection.end.y), width: Math.abs(selection.end.x - selection.start.x), height: Math.abs(selection.end.y - selection.start.y)}} /> : null}
        {pinContextMenu ? <PinContextMenu menu={pinContextMenu} onDelete={deleteBoundaryPin} onClose={() => setPinContextMenu(null)} /> : null}
        {gateContextMenu ? <GateContextMenu menu={gateContextMenu} onDelete={deleteSelectedItems} onClose={() => setGateContextMenu(null)} /> : null}
      </header>
    </div>
  );
};