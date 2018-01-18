'use strict';

const should = require('chai').should();
const isValidId = require('mongoose').Types.ObjectId.isValid;

const errors = {
  forbidden: {
    status: 403,
    id: 'unauthorized',
    message: 'You are not authorized'
  },
  badRequest: {
    status: 400,
    id: 'validationerror',
    message: 'validation failed'
  },
  invalidId: {
    status: 400,
    id: 'invalidid',
    message: 'Invalid id'
  },
  invalid: (model, field) => {
    return {
      id: 'validationerror',
      message: `${model} validation failed`,
      status: 400,
      fields: field
    };
  },
  duplicate: (model) => {
    return {
      id: 'duplicate',
      message: `${model} already exists`,
      status: 400
    };
  },
  notFound: {
    status: 404,
    id: 'notfound',
    message: 'Model does not exist'
  },
  unauthenticated: {
    status: 401,
    id: 'unauthenticated',
    message: 'User is not authenticated'
  },
  invalidAuth: {
    status: 400,
    id: 'invalidcredential',
    message: 'invalid user/password combination'
  },
  server: {
    status: 500,
    id: 'servererror',
    message: 'failed to get User'
  }
};

class ResponseValidator {
  constructor(errors) {
    this.errors = errors || errors;
  }
  unauthenticated(req, done)  {
    req.end((err, res) => {
      let error = errors.unauthenticated;
      validateError(err, res, error);
      return done();
    });

  }

  invalidAuth(req, done, error)  {
    req.end((err, res) => {
      error = error || errors.invalidAuth;
      error.status = error.status || 400;
      validateError(err, res, error);
      return done();
    });
  }

  signin(user, req, callback)  {
    req.end((err, res) => {
      should.not.exist(err);
      should.exist(res);
      res.should.have.property('status', 200);
      res.should.have.property('body');

      let resUser;
      let token = res.body.token;

      if (token) {
        res.body.should.have.property('user');
        res.body.should.have.property('token');
        token.should.have.length.above(20);
        resUser = res.body.user;
      } else {
        resUser = res.body;
      }
      should.exist(resUser);
      resUser.should.have.property('firstName');
      resUser.firstName.should.equal(user.firstName);
      resUser.should.have.property('lastName');
      resUser.lastName.should.equal(user.lastName);
      resUser.should.have.property('username');
      resUser.username.should.equal(user.username);
      resUser.should.have.property('roles');
      resUser.roles.should.be.a('array');
      resUser.roles.forEach((r) => {
        user.roles.indexOf(r).should.be.above(-1);
      });

      return callback(null, token);

    });
  }

  signout(req, callback)  {
    req.end((err, res) => {
      should.not.exist(err);
      should.exist(res);
      res.should.have.property('status', 200);
      res.should.have.property('body');
      res.body.should.have.property('message');
      res.body.message.should.equal('logout successful');
      return callback();
    });
  }

  list(models, modelName, model, req, done)  {
    req.end((err, res) => {
      this.api(err, res, models.length);
      this.meta(res.body.meta, models);

      this.model(
        findModelInResponse(res.body.data, model),
        model
      );
      return done();
    });
  }

  query(models, total, limit, offset, options, req, done)  {
    if (typeof req === 'function') {
      done = req;
      req = options;
      options = undefined;
    }
    req.end((err, res) => {
      this.api(err, res, limit || models.length, options);
      this.meta(res.body.meta, models, total, limit, offset);
      return done();
    });
  }

  api(err, res, length, options) {
    let maxlength = Math.min(length, 100);
    should.not.exist(err);
    should.exist(res);
    res.should.be.json;
    res.should.have.property('status', 200);
    res.should.have.property('body');
    res.body.should.have.property('meta');
    res.body.meta.should.be.an('object');
    res.body.should.have.property('data');
    res.body.data.should.be.instanceof(Array);
    res.body.data.should.have.length(maxlength);
    if (options && options.select) {
      let object = res.body.data[0];
      should.exist(object);
      options.select.forEach(s => {
        object.should.have.property(s);
      });
      object.should.not.have.property(options.select.deselected);
    }
  }

  meta(meta, models, total, count, offset) {
    count = count || models.length;
    count = Math.min(count, 100);
    meta.should.have.property('total', total || models.length);
    meta.should.have.property('count', count);
    meta.should.have.property('offset', offset || 0);
    should.not.exist(meta.error);
  }

