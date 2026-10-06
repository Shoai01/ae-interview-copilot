import * as tf from '@tensorflow/tfjs';

// @tensorflow-models/coco-ssd's own load() hardcodes a fetch from
// storage.googleapis.com with no way to override the URL (no modelUrl param
// in the installed version), so we can't self-host through it directly.
// This replicates its inference logic against our own loadGraphModel call
// against the self-hosted model files instead (frontend/public/models/coco-ssd),
// filtered down to just the one thing we need: a count of "person"-class
// detections. COCO label map id 1 = "person".
const PERSON_CLASS_ID = 1;
const MAX_BOXES = 20;
// Low floor passed into NMS itself (just to drop obvious garbage and dedupe
// overlapping boxes) — the real cutoff is applied afterwards in JS, so
// sub-threshold detections are still visible for debugging/tuning instead
// of being silently discarded inside NMS before we can inspect them.
const NMS_FLOOR_SCORE = 0.1;

export async function loadPersonDetector(modelUrl) {
  const model = await tf.loadGraphModel(modelUrl);
  const warmup = tf.zeros([1, 300, 300, 3]);
  const result = await model.executeAsync(warmup);
  result.forEach((t) => t.dispose());
  warmup.dispose();
  return model;
}

export async function countPersons(model, imgEl, minScore = 0.5) {
  const input = tf.tidy(() => tf.expandDims(tf.browser.fromPixels(imgEl)));

  const outputs = await model.executeAsync(input);
  const scoresData = outputs[0].dataSync();
  const boxesData = outputs[1].dataSync();
  const numBoxes = outputs[0].shape[1];
  const numClasses = outputs[0].shape[2];
  input.dispose();
  tf.dispose(outputs);

  const maxScores = [];
  const classIndices = [];
  for (let i = 0; i < numBoxes; i++) {
    let max = Number.MIN_VALUE;
    let maxIdx = -1;
    for (let c = 0; c < numClasses; c++) {
      const v = scoresData[i * numClasses + c];
      if (v > max) { max = v; maxIdx = c; }
    }
    maxScores[i] = max;
    classIndices[i] = maxIdx;
  }

  // nonMaxSuppression requires the CPU backend in this tfjs version.
  const prevBackend = tf.getBackend();
  if (prevBackend === 'webgl') tf.setBackend('cpu');
  const selectedIndices = tf.tidy(() => {
    const boxes2d = tf.tensor2d(boxesData, [outputs[1].shape[1], outputs[1].shape[3]]);
    return tf.image.nonMaxSuppression(boxes2d, maxScores, MAX_BOXES, NMS_FLOOR_SCORE, NMS_FLOOR_SCORE);
  });
  const selected = Array.from(selectedIndices.dataSync());
  selectedIndices.dispose();
  if (prevBackend !== tf.getBackend()) tf.setBackend(prevBackend);

  let personCount = 0;
  const personScores = [];
  for (const idx of selected) {
    const classId = classIndices[idx] + 1;
    if (classId === PERSON_CLASS_ID) {
      personScores.push(maxScores[idx]);
      if (maxScores[idx] >= minScore) personCount++;
    }
  }
  return { personCount, personScores };
}
