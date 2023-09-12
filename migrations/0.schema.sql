CREATE TABLE users(
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSON NOT NULL
);

CREATE TABLE items(
    id SERIAL PRIMARY KEY NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255) NOT NULL DEFAULT 'created',
    publisher VARCHAR(255) NOT NULL,
    community VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    description JSON NOT NULL DEFAULT '{}'
);

ALTER TABLE items
ADD CONSTRAINT fk_items_publisher
FOREIGN KEY (publisher) REFERENCES users(id);

-- FOR DEV ONLY
INSERT INTO users (id, details) VALUES ('testuser1', '{"name": "Test User 1"}');
INSERT INTO users (id, details) VALUES ('testuser2', '{"name": "Test User 2"}');
INSERT INTO items (publisher, community, price, description) VALUES ('testuser1', 'testcommunity1', 100, '{"name": "Test Item 1"}');
INSERT INTO items (publisher, community, price, description) VALUES ('testuser1', 'testcommunity1', 200, '{"name": "Test Item 2"}');
INSERT INTO items (publisher, community, price, description) VALUES ('testuser2', 'testcommunity2', 300, '{"name": "Test Item 3"}');