  model(resModel, testModel) {
    should.exist(resModel);

    let fields = Object.keys(testModel);

    let idx = fields.indexOf('_id');
    if (idx >= 0) fields.splice(idx, 1);
    idx = fields.indexOf('__v');
    if (idx >= 0) fields.splice(idx, 1);

    fields.forEach(field => {
      if (field === 'timestamps') {
        this.timestamps(resModel.timestamps, testModel.timestamps);
      } else {
        resModel.should.have.property(field);
        if (isValidId(resModel[field]) || isValidId(testModel[field])) {
          if (typeof resModel[field] !== 'object' && !isValidId(resModel[field])) {
            resModel[field].toString().should.eql(testModel[field].toString());
          } // else disregard populated content
        } else if (Date.parse(resModel[field])) {
          // don't check
        } else if (field === 'mark') {
          // skip => e.g. mark deleted
        }
        else {
          if (resModel[field] !== null || testModel[field] !== null) {
            if (
              typeof resModel[field] == 'object' || typeof testModel[field] == 'object'
            ) {
              Object.keys(testModel[field]).forEach((fieldName) => {
                if (
                  isValidId(resModel[field][fieldName]) ||
                  isValidId(testModel[field][fieldName])
                ) {
                  resModel[field][fieldName].toString().should.eql(
                    testModel[field][fieldName].toString()
                  );
                } else {
                  resModel[field][fieldName].should.eql(testModel[field][fieldName]);
                }
              });
            } else resModel[field].should.eql(testModel[field]);
          } // else it's supposed to be null

        }
      }
    });
    // should never have a password or a salt in a model
    resModel.should.not.have.property('password');
    resModel.should.not.have.property('salt');
  }

  timestamps(timestamps, oldTimestamps) {
    should.exist(timestamps);
    timestamps.should.have.property('created');
    timestamps.created.should.have.property('by');
    timestamps.created.should.have.property('at');
    let createdTime = new Date(timestamps.created.at).getTime();
    let createdTimeOld = new Date(oldTimestamps.created.at).getTime();
    createdTime.should.be.approximately(createdTimeOld, 5);
    timestamps.should.have.property('updated');
    timestamps.updated.should.have.property('by');
    timestamps.updated.should.have.property('at');
    new Date(timestamps.updated.at).getTime()
    .should.be.approximately(new Date(oldTimestamps.updated.at).getTime(), 100);
  }

  success(err, res) {
    validateSuccess(err, res, 200);
  }

  createSuccess(err, res) {
    validateSuccess(err, res, 201);
  }

  notFound(err, res, error) {
    error = error || errors.notFound;
    error.status = error.status || 404;
    validateError(err, res, error);
  }

  validationError(Model, field, err, res) {
    let error = errors.invalid(Model, field);
    validateError(err, res, error);
    res.body.error.should.have.property('fields');
    res.body.error.fields.should.have.property(error.fields);
  }
  invalidIdError(err, res) {
    let error = errors.invalidId;
    validateError(err, res, error);
  }
  duplicateError(Model, err, res) {
    let error = errors.duplicate(Model);
    validateError(err, res, error);
  }
  badRequest(err, res, error) {
    error = error || errors.badRequest;
    error.status = error.status || 400;
    validateError(err, res, error);
    if (error.id !== 'duplicate' && error.id !== 'invalidid') {
      res.body.error.should.have.property('fields');
      res.body.error.fields.should.have.property(error.fields);
    }
  }

  forbidden(err, res, error) {
    error = error || errors.forbidden;
    error.status = error.status || 403;
    validateError(err, res, error);
  }

  serverError(err, res, error) {
    error = error || errors.server;
    error.status = error.status || 500;
    validateError(err, res, error);
  }
}

function findModelInResponse(models, model) {
  let id = model._id.toString();
  let idx = models.map(m => m._id).indexOf(id);
  return models[idx];
}

function validateSuccess(err, res, status) {
  should.not.exist(err);
  should.exist(res);
  res.should.be.json;
  res.should.have.property('status', status);
  res.should.have.property('body');
}

function validateError(err, res, error) {
  should.exist(err);
  should.exist(res);
  res.should.be.json;
  res.should.have.property('status', error.status);
  res.should.have.property('body');
  res.body.should.have.property('error');
  res.body.error.should.have.property('id', error.id);
  res.body.error.should.have.property('message');
  res.body.error.message.indexOf(error.message).should.be.equal(0);
}

module.exports = ResponseValidator;
