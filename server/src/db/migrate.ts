import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';
import path from 'path';

console.log('Running migrations...');
migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
console.log('Migrations complete.');
