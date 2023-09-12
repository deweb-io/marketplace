# BBS Marketplace Plugin

The BBS Marketplace plugin, when enabled, creates a new `Marketplace` tab, in which the user can create for-sale items and manage their statuses. For-sale items are created within communities, and whenever an item is created - a matching post is automatically created in its community, with the creating user as the publisher and containing - within a designated block - all the item's details (which are then written to the blockchain and core DB and indexed by our core system). When an item is marked as sold or cancelled, its post is automatically marked as hidden.

The `Marketplace` tab will also let the user set its business details (address, phone number, whatever). The post for the first item that is created after a change in the business details will also contain them (and they will be written to the blockchain and core DB and indexed by our core system).

The plugin also serves a Single SPA rendering of for-sale items to be mounted and displayed when a for-sale item's post is viewed within the message board, if the plugin is enabled.

## Core UI Specifications

The Service integration requires the following:
* Mount the plugin index page (where the user creates and updates his for-sale items) from the plugin server as a tab
* Mount the custom rendering of for-sale item posts from the plugin server
* Create and hide posts on the user's behalf from the plugin tab (this should happen via our bbs-common library)

Both our UI's (the index page and custom renderings of for-sale items) are served as Single SPA parcels. The Web app already has the ability to mount Single SPA parcels, and the mobile app will require a thin adapter layer, basically a bare HTML which can mount a Single SPA parcel - there may be a flutter plugin that already does that, and a working example can be found at `/site/dev.html`.

In order for the Service to authenticate the BBS user running the Core UI, the UI parcel requires access to the signed Firebase auth token. This token has to be passed to the UI as a parameter to the `mount` function call (this means adding it to Single SPA's props).

### Marketplace Service Specifications

The service exposes the following endpoints:
* `GET:/health` - checks if everything is fine and dandy, so the Core UI can disable the plugin if the service is unhealthy and possibly notify the user
* `GET:/items/<community>` - returns a Single SPA compatible JS package (an AMD module which defines the Single SPA lifecycle stages) that deploys an interface for creating and modifying for-sale items of the current user in the given community.
* `GET:/item/<item ID>` - returns a Single SPA compatible JS package (an AMD module which defines the Single SPA lifecycle stages) that deploys an interface for viewing and interacting with a specific for-sale item.
* `POST:/items/<community>` - returns details for the items of the current user in the given community.
* `POST:/item/<item ID>` - returns the details of a specific item.
* `POST:/items/<community>/new` - creates a new item for the current user in the specified community.
* `POST:/item/<item ID>/update` - update the status of the specified item of the current user.
* `GET:/site/<path>` - serves static assets for convenience when developing (will get removed in production)

Note that only the first three endpoints are used by the core UI, while all the others are for internal use, i.e. they are only called from the parcels loaded by the previous endpoints.

## Running the Service Locally

Except for the service itself, running on Node 18, you will need to run a PostgreSQL RDBMS, which we will use for storing BI data and an online WooCommerce site as described above.

Create an `.env` file with some basic params:
* `FASTIFY_ADDRESS`                 - Host to serve from (defaults to 127.0.0.1)
* `FASTIFY_PORT`                    - Port to serve from (defaults to 8000)
* `FASTIFY_SWAGGER`                 - Serve swagger-UI from `/doc` (defaults to false)
* `PGDATABASE`                      - Postgres database (schema) name (defaults to postgres)
* `PGHOST`                          - Postgres host (defaults to localhost)
* `PGPASSWORD`                      - Postgres user password (defaults to no-password)
* `PGPORT`                          - Postgres port (defualts to 5432)
* `PGUSERNAME`                      - Postgres user name (defaults to user running the process)
* `PLUGIN_SERVICE_ENDPOINT`         - REQUIRED: The base URL of the plugin service
* `JWT_CERTS_URL`                   - REQUIRED: The URL for the public keys of the store module authenticaion JWT (for Firebase tokens this is usually `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`)

```sh
npm install         # Install dependencies
npm run refresh-db  # Initialize the database (drops and recreates the table)
npm run lint        # Run the linter
npm run test        # Run tests
npm run coverage    # Run tests and check coverage
npm run serve       # Run the Web server
npm run start       # Run the Web server in production mode (with all checks)
npm run dev         # Run the Web server in debug mode (node-inspector, auto reload and swagger enabled)
```

Once you run a server, you can access `/site/dev.html?community=<community>&authToken=<valid Firebase auth token>` which loads the UI as a Single SPA component. To assist development, you may want to set your `JWT_POLICY` environment variable to `'fake'`. This will result in accepting any string as a valid and signed JWT. The username associated (the user's unique blockchain ID) will be the JWT string itself (so the link above turns into `/site/dev.html?community=<community>&authToken=<user ID>`). You can also use it to view the rendering of a single item with `/site/dev.html?item=<item ID>&authToken=<valid Firebase auth token>`.

Also note that while we usually use `fastify-cli` to launch the server, there is also a minimal script to launches it at `/src/launch.cjs`. It can come in handy when you are trying to isolate problems and for conveniently running a debugger from your IDE.

## Deploying the Service to GCP

### Quick deploy

Set env variables in deployment/env.yaml.
Set `deploy_env` in deployment/cloudRunDeploy.sh and run it.

### Setup secrets

Set the following secrets on GCP Secert Manager:
* `PGUSERNAME`
* `PGPASSWORD`

Add the secrets to cloud run service (exposed as environment variable) and redeploy.

### Cloud SQL (postgres)

* Create instance on google cloud. (https://console.cloud.google.com/sql/instances)
* Create database named as `PGDATABASE` (probably 'marketplace').
* Verify deployment/env.yaml contains updated values for `PGHOST`, `PGPORT` and `PGDATABASE`.
* Setup connection between 'cloud run' service to sql instance:
https://towardsdatascience.com/how-to-connect-to-gcp-cloud-sql-instances-in-cloud-run-servies-1e60a908e8f2

* Connect to remote DB from local environment:
    1. Add your ip to Authorized networks.
    2. Set `PGHOST` to public ip of the postgres instance on GCP (and update other postgres related env if needed).
    3. check connection:
        ```shell
        psql -h POSTGRES_PUBLIC_IP -U postgres -d `PGDATABASE`
        ```
