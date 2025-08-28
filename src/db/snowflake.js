const { Sequelize, DataTypes } = require('sequelize');

/**
 * Sequelize model options for the snowflake data type.
 * This is a 64-bit integer, but they're represented in JS as strings to avoid losing precision.
 */
module.exports = function snowflake(colName) {
    return {
        type: DataTypes.BIGINT,
        allowNull: false,
        get() {
            const val = this.getDataValue(colName); // bigint
            return val ? val.toString() : null;
        },
        set(val) {
            this.setDataValue(colName, BigInt(val));
        }
    }
}