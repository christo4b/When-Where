module.exports = {

  'facebookAuth' : {
      'clientID'      : 'x', // your App ID
      'clientSecret'  : 'x', // your App Secret
      'callbackURL'   : 'http://localhost:3000/login/facebook/return'
  },

  'twitterAuth' : {
      'consumerKey'       : 'your-consumer-key-here',
      'consumerSecret'    : 'your-client-secret-here',
      'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
  },

  'googleAuth' : {
      'clientID'      : 'your-secret-clientID-here',
      'clientSecret'  : 'your-client-secret-here',
      'callbackURL'   : 'http://localhost:8080/auth/google/callback'
  }

};
