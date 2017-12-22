module.exports = {
  /**
   * Add all hooks in models with image fields
   *
   * @param {Object}   we
   */
  addAllImageHooks(we, done) {
    const models = we.db.models;
    const img = we.file.image;
    const _ = we.utils._;

    for (let modelName in models) {
      let imageFields = img.getModelImageFields(
        we.db.modelsConfigs[modelName]
      )

      if (_.isEmpty(imageFields)) continue;

      let model = models[modelName];

      model.addHook('afterFind', 'loadImages', img.afterFind)
      model.addHook('afterCreate', 'createImage', img.afterCreatedRecord)
      model.addHook('afterUpdate', 'updateImage', img.afterUpdatedRecord)
      model.addHook('afterDestroy', 'destroyImage', img.afterDeleteRecord)
    }

    done()
  }
}