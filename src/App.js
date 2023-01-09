import React, { useState, useEffect, useRef } from 'react';
import uniqueId from 'lodash/uniqueId';
import Xarrow, {cPaths, useXarrow, Xwrapper} from 'react-xarrows';
import Draggable, { DraggableCore } from 'react-draggable';
import './App.css';

const NameForm = ({name, setName}) => {
  
  return (
    <input style={{outlineStyle: "none", boxShadow: "none", borderStyle: "none", borderColor: "transparent", height: "100%", width: "90%",backgroundColor: "transparent", fontSize: "x-large", color: "white"}} type='input' value={name} onChange={(e)=>setName(e.target.value)} placeholder='Enter gate name here'></input>
  );
};

const TopBar = ({name, setName, groupGate}) => {
  const handleClick = (e) => {
    e.preventDefault();
    setName("");
    groupGate();
  };

  return (
  <div style={{display: "flex", flexDirection: "row", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "8%", backgroundColor: "transparent"}}>
    <NameForm name={name} setName={setName}/>
    <div onClick={handleClick} style={{height: "100%", width: "10%", backgroundColor: "transparent", color: "grey", textAlign: "center", verticalAlign: "center"}}>group</div>
  </div>
  );
};

const Input = ({id, pinId, deleteInput, setPinHover, handleMouseDownOnPin}) => {
  const [isHover, setIsHover] = useState(false);
  const [onCondition, setOnCondition] = useState(false);
  
  const handleMouseEnter = (e) => {
    e.preventDefault();
    setPinHover({isTrue: true, pinId: pinId, pinType: "output", parentGate: "grid"});
  };
  
  const handleMouseLeave = (e) => {
    e.preventDefault();
    setPinHover({isTrue: false, pinId: null, pinType: null, parentGate: null});
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleMouseDownOnPin(pinId, "output", "grid");
  };

  const removeInput = (e) => {
    e.preventDefault()
    deleteInput(id, pinId)
  }

  return (
    <div id={id} onMouseEnter={()=>{setIsHover(true)}} onMouseLeave={()=>{setIsHover(false)}} style={{display: "flex", flexDirection: "row", width: "100%", height: "7%"}}>
      <>
        {isHover ? <div id={id} pinid={pinId} onClick={removeInput} style={{position: "relative", width: "1.5vw", height: "1.5vw", color: "red", cursor: "pointer"}}>x</div> 
        : <div style={{position: "relative", width: "1.5vw", height: "1.5vw", color: "#282c34"}}>x</div>
        }
      </>
      <div style={{display: "flex", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "100%", justifyContent: "flex-end", alignItems: "center", backgroundColor: "#323640"}}>
        <div style={{width: "2vw", height: "2vw"}}>
          <div id={pinId} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={handleMouseDown} style={{position: "relative", left: "50%", width: "100%", height: "100%", outline: "2px solid grey", borderRadius: "100%", backgroundColor: "lightgrey", cursor: "pointer", zIndex: "4"}}></div>
        </div>
      </div>

    </div>
  )
};

const InputBar = ({inputs, setInputs, setWires, setPinHover, handleMouseDownOnPin}) => {

  const addInput = () => {
    setInputs([...inputs, {id: uniqueId(), pinId: uniqueId()}]);
  };

  const deleteInput = (id, pinId) => {
    setWires(wires=>wires.filter(wire=> wire.end !== pinId));
    setInputs(inputs=>inputs.filter(input=>input.id !== id));
  };
  return (
    <div style={{display: "flex", flexDirection: "column", width: "5%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "space-evenly"}}>
      <div onClick={addInput} style={{position: "fixed", top: "8%", left: "0px", border: "1px solid lightgrey", width: "4.8%", height: "5%", cursor: "pointer"}}>+</div>
      <div style={{width: "100%", height: "6.5%"}}></div>
      <div style={{display: "flex", flexDirection: "column", width: "100%", height: "93.5%", justifyContent: "space-evenly"}}>
      {inputs.map(input=>(
        <Input id={input.id} pinId={input.pinId} deleteInput={deleteInput} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin}/>
      ))}
      </div>
    </div>
  );
};

const MainGrid = ({draggedPinActive, x, y, gates, handleMouseDownOnPin, setPinHover, wires, deleteWire}) => {

  return (
  <div style={{width: "90%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px"}}>
    <DraggedPin id={"dragged-pin"} active={draggedPinActive} xOffset={x - 7} yOffset={y- 7}/>
    {gates.map(gate=>(
      <Gate id={gate.id} name={gate.name} pins={gate.pins} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover}/>
    ))}
    {wires.map(wire=>(
      <Wire id={wire.id} start={wire.start} end={wire.end} deleteWire={deleteWire}/>
    ))}
  </div>
  );
};


