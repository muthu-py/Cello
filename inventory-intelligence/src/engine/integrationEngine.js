/*
  Integration Engine.
  Merges inventory restock priorities with financial payables
  into a single, unified priority queue using flexibility-based override rules.
*/

/**
 * Maps an inventory restock item to the unified format.
 * Normalizes the 0-10 score to 0-1 for cross-domain comparison.
 * @param {Object} item - A decision engine output item
 * @returns {Object} Unified priority item
 */
function mapInventory(item) {
    return {
        id: item.medicine_id,
        name: item.medicine_name,
        source: 'inventory',
        score: parseFloat((item.priority_score / 10).toFixed(4)), // normalize 0-10 → 0-1
        flexibility: item.flexibility,
        reason: item.reason,
        raw: item
    };
}

/**
 * Maps a payable item to the unified format.
 * Payable scores are already softmax-normalized (0-1).
 * @param {Object} item - A payables API response item
 * @returns {Object} Unified priority item
 */
function mapPayable(item) {
    return {
        id: item.id,
        name: item.name,
        source: 'payable',
        score: item.priority_score, // already 0-1 (softmax)
        flexibility: item.flexibility,
        reason: item.reason,
        raw: item
    };
}

/**
 * Flexibility-based comparator for cross-domain priority sorting.
 *
 * RULE 1: Both LOW → inventory wins (medical urgency > financial)
 * RULE 2: Inventory HIGH vs Payable MEDIUM/HIGH → payable wins
 * DEFAULT: Sort by normalized score descending
 *
 * @param {Object} a - Unified item
 * @param {Object} b - Unified item
 * @returns {number} Sort comparator value
 */
function compare(a, b) {
    // RULE 1: both LOW → inventory wins
    if (a.flexibility === 'low' && b.flexibility === 'low') {
        if (a.source === 'inventory' && b.source === 'payable') return -1;
        if (a.source === 'payable' && b.source === 'inventory') return 1;
    }

    // RULE 2: inventory HIGH vs payable MEDIUM/HIGH → payable wins
    if (
        a.source === 'inventory' &&
        a.flexibility === 'high' &&
        b.source === 'payable' &&
        (b.flexibility === 'medium' || b.flexibility === 'high')
    ) return 1;

    if (
        b.source === 'inventory' &&
        b.flexibility === 'high' &&
        a.source === 'payable' &&
        (a.flexibility === 'medium' || a.flexibility === 'high')
    ) return -1;

    // DEFAULT: compare normalized score
    return b.score - a.score;
}

/**
 * Merges inventory and payable lists into a unified, sorted priority queue.
 * @param {Array} inventoryList - Decision engine output
 * @param {Array} payableList - Payables API output
 * @returns {Array} Sorted unified priority queue
 */
function integrate(inventoryList, payableList) {
    const inv = inventoryList.map(mapInventory);
    const pay = payableList.map(mapPayable);

    const combined = [...inv, ...pay];
    combined.sort(compare);

    return combined;
}

module.exports = { integrate, compare, mapInventory, mapPayable };
