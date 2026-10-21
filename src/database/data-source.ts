import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';

const entities   = join(__dirname, '..', '**', '*.entity.{ts,js}');
const migrations = join(__dirname, 'migrations', '*.{ts,js}');

export default new DataSource({ 
    type        : 'mysql', 
    host        : process.env.DB_HOST ?? 'localhost', 
    port        : Number(process.env.DB_PORT ?? 3306), 
    username    : process.env.DB_USERNAME ?? 'root', 
    password    : process.env.DB_PASSWORD ?? '', 
    database    : process.env.DB_DATABASE, 
    entities    : [entities], 
    migrations  : [migrations], 
    synchronize : false 
});