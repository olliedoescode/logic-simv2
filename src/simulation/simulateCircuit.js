import {getGateDefinition} from './gateDefinitions';

const getGateOutputStates = (gate, states) => {
  const definition = gate.definition || getGateDefinition(gate.name);
  if (!definition) return gate.outputPins.map(() => false);
  const inputStates = gate.inputPins.map((pinId) => Boolean(states[pinId]));
  if (definition.definition && gate.compiledDefinition) {
    const nestedInitialStates = {};
    definition.definition.inputs.forEach((input, index) => {
      nestedInitialStates[input.pinId] = inputStates[index] || false;
    });
    const nested = initializeCircuit(gate.compiledDefinition, nestedInitialStates);
    return definition.definition.outputs
      .map((output) => Boolean(nested.states[output.pinId]))
      .slice(0, gate.outputPins.length);
  }
  const outputStates = definition.evaluate(inputStates);
  return gate.outputPins.map((_, index) => Boolean(outputStates[index]));
};

export const propagateCircuit = (compiledCircuit, initialStates = {}, changedPins = []) => {
  const states = {...initialStates};
  const queue = changedPins.map((pinId) => ({pinId, value: Boolean(states[pinId])}));
  let queueIndex = 0;
  let updates = 0;
  const maxUpdates = Math.max(1, Object.keys(compiledCircuit.pinTypes).length * 4);
  const processedSignals = new Set();

  while (queueIndex < queue.length && updates < maxUpdates) {
    const {pinId, value} = queue[queueIndex++];
    const signalKey = `${pinId}:${value}`;
    if (processedSignals.has(signalKey)) continue;
    processedSignals.add(signalKey);
    states[pinId] = value;
    updates += 1;

    (compiledCircuit.outgoingWires[pinId] || []).forEach((destinationPinId) => {
      queue.push({pinId: destinationPinId, value});
    });

    const gateId = compiledCircuit.inputPinToGate[pinId];
    const gate = gateId ? compiledCircuit.gateNodes[gateId] : null;
    if (gate) {
      const outputStates = getGateOutputStates(gate, states);
      gate.outputPins.forEach((outputPinId, index) => {
        queue.push({pinId: outputPinId, value: outputStates[index]});
      });
    }
  }

  return {
    states,
    unstable: queueIndex < queue.length || updates >= maxUpdates
  };
};

export const initializeCircuit = (compiledCircuit, initialStates = {}) => {
  const pinIds = Object.keys(compiledCircuit.pinTypes);
  const states = pinIds.reduce((result, pinId) => {
    result[pinId] = Boolean(initialStates[pinId]);
    return result;
  }, {});
  const sourcePins = pinIds.filter((pinId) => (
    compiledCircuit.pinTypes[pinId] === "output" &&
    compiledCircuit.pinParents[pinId] === "grid"
  ));
  return propagateCircuit(compiledCircuit, states, sourcePins);
};

export default propagateCircuit;
