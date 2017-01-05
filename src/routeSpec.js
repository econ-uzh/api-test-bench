'use strict';

const specs = require('./specs');
const apiUrl = '/api/v0/'; // TODO: read from conf
const ResponseValidator = require('./responseValidator');

class RouteSpec {

  constructor(model, url, request, options) {
    if (new.target === RouteSpec) {
      throw new TypeError('Cannot construct Abstract instance RouteSpec directly');
    }

    this.url = url;
    this.model = model;
    this.modelName = this.model.modelName.toLowerCase();
    this.pluralName = this.model.collection.name;
    this.options = {
      sort: '',
      unique: {
        field: '',
        type: ''
      },
      filter: {
        model: '',
        attribute: '',
        value: '',
        key: ''
      },
      select: [],
      deselected: '',
      required: '',
      checkInvalid: false,
      permissions: {
        get: ['*'],
        getById: ['*'],
        post: ['*'],
        put: ['*'],
        delete: ['*']
      }
    };
    this.setOptions(options);
    this.request = request;
    this.token = null;

    this.setResponseValidator(new ResponseValidator());
    this.registerRequests();

    this.pipeline = {
      get: [(p) => this.get(p)],
      getById: [(p) => this.getById(p)],
      post: [(p) => this.post(p)],
      put: [(p) => this.put(p)],
      delete: [(p) => this.delete(p)]
    };
  }

  registerRequests() {
    let url = apiUrl + this.url;
    if (url.substr(-1) !== '/') url += '/';
    this.requests = {
      get: (u) => this.next(this.request.get(u || url)),
      query: (query, u) => this.next(this.request.get((u || url) + query)),
      getOne: (model, u) => this.next(this.request.get((u || url) + model._id)),
      post: (model, u) => this.next(this.request.post((u || url)).send(model)),
      put: (model, u) => this.next(this.request.put((u || url) + model._id).send(model)),
      delete: (model, u) => this.next(this.request.del((u || url) + model._id)),
      signout: () => this.request.post(apiUrl + 'auth/signout'),
      signin: (user, request) => {
        return (request || this.request)
        .post(apiUrl + 'auth/signin/')
        .send(user);
      }
    };
  }

  setOptions(options) {
    this.options = parseOptions(this.options, options);
  }
  setResponseValidator(validator) {
    if (validator instanceof ResponseValidator) {
      this.validate = validator;
    } else throw new TypeError('validator must be of type ResponseValidator');
  }

  get(isAuthorized) {
    if (isAuthorized) specs.get.authorized(this);
    else specs.get.unauthorized(this);
  }
  addGet(getFnc) {
    if (typeof getFnc !== 'function') throw new TypeError('must be a function');
    else this.pipeline.get.push((p) => getFnc(this, p));
  }
  getById(isAuthorized) {
    if (isAuthorized) specs.getById.authorized(this);
    else specs.getById.unauthorized(this);
  }

  post(isAuthorized) {
    if (isAuthorized) specs.post.authorized(this);
    else specs.post.unauthorized(this);
  }

  put(isAuthorized) {
    if (isAuthorized) specs.put.authorized(this);
    else specs.put.unauthorized(this);
  }

  delete(isAuthorized) {
    if (isAuthorized) specs.delete.authorized(this);
    else specs.delete.unauthorized(this);
  }

  runAuthenticatedAs(user) {
    describe(`${this.modelName} routes test authenticated as ${user.username}`, () => {
      beforeEach((done) => {
        this.validate.signin(user, this.requests.signin(user), (err, token) => {
          this.token = token;
          return done();
        });
      });
      let tests = Object.keys(this.pipeline);
      tests.forEach(method => {
        let isAuthorized = this.isAuthorized(user, method);
        this.pipeline[method].forEach(s => s(isAuthorized));
      });
      after((done) => {
        this.validate.signout(this.requests.signout(), () => {
          this.token = null;
          return done();
        });
      });
    });
  }

  runUnauthenticated() {
    specs.unauthenticated(this);
  }

  duplicateModel(model){
    model = Object.assign({}, model);
    delete model._id;
    delete model.__v;
    delete model.salt;
    return model;
  }
  createRandomModel(model, field, type) {
    type = type || this.options.unique.type;
    field = field || this.options.unique.field;

    model = this.duplicateModel(model);
    model[field] = randomString(10);

    switch (type) {
      case 'username':
        model.email = model[field] + '@foo.bar';
        model.password = '!23ffgJJJ';
        break;
      case 'date':
        model[field] = new Date();
        break;
      case 'number':
      case 'numeric':
        model[field] = Math.ceil(Math.random() * 100);
        break;
      default:

    }
    return model;
  }
  findAndDuplicateModel(callback) {
    this.model.findOne({}, (err, result) => {
      if (err) return callback(err, null);
      else {
        result = result.toObject();
        let model = this.duplicateModel(result);
        model = this.createRandomModel(model);
        model = new this.model(model);
        model.save(callback);
      }
    });
  }
  isAuthorized(user, method) {
    let role = this.options.permissions[method];
    role =  typeof role === 'string' ? [role] : role;
    let roles = user.roles;
    return role.some(r => roles.indexOf(r) > -1);
  }
  next(request){
    if (this.token) return request.set('Authorization', 'Bearer '  + this.token);
    else return request;
  }
}

function randomString(length) {
  return Array(length).fill(null).map(a => {
    let randChar = Math.floor(Math.random() * 25) + 97;
    return String.fromCharCode(randChar);
  }).join('');
}

function parseOptions(_options, options) {
  // TODO: add better options parser
  let opt = JSON.parse(JSON.stringify(options));
  let parsedOptions = {};
  if (opt && Object.keys(opt).length > 0) {
    Object.keys(_options).forEach(o => {
      parsedOptions[o] = opt[o];
    });
  }
  if (options && options.filter && options.filter.model) {
    // reattach mongoose model if there was one
    parsedOptions.filter.model = options.filter.model;
  }
  return parsedOptions;
}

module.exports = RouteSpec;
