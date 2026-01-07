/**
 * Block Database
 * Defines behaviors and properties for all block types.
 */

export const BLOCKS = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    WOOD: 4,
    BEDROCK: 5,
    SAPLING: 6,
    TREE_SMALL: 7,
    TREE_MATURE: 8,
    LEAVES: 9,
    WOOD_ROTTEN: 10,
    MUSHROOM: 11
};

export const BLOCK_DEFS = {
    [BLOCKS.SAPLING]: {
        name: 'Sapling',
        tick: (world, x, y) => {
            if (Math.random() < 0.1) {
                world.setTile(x, y, BLOCKS.TREE_SMALL);
            }
        }
    },
    [BLOCKS.TREE_SMALL]: {
        name: 'Small Tree',
        tick: (world, x, y) => {
            if (Math.random() < 0.05) {
                world.setTile(x, y, BLOCKS.TREE_MATURE);
                // Simple trunk growth?
                world.setTile(x, y - 1, BLOCKS.TREE_MATURE);
                world.setTile(x, y - 2, BLOCKS.LEAVES);
            }
        }
    },
    [BLOCKS.TREE_MATURE]: {
        name: 'Mature Tree',
        tick: (world, x, y) => {
            if (Math.random() < 0.001) { // Old age
                world.setTile(x, y, BLOCKS.WOOD_ROTTEN);
            }
        }
    },
    [BLOCKS.WOOD_ROTTEN]: {
        name: 'Rotten Wood',
        tick: (world, x, y) => {
            if (Math.random() < 0.05) {
                // Spawn mushroom nearby
                const nx = x + (Math.random() > 0.5 ? 1 : -1);
                if (world.getTile(nx, y) === BLOCKS.AIR) {
                    world.setTile(nx, y, BLOCKS.MUSHROOM);
                }
            }
        }
    },
    [BLOCKS.MUSHROOM]: {
        name: 'Mushroom',
        tick: (world, x, y) => {
            // Mushrooms spread on rotten wood or die in bright light (eventually)
            if (Math.random() < 0.01) {
                // Spreading logic...
            }
        }
    }
};
