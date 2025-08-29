/**
 * Builds a Discord avatar URL from user ID and avatar hash.
 * Handles both custom avatars and default avatars.
 * 
 * @param {string} userId - The Discord user ID (snowflake)
 * @param {string|null} avatarHash - The user's avatar hash, or null for default
 * @param {Object} opts - Options object
 * @param {number} opts.size - Avatar size (default: 64)
 * @returns {string} The complete avatar URL
 */
function buildAvatarUrl(userId, avatarHash, opts = {}) {
    const size = typeof opts.size === 'number' ? opts.size : 64;
    
    if (avatarHash) {
        const isAnimated = avatarHash.startsWith('a_');
        const ext = isAnimated ? 'gif' : 'webp';
        return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
    }
    
    let index = 0;
    try {
        index = Number(BigInt(userId) % 6n);
    } catch (_) {
        index = 0;
    }
    return `https://cdn.discordapp.com/embed/avatars/${index}.png?size=${size}`;
}

module.exports = { buildAvatarUrl };
