'use strict';

const should = require('chai').should();
const mongoose = require('mongoose');

module.exports = (Spec) => {
  let Model = Spec.model;
  let requests = Spec.requests;
  let options = Spec.options;
  let validate = Spec.validate;
  let modelName = Spec.modelName;
  let pluralName = Spec.pluralName;

  let models;
  let model;
  let total;

  describe(`GET /${pluralName}/`, () => {
    before(done => {
      Model.find({}, (err, results) => {
        should.not.exist(err);
        should.exist(results);
        results.should.be.instanceof(Array);
        results.should.have.length.above(0);
        models = results;
        Model.findById(results[0]._id, (err, result) => {
          should.not.exist(err);
          should.exist(results);
          model = result.toObject();
          total = models.length;
          return done();
        });
      });
    });
    it(`should be possible to list all ${pluralName}`, done => {
      validate.list(
        models,
        modelName,
        model,
        requests.get(),
        done
      );
    });
    it(`should be possible to sort ${pluralName}`, done => {
      validate.query(
        models,
        models.legth,
        total,
        0,
        requests.query('?sort=' + options.sort), done
      );
    });
    it(`should be possible to filter ${pluralName} by a ${options.filter.attribute}`,
      done => {
        let filter = options.filter;
        let search = filter.value;
        let query = {};
        query[filter.attribute] = search;
        filter.model.findOne(query, (err, result) => {
          should.not.exist(err);
          should.exist(result);
          query = {};
          query[filter.key] = result._id;
          Model.find(query, (err, results) => {
            should.not.exist(err);
            should.exist(result);
            validate.query(
              models,
              total,
              results.length,
              0,
              requests.query('?q='+ search),
              done
            );
          });
        });
      });
    it(`should be possible to limit ${pluralName}`, done => {
      let limit = 1;
      let offset = 0;
      validate.query(
        models,
        total,
        limit,
        offset,
        requests.query('?limit=' + limit),
        done
      );
    });
    it(`should be possible to offset ${pluralName}`, done => {
      let offset = 1;
      let limit = total - offset;
      validate.query(
        models,
        total,
        limit,
        offset,
        requests.query('?offset=' + offset), done
      );
    });
    it(`should be possible to select fields in ${pluralName}`, done => {
      validate.query(
        models,
        models.length,
        total,
        0,
        options,
        requests.query('?select=' + options.select.join(' ')),
        done
      );
    });
  });
};