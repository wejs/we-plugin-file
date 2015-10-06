/**
 * File association model
 *
 * @module      :: Model
 *
 */

module.exports = function ImageAssocModel(we) {
  // set sequelize model define and options
  var model = {
    definition: {
      modelName: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      modelId: {
        type: we.db.Sequelize.BIGINT,
        allowNull: false
      },
      field: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      order: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: false
      }
    },
    associations: {
      file: {
        type: 'belongsTo',
        model: 'file',
        constraints: false
      }
    },
    options: { paranoid: false }
  }
  return model;
}