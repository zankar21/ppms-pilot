// scripts/embed-logbook.js
// Usage: node scripts/embed-logbook.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Logbook from '../models/Logbook.js';
import { embedText } from '../services/embeddings.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');

const cursor = Logbook.find({ $or: [ { embedding: { $exists: false } }, { embedding: { $size: 0 } } ] }).cursor();
let n = 0;
for await (const doc of cursor) {
  try {
    const vec = await embedText([doc.title, doc.body].filter(Boolean).join('\n'));
    doc.embedding = vec;
    await doc.save();
    n++;
    if (n % 20 === 0) console.log(`Embedded ${n} docs...`);
  } catch (e) {
    console.error('Failed to embed doc', doc._id, e.message);
  }
}
console.log(`Done. Embedded ${n} documents.`);
process.exit(0);
