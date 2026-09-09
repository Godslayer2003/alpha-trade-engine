import { existsSync } from 'fs';
import { config } from 'dotenv';
import { dirname, join } from 'path';

// The API runs from apps/api in local development, while the shared .env
// belongs at the monorepo root. Render supplies production variables directly,
// so this is deliberately a local-development convenience only.
let directory = process.cwd();
while (true) {
  const candidate = join(directory, '.env');
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }

  const parent = dirname(directory);
  if (parent === directory) break;
  directory = parent;
}
