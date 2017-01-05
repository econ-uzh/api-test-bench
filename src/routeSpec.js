'use strict';

const specs = require('./specs');
const apiUrl = '/api/v0/'; // TODO: read from conf
const ResponseValidator = require('./responseValidator');

class RouteSpec {

  constructor(model, url, agent, options) {
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
      checkInvalid: false
    };
    this.setOptions(options);
    this.agent = agent;

    this.setResponseValidator(new ResponseValidator());
    this.registerRequests();

    this.pipeline = {
      get: [() => this.get()],
      getById: [() => this.getById()],
      post: [() => this.post()],
      put: [() => this.put()],
      delete: [() => this.delete()]
    };
  }

  registerRequests() {
    let url = apiUrl + this.url;
    if (url.substr(-1) !== '/') url += '/';
    this.requests = {
      get: () => this.agent.get(url),
      query: (query) => this.agent.get(url + query),
      getOne: (model) => this.agent.get(url + model._id),
      post: (model) => this.agent.post(url).send(model),
      put: (model) => this.agent.put(url + model._id).send(model),
      delete: (model) => this.agent.del(url + model._id),
      signout: () => this.agent.post(apiUrl + 'auth/signout'),
      signin: (user, agent) => {
        return (agent || this.agent)
        .post(apiUrl + 'auth/signin/')
        .send(user);
      }
    };
  }

  setOptions(options) {
    // TODO: add options parser
    if (options && Object.keys(options)) {
      Object.keys(this.options).forEach(o => {
        this.options[o] = options[o];
      });
    }
  }
  setResponseValidator(validator) {
    if (validator instanceof ResponseValidator) {
      this.validate = validator;
    } else throw new TypeError('validator must be of type ResponseValidator');
  }

  get() {
    specs.get(this);
  }
  getById() {
    specs.getById(this);
  }

  post() {
    specs.post(this);
  }

  put() {
    specs.put(this);
  }

  delete() {
    specs.delete(this);
  }

  runAuthenticatedAs(user) {
    describe(`${this.modelName} routes test authenticated as ${user.username}`, () => {
      beforeEach((done) => {
        this.validate.signin(user, this.requests.signin(user), done);
      });
      let tests = Object.keys(this.pipeline);
      tests.forEach(suit => {
        this.pipeline[suit].forEach(s => s(this.agent));
      });
      after((done) => {
        this.validate.signout(this.requests.signout(user), done);
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
}

function randomString(length) {
  return Array(length).fill(null).map(a => {
    let randChar = Math.floor(Math.random() * 25) + 97;
    return String.fromCharCode(randChar);
  }).join('');
}

module.exports = RouteSpec;
