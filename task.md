# Terminus Project Checklist

## Phase 1: Foundation
- [x] Initialize Directory & Basic Files <!-- id: 701 -->
- [x] Research Angband gamedata for ANSI entities <!-- id: 711 -->
- [x] Study ModernUO for Server/Persistence patterns <!-- id: 712 -->
- [x] Set up Node.js Server (Socket.io) with Chat Logging <!-- id: 702 -->
- [x] Implement ANSI Canvas Renderer <!-- id: 703 -->
- [x] Implement Pixel-Perfect Bitmap Styles <!-- id: 704 -->
- [x] Prepare Dockerfile for GCP Deployment <!-- id: 713 -->

## Phase 2: World & Social
- [x] Create Static Town/Castle Map (Conference Hubs) <!-- id: 705 -->
- [x] Implement Real-time Player Sync (@ symbols) <!-- id: 706 -->
- [x] Implement Integrated Chatroom (ANSI style) <!-- id: 707 -->

## Phase 3: Roguelike Mechanics
- [x] Implement Procedural Dungeon Generator <!-- id: 708 -->
- [x] Implement Level Transitions (Stairs) <!-- id: 714 -->
- [x] Implement Collision & Rich ASCII Rendering <!-- id: 710 -->
- [x] Implement Minimap & Survey Map <!-- id: 716 -->
- [x] Implement Atmospheric VFX (Fog, Dark Filters) <!-- id: 717 -->
- [x] Implement Inventory & Treasure System (Basic Implementation) <!-- id: 718 -->
- [x] Implement Weather & Wind (Dynamic Fog) <!-- id: 726 -->
- [/] Mobile Touch Controls (D-Pad implemented, need fine tuning) <!-- id: 727 -->

## Phase 4: Social & Advanced User UI
- [x] User Registration & Persistence (React Login Screen Implemented) <!-- id: 719 -->
- [x] Online User List & Friend System <!-- id: 720 -->
- [x] Summon / Teleport System ("Calling" users) <!-- id: 721 -->
- [x] Advanced User Profiles <!-- id: 722 -->

## Phase 5: Crafting & Advanced World-Gen
- [x] Crafting at the Forge (Implemented CraftingMenu) <!-- id: 723 -->
- [x] Advanced wilderness (Rivers, Chasms, Caves) <!-- id: 724 -->
- [x] Simple Combat (Player vs. Monster) <!-- id: 725 -->
- [x] Farm System (Crop Growth) <!-- id: 728 -->
- [x] Vegan Food Shop <!-- id: 729 -->
- [x] Castle Bank (Gold Storage) <!-- id: 730 -->
- [x] Equipment System (Left/Right Hands) <!-- id: 731 -->
- [x] Hoe Tool & Farming Requirement <!-- id: 732 -->
- [x] Loot-based Crafting Logic (Mining Drops + Recipes) <!-- id: 733 -->
- [x] 1-bit Lo-Fi Sound System <!-- id: 734 -->
- [x] Bug: Fix "halted" door interaction <!-- id: 735 -->
- [x] Sign System & Directional Guidance <!-- id: 736 -->
- [x] Stabilized Wind & Fluid Dynamics Fog <!-- id: 737 -->
- [x] Enhanced Atmospheric Audio (Wind Whistle, Fog Sand-Texture) <!-- id: 738 -->
- [x] Inventory & Treasure System cleanup (Completed with Economy Update) <!-- id: 718 -->
- [x] Mobile Touch Controls cleanup (Added UI Overlay for mobile) <!-- id: 727 -->

## Phase 6: Polish & Deployment Readiness
- [ ] Verify/Implement Multiplayer Chat Input <!-- id: 739 -->
- [ ] Scale Default Graphics to 50% (Low Res) <!-- id: 740 -->
- [ ] Organic Non-Circular Fog Generation <!-- id: 741 -->
- [ ] Keyboard Zoom Controls (+/-) <!-- id: 742 -->
- [x] Complete Help Text Overlay (Implemented & Fixed Close Bug) <!-- id: 743 -->
- [ ] Running Acceleration Mechanic <!-- id: 751 -->

