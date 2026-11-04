import { Point } from './logic';

export type SilhouetteType =
  | 'question-mark'      // Reference Image 2: Iconic Question Mark labyrinth
  | 'hourglass'          // Stepped Hourglass with flowing sand
  | 'pac-man'            // Circular Pac-Man with wedge mouth
  | 'christmas-tree'     // Stepped Pine Tree with Star & Trunk
  | 'castle-battlements' // Fortress crenellations & keep
  | 'pokeball'           // Dual Sphere / Yin-Yang split dome
  | 'diamond-gem'        // Faceted Gem Rhombus
  | 'heart-labyrinth'    // Romantic Curved Heart Chambers
  | 'hexagon-shield'     // Knight's Crest Shield
  | 'oval-arch'          // Vaulted Arch Portal
  | 'pinwheel-spiral'    // Swirling Pinwheel Vortex
  | 'knight-steed'       // Reference Image 3: Knight/Horse Profile Labyrinth
  | 'royal-crown'        // Triple-Crested Royal Crown
  | 'golden-key'         // Ornate Key Profile
  | 'ship-anchor'        // Nautical Anchor Profile
  | 'cross-plus';        // Crossroads Plus Matrix

export interface SilhouetteConfig {
  type: SilhouetteType;
  name: string;
  subtitle: string;
  gridWidth: number;
  gridHeight: number;
  isInside: (x: number, y: number) => boolean;
  getValidGridPoints: () => Point[];
  getColorForPoint?: (x: number, y: number, w: number, h: number) => string;
}

/**
 * Returns a deterministic, visually distinct silhouette configuration for any level.
 * STRICT REQUIREMENT: Every board is strictly a portrait 3:4 aspect ratio (gridWidth:gridHeight = 3:4).
 * Never generates landscape/horizontal boards.
 */
