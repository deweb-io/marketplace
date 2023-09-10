// We generally use fastify-cli to launch the server, but this minimal launcher still comes in handy sometimes.
require('dotenv').config();
const fastify = require('fastify')();
fastify.register(require('./routes.cjs'));
fastify.listen(process.env.FASTIFY_PORT || 3000, (error, address) => {
    if(error) {
        console.error(error);
        process.exit(1);
    }
    console.log(`Server listening on ${address}`);
});
