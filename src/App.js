import React, { useMemo, useState, useEffect, useRef } from 'react';
import uniqueId from 'lodash/uniqueId';
import {useXarrow, Xwrapper} from 'react-xarrows';
import './App.css';
import {compileCircuit} from './simulation/compileCircuit';
import {initializeCircuit, propagateCircuit} from './simulation/simulateCircuit';
import {createDefaultProject, createProjectId, parseProject} from './storage/projectStorage';
import {loadInitialData, repository} from './storage/repository';

const ColorPickerMenu = ({color, setColor}) => {
  const [hue, setHue] = useState(180);
  const [spectrumPoint, setSpectrumPoint] = useState({x: 50, y: 50});
  const rgb = [0, 1, 2].map((index) => parseInt(color.slice(index * 2 + 1, index * 2 + 3), 16) || 0);
  const updateRgb = (index, value) => {
    const nextRgb = rgb.map((channel, channelIndex) => channelIndex === index ? value : channel);
    setColor(`#${nextRgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
  };
  const selectSpectrumColor = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const saturation = Math.round(x * 100);
    const lightness = Math.round((1 - y) * 50);
    setSpectrumPoint({x: x * 100, y: y * 100});
    const context = document.createElement("canvas").getContext("2d");
    context.fillStyle = `hsl(${hue} ${saturation}% ${lightness + 10}%)`;
    setColor(context.fillStyle);
  };

  return (
    <details className="topbar-colour-menu">
      <summary className="topbar-colour-toggle" title="Change gate colour">
        <span className="colour-swatch" style={{backgroundColor: color}} />
        <span>Colour</span>
        <span className="colour-menu-icon">⌄</span>
      </summary>
      <div className="topbar-colour-panel">
        <div className="colour-spectrum" style={{"--picker-hue": `hsl(${hue} 80% 55%)`}} onMouseDown={selectSpectrumColor} role="button" tabIndex="0" aria-label="Choose saturation and lightness">
          <span className="colour-spectrum-marker" style={{left: `${spectrumPoint.x}%`, top: `${spectrumPoint.y}%`}} />
        </div>
        <input className="colour-hue-strip" type="range" min="0" max="360" value={hue} onChange={(event) => {
          setHue(Number(event.target.value));
          const context = document.createElement("canvas").getContext("2d");
          context.fillStyle = `hsl(${event.target.value} 80% 55%)`;
          setColor(context.fillStyle);
        }} aria-label="Hue" />
        <div className="colour-model-fields">
          <label>HEX<input value={color.toUpperCase()} onChange={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && setColor(event.target.value.toLowerCase())} /></label>
          {["R", "G", "B"].map((channel, index) => <label key={channel}>{channel}<input type="number" min="0" max="255" value={rgb[index]} onChange={(event) => updateRgb(index, Math.max(0, Math.min(255, Number(event.target.value) || 0)))} /></label>)}
        </div>
      </div>
    </details>
  );
};

const TopBar = ({openGateDialog, onBackToGates, editingGateId, name, setName, onApplyChanges, gateColor, setGateColor}) => {
  return (
  <div className="topbar">
    <div className="brand-lockup"><span className="brand-mark">∿</span><span className="brand-name">Logic Studio</span><span className="brand-context">/ workspace</span></div>
    <button className="group-button" onClick={onBackToGates} type="button">Menu</button>
    {editingGateId ? (
      <input className="topbar-gate-name" value={name} onChange={(event) => setName(event.target.value)} aria-label="Gate name" />
    ) : null}
    <div className="topbar-spacer"></div>
    {editingGateId ? <ColorPickerMenu color={gateColor} setColor={setGateColor} /> : null}
    <button className="group-button" onClick={editingGateId ? onApplyChanges : openGateDialog} type="button">{editingGateId ? "Apply changes" : "Save gate"}</button>
  </div>
  );
};

const ProjectMenu = ({projects, onNewProject, onOpenProject, onDeleteProject, onDuplicateProject, onImportProject}) => (
  <main className="library-screen">
    <div className="library-heading">
      <span className="dialog-eyebrow">LOGIC STUDIO</span>
      <h1>Projects</h1>
    </div>
    <div className="library-actions">
      <button className="library-primary-button" type="button" onClick={onNewProject}>New project</button>
      <button className="library-secondary-button" type="button" onClick={onImportProject}>Import</button>
    </div>
    <div className="project-table" role="table" aria-label="Saved projects">
      <div className="project-table-header" role="row">
        <span role="columnheader">Name</span>
        <span role="columnheader">Updated</span>
        <span role="columnheader">Gates</span>
        <span role="columnheader">Actions</span>
      </div>
      {projects.map((project) => (
        <div className="project-table-row" role="row" key={project.id}>
          <strong role="cell">{project.name}</strong>
          <span role="cell">{new Date(project.updatedAt).toLocaleString()}</span>
          <span role="cell">{project.gateDefinitions?.length || 0}</span>
          <div className="project-table-actions" role="cell">
            <button type="button" onClick={() => onOpenProject(project.id)}>Open</button>
            <button type="button" onClick={() => onDuplicateProject(project)}>Duplicate</button>
            <button className="danger-action" type="button" onClick={() => onDeleteProject(project)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  </main>
);

const NewProjectScreen = ({name, setName, onBack, onSubmit}) => (
  <main className="new-project-screen">
    <form className="new-project-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <button className="library-back-button" type="button" onClick={onBack}>← Back</button>
      <span className="dialog-eyebrow">NEW PROJECT</span>
      <h1>Name your project</h1>
      <label htmlFor="project-name">Project name</label>
      <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} />
      <button className="library-primary-button" type="submit" disabled={!name.trim()}>Create project</button>
    </form>
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

const GatePreview = ({gate, compact = false}) => (
  <div className={`gate-preview${compact ? " gate-preview-compact" : ""}`} style={{"--gate-color": gate.color, "--gate-text-color": getGateTextColor(gate.color)}}>
    {!compact ? (
      <div className="gate-preview-pins gate-preview-inputs" aria-hidden="true">
        {Array.from({length: gate.inputs}, (_, index) => <span key={`input-${index}`} />)}
      </div>
    ) : null}
    <span className="gate-preview-body">{gate.name}</span>
    {!compact ? (
      <div className="gate-preview-pins gate-preview-outputs" aria-hidden="true">
        {Array.from({length: gate.outputs}, (_, index) => <span key={`output-${index}`} />)}
      </div>
    ) : null}
  </div>
);

const BottomBar = ({gateList, hotbarIds, setHotbarIds, slotCount, isDrawerOpen, setIsDrawerOpen, handleMouseDownOnGate, openGateDefinition}) => {

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleMouseDownOnGate(e.currentTarget.id, e.shiftKey);
  };

  const handleDrawerDragStart = (e, gateId) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrawerOpen(false);
    handleMouseDownOnGate(gateId, e.shiftKey);
  };

  const handleNativeDragStart = (event, gateId) => {
    event.dataTransfer.setData("text/gate-id", String(gateId));
    setIsDrawerOpen(false);
  };

  const moveGateToHotbar = (gateId, targetIndex, sourceIndex = null) => {
    setHotbarIds((currentIds) => {
      const nextIds = [...currentIds];
      const existingIndex = nextIds.findIndex((id) => String(id) === String(gateId));
      const targetGateId = nextIds[targetIndex];

      if (sourceIndex !== null && targetGateId && sourceIndex !== targetIndex) {
        nextIds[sourceIndex] = targetGateId;
      } else if (existingIndex !== -1 && existingIndex !== targetIndex) {
        nextIds[existingIndex] = null;
      }

      nextIds[targetIndex] = gateId;
      return nextIds;
    });
  };

  const replaceHotbarSlot = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    const gateId = event.dataTransfer.getData("text/gate-id");
    const sourceIndex = event.dataTransfer.getData("text/hotbar-index");
    if (gateId) moveGateToHotbar(gateId, index, sourceIndex === "" ? null : Number(sourceIndex));
  };

  return (
    <section className={`gate-dock${isDrawerOpen ? " gate-dock-open" : ""}`} aria-label="Gate menu">
      {isDrawerOpen ? (
        <div className="gate-drawer">
          <div className="gate-drawer-heading">
            <div>
              <span className="gate-library-kicker">GATE MENU</span>
              <h2>All gates</h2>
            </div>
            <span className="gate-drawer-hint">Drag a preview to the workspace or a hotbar slot.</span>
          </div>
          <div className="gate-drawer-grid">
            {gateList.map((gate) => (
              <div
                className="gate-drawer-card"
                key={gate.id}
                draggable
                onDragStart={(event) => handleNativeDragStart(event, gate.id)}
                onMouseDown={(event) => handleDrawerDragStart(event, gate.id)}
                onDoubleClick={() => openGateDefinition(gate)}
                title={gate.builtIn ? "Drag to place" : "Drag to place, double-click to edit"}
              >
                <GatePreview gate={gate} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="gate-hotbar">
        <button className="gate-menu-toggle" type="button" onClick={() => setIsDrawerOpen((open) => !open)} aria-expanded={isDrawerOpen}>
          <span>Gate menu</span>
          <span className={`gate-menu-arrow${isDrawerOpen ? " is-open" : ""}`} aria-hidden="true">⌃</span>
        </button>
        <div className="gate-hotbar-slots">
          {Array.from({length: slotCount}, (_, index) => {
            const gateId = hotbarIds[index] || null;
            const gate = gateList.find((item) => String(item.id) === String(gateId));
            return (
              <div className="gate-hotbar-slot" data-hotbar-slot={index} key={`${gateId}-${index}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => replaceHotbarSlot(event, index)}>
                {gate ? <div id={gate.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/gate-id", String(gate.id)); event.dataTransfer.setData("text/hotbar-index", String(index)); }} onMouseDown={handleMouseDown} title={`Drag ${gate.name} to place`}><GatePreview gate={gate} compact /></div> : <span className="gate-hotbar-empty">+</span>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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

const GateDialog = ({name, setName, onCancel, onSave}) => (
  <div className="dialog-backdrop">
    <form className="gate-dialog" onSubmit={onSave}>
      <div className="dialog-heading">
        <div>
          <span className="dialog-eyebrow">CUSTOM COMPONENT</span>
          <h2>Create gate</h2>
        </div>
        <button className="dialog-close" type="button" onClick={onCancel} aria-label="Close dialog">×</button>
      </div>
      <label className="dialog-label">Gate name
        <input className="dialog-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Half adder" autoFocus />
      </label>
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
  const [newProjectName, setNewProjectName] = useState("");
  const [inputs, setInputs] = useState(initialProject.workspace.inputs);
  const [outputs, setOutputs] = useState(initialProject.workspace.outputs);
  const [name, setName] = useState("");
  const [gateList, setGateList] = useState([]);
  const [hotbarIds, setHotbarIds] = useState(["0", "1", null, null, null, null]);
  const [hotbarSlotCount, setHotbarSlotCount] = useState(() => Math.max(6, Math.floor((window.innerWidth - 170) / 86)));
  const [isGateDrawerOpen, setIsGateDrawerOpen] = useState(false);
  const [gates, setGates] = useState(initialProject.workspace.gates);
  const [wires, setWires] = useState(initialProject.workspace.wires);
  const [draggedGate, setDraggedGate] = useState({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, definitionId: null, count: 1})
  const [mouseOverGrid, setMouseOverGrid] = useState(false);
  const [draggedPinActive, setDraggedPinActive] = useState(false);
  const [pinHover, setPinHover] = useState({isTrue: false, pinId: null, pinType: null, parentGate: null});
  const [startPin, setStartPin] = useState({pinId: null, pinType: null, parentGate: null});
  const [gateHover, setGateHover] = useState({id: null});
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
    const updateHotbarSize = () => {
      const nextCount = Math.max(6, Math.floor((window.innerWidth - 170) / 86));
      setHotbarSlotCount(nextCount);
    };
    updateHotbarSize();
    window.addEventListener("resize", updateHotbarSize);
    return () => window.removeEventListener("resize", updateHotbarSize);
  }, []);

  useEffect(() => {
    loadInitialData().then(({project, projects: savedProjects}) => {
      setProjectId(project.id);
      setProjectName(project.name);
      setInputs(project.workspace.inputs);
      setOutputs(project.workspace.outputs);
      setGates(project.workspace.gates);
      setWires(project.workspace.wires);
      setSimulation({states: project.workspace.simulationStates || {}, unstable: false});
      setHotbarIds(project.workspace.hotbarIds || ["0", "1", ...(project.gateDefinitions || []).slice(0, 4).map((gate) => gate.id), null, null].slice(0, 6));
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
      workspace: {inputs, outputs, gates, wires, simulationStates: simulation.states, hotbarIds},
      gateDefinitions: gateList.filter((gate) => !gate.builtIn)
    }).then(() => repository.listProjects()).then(setProjects);
  }, [projectId, projectName, inputs, outputs, gates, wires, simulation.states, hotbarIds, gateList, initialProject, isStorageReady]);
  
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
      console.log("gateHover changed, new binHover: ", gateHover);
    }, [gateHover, setGateHover]
  );


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
    const hotbarSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-hotbar-slot]");
    if (draggedGate.isTrue && hotbarSlot && draggedGate.sourceId) {
      const slotIndex = Number(hotbarSlot.getAttribute("data-hotbar-slot"));
      setHotbarIds((currentIds) => {
        const sourceIndex = currentIds.findIndex((id) => String(id) === String(draggedGate.sourceId));
        const nextIds = [...currentIds];
        const targetGateId = nextIds[slotIndex];
        if (sourceIndex !== -1 && sourceIndex !== slotIndex) {
          nextIds[sourceIndex] = targetGateId || null;
        } else if (sourceIndex === -1) {
          nextIds.forEach((id, index) => {
            if (String(id) === String(draggedGate.sourceId)) nextIds[index] = null;
          });
        }
        nextIds[slotIndex] = draggedGate.sourceId;
        return nextIds;
      });
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
      return;
    }
    if (draggedGate.isTrue && releasedOnGrid && !batchPlacementRef.current && !draggedGate.isBatch) {
      const xOff = e.clientX;
      const yOff = e.clientY;
      placeDraggedGateAt(xOff, yOff);
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
    };

    if (!batchPlacementRef.current) {
      setDraggedGate({isTrue: false, isBatch: false, sourceId: null, id: null, name: null, color: null, pins: null, count: 1});
    }
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

  const startNewProject = () => {
    setNewProjectName("");
    setScreen("new-project");
  };

  const createNewProject = () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) return;
    const project = createDefaultProject(trimmedName);
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
    setHotbarIds(["0", "1", null, null, null, null]);
    setSimulation({states: {}, unstable: false});
    setSelectedIds([]);
    setScreen("gate-menu");
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
    setHotbarIds(project.workspace.hotbarIds || ["0", "1", ...(project.gateDefinitions || []).slice(0, 4).map((gate) => gate.id), null, null].slice(0, 6));
    setGateList([
      {id: "0", name: "AND", color: "#d95773", inputs: 2, outputs: 1, builtIn: true},
      {id: "1", name: "NOT", color: "#5b8def", inputs: 1, outputs: 1, builtIn: true},
      ...(project.gateDefinitions || [])
    ]);
    setSelectedIds([]);
    setScreen(openWorkspace ? "gate-workspace" : "gate-menu");
    });
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

  if (screen === "new-project") {
    return (
      <div className="App app-library">
        <NewProjectScreen
          name={newProjectName}
          setName={setNewProjectName}
          onBack={() => setScreen("project-menu")}
          onSubmit={createNewProject}
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
          onBackToGates={() => setScreen("gate-menu")}
          editingGateId={editingGateId}
          name={name}
          setName={setName}
          onApplyChanges={groupGate}
          gateColor={gateColor}
          setGateColor={setGateColor}
        />
        <div className="workspace">
          <Xwrapper>
            <InputBar inputs={inputs} setInputs={setInputs} setWires={setWires} simulationStates={simulation.states} onToggleInput={toggleInput} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openPinContextMenu} selectedIds={selectedIds}/>
            <MainGrid draggedPinActive={draggedPinActive} setMouseOverGrid={setMouseOverGrid} x={x} y={y} gates={gates} simulationStates={simulation.states} setGateHover={setGateHover} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover} wires={wires} deleteWire={deleteWire} deleteWirePoint={deleteWirePoint} selectedIds={selectedIds} onDragStart={startGateDrag} onContextMenu={openGateContextMenu} wireDraft={wireDraft} addWirePoint={addWirePoint} addWirePointToWire={addWirePointToWire} moveWirePoint={moveWirePoint} finishWirePoint={finishWirePoint} />
            <OutputBar outputs={outputs} setOutputs={setOutputs} setWires={setWires} simulationStates={simulation.states} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin} openContextMenu={openPinContextMenu} selectedIds={selectedIds}/>
          </Xwrapper>
        </div>
        <BottomBar
          gateList={gateList}
          hotbarIds={hotbarIds}
          setHotbarIds={setHotbarIds}
          slotCount={Math.max(hotbarSlotCount, hotbarIds.length)}
          isDrawerOpen={isGateDrawerOpen}
          setIsDrawerOpen={setIsGateDrawerOpen}
          handleMouseDownOnGate={handleMouseDownOnGate}
          openGateDefinition={openGateDefinition}
        />
        {draggedGate.isTrue && (!draggedGate.isBatch || batchPreviewVisible) ? <DraggedGate id={"dragged-gate"} name={draggedGate.name} color={draggedGate.color} pins={draggedGate.pins} count={draggedGate.count} xOffset={x} yOffset={y}/> : null}
        {isGateDialogOpen ? <GateDialog name={name} setName={setName} onCancel={() => setIsGateDialogOpen(false)} onSave={(e) => { e.preventDefault(); groupGate(); }} /> : null}
        {selection ? <div className="selection-rectangle" style={{left: Math.min(selection.start.x, selection.end.x), top: Math.min(selection.start.y, selection.end.y), width: Math.abs(selection.end.x - selection.start.x), height: Math.abs(selection.end.y - selection.start.y)}} /> : null}
        {pinContextMenu ? <PinContextMenu menu={pinContextMenu} onDelete={deleteBoundaryPin} onClose={() => setPinContextMenu(null)} /> : null}
        {gateContextMenu ? <GateContextMenu menu={gateContextMenu} onDelete={deleteSelectedItems} onClose={() => setGateContextMenu(null)} /> : null}
      </header>
    </div>
  );
};