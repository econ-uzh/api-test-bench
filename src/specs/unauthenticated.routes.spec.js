'use strict';

const should = require('chai').should();

module.exports = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let validate = Spec.validate;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let model;

  describe(`${pluralName} routes test unauthenticated`, () => {
    before(done => {
      Model.findOne({}, (err, result) => {
        should.not.exist(err);
        should.exist(result);
        model = result.toObject();
        return done();
      });
    });
    describe(`/${pluralName}/ unauthenticated`, () => {
      it(`should not be possible to GET ${pluralName} unauthenticated`, done => {
        validate.unauthenticated(requests.get(), done);
      });
      it(`should not be possible to GET ${modelName} unauthenticated`, done => {
        validate.unauthenticated(requests.getOne(model), done);
      });
      it(`should not be possible to CREATE ${modelName} unauthenticated`, done => {
        const model2 = Spec.createRandomModel(model);
        validate.unauthenticated(requests.post(model2), done);
      });
      it(`should not be possible to UPDATE ${modelName} unauthenticated`, done => {
        validate.unauthenticated(requests.put(model), done);
      });
      it(`should not be possible to DELETE ${modelName} unauthenticated`, done => {
        validate.unauthenticated(requests.delete(model), done);
      });
    });
  });
};
