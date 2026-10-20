const gateDefinitions = {
  AND: {
    evaluate: (inputs) => [inputs.every(Boolean)]
  },
  NOT: {
    evaluate: (inputs) => [!Boolean(inputs[0])]
  }
};

export const getGateDefinition = (name) => gateDefinitions[name] || null;

export default gateDefinitions;
