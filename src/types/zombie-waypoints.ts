/**
 * Type definitions for Zombie waypoint system
 */

/**
 * Waypoint interface for zombie pathfinding
 */
interface Waypoint {
  x: number;
  y: number;
}

/**
 * Interface for objects that support waypoint-based navigation
 */
export interface HasWaypoints {
  waypoints: Waypoint[];
}
