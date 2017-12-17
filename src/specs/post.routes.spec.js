'use strict';

const should = require('chai').should();

module.exports.authorized = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let validate = Spec.validate;
  let options = Spec.options;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let model;

  describe(`POST /${pluralName}/`, () => {
    beforeEach(done => {
      Spec.findModel((err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result;
        if (model.roles) model.roles = ['user'];
        delete model.timestamps;

        return done();
      });
    });
    it(`should create a ${modelName} without problem`, done => {
      requests.post(model).end((err, res) => {
        validate.createSuccess(err, res);
         // remove a password field before validation eventhough it was used for creation
        delete model.password;
        validate.model(res.body, model);
        return done();
      });
    });
    it(`should not create a ${modelName} with no ${options.required}`, done => {
      model = Spec.setField(model, options.required, null);
      requests.post(model).end((err, res) => {
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
      it(`should not create a ${modelName} with invalid ${options.required}`, done => {
        model = Spec.setField(model, options.required, 'foobar');
        requests.post(model).end((err, res) => {
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
    it(`should not create a ${modelName} with non existent ${options.required}`,
      done => {
        model = Spec.setField(model, options.required, null);
        requests.post(model).end((err, res) => {
          let error = {
            id: 'validationerror',
            message: `${Model.modelName} validation failed`,
            fields: options.required
          };
          validate.badRequest(err, res, error);
          return done();
        });
      });
  });
};
module.exports.unauthorized = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;
  let validate = Spec.validate;

  describe(`POST /${pluralName}/`, () => {
    let model;
    beforeEach(done => {
      Model.findOne({}, (err, result) => {
        should.not.exist(err);
        should.exist(result);
        result = result.toObject();
        result.should.be.an('object');
        model = Spec.duplicateModel(result);
        model = Spec.createRandomModel(model);
        return done();
      });
    });
    it(`should not create a ${modelName}`, (done) => {
      requests.post(model).end((err, res) => {
        validate.forbidden(err, res);
        return done();
      });
    });
  });
};
