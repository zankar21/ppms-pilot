import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './utils/db.js';

import inventoryRoutes from './routes/inventory.js';
import maintenanceRoutes from './routes/maintenance.js';
import logbookRoutes from './routes/logbook.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, true), // relax for local dev; lock via CORS_ORIGIN env later
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/inventory', inventoryRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
const main = async () => {
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`[API] up on :${PORT}`));
};
main().catch(err => { console.error(err); process.exit(1); });