const Output = ({id, pinId, deleteOutput, setPinHover, handleMouseDownOnPin}) => {
  const [isHover, setIsHover] = useState(false);
  
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
    handleMouseDownOnPin(pinId, "input", "grid");
  };
  const removeOutput = (e) => {
    e.preventDefault();
    deleteOutput(id, pinId);
  };

  return (
    <div id={id} onMouseEnter={()=>{setIsHover(true)}} onMouseLeave={()=>{setIsHover(false)}} style={{display: "flex", flexDirection: "row", width: "100%", height: "7%"}}>
      <div style={{display: "flex", outline: "1px solid grey", outlineOffset: "-1px", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", backgroundColor: "#323640"}}>
        <div style={{width: "2vw", height: "2vw"}}>
        <div id={pinId} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseDown={handleMouseDown} style={{position: "relative", left: "-50%", width: "100%", height: "100%", outline: "2px solid grey", borderRadius: "100%", backgroundColor: "lightgrey", cursor: "pointer", zIndex: "4"}}></div>
        </div>
      </div>
      <>
        {isHover ? <div id={id} onClick={removeOutput} style={{position: "relative", width: "1.5vw", height: "1.5vw", color: "red", cursor: "pointer"}}>x</div> 
        : <div style={{position: "relative", width: "1.5vw", height: "1.5vw", color: "#282c34"}}>x</div>
        }
      </>
    </div>
  )
};

const OutputBar = ({outputs, setOutputs, setWires, setPinHover, handleMouseDownOnPin}) => {

  const addOutput = (e) => {
    e.preventDefault();
    setOutputs([...outputs, {id: uniqueId(), pinId: uniqueId()}]);
  };

  const deleteOutput = (id, pinId) => {
    setWires(wires=>wires.filter(wire=> wire.start !== pinId));
    setOutputs(outputs=>outputs.filter(output=>output.id !== id));
  };
  return (
    <div style={{display: "flex", flexDirection: "column", width: "5%", height: "100%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "space-evenly"}}>
      <div onClick={addOutput} style={{position: "fixed", top: "8%", left: "95%", border: "1px solid lightgrey", width: "4.8%", height: "5%", cursor: "pointer"}}>+</div>
      {outputs.map(output=>(
        <Output id={output.id} pinId={output.pinId} deleteOutput={deleteOutput} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin}/>
      ))}
    </div>
  );
};

const BottomBar = ({gateList, handleMouseDownOnGate}) => {

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleMouseDownOnGate(e.target.id);
  }

  return (
    <div style={{display: "flex", flexDirection: "row",width: "100%", height: "12%", outline: "1px solid grey", outlineOffset: "-1px", justifyContent: "start"}}>
      {gateList.map(gate=>(
        <div id={gate.id} onMouseDown={handleMouseDown} style={{border: "2px solid grey", borderRadius: "15px", padding: "10px", backgroundColor: "transparent", marginLeft: "5px", marginTop: "8px", marginBottom: "8px", fontSize: "medium"}}>{gate.name}</div>
      ))}
    </div>  
  );
};

const UpDownCounter = ({ count, setCount, addInput, removeInput }) => {
  const up = (e) => {
    e.preventDefault();
    setCount(count + 1);
    addInput()
  };

  const down = (e) => {
    if (count > 0) {
      e.preventDefault();
      setCount(count - 1);
      removeInput()
    };
  };

  return (
    <div style={{display: "flex", flexDirection: "row", position: "fixed", top: "8%", left: "0px", border: "1px solid lightgrey", width: "7.8%", height: "5%", justifyContent: "space-evenly"}}>
      <button onClick={down} style={{border: "none",borderRight: "1px solid lightgrey", backgroundColor: "transparent", fontSize: "medium", width: "33%", color: "lightgrey"}}>-</button>
      <div style={{fontSize: "x-large", color: "lightgrey"}}>{count}</div>
      <button onClick={up} style={{border: "none", borderLeft: "1px solid lightgrey", backgroundColor: "transparent", fontSize: "medium", width: "33%", color: "lightgrey"}}>+</button>
    </div>
  );
};

const Pin = ({id, pinType, parentGate, setDisabled, handleMouseDownOnPin, setPinHover}) => {
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
    handleMouseDownOnPin(id, pinType, parentGate);
  };

  return (
    <div id={id} style={{border: "grey solid 2px", borderRadius: "10px", marginTop: "1px", marginBottom: "1px", width: "10px", height: "10px", backgroundColor: "lightgrey", zIndex: "3"}} onMouseOver={handleMouseEnter} onMouseOut={handleMouseLeave} onMouseDown={handleMouseDown}></div>
  );
};

