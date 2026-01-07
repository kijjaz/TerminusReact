/**
 * Structure Blueprints
 * Definitions for procedurally generated buildings.
 */

export const STRUCTURES = {
    FARM: {
        width: 5,
        height: 3,
        build: (world, x, y, data, width) => {
            // Dirt base, wood fence
            for (let i = -2; i <= 2; i++) {
                setTileInChunk(data, x + i, y, 2, width); // Dirt
                if (Math.abs(i) === 2) setTileInChunk(data, x + i, y - 1, 4, width); // Fence
            }
        }
    },
    HOUSE: {
        width: 7,
        height: 5,
        build: (world, x, y, data, width) => {
            // Wood walls, stone roof
            for (let w = -3; w <= 3; w++) {
                for (let h = 1; h <= 4; h++) {
                    setTileInChunk(data, x + w, y - h, 4, width);
                }
            }
            // Roof
            for (let w = -4; w <= 4; w++) {
                setTileInChunk(data, x + w, y - 5, 1, width);
            }
        }
    },
    CASTLE_WALL: {
        width: 1,
        height: 10,
        build: (world, x, y, data, width) => {
            for (let h = 1; h <= 10; h++) {
                setTileInChunk(data, x, y - h, 1, width);
            }
            // Merlon
            if (x % 2 === 0) setTileInChunk(data, x, y - 11, 1, width);
        }
    }
};

function setTileInChunk(data, x, y, id, width) {
    if (x >= 0 && x < width && y >= 0 && y < width) {
        data[y * width + x] = id;
    }
}
