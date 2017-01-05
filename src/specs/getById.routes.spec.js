'use strict';

const should = require('chai').should();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

module.exports.authorized = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let validate = Spec.validate;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let model;

  describe(`GET /${pluralName}/:${modelName}Id/`, () => {
    beforeEach(done => {
      Spec.findAndDuplicateModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    it(`should get a ${modelName} without problem`, (done) => {
      requests.getOne(model).end((err, res) => {
        validate.success(err, res);
        validate.model(res.body, model);
        return done();
      });
    });
    it('should get a proper error message if not found', (done) => {
      model._id = ObjectId();
      requests.getOne(model).end((err, res) => {
        let error =  {
          id: 'notfound',
          message: `${Model.modelName} ${model._id} does not exist`
        };
        validate.notFound(err, res, error);
        return done();
      });
    });
    it('should get a proper error message if invalid id', (done) => {
      model._id = 'foobar';
      requests.getOne(model).end((err, res) => {
        let error = {
          id: 'invalidid',
          message: 'Invalid id'
        };
        validate.badRequest(err, res, error);
        return done();
      });
    });
  });
};

module.exports.unauthorized = (Spec) => {
  let requests = Spec.requests;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;
  let validate = Spec.validate;

  describe(`GET /${pluralName}/:id`, () => {
    let model;
    beforeEach(done => {
      Spec.findAndDuplicateModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    it(`should not get a ${modelName}`, (done) => {
      requests.getOne(model).end((err, res) => {
        validate.forbidden(err, res);
        return done();
      });
    });
  });
};
