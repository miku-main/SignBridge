export class MLP {
  constructor(weightsData) {
    this.layers = weightsData.layers;
  }

  relu(x) {
    return x > 0 ? x : 0;
  }

  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }

  predict(input) {
    let activation = input;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const W = layer.W;
      const b = layer.b;
      const output = new Array(b.length).fill(0);

      for (let j = 0; j < b.length; j++) {
        let sum = b[j];
        for (let k = 0; k < activation.length; k++) {
          sum += activation[k] * W[k][j];
        }
        output[j] = sum;
      }

      if (i < this.layers.length - 1) {
        activation = output.map(x => this.relu(x));
      } else {
        activation = output;
      }
    }

    const probs = this.softmax(activation);
    const maxIdx = probs.indexOf(Math.max(...probs));
    return { index: maxIdx, confidence: probs[maxIdx], probabilities: probs };
  }
}
