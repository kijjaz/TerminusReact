/**
 * VGA Palette and Color System
 */

export const PALETTE = {
    BLACK: '#000',
    BLUE: '#0000AA',
    GREEN: '#00AA00',
    CYAN: '#00AAAA',
    RED: '#AA0000',
    MAGENTA: '#AA00AA',
    BROWN: '#AA5500',
    LIGHT_GRAY: '#AAAAAA',
    DARK_GRAY: '#555555',
    LIGHT_BLUE: '#5555FF',
    LIGHT_GREEN: '#55FF55',
    LIGHT_CYAN: '#55FFFF',
    LIGHT_RED: '#FF5555',
    LIGHT_MAGENTA: '#FF55FF',
    YELLOW: '#FFFF55',
    WHITE: '#FFF',

    // Custom "Horror" VGA customized indices
    VOID: '#050505',
    DEEP_PURPLE: '#2a002a',
    DIRT_DARK: '#331100',
    STONE_DARK: '#222222',
    GOLD: '#FFD700',
    DEEP_RED: '#8B0000',
    MUSHROOM: '#FF6347'
};

export const BLOCK_COLORS = {
    0: 'transparent',
    1: PALETTE.STONE_DARK, // Stone
    2: PALETTE.DIRT_DARK,  // Dirt
    3: PALETTE.GREEN,      // Grass
    4: PALETTE.BROWN,      // Wood/Structures
    5: PALETTE.BLACK,      // Bedrock
    6: '#98FB98',          // Sapling
    7: '#556B2F',          // Small Tree
    8: '#228B22',          // Mature Tree
    9: '#006400',          // Leaves
    10: '#4B3621',         // Rotten Wood
    11: PALETTE.MUSHROOM   // Mushroom
};
