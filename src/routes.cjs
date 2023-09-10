// Fastify routes.
const fs = require('fs');

const axios = require('axios');
const jwt = require('fast-jwt');

require('dotenv').config();

const db = require('./db.cjs');

// Get the configuration from the environment (make the required variables explicit - perhaps we can be more elegant).
for(const requiredEnvironmentVariable of ['JWT_CERTS_URL']) {
    if(!process.env[requiredEnvironmentVariable]) {
        throw new Error(`missing environment variable ${requiredEnvironmentVariable}`);
    }
}
const JWT_CERTS_URL = process.env.JWT_CERTS_URL;

const INDEX_TEMPLATE = fs.readFileSync('./site/index.html.template', 'utf8');

// An http status code aware error.
const HttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// Verify the auth token and return the decoded data.
const verifyAuth = async(authToken) => {
    if(process.env.JWT_POLICY === 'fake') {
        console.warn('not verifying JWT');
        return authToken;
    }
    try {
        return jwt.createVerifier({
            key: (await axios.get(JWT_CERTS_URL)).data[
                jwt.createDecoder({complete: true})(authToken).header.kid
            ]
        })(authToken).blockchainId[0];
    } catch(_) {
        throw HttpError(401, 'invalid auth token');
    }
};

console.debug(`JWT policy: ${process.env.JWT_POLICY} - verifyAuth loaded: ${!!verifyAuth}`);

module.exports = async(fastify, _) => {
    // Setup CORS.
    fastify.register(require('@fastify/cors'), {origin: '*'});

    // Configure swagger if needed.
    if(process.env.FASTIFY_SWAGGER) {
        await fastify.register(require('@fastify/swagger'), {swagger: {info: {
            title: 'BBS Marketplace Plugin', description: fs.readFileSync('./README.md', 'utf8'), version: '0.1.0'
        }}});
        await fastify.register(require('@fastify/swagger-ui'), {routePrefix: '/doc'});
    }

    // A health check - let's make it a bit more thorough.
    fastify.get('/health', async(_, response) => await db.health());

    // A helper function to register routes with optional trailing slashes.
    const optionalTrailingSlash = (method, path, schema, handler) => ['', '/'].forEach((suffix) => {
        fastify[method](`${path}${suffix}`, {schema}, handler);
    });

    // Return the index interface for the given community.
    optionalTrailingSlash('get', '/community/:community', {schema: {
        params: {community: {type: 'string'}}
    }}, async(request, response) => response.type('application/javascript').send(INDEX_TEMPLATE.replace(
        'const community = null;', `const community = '${request.params.community}';`
    )));

    // A route for static serving files from the `site` directory - will be removed in production.
    fastify.get('/site/:path', async(request, response) => {
        const path = `/site/${request.params.path}`;
        try {
            const content = fs.readFileSync(`.${path}`, 'utf8');
            if(path.endsWith('.js')) response.type('application/javascript');
            else if(path.endsWith('.html')) response.type('text/html');
            else throw new Error('unknown file type');
            return response.send(content);
        } catch(_) {
            return response.code(404).type('text/plain').send('file not found');
        }
    });
};
