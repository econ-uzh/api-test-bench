'use strict';

const should = require('chai').should();

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
    status: 401,
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

  invalidAuth(error, req, done)  {
    req((err, res) => {
      error = error || errors.invalidAuth;
      error.status = error.status || 400;
      validateError(err, res, error);
      return done();
    });
  }

  signin(user, req, done)  {
    req.end((err, res) => {
      should.not.exist(err);
      should.exist(res);
      res.should.have.status(200);
      res.should.have.property('body');
      res.body.should.have.property('firstName');
      res.body.firstName.should.equal(user.firstName);
      res.body.should.have.property('lastName');
      res.body.lastName.should.equal(user.lastName);
      res.body.should.have.property('username');
      res.body.username.should.equal(user.username);
      res.body.should.have.property('email');
      res.body.email.should.equal(user.email);
      res.body.should.have.property('roles');
      res.body.roles.should.be.a('array');
      res.body.roles.forEach((r)  => {
        user.roles.indexOf(r).should.be.above(-1);
      });
      return done();
    });
    // return callback(err, req);
  }

  signout(req, done)  {
    req.end((err, res) => {
      should.not.exist(err);
      should.exist(res);
      res.should.have.status(200);
      res.should.have.property('body');
      res.body.should.have.property('message');
      res.body.message.should.equal('logout successful');
      return done();
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
    res.should.have.status(200);
    res.should.have.property('body');
    res.body.should.have.property('meta');
    res.body.data.should.be.an.Object;
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

    fields.forEach(field => {
      if (field === 'timestamps') {
        this.timestamps(resModel.timestamps, testModel.timestamps);
      } else {
        resModel.should.have.property(field);
        resModel[field].should.eql(testModel[field]);
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
    createdTime.should.be.approximately(createdTimeOld, 1);
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
  res.should.have.status(status);
  res.should.have.property('body');
}

function validateError(err, res, error) {
  should.exist(err);
  should.exist(res);
  res.should.be.json;
  res.should.have.status(error.status);
  res.should.have.property('body');
  res.body.should.have.property('error');
  res.body.error.should.have.property('id', error.id);
  res.body.error.should.have.property('message', error.message);
}

module.exports = ResponseValidator;
