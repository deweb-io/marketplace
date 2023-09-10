require('dotenv').config();
const expect = require('chai').expect;

describe('Database', () => {
    process.env.PGDATABASE = `${process.env.PGDATABASE}_test`;
    const db = require('./db.cjs');

    beforeEach(async() => {
        const consoleWarn = console.warn;
        console.warn = () => {};
        await db.refreshDatabase();
        console.warn = consoleWarn;
    });

    it('Health check', async() => {
        expect((await db.health())).to.equal('OK');
    });
});

describe('Web server', () => {
    let server;

    before(async() => {
        // Run with swagger.
        process.env.FASTIFY_SWAGGER = 'true';
        server = require('fastify')({logger: false});
        server.register(require('./routes.cjs'));
    });

    it('Verify environment variables', async() => {
        const originalCertsUrl = process.env.JWT_CERTS_URL;
        process.env.JWT_CERTS_URL = '';
        delete require.cache[require.resolve('./routes.cjs')];
        try {
            require('./routes.cjs');
            expect.fail();
        } catch(error) {
            expect(error.message).to.equal('missing environment variable JWT_CERTS_URL');
        }
        process.env.JWT_CERTS_URL = originalCertsUrl;
    });

    it('Health endpoint', async() => {
        const healthResponse = await server.inject({method: 'GET', url: '/health'});
        expect(healthResponse.statusCode).to.equal(200);
    });

    it('Static endpoints', async() => {
        let response;
        response = await server.inject({method: 'GET', url: '/nosuchpath'});
        expect(response.statusCode).to.equal(404);
        response = await server.inject({method: 'GET', url: '/site/nosuchpath'});
        expect(response.statusCode).to.equal(404);

        // Mock fs to check for filetypes that don't exist in the site directory by default.
        const fs = require('fs');
        const originalReadFileSync = fs.readFileSync;
        fs.readFileSync = () => 'content';

        response = await server.inject({method: 'GET', url: '/site/test.js'});
        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-type']).to.equal('application/javascript');

        response = await server.inject({method: 'GET', url: '/site/file.nosuckextension'});
        expect(response.statusCode).to.equal(404);

        fs.readFileSync = originalReadFileSync;
    });
});
