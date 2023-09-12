// Database initialization and access.
require('dotenv').config();
const postgres = require('postgres');

const psql = postgres({transform: postgres.toCamel});

// Database initialization.
const refreshDatabase = async() => {
    console.warn(`┌refreshing database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);
    console.warn(`using credentials ${process.env.PGUSER}:${process.env.PGPASSWORD}`);
    console.warn('│┌clearing all tables');
    for(const row of await psql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`) {
        console.warn(`││┌dropping table ${row.tablename}`);
        // This trick is required to stop postgres.js from escaping the table name.
        // You may want to suppress cascade notices by setting client_min_messages to warning, e.g.:
        // `ALTER DATABASE marketplace_test SET client_min_messages TO warning;`
        const dropQuery = `DROP TABLE ${row.tablename} CASCADE`;
        await psql({...[dropQuery], raw: [dropQuery]});
        console.warn(`││└dropped table ${row.tablename}`);
    }
    console.warn('│└all tables cleared');

    const fs = require('fs');
    const path = require('path');
    const migrationDirectory = './migrations';
    console.warn('│┌running migrations');
    for(let fileName of (
        (await fs.promises.readdir(migrationDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort()
    )) {
        fileName = path.join(migrationDirectory, fileName);
        console.warn(`││┌running migration ${fileName}`);
        await psql.file(fileName);
        console.warn(`││└finished migration ${fileName}`);
    }
    console.warn('│└finished migrations');

    console.warn(`└database ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE} refresehd`);
};

// Report database connection and health.
const health = async() => await psql`SELECT 1 FROM items LIMIT 1` && 'OK';

// Get item details.
const getItem = async(itemId) => (await psql`SELECT * FROM items WHERE id = ${itemId}`)[0];

// Get list of items for a user in a community.
const getItems = async(community, user) => (
    await psql`SELECT * FROM items WHERE community = ${community} AND publisher = ${user}`
);

// Create a new item (creating the user if needed).
const createItem = async(community, user, price, description) => {
    await psql`INSERT INTO users (id, details) VALUES (${user}, '{}') ON CONFLICT DO NOTHING;`;
    return await psql`
        INSERT INTO items (publisher, community, price, description)
        VALUES (${user}, ${community}, ${price}, ${description})
        RETURNING id;`;
};

// Update item status.
const updateItem = async(itemId, user, status) => await psql`
    UPDATE items SET status = ${status} WHERE id = ${itemId} AND publisher = ${user};
`;

exports = module.exports = {
    createItem,
    getItem,
    getItems,
    health,
    psql,
    refreshDatabase,
    updateItem
};
