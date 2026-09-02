import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SRC = join(homedir(), 'Dev/Rflopz/Docs/rendercv/Rafael_Lopez_Castillo_CV.yaml');
const DEST = join(__dirname, '../src/data/cv.yaml');

mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(SRC, DEST);
console.log(`Synced CV data: ${SRC} -> ${DEST}`);
