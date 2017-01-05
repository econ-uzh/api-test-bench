'use strict';

const should = require('chai').should();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


module.exports = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let validate = Spec.validate;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let model;

  describe(`DELETE /${pluralName}/:${modelName}Id/`, () => {
    beforeEach(done => {
      Spec.findAndDuplicateModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    it(`should delete a ${modelName} without problem`, done => {
      requests.delete(model).end((err, res) => {
        validate.success(err, res);
        validate.model(res.body, model, true);
        return done();
      });
    });
    it(`should not be possible to delete a ${modelName} with invalid id`, done => {
      model._id = 'foobar';
      requests.delete(model).end((err, res) => {
        let error = {
          id: 'invalidid',
          message: 'Invalid id'
        };
        validate.badRequest(err, res, error);
        return done();
      });
    });
    it(`should not be possible to delete a ${modelName} if not found`, done => {
      model._id = ObjectId();
      requests.delete(model).end((err, res) => {
        let error = {
          id: 'notfound',
          message: `${Model.modelName} ${model._id} does not exist`
        };
        validate.notFound(err, res, error);
        return done();
      });
    });
  });
};
