/**
 * Texture Loader & Asset Mapping
 * Loads PNG textures from the assets folder.
 */

export class TextureLoader {
    constructor() {
        this.textures = {};
        this.basePath = 'assets/textures/mods/default/textures/';
    }

    async load(mappings) {
        const promises = [];
        for (const [id, filename] of Object.entries(mappings)) {
            promises.push(new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.textures[id] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load texture: ${filename}`);
                    resolve();
                };
                img.src = this.basePath + filename;
            }));
        }
        return Promise.all(promises);
    }

    get(id) {
        return this.textures[id];
    }
}

export const TEXTURE_MAP = {
    1: 'default_stone.png',
    2: 'default_dirt.png',
    3: 'default_grass.png',
    4: 'default_wood.png',
    5: 'default_obsidian.png',
    6: 'default_sapling.png',
    7: 'default_tree.png',
    8: 'default_tree.png',
    9: 'default_leaves.png',
    10: 'default_cobble.png',
    11: 'default_stone.png' // Find flower/mushroom later
};
