'use strict';

module.exports = {
  get: require('./get.routes.spec.js'),
  getById: require('./getById.routes.spec.js'),
  post: require('./post.routes.spec.js'),
  put: require('./put.routes.spec.js'),
  delete: require('./delete.routes.spec.js'),
  unauthenticated: require('./unauthenticated.routes.spec.js')
};
