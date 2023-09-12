// Fastify routes.
const fs = require('fs');

const axios = require('axios');
const jwt = require('fast-jwt');

require('dotenv').config();

const db = require('./db.cjs');

// Get the configuration from the environment (make the required variables explicit - perhaps we can be more elegant).
for(const requiredEnvironmentVariable of ['JWT_CERTS_URL', 'PLUGIN_SERVICE_ENDPOINT']) {
    if(!process.env[requiredEnvironmentVariable]) {
        throw new Error(`missing environment variable ${requiredEnvironmentVariable}`);
    }
}
const JWT_CERTS_URL = process.env.JWT_CERTS_URL;
const PLUGIN_SERVICE_ENDPOINT = process.env.PLUGIN_SERVICE_ENDPOINT;

const INDEX_TEMPLATE = fs.readFileSync('./site/index.js.template', 'utf8');
const ITEM_TEMPLATE = fs.readFileSync('./site/item.js.template', 'utf8');

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

const getItems = async(community, authToken) => {
    const user = await verifyAuth(authToken);
    return {user, community, items: await db.getItems(community, user)};
};

const getItem = async(itemId) => {
    try {
        return await db.getItem(itemId);
    } catch(_) {
        throw HttpError(404, 'item not found');
    }
};

const createItem = async(community, authToken, price, description) => {
    const user = await verifyAuth(authToken);
    try {
        return await db.createItem(community, user, price, description);
    } catch(error) {
        throw HttpError(400, error.message || error);
    }
};

const updateItem = async(itemId, authToken, status) => {
    const user = await verifyAuth(authToken);
    try {
        return await db.updateItem(itemId, user, status);
    } catch(error) {
        throw HttpError(400, error.message || error);
    }
};

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

    // Return the index parcel for the given community.
    fastify.get('/items/:community', {schema: {
        params: {community: {type: 'string'}}
    }}, async(request, response) => response.type('application/javascript').send(INDEX_TEMPLATE.replace(
        'const community = null;', `const community = '${request.params.community}';`
    ).replace(
        'const pluginServer = null;', `const pluginServer = '${PLUGIN_SERVICE_ENDPOINT}';`
    )));

    // Return the item parcel for a given item.
    fastify.get('/item/:item', {schema: {
        params: {item: {type: 'string'}}
    }}, async(request, response) => response.type('application/javascript').send(ITEM_TEMPLATE.replace(
        'const item = null;', `const item = '${request.params.item}';`
    ).replace(
        'const pluginServer = null;', `const pluginServer = '${PLUGIN_SERVICE_ENDPOINT}';`
    )));


    // From here on the endpoints are internal, i.e. used only by the parcels served above.

    // Return the index details for a given community and user.
    fastify.post('/items/:community', {schema: {
        params: {community: {type: 'string'}},
        body: {type: 'object', properties: {authToken: {type: 'string'}}}
    }}, async(request, response) => response.send(await getItems(request.params.community, request.body.authToken)));

    // Return the item details for a given item.
    fastify.post('/item/:item', {schema: {
        params: {item: {type: 'string'}}
    }}, async(request, response) => response.send(await getItem(request.params.item)));

    // Create a new item for the current user in the current community.
    fastify.post('/items/:community/new', {schema: {
        params: {community: {type: 'string'}},
        body: {type: 'object', properties: {authToken: {type: 'string'}, item: {type: 'object'}}}
    }}, async(request, response) => {
        return response.code(201).send(await createItem(
            request.params.community, request.body.authToken, request.body.price, request.body.item
        ));
    });

    // Update the status of an item.
    fastify.post('/item/:item/update', {schema: {
        params: {item: {type: 'string'}},
        body: {type: 'object', properties: {authToken: {type: 'string'}, status: {type: 'string'}}}
    }}, async(request, response) => {
        return response.send(await updateItem(request.params.item, request.body.authToken, request.body.status));
    });

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
