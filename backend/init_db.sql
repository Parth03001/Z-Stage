-- Run this once to create the database
CREATE DATABASE zstage;

-- Tables are auto-created by SQLAlchemy on first run via models.Base.metadata.create_all()
-- But here is the equivalent SQL for reference:

-- CREATE TABLE layouts (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE station_boxes (
--     id SERIAL PRIMARY KEY,
--     layout_id INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
--     name VARCHAR(255) NOT NULL,
--     prefix VARCHAR(50) NOT NULL,
--     station_count INTEGER NOT NULL,
--     position_x FLOAT NOT NULL DEFAULT 0,
--     position_y FLOAT NOT NULL DEFAULT 0,
--     order_index INTEGER DEFAULT 0,
--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE bypass_icons (
--     id SERIAL PRIMARY KEY,
--     layout_id INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
--     position_x FLOAT NOT NULL DEFAULT 0,
--     position_y FLOAT NOT NULL DEFAULT 0,
--     created_at TIMESTAMP DEFAULT NOW()
-- );