## Phase 7: Biomes & European Hub Design
- [x] Implement Multi-Octave Noise Biomes (Temperate/Volcanic/Wasteland) <!-- id: 744 -->
- [x] Redesign Castle as a 'Citadel' (Moat, Drawbridge, Courtyard) <!-- id: 745 -->
- [x] Organic Town Layout (Cobble main street, walled districts) <!-- id: 746 -->
- [x] Logic: Restrict TILE_TYPES based on Biome (Lava only in Volcanic) <!-- id: 747 -->

## Phase 8: Social Expansion & Final Polish
- [ ] Group Chat System (Private selected messaging) <!-- id: 748 -->
- [ ] Final UI/UX Polish (Consistency across menus) <!-- id: 749 -->


## Phase 13: Monsters & Combat AI (Server-Side)
- [x] **Infrastructure**:
    -   Convert `server.js` to ESM (`import` syntax) to share code with Client.
    -   Import `World.js`, `Monster.js` on Server.
    -   Initialize authoritative `World` on Server start.
- [x] **Server Game Loop**:
    -   Implement `setInterval` (e.g., 200ms) for AI.
    -   `world.level.mobs.forEach(mob => mob.update(...))`.
    -   Broadcast `mob_update` events to all clients.
- [x] **Combat Mechanics**:
    -   Handle `attack_request` from Client.
    -   Validate distance/weapon on server.
    -   Apply damage and broadcast `chat_message` and `mob_death`.
- [x] **Client Sync**:
    -   Remove local AI loop.
    -   Listen for `mob_update` to render mobs.
    -   Send `attack_request` on click.

## Phase 14: Visual Polish & Atmosphere
- [x] **Dynamic Lighting**: Light emitted from torches, lamps, and active tools.
- [x] **Moving Fog**: Animated fog layer drifting with "wind".
- [x] **Line-of-Sight**: True Raycasting FOV (Fog of War).
- [ ] **Sound Panning**: Verify stereo panning works in-game.


## Phase 9: Multi-Storey Buildings
- [x] Architecture: Implement `storeys` layer in World.js <!-- id: 752 -->
- [x] Logic: Update stairs to navigate between floors <!-- id: 753 -->
- [ ] Rendering: Dimmed ground-floor overlay when in upper levels <!-- id: 754 -->
- [ ] Content: Multi-storey castle keep and tavern <!-- id: 755 -->

## Phase 10: Atmosphere & Lighting
- [x] Dynamic Lighting: Flickering torches `i` with crackle SFX <!-- id: 756 -->
- [x] magical Mese Lamps: Steady, colored light sources <!-- id: 757 -->
- [x] Sparse Night Sounds: Insects & Birds <!-- id: 760 -->
- [x] Render: Subtractive lighting (Darkness) vs Light circles <!-- id: 758 -->
- [x] Final Biome World-Gen (Temperate/Volcanic/European) <!-- id: 759 -->

## Phase 11: React Migration (Refactor)
- [x] Scaffold `TerminusReact` (Vite + React) <!-- id: 801 -->
- [x] Port `Renderer.js` to React Component (`<GameCanvas />`) <!-- id: 802 -->
- [ ] Port Input Handling to `useGameLoop` Hook <!-- id: 803 -->
- [x] Port `Sound.js` to isolated Sound Engine <!-- id: 804 -->
- [x] Port `World.js` Generation Logic <!-- id: 805 -->
- [x] Apply Minerio Theme (Story, Monsters, Colors) <!-- id: 809 -->
- [x] Implement React State for UI (Inventory, Chat, Stats) <!-- id: 806 -->
- [x] Rebuild UI Overlays (JSX instead of HTML strings) <!-- id: 807 -->
- [x] Integrate Socket.io Client in React Context <!-- id: 808 -->
- [x] Sync Engine State to React State (Bridge) <!-- id: 810 -->

## Phase 12: Final React Polish
- [x] Implement Mouse Mining / Digging <!-- id: 811 -->
- [x] Clean up Debug Code ('G' key) <!-- id: 812 -->
- [ ] Verify Build & Serve (Production) <!-- id: 813 -->
