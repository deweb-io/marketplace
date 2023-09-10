CREATE TABLE users(
    bcid VARCHAR(255) PRIMARY KEY NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSON NOT NULL
);

CREATE TABLE items(
    id SERIAL PRIMARY KEY NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publisher VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    description JSON NOT NULL
);

ALTER TABLE items
ADD CONSTRAINT fk_items_publisher
FOREIGN KEY (publisher) REFERENCES users(bcid);
