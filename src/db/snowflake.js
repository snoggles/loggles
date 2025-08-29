const { Sequelize, DataTypes } = require('sequelize');

/**
 * Sequelize model options for the snowflake data type.
 * This is a 64-bit integer, but they're represented in JS as strings to avoid losing precision.
 */
module.exports = function snowflake(colName) {
    return {
        type: DataTypes.STRING,
        allowNull: false,
        get() {
            // Sqlite node package doesn't support bigint! https://github.com/sequelize/sequelize/pull/17154
            // const val = this.getDataValue(colName); // bigint
            // return val ? val.toString() : null;
            return this.getDataValue(colName);
        },
        set(val) {
            // const bigint = BigInt(val)
            // this.setDataValue(colName, bigint);
            this.setDataValue(colName, val);
        }
    }
}