const DraggedPin = ({ id, active, xOffset, yOffset }) => {

  return (
    active ? <div id={id} style={{position: "fixed", top: yOffset, left: xOffset, border: "grey solid 2px", borderRadius: "10px", padding: "5px", backgroundColor: "lightgrey", zIndex: "1"}}></div>
    : null
  );
};

const Gate = ({ id, name, pins, handleMouseDownOnPin, setPinHover }) => {
  const updateXarrow = useXarrow();
  const [disabled, setDisabled] = useState(false);

  return (
    <Draggable disabled={disabled} onDrag={updateXarrow}>
      <div id={id} style={{position: "relative", display: "flex", flexDirection: "row", border: "grey solid 2px", borderRadius: "10px", padding: "5px", maxWidth: "60px", backgroundColor: "transparent",fontSize: "medium", zIndex: "2"}}>
        <div style={{position: "relative", left: "-12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
          {pins.map(pin=>(
            pin.pinType === "input" ? <Pin id={pin.id} pinType={"input"} parentGate={id} setDisabled={setDisabled} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover}/> : null
          ))}
        </div>
        {name}
        <div style={{position: "relative", left: "12px", display: "flex", flexDirection: "column", justifyContent: "center"}}>
          {pins.map(pin=>(
            pin.pinType === "output" ? <Pin id={pin.id} pinType={"output"} parentGate={id} setDisabled={setDisabled} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover}/> : null
          ))}
        </div>
      </div>
    </Draggable>
  );
};

const Wire = ({ id, start, end, deleteWire }) => {
  const [deleteButtonText, setDeleteButtonText] = useState("");
  const [deleteButtonStyle, setDeleteButtonStyle] = useState({})
  const handleMouseEnter = (e) => {
    e.preventDefault();
    setDeleteButtonText("")
    setDeleteButtonStyle({position: "relative", fontSize: "x-large", padding: "10px",border: "2px solid grey", borderRadius: "15px", cursor: "pointer", overflow: "hidden"})
  };

  const handleMouseLeave = (e) => {
    e.preventDefault();
    setDeleteButtonText("");
    setDeleteButtonStyle({})
  };

  const handleClickDelete = (e) => {
    e.preventDefault();
    deleteWire(id);
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
    <Xarrow id={id} start={start} end={end} curveness={0.5} labels={{middle: <div onClick={handleClickDelete} style={deleteButtonStyle}>{deleteButtonText}</div>}} headSize={0} startAnchor='middle' endAnchor='middle' color='lightgrey' zIndex={0}/>
    </div>
  );
};

