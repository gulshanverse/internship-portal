import 'dotenv/config';
import { createApp } from '../src/server/app';

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

app.listen(port, () => {
  console.log(`Internship Portal API listening on http://localhost:${port}`);
});
