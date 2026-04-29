import { handle } from 'hono/vercel';
import { createApp } from '../server/src/app';

export const config = { runtime: 'nodejs' };

const app = createApp();

export default handle(app);
