'use strict';

const should = require('chai').should();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

module.exports.authorized = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let validate = Spec.validate;
  let options = Spec.options;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let model;

  describe(`PUT /${pluralName}/:${modelName}Id/`, () => {
    beforeEach(done => {
      Spec.findAndDuplicateModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    it(`should update a ${modelName} without problem`, done => {
      requests.put(model).end((err, res) => {
        validate.success(err, res);
        validate.model(res.body, model);
        return done();
      });
    });
    it(`should not create a ${modelName} with no ${options.required}`, done => {
      model[options.required] = null;
      requests.put(model).end((err, res) => {
        let error = {
          id: 'validationerror',
          message: `${Model.modelName} validation failed`,
          fields: options.required
        };
        validate.badRequest(err, res, error);
        return done();
      });
    });
    if (options.checkInvalid) {
      it(`should not update a ${modelName} with invalid ${options.required}`, done => {
        model[options.required] = 'foobar';
        requests.put(model).end((err, res) => {
          let error = {
            id: 'validationerror',
            message: `${Model.modelName} validation failed`,
            fields: options.required
          };
          validate.badRequest(err, res, error);
          return done();
        });
      });
      it(`should not update a ${modelName} with non existent ${options.required}`,
        done => {
          model[options.required] = ObjectId();
          requests.put(model).end((err, res) => {
            let error = {
              id: 'validationerror',
              message: `${Model.modelName} validation failed`,
              fields: options.required
            };
            validate.badRequest(err, res, error);
            return done();
          });
        });
    }
  });
};

module.exports.unauthorized = (Spec) => {
  let requests = Spec.requests;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;
  let validate = Spec.validate;
  let options = Spec.options;

  describe(`PUT /${pluralName}/:id`, () => {
    let model;
    beforeEach(done => {
      Spec.findAndDuplicateModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    it(`should not update a ${modelName}`, done => {
      model[options.sort] = 'somestring';
      requests.put(model).end((err, res) => {
        validate.forbidden(err, res);
        return done();
      });
    });
  });
};