export default function App() {
  const [x, setX] = useState();
  const [y, setY] = useState();
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [name, setName] = useState("");
  const [gateList, setGateList] = useState([]);
  const [gateListID, setGateListID] = useState(2);
  const [gates, setGates] = useState([]);
  const [wires, setWires] = useState([]);
  const [draggedGate, setDraggedGate] = useState({isTrue: false, })
  const [draggedPinActive, setDraggedPinActive] = useState(false);
  const [pinHover, setPinHover] = useState({isTrue: false, pinId: null, pinType: null, parentGate: null});
  const [startPin, setStartPin] = useState({pinId: null, pinType: null, parentGate: null});

  useEffect(
    () => {
      setGateList([{id: "0", name: "AND", inputs: 2, outputs: 1}, {id: "1", name: "NOT", inputs: 1, outputs: 1}])
      setGates([{id: uniqueId(), name: "AND", pins: generatePins(2, 1)}, {id: uniqueId(), name: "NOT", pins: generatePins(1, 1)}])
    }, []
  );
  
  useEffect(
    () => {
      const update = (e) => {
        setX(e.x);
        setY(e.y);
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
      console.log("pinHover changed, new pinHover: ", pinHover);
    }, [pinHover, setPinHover]
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
      console.log("invalid gate: no name")
    } else if (false){
      // test for pins
    } else {
      setGateList([...gateList, {id: gateListID, name: name, inputs: inputs.length, outputs: outputs.length}]);
      setGateListID(gateListID + 1); 
      console.log("new gate created, name: ", name, " id: ", gateListID);
    };
  };

  const handleMouseDownOnGate = (id) => {
    console.log(gateList)
    console.log(gateList[id].name);
    console.log(gateList[id].inputs);
    console.log(gateList[id].outputs);
    setGates([...gates, {id: uniqueId(), name: gateList[id].name, pins: generatePins(gateList[id].inputs, gateList[id].outputs)}]);
  };

  const handleMouseDownOnPin = (id, pinType, parentGate) => {
    setDraggedPinActive(true);
    if (pinType === "input") {
      console.log("wire connected, pinType: ", pinType)
      setWires([...wires, {id: uniqueId(), start: id, end: "dragged-pin"}]);
    } else {
      console.log("wire connected, pinType: ", pinType)
      setWires([...wires, {id: uniqueId(), start: "dragged-pin", end: id}]);
    };
    setStartPin({pinId: id, pinType: pinType, parentGate: parentGate});
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    if (pinHover.isTrue) {
      tryConnection();
    } else {
      if (startPin.pinType === "input") {
        setWires((wires) => wires.filter((wire) => wire.end !== "dragged-pin"));
      } else {
        setWires((wires) => wires.filter((wire) => wire.start !== "dragged-pin"));
      };
      setStartPin({pinId: null, pinType: null, parentGate: null});
    };
    setDraggedPinActive(false);
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

  return (
    <div className="App" onMouseUp={handleMouseUp}>
      <header className="App-header">
        <TopBar name={name} setName={setName} groupGate={groupGate}/>
        <div style={{display: "flex", flexDirection: "row", width: "100%", height: "80%"}}>
          <Xwrapper>
            <InputBar inputs={inputs} setInputs={setInputs} setWires={setWires} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin}/>
            <MainGrid draggedPinActive={draggedPinActive} x={x} y={y} gates={gates} handleMouseDownOnPin={handleMouseDownOnPin} setPinHover={setPinHover} wires={wires} deleteWire={deleteWire} />
            <OutputBar outputs={outputs} setOutputs={setOutputs} setWires={setWires} setPinHover={setPinHover} handleMouseDownOnPin={handleMouseDownOnPin}/>
          </Xwrapper>
        </div>
        <BottomBar gateList={gateList} handleMouseDownOnGate={handleMouseDownOnGate}/>
        {/* <div style={{position: "fixed", top: "0px", display: "flex", flexDirection: "column", padding: "3px", border: "2px solid grey", borderRadius: "10px"}}>
          
          <div style={{display: "flex", flexDireciton: "row"}}>
            <UpDownCounter count={inputCounter} setCount={setInputCounter}/>
            <UpDownCounter count={outputCounter} setCount={setOutputCounter}/>
            <button onClick={addGate} style={{border: "2px solid grey", borderRadius: "5px", backgroundColor: "transparent", color: "white"}}>click</button>
          </div>
        </div>
        <Xwrapper>
          
        </Xwrapper> */}
      </header>
    </div>
  );
};