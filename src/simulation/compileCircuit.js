import {getGateDefinition} from './gateDefinitions';

const addToLookup = (lookup, key, value) => {
  if (!lookup[key]) lookup[key] = [];
  lookup[key].push(value);
};

export const compileCircuit = (gates, inputs, outputs, wires, customDefinitions = []) => {
  const customById = customDefinitions.reduce((result, definition) => {
    result[definition.id] = definition;
    return result;
  }, {});
  const customByName = customDefinitions.reduce((result, definition) => {
    result[definition.name] = definition;
    return result;
  }, {});
  const compile = (nestedGates, nestedInputs, nestedOutputs, nestedWires, definitionStack = []) => {
  const pinTypes = {};
  const pinParents = {};
  const inputPinToGate = {};
  const gateNodes = {};
  const errors = [];

  nestedInputs.forEach((input) => {
    pinTypes[input.pinId] = "output";
    pinParents[input.pinId] = "grid";
  });
  nestedOutputs.forEach((output) => {
    pinTypes[output.pinId] = "input";
    pinParents[output.pinId] = "grid";
  });
  nestedGates.forEach((gate) => {
    const definition = getGateDefinition(gate.name) ||
      customById[gate.definitionId] ||
      customByName[gate.name];
    if (!definition) {
      errors.push(`Unknown gate type: ${gate.name}`);
    }
    let compiledDefinition = null;
    if (definition?.definition) {
      if (definitionStack.includes(definition.id)) {
        errors.push(`Circular gate definition: ${definition.name}`);
      } else {
        compiledDefinition = compile(
          definition.definition.gates,
          definition.definition.inputs,
          definition.definition.outputs,
          definition.definition.wires,
          [...definitionStack, definition.id]
        );
        compiledDefinition.errors.forEach((error) => errors.push(`${definition.name}: ${error}`));
      }
    }
    const inputPins = gate.pins.filter((pin) => pin.pinType === "input").map((pin) => pin.id);
    const outputPins = gate.pins.filter((pin) => pin.pinType === "output").map((pin) => pin.id);
    gateNodes[gate.id] = {id: gate.id, name: gate.name, inputPins, outputPins, definition, compiledDefinition};
    inputPins.forEach((pinId) => {
      pinTypes[pinId] = "input";
      pinParents[pinId] = gate.id;
      inputPinToGate[pinId] = gate.id;
    });
    outputPins.forEach((pinId) => {
      pinTypes[pinId] = "output";
      pinParents[pinId] = gate.id;
    });
  });

  const incomingWire = {};
  const outgoingWires = {};
  nestedWires.forEach((wire) => {
    const sourceType = pinTypes[wire.start];
    const destinationType = pinTypes[wire.end];
    if (!sourceType || !destinationType) {
      errors.push(`Wire ${wire.id} references a missing pin`);
      return;
    }
    if (sourceType !== "output" || destinationType !== "input") {
      errors.push(`Wire ${wire.id} must connect an output to an input`);
      return;
    }
    if (incomingWire[wire.end]) {
      errors.push(`Input pin ${wire.end} has multiple incoming wires`);
      return;
    }
    incomingWire[wire.end] = wire.start;
    addToLookup(outgoingWires, wire.start, wire.end);
  });

  return {
    pinTypes,
    pinParents,
    gateNodes,
    inputPinToGate,
    incomingWire,
    outgoingWires,
    errors
  };
  };

  return compile(gates, inputs, outputs, wires);
};

export default compileCircuit;
