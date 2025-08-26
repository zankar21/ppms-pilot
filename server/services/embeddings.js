// services/embeddings.js
// Singleton embedding pipeline using @xenova/transformers (pure JS).
// Model: all-MiniLM-L6-v2 (384 dims).

import { pipeline } from '@xenova/transformers';

let _pipePromise = null;

export async function getEmbedder() {
  if (!_pipePromise) {
    _pipePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return _pipePromise;
}

export async function embedText(text) {
  const emb = await getEmbedder();
  const out = await emb(text || '', { pooling: 'mean', normalize: true });
  // note: out.data is a Float32Array
  return Array.from(out.data);
}
