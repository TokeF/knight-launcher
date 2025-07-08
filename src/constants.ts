export const WORLD_WIDTH = 6400;
export const WORLD_HEIGHT = 600;

// Collision Categories
export const CAT_PLAYER = 1 << 0;
export const CAT_GROUND = 1 << 1;
export const CAT_OBSTACLE = 1 << 2;
export const CAT_ENEMY = 1 << 3;

// Obstacle Generation
export const MAX_OBSTACLE_ATTEMPTS = 100;
export const MIN_SPAWN_X = 400;
export const SPAWN_MARGIN = 200;
