# api-test-bench

## this is an api test bench to facilitate testing

this is work in progress

### to install
```
npm install api-test-bench --save-dev

```

### usage example

```

'use strict';


const User = require('mongoose').model('User');
const url = 'users';

const RouteSpec = require('api-test-bench');

let options = {
  sort: 'username',
  unique: {
    field: 'username',
    type: 'username'
  },
  filter: {
    model: User,
    attribute: 'username',
    value: null,
    key: '_id'
  },
  select: ['firstName', 'lastName'],
  deselected: 'username',
  required: 'email',
  checkInvalid: true
};

class UserBench extends RouteSpec {

}


module.exports.unauthenticated = (agent) => {
  let userBench = new UserBench(User, url, agent, options);
  userBench.runUnauthenticated();
};

module.exports.authenticated = (user, agent) => {
  options.filter.value = user.username;
  let userBench = new UserBench(User, url, agent, options);
  userBench.runAuthenticatedAs(user);
};
```
