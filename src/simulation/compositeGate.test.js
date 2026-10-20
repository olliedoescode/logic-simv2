import {compileCircuit} from './compileCircuit';
import {initializeCircuit} from './simulateCircuit';

test("simulates a saved composite gate through its exposed pins", () => {
  const definition = {
    id: "inverter-definition",
    name: "Inverter component",
    version: 1,
    definition: {
      inputs: [{id: "component-input", pinId: "component-input-pin"}],
      outputs: [{id: "component-output", pinId: "component-output-pin"}],
      gates: [{
        id: "internal-not",
        name: "NOT",
        pins: [
          {id: "internal-input", pinType: "input"},
          {id: "internal-output", pinType: "output"}
        ]
      }],
      wires: [
        {id: "input-wire", start: "component-input-pin", end: "internal-input"},
        {id: "output-wire", start: "internal-output", end: "component-output-pin"}
      ]
    }
  };
  const compiled = compileCircuit(
    [{
      id: "instance",
      name: definition.name,
      definitionId: definition.id,
      pins: [
        {id: "instance-input", pinType: "input"},
        {id: "instance-output", pinType: "output"}
      ]
    }],
    [{id: "workspace-input", pinId: "workspace-input-pin"}],
    [{id: "workspace-output", pinId: "workspace-output-pin"}],
    [
      {id: "input-wire", start: "workspace-input-pin", end: "instance-input"},
      {id: "output-wire", start: "instance-output", end: "workspace-output-pin"}
    ],
    [definition]
  );

  const result = initializeCircuit(compiled, {"workspace-input-pin": true});

  expect(compiled.errors).toEqual([]);
  expect(result.unstable).toBe(false);
  expect(result.states["workspace-output-pin"]).toBe(false);
});
