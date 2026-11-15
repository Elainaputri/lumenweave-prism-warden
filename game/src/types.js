// types.js — shared shapes for Lumenweave: Prism Warden.
// Written as JSDoc typedefs so the file stays valid JavaScript: the bundle
// builder concatenates it verbatim, and editors still get type checking.

/**
 * @typedef {Object} Vec
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} BeamSegment
 * @property {number} x1 - segment start x
 * @property {number} y1 - segment start y
 * @property {number} x2 - segment end x
 * @property {number} y2 - segment end y
 * @property {number} phase - chromatic phase: 0 cyan, 1 amber, 2 magenta
 * @property {number} depth - bounce depth (0 = direct beam)
 */

/**
 * @typedef {Object} Prism
 * @property {number} x
 * @property {number} y
 * @property {number} angle - slow spin for the facet animation
 * @property {number} placedAt - game time when placed (oldest is replaced)
 * @property {number} flash - 0..1 glow pulse after a beam passes through
 */

/**
 * @typedef {Object} Enemy
 * @property {string} kind - mote | crawler | sentinel | weaver | juggernaut | leviathan
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} r - collision radius
 * @property {number} speed
 * @property {number} score - base score on kill
 * @property {number} facing - movement heading in radians
 * @property {number} slowUntil - game time until the slow effect ends
 * @property {number} burnUntil - game time until the amber burn ends
 * @property {number} burnDps
 * @property {number} flash - 0..1 white hit flash
 * @property {number} t - age in seconds
 * @property {number} teleportIn - seconds until the next teleport (weavers)
 * @property {number} shotIn - seconds until the next void orb (weavers)
 * @property {number} wobble - per-enemy wobble phase (motes)
 */

/**
 * @typedef {Object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life
 * @property {number} maxLife
 * @property {number} size
 * @property {string} color
 * @property {number} shape - 0 dot, 1 shard triangle, 2 ring
 * @property {number} rot
 * @property {number} vr
 */

/**
 * @typedef {Object} FloatText
 * @property {number} x
 * @property {number} y
 * @property {string} text
 * @property {string} color
 * @property {number} life
 * @property {number} size
 */

/**
 * @typedef {Object} Bolt
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life
 */

/**
 * @typedef {Object} Orb
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} r
 * @property {number} life
 */

/**
 * @typedef {Object} BossNode
 * @property {number} seg - which serpent segment the node rides on
 * @property {number} hp
 * @property {number} maxHp
 * @property {boolean} dead
 */