export function getSilhouetteForLevel(levelNumber: number): SilhouetteConfig {
  const safeLevel = Math.max(1, Math.floor(levelNumber));

  // Sequence of 16 distinct silhouettes ensuring shape changes continuously across levels!
  const silhouetteCycle: SilhouetteType[] = [
    'diamond-gem',        // Level 1: Diamond Gem
    'hourglass',          // Level 2: Hourglass
    'pac-man',            // Level 3: Pac-Man
    'question-mark',      // Level 4: Question Mark
    'christmas-tree',     // Level 5: Christmas Tree
    'heart-labyrinth',    // Level 6: Heart Labyrinth
    'pokeball',           // Level 7: Pokeball / Dual Sphere
    'knight-steed',       // Level 8: Knight/Horse Profile (Reference Image 3!)
    'castle-battlements', // Level 9: Castle Battlements
    'hexagon-shield',     // Level 10: Knight's Shield
    'royal-crown',        // Level 11: Royal Crown
    'golden-key',         // Level 12: Golden Key
    'ship-anchor',        // Level 13: Ship Anchor
    'oval-arch',          // Level 14: Vaulted Arch
    'pinwheel-spiral',    // Level 15: Spiral Vortex
    'cross-plus',         // Level 16: Crossroads Matrix
  ];

  const type = silhouetteCycle[(safeLevel - 1) % silhouetteCycle.length];

  // Scale factor k (Strict 3:4 portrait ratio where width = 3 * k, height = 4 * k):
  // Levels 1-6:   k = 3 -> 9x12 (compact, dense, zero sparse gaps!)
  // Levels 7-18:  k = 4 -> 12x16 (medium dense labyrinth)
  // Levels 19-40: k = 5 -> 15x20 (large intricate labyrinth)
  // Levels 41-75: k = 6 -> 18x24 (master labyrinth)
  // Levels 76+:   k = 7 -> 21x28 (epic labyrinth)
  let k = 3;
  if (safeLevel <= 3) {
    k = 3; // 9x12 (Levels 1-3: 12-14 multi-bend arrows)
  } else if (safeLevel <= 18) {
    k = 4; // 12x16 (Levels 4-18: 15-29 multi-bend arrows)
  } else if (safeLevel <= 38) {
    k = 5; // 15x20 (Levels 19-38: 30-45 multi-bend arrows)
  } else if (safeLevel <= 65) {
    k = 6; // 18x24 (Levels 39-65: 46-60 multi-bend arrows)
  } else {
    k = 7; // 21x28 (Levels 66+: 61-80 multi-bend arrows)
  }

  const w = 3 * k;
  const h = 4 * k;
  const cx = w / 2;
  const cy = h / 2;

  switch (type) {
    // 1. QUESTION MARK (Reference Image 2)
    case 'question-mark': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Upper curved hook (y between 1 and h * 0.48)
        const hookMaxY = h * 0.48;
        if (y <= hookMaxY) {
          const hookCy = h * 0.25;
          const rx = w * 0.45;
          const ry = h * 0.24;
          const normDist = Math.hypot((x - cx) / rx, (y - hookCy) / ry);
          const inHookOuter = normDist <= 1.12;
          const inHookInner = normDist < 0.28 && y > hookCy - 0.5 && x < cx + 0.5;
          if (y > hookCy + 1 && x < cx - 1.5) return false;
          return inHookOuter && !inHookInner;
        }
        // Middle vertical stem (y between h * 0.48 and h * 0.72)
        if (y > hookMaxY && y <= h * 0.72) {
          return Math.abs(x - cx) <= Math.max(2.0, w * 0.24);
        }
        // Distinct gap at y == Math.round(h * 0.75)
        if (Math.abs(y - Math.round(h * 0.76)) < 0.6) {
          return false;
        }
        // Bottom square/dot box
        return Math.abs(x - cx) <= Math.max(2.2, w * 0.28);
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        if (y <= h * 0.46) return '#06B6D4'; // Vibrant Cyan
        if (y <= h * 0.72) return '#3B82F6'; // Electric Blue
        return '#10B981'; // Mint Green Dot
      };

      return {
        type,
        name: 'Question Mark',
        subtitle: 'Enigma Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 2. HOURGLASS (Reference Image 3)
    case 'hourglass': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Top and bottom wide framing bars
        if (y <= 2 || y >= h - 2) {
          return x >= 1 && x <= w - 1;
        }
        // Funnel calculation: narrower at center cy, wider at top and bottom
        const distFromCenterY = Math.abs(y - cy) / cy; // 0 at neck, 1 at ends
        const halfWidthAtY = Math.max(1.2, w * 0.15 + distFromCenterY * (w * 0.35));
        return Math.abs(x - cx) <= halfWidthAtY;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= 2 || y >= h - 2) return '#D97706'; // Amber frame
        if (Math.abs(y - cy) <= 1.5) return '#38BDF8'; // Sky Blue neck
        return '#F59E0B'; // Golden Sand
      };

      return {
        type,
        name: 'Hourglass',
        subtitle: 'Chamber of Time',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 3. PAC-MAN (Reference Image 5)
    case 'pac-man': {
      const rx = w * 0.46;
      const ry = h * 0.44;
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Ellipse distance
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1.05) return false;
        // Cut out wedge mouth on the right side (angle between -35 deg and +35 deg)
        if (x >= cx) {
          const angle = Math.atan2(y - cy, x - cx);
          if (Math.abs(angle) < 0.65) return false;
        }
        return true;
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        const dist = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (dist > 0.8) return '#38BDF8'; // Sky Blue outer border
        return '#EAB308'; // Classic Golden Yellow Pac-Man
      };

      return {
        type,
        name: 'Pac-Sphere',
        subtitle: 'Arcade Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 4. CHRISTMAS TREE (Reference Image 6)
    case 'christmas-tree': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Top star (y <= 2)
        if (y <= 2) {
          return Math.abs(x - cx) <= 1;
        }
        // Bottom trunk (y >= h - 3)
        if (y >= h - 3) {
          return Math.abs(x - cx) <= Math.max(1.2, w * 0.16);
        }
        // Stepped pine tiers (y between 3 and h - 4)
        const treeH = (h - 4) - 3;
        const treeY = (y - 3) / treeH; // 0 at top, 1 at bottom
        // 3 stepped branch tiers
        const tier = Math.floor(treeY * 3);
        const tierProgress = (treeY * 3) - tier;
        const baseWidthForTier = (tier + 1) * (w * 0.14) + tierProgress * (w * 0.08);
        return Math.abs(x - cx) <= baseWidthForTier;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= 2) return '#FBBF24'; // Gold Star
        if (y >= h - 3) return '#EF4444'; // Festive Red Trunk
        return '#10B981'; // Emerald Green Pine
      };

      return {
        type,
        name: 'Pine Tree',
        subtitle: 'Emerald Forest Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 5. CASTLE BATTLEMENTS (Reference Image 7)
    case 'castle-battlements': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Top crenellations: alternating teeth at y == 1
        if (y === 1) {
          return Math.floor(x) % 2 === 1;
        }
        // Upper wall / battlements
        if (y <= 3) return true;
        // Waist constriction or main keep
        if (y <= h * 0.6) {
          return Math.abs(x - cx) <= w * 0.44;
        }
        // Base fortress wall
        return x >= 1 && x <= w - 1;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= 3) return '#14B8A6'; // Teal Battlements
        if (y >= h - 3) return '#F59E0B'; // Amber Foundation
        return '#6366F1'; // Royal Indigo Keep
      };

      return {
        type,
        name: 'Castle Fortress',
        subtitle: 'Medieval Ramparts',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 6. POKEBALL / DUAL SPHERE (Reference Image 8)
    case 'pokeball': {
      const rx = w * 0.46;
      const ry = h * 0.46;
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        return dx * dx + dy * dy <= 1.05;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y < cy - 1) return '#EF4444'; // Crimson Red Upper Dome
        if (y > cy + 1) return '#E2E8F0'; // Silver White Lower Dome
        return '#3B82F6'; // Center Blue Belt & Button
      };

      return {
        type,
        name: 'Dual Sphere',
        subtitle: 'Bicolor Core Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 7. DIAMOND GEM
    case 'diamond-gem': {
      const rx = w * 0.48;
      const ry = h * 0.48;
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        const dist = Math.abs(x - cx) / rx + Math.abs(y - cy) / ry;
        return dist <= 1.12;
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < w * 0.22) return '#F59E0B'; // Gold Core
        return '#06B6D4'; // Electric Cyan Facet
      };

      return {
        type,
        name: 'Diamond Crest',
        subtitle: 'Faceted Crystal Formation',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 8. HEART LABYRINTH
    case 'heart-labyrinth': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Two lobes at top, converging V at bottom
        const normX = (x - cx) / (w * 0.48);
        const normY = (cy - y) / (h * 0.46) + 0.2;
        // Classic heart equation: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
        const a = normX * normX + normY * normY - 0.9;
        return a * a * a - normX * normX * normY * normY * normY <= 0.08;
      };

      const getColorForPoint = (x: number, _y: number, _w: number, _h: number) => {
        return Math.abs(x - cx) < w * 0.25 ? '#EC4899' : '#F43F5E'; // Rose Pink to Coral
      };

      return {
        type,
        name: 'Heart Labyrinth',
        subtitle: 'Chambers of Passion',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 9. HEXAGON SHIELD
    case 'hexagon-shield': {
      const rx = w * 0.50;
      const ry = h * 0.50;
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        const dx = Math.abs(x - cx) / rx;
        const dy = Math.abs(y - cy) / ry;
        return dx + dy <= 1.35;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= h * 0.3) return '#3B82F6';
        if (y >= h * 0.7) return '#10B981';
        return '#F59E0B';
      };

      return {
        type,
        name: 'Knight Shield',
        subtitle: 'Royal Crest Matrix',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 10. OVAL ARCH
    case 'oval-arch': {
      const rx = w * 0.46;
      const ry = h * 0.46;
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        if (y < cy) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          return dx * dx + dy * dy <= 1.05;
        }
        return true;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        return y < cy ? '#8B5CF6' : '#06B6D4';
      };

      return {
        type,
        name: 'Vaulted Arch',
        subtitle: 'Ancient Portal',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 11. PINWHEEL SPIRAL
    case 'pinwheel-spiral': {
      const armW = Math.max(2, Math.floor(w * 0.28));
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        if (Math.abs(x - cx) <= armW && Math.abs(y - cy) <= armW) return true;
        const topArm = y <= cy && x >= cx - 1 && x <= w - 2;
        const rightArm = x >= cx && y >= cy - 1 && y <= h - 2;
        const bottomArm = y >= cy && x >= 2 && x <= cx + 1;
        const leftArm = x <= cx && y >= 2 && y <= cy + 1;
        return topArm || rightArm || bottomArm || leftArm;
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        if (x >= cx && y < cy) return '#38BDF8';
        if (x >= cx && y >= cy) return '#F59E0B';
        if (x < cx && y >= cy) return '#10B981';
        return '#EC4899';
      };

      return {
        type,
        name: 'Spiral Vortex',
        subtitle: 'Pinwheel Swirling Maze',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 12. KNIGHT STEED (Reference Image 3: Horse / Knight Chess Piece Profile)
    case 'knight-steed': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Solid bottom base bar
        if (y >= h - 2) return x >= 1 && x <= w - 1;
        // Head / Snout at top right (y <= h * 0.3)
        if (y <= h * 0.3) {
          // Snout extends rightwards
          return x >= cx - 2 && x <= w - 1;
        }
        // Mane on top left (y <= h * 0.25)
        if (y <= h * 0.25 && x <= cx - 1) return true;
        // Curved neck & torso in middle (y between h * 0.3 and h - 2)
        const progress = (y - h * 0.3) / (h * 0.68);
        const minX = Math.max(1, cx - 4 + progress * 2);
        const maxX = Math.min(w - 1, cx + 3 + progress * 2);
        return x >= minX && x <= maxX;
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        if (y <= h * 0.3) return '#3B82F6'; // Royal Sapphire Blue Head
        if (y >= h - 2) return '#10B981'; // Mint Base
        return '#8B5CF6'; // Imperial Purple Torso
      };

      return {
        type,
        name: 'Knight Steed',
        subtitle: 'Royal Horse Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 13. ROYAL CROWN
    case 'royal-crown': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Solid crown rim base at bottom
        if (y >= h - 3) return x >= 1 && x <= w - 1;
        // 3 peak spikes at top
        if (y <= h * 0.35) {
          const leftPeak = Math.abs(x - (cx - w * 0.32)) <= 2;
          const centerPeak = Math.abs(x - cx) <= 2;
          const rightPeak = Math.abs(x - (cx + w * 0.32)) <= 2;
          return leftPeak || centerPeak || rightPeak;
        }
        // Middle crown body
        return Math.abs(x - cx) <= w * 0.44;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= h * 0.35) return '#EF4444'; // Crimson Jewels
        return '#F59E0B'; // Golden Crown Body
      };

      return {
        type,
        name: 'Royal Crown',
        subtitle: 'Imperial Crest Matrix',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 14. GOLDEN KEY
    case 'golden-key': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Top circular ring bow (y <= h * 0.35)
        if (y <= h * 0.35) {
          const dist = Math.hypot((x - cx) / (w * 0.42), (y - h * 0.18) / (h * 0.16));
          return dist <= 1.0;
        }
        // Vertical shaft
        if (Math.abs(x - cx) <= Math.max(2.0, w * 0.22)) return true;
        // Teeth at bottom right (y >= h * 0.60)
        if (y >= h * 0.60 && x >= cx && x <= cx + w * 0.40) {
          return true;
        }
        return false;
      };

      const getColorForPoint = (x: number, _y: number, _w: number, _h: number) => {
        return x > cx ? '#D97706' : '#F59E0B';
      };

      return {
        type,
        name: 'Golden Key',
        subtitle: 'Unlocking Sanctuary',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 15. SHIP ANCHOR
    case 'ship-anchor': {
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        // Top ring (y <= 3)
        if (y <= 3) return Math.abs(x - cx) <= w * 0.35;
        // Central vertical shank
        if (Math.abs(x - cx) <= Math.max(2.0, w * 0.22)) return true;
        // Curved flukes / hooks at bottom (y >= h * 0.55)
        if (y >= h * 0.55) {
          return Math.abs(x - cx) <= w * 0.44;
        }
        return false;
      };

      const getColorForPoint = (_x: number, y: number, _w: number, _h: number) => {
        if (y <= 3) return '#06B6D4'; // Cyan Stock
        return '#3B82F6'; // Steel Blue Anchor Body
      };

      return {
        type,
        name: 'Ship Anchor',
        subtitle: 'Oceanic Fortress',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }

    // 12. CROSSROADS MATRIX
    case 'cross-plus':
    default: {
      const armX = Math.max(2, Math.floor(w * 0.32));
      const armY = Math.max(2, Math.floor(h * 0.30));
      const isInside = (x: number, y: number) => {
        if (x < 1 || x > w - 1 || y < 1 || y > h - 1) return false;
        const inHoriz = Math.abs(y - cy) <= armY;
        const inVert = Math.abs(x - cx) <= armX;
        return inHoriz || inVert;
      };

      const getColorForPoint = (x: number, y: number, _w: number, _h: number) => {
        const inCenter = Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2;
        if (inCenter) return '#F59E0B';
        return Math.abs(x - cx) > Math.abs(y - cy) ? '#06B6D4' : '#6366F1';
      };

      return {
        type: 'cross-plus',
        name: 'Crossroads Matrix',
        subtitle: 'Geometric Plus Labyrinth',
        gridWidth: w,
        gridHeight: h,
        isInside,
        getValidGridPoints: () => collectPoints(w, h, isInside),
        getColorForPoint,
      };
    }
  }
}

function collectPoints(
  width: number,
  height: number,
  isInside: (x: number, y: number) => boolean
): Point[] {
  const pts: Point[] = [];
  for (let x = 1; x < width; x++) {
    for (let y = 1; y < height; y++) {
      if (isInside(x, y)) {
        pts.push({ x, y });
      }
    }
  }
  return pts;
}
