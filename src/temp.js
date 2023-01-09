import React, { useState, useRef, useEffect } from 'react'
import Xarrow, {useXarrow, Xwrapper} from 'react-xarrows';
import Draggable from 'react-draggable';
import './App.css'

const boxStyle = {border: "grey solid 2px", borderRadius: "10px", padding: "5px"}

const DraggableBox = ({id}) => {
  const updateXarrow = useXarrow();
  return (
      <Draggable onDrag={updateXarrow} onStop={updateXarrow}>
          <div id={id} style={boxStyle}>
              {id}
          </div>
      </Draggable>
  );
};

function App() {

  const [gateList, setGateList] = useState([])

  const box1Ref = useRef(null)

  return (
    <div className="App">
      <header className="App-header">
            <Xwrapper>
                <DraggableBox id={'elem1'}/>
                <DraggableBox id={'elem2'}/>
                <Xarrow start={'elem1'} end="elem2" curveness='0' headSize='0'/>
            </Xwrapper>
      </header>
    </div>
  );
}

export default App;


import React, { useState, useEffect } from 'react'
import Xarrow, {cPaths, useXarrow, Xwrapper} from 'react-xarrows';
import Draggable from 'react-draggable';
import './App.css'



const counterStyle = {display: "flex", flexDirection: "row"}
const pinStyle = {border: "grey solid 2px", borderRadius: "10px", padding: "5px", backgroundColor: "lightgrey"}
const gateLeftSideStyle = {position: "relative", left: "-12px", display: "flex", flexDirection: "column", justifyContent: "center"}
const gateRightSideStyle = {position: "relative", left: "12px", display: "flex", flexDirection: "column", justifyContent: "center"}

const UpDownCounter = ({ count, setCount, arr, setArr }) => {

  const up = (e) => {
    e.preventDefault()
    setCount(count + 1)
    setArr([...arr, {id: Date.now()}])
  }
  const down = (e) => {
    if (count > 0) {
      e.preventDefault()
      setCount(count - 1)
      setArr(arr.splice(0, -1))
    }
  }

  return (
    <div style={counterStyle}>
      <button onClick={down}>-</button>
      <div>{count}</div>
      <button onClick={up}>+</button>
    </div>
  )
}

const Pin = ({id, setIsDisabled, handleMouseDown}) => {
  const handleMouseEnter = (e) => {
    e.preventDefault()
    setIsDisabled(true)
  }
  
  const handleMouseLeave = (e) => {
    e.preventDefault()
    setIsDisabled(false)
  }


  return (
    <div id={id} style={pinStyle} onMouseOver={handleMouseEnter} onMouseOut={handleMouseLeave} onMouseDown={handleMouseDown}>
    </div>
  )
}

const DraggedPin = ({id}) => {

  return (
    <Draggable>
      <div id={id} style={pinStyle}></div>
    </Draggable>
  )
}

const Gate = ({id, inputs, outputs, handleMouseDown}) => {
  const updateXarrow = useXarrow();
  const [isDisabled, setIsDisabled] = useState(false)

  return (
    <Draggable disabled={isDisabled} onDrag={updateXarrow} onStop={updateXarrow}>
      <div id={id} style={{position: "fixed", top: "400px", display: "flex", flexDirection: "row", border: "grey solid 2px", borderRadius: "10px", padding: "5px"}}>
        <div style={gateLeftSideStyle}>
        {inputs.map(input=>(
          <Pin id={input.id} setIsDisabled={setIsDisabled} handleMouseDown={handleMouseDown}/>
          
        ))}
        </div>
        hello
        <div style={gateRightSideStyle}>
        {outputs.map(output=>(
          <Pin id={output.id} setIsDisabled={setIsDisabled} handleMouseDown={handleMouseDown}/>
        ))}
        </div>
      </div>
    </Draggable>
  )
}

function App() {
  const [inputs, setInputs] = useState([])
  const [outputs, setOutputs] = useState([])
  const [count1, setCount1] = useState(0)
  const [count2, setCount2] = useState(0)
  const [gates, setGates] = useState([])
  const [wires, setWires] = useState([])
  const [startPinId, setStartPinId] = useState()
  const [draggedPin, setDraggedPin] = useState([])

  useEffect(({ startPinId, wires }) => {
    if (draggedPin !== []) {
      setWires([...wires, {id: Date.now(), start: startPinId, end: draggedPin[0].id}])
    }
  }, [draggedPin])

  const addGate = (e) => {
    e.preventDefault()
    if (inputs.length > 0 || outputs.length > 0) {
      setGates([...gates, {id: Date.now(), inputs: inputs, outputs: outputs}])
      console.log(gates)
      setCount1(0)
      setCount2(0)
      setInputs([])
      setOutputs([])
    }
  }
  
  const addDraggedPin = (e) => {
    e.preventDefault()
    setDraggedPin([...draggedPin, {id: Date.now()}])
    console.log(draggedPin)
  }

  const handleMouseUp = (e) => {
    e.preventDefault()
    setWires((wires) =>
      wires.filter((wire) => wire.id !== draggedPin[0].id)
    )
    setDraggedPin([])
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    setStartPinId(e.target.id)
    addDraggedPin()
  }
  
  return (
    <div className="App" onMouseUp={handleMouseUp}>
      <header className="App-header">
        <button onClick={addDraggedPin} >a</button>
        <UpDownCounter count={count1} setCount={setCount1} arr={inputs} setArr={setInputs}/>
        <UpDownCounter count={count2} setCount={setCount2} arr={outputs} setArr={setOutputs}/>

        <button onClick={addGate}>click to add a gate</button>
        <Xwrapper>
          {gates.map(gate=>(
            <Gate id={gate.id} inputs={gate.inputs} outputs={gate.outputs} handleMouseDown={handleMouseDown}/>
          ))}
          {draggedPin.map(pin=>(
            <DraggedPin id={pin.id}/>
          ))}
          {wires.map(wire=>(
            <Xarrow start={wire.start} end={wire.end} curveness='0' headSize='0'/>
          ))}
        </Xwrapper>
      </header>
    </div>
  );
}

export default App;

        // <div className='main'>
        //   <InputBar />
        //   <Grid/>
        //   <OutputBar/>
        // </div>
        // <LowerBar/>