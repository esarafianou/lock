/**
 * Mocha config
 */

mocha.timeout(60000);
mocha.ui('bdd');
mocha.reporter('html');
mocha.globals(['jQuery*', '__auth0jp*', 'Auth0*']);

/**
 * Define some support variables
 */

var placeholderSupport = ('placeholder' in document.createElement('input'));
var placeholderSupportPrefix = placeholderSupport ? '' : 'not ';

/**
 * Test Auth0Lock
 */

describe('Auth0Lock', function () {
  var domain =      'abc.auth0.com';
  var clientID =    '123456789';
  var callbackURL = 'http://myapp.com/callback';
  var widget, client;

  beforeEach(function (done) {
    Auth0Lock.prototype.getClientConfiguration = function (done) {
      var $client = {
        id: clientID,
        strategies: [
          {
            "name": "facebook",
            "connections": [{ "name": "facebook", "domain": "" }]
          },
          {
            "name": "twitter",
            "connections": [{ "name": "twitter", "domain": "" }]
          },
          {
            "name": "google-oauth2",
            "connections": [{ "name": "google-oauth2", "domain": "" }]
          },
          {
            "name": "adfs",
            "connections": [{ "name": "contoso", "domain": "contoso.com" }]
          },
          {
            "name": "auth0-adldap",
            "connections": [{ "name": "adldap", "domain": "litware.com" }]
          },
          {
            "name": "auth0",
            "connections": [
              { "name": "dbTest", "domain": "", "showSignup": true, "showForgot": true },
              { "name": "Username-Password-Authentication", "domain": "" }
            ]
          },
          {
            "name": "google-apps",
            "connections": [
              { "name": "google-app1", "domain": "" },
              { "name": "google-app2", "domain": "" },
              { "name": "google-app3", "domain": "" }
            ]
          }
        ]
      };

      if ('function' === typeof done) {
        done($client);
      };
    };

    widget = new Auth0Lock(clientID, domain);

    client = widget.$auth0;
    client.getSSOData = function (withAd, callback) {
      callback(null, { sso: false });
    };
    done();
  });

  afterEach(function (done) {
    global.window.location.hash = '';
    if (widget) {
      widget.hide(done);
    } else {
      $('#a0-lock').remove();
      done();
    }

  });

  it('should setup client with callbackOnLocationHash', function (done) {
    widget
    .once('signin ready', function() {
      expect(client._callbackOnLocationHash).to.be(true);
      done();
    })
    .show({
      responseType: 'token'
    });
  });

  it('should setup client with callbackURL', function (done) {
    widget
    .once('ready', function() {
      expect(client._callbackURL).to.be(callbackURL);
      done();
    })
    .show({
      callbackURL: callbackURL
    });
  });

  it('should setup client to use JSONP', function (done) {
    widget
    .once('ready', function() {
      expect(client._useJSONP).to.be(true);
      done();
    })
    .show({
      forceJSONP: true
    });
  });

  it('should remove widget when user close it', function (done) {
    widget
    .once('ready', function () {
      bean.fire($('#a0-lock a.a0-close')[0], 'click');
    })
    .once('hidden', function () {
      expect($('#a0-lock').length).to.equal(0);
      done();
    })
    .show({
      callbackURL: callbackURL,
      responseType: 'token'
    });
  });

  it('should show only notloggedin view if SSO data is not present', function (done) {
    widget
    .once('ready', function () {
      expect($('#a0-lock .a0-notloggedin')[0]).to.exist;
      expect($('#a0-lock .a0-loggedin')[0]).to.not.exist;
      expect($('#a0-lock .a0-signup')[0]).to.not.exist;
      expect($('#a0-lock .a0-reset')[0]).to.not.exist;
      done();
    })
    .show({
      callbackURL: callbackURL,
      responseType: 'token'
    });

  });

  it('should show only loggedin view with SSO data (social) if it is present', function (done) {
    client.getSSOData = function (withAd, callback) {
      callback(null, {
        sso: true,
        lastUsedUsername: 'john@gmail.com',
        lastUsedConnection: { strategy: 'google-oauth2', connection: 'google-oauth2' }
      });
    };

    widget
    .once('ready', function () {
      expect($('#a0-lock .a0-notloggedin')[0]).to.not.exist;
      expect($('#a0-lock .a0-loggedin')[0]).to.exist;
      expect($('#a0-lock .a0-signup')[0]).to.not.exist;
      expect($('#a0-lock .a0-reset')[0]).to.not.exist;
      expect($('#a0-lock .a0-loggedin .a0-strategy [data-strategy]').attr('title')).to.equal('john@gmail.com (Google)');
      done();
    })
    .show({
      callbackURL: callbackURL,
      responseType: 'token'
    });
  });

  it('should use only specified connections', function (done) {
    widget
    .once('ready', function () {
      expect(widget.$client.strategies.length).to.equal(4);

      expect(widget.$client.strategies[0].name).to.equal('twitter');
      expect(widget.$client.strategies[0].connections.length).to.equal(1);
      expect(widget.$client.strategies[0].connections[0].name).to.equal('twitter');

      expect(widget.$client.strategies[1].name).to.equal('google-oauth2');
      expect(widget.$client.strategies[1].connections.length).to.equal(1);
      expect(widget.$client.strategies[1].connections[0].name).to.equal('google-oauth2');

      expect(widget.$client.strategies[2].name).to.equal('auth0');
      expect(widget.$client.strategies[2].connections.length).to.equal(1);
      expect(widget.$client.strategies[2].connections[0].name).to.equal('dbTest');

      expect(widget.$client.strategies[3].name).to.equal('google-apps');
      expect(widget.$client.strategies[3].connections.length).to.equal(2);
      expect(widget.$client.strategies[3].connections[0].name).to.equal('google-app1');
      expect(widget.$client.strategies[3].connections[1].name).to.equal('google-app3');

      done();
    })
    .show({
      callbackURL: callbackURL,
      responseType: 'token',
      connections: ['twitter', 'google-oauth2', 'invalid-connection', 'google-app1', 'dbTest', 'google-app3']
    });
  });

  describe('When assetsUrl option is not specified', function () {
    beforeEach(function() {
      this.widget = new Auth0Lock(clientID, 'abc.contoso.com', {
        callbackURL: callbackURL
      });
    });

    it('should use domain as assetsUrl if domain is not *.auth0.com', function () {
      expect(this.widget.$options.assetsUrl).to.equal('https://abc.contoso.com/');
    });

    it('should use default assetsUrl if domain is *.auth0.com', function () {
      var widget = new Auth0Lock(clientID, 'abc.auth0.com:3000', {
        callbackURL: callbackURL
      });

      expect(widget.$options.assetsUrl).to.equal('https://s3.amazonaws.com/assets.auth0.com/');
    });
  });

  describe('When cdn option is not specified', function () {
    beforeEach(function() {
      this.widget = new Auth0Lock(clientID, 'abc.contoso.com', {
        callbackURL: callbackURL
      });
    });

    it('should use domain as cdn if domain is not *.auth0.com', function () {
      expect(this.widget.$options.cdn).to.equal('https://abc.contoso.com/w2/');
    });

    it('should use default cdn if domain is *.auth0.com', function () {
      var widget = new Auth0Lock(clientID, 'abc.auth0.com', {
        callbackURL: callbackURL
      });

      expect(widget.$options.cdn).to.equal('https://d19p4zemcycm7a.cloudfront.net/w2/');
    });
  });

  describe('Sign In', function () {
    it('should signin with social connection', function (done) {
      client.login = function (options) {
        expect(options.connection).to.equal('google-oauth2');
        expect(options.username).to.not.exist;
        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="google-oauth2"]')[0], 'click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });

    it('should signin with social connection specifying state', function (done) {
      client.login = function (options) {
        expect(options.state).to.equal('foo');
        expect(options.connection).to.equal('google-oauth2');
        expect(options.username).to.not.exist;
        done();
      };

      widget
      .once('ready', function (mode) {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="google-oauth2"]')[0], 'click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token',
        authParams: { state: 'foo' }
      });
    });

    it('should send offline_mode as true to the client', function (done) {
      client.login = function (options) {
        expect(options.offline_mode).to.equal(true);
        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="google-oauth2"]')[0], 'click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', authParams: { offline_mode: true }});
    });

    it('should signin with social connection specifying connection_scope if one is provided', function (done) {
      var connection_scopes = {
        'twitter': ['grant1', 'grant2'],
        'google-oauth2': ['grant3'] };
      var connections = ['twitter', 'google-oauth2'];

      client.login = function (options) {
        expect(options.connection).to.equal('twitter');
        expect(options.username).to.not.exist;
        expect(options.connection_scope.length).to.equal(2);
        expect(options.connection_scope[0]).to.equal('grant1');
        expect(options.connection_scope[1]).to.equal('grant2');
        expect(options.connection_scopes).to.not.exist;

        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="twitter"]')[0], 'click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', connections: connections, authParams: { connection_scopes: connection_scopes }});
    });

    it('should signin with social connection with undefined connection_scope if one is not provided (does not throw)', function (done) {
      var connection_scopes = {
        'twitter': ['grant1', 'grant2'] };
      var connections = ['twitter', 'google-oauth2'];

      client.login = function (options) {
        expect(options.connection).to.equal('google-oauth2');
        expect(options.username).to.not.exist;
        expect(options.connection_scope).to.not.exist;
        expect(options.connection_scopes).to.not.exist;

        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="google-oauth2"]')[0], 'click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', connections: connections, authParams: { connection_scopes: connection_scopes }});
    });

    it('should signin with database connection (auth0 strategy)', function (done) {
      client.login = function (options) {
        expect(options.connection).to.equal('dbTest');
        expect(options.username).to.equal('john@fabrikam.com');
        expect(options.password).to.equal('xyz');
        done();
      };

      widget
      .once('ready', function () {
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input').val('john@fabrikam.com');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-password input').val('xyz');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', authParams: { state: 'foo' }});
    });

    it('should signin with database connection (auth0 strategy) specifying state authParam', function (done) {
      client.login = function (options) {
        expect(options.state).to.equal('foo');
        expect(options.connection).to.equal('dbTest');
        expect(options.username).to.equal('john@fabrikam.com');
        expect(options.password).to.equal('xyz');
        done();
      };

      widget
      .once('ready', function () {
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input').val('john@fabrikam.com');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-password input').val('xyz');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', authParams: { state: 'foo' }});
    });

    it('should signin with adldap connection (auth0-adldap strategy)', function (done) {
      client.login = function (options) {
        expect(options.connection).to.equal('adldap');
        expect(options.username).to.equal('peter');
        expect(options.password).to.equal('zzz');
        done();
      };

      widget
      .once('ready', function() {
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input').val('peter@litware.com');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-password input').val('zzz');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token',
        defaultUserPasswordConnection: 'adldap'
      });
    });

    it('should signin with enterprise connection', function (done) {
      client.login = function (options) {
        expect(options.connection).to.equal('contoso');
        expect(options.username).to.not.exist;
        done();
      };
      widget
      .once('ready', function () {
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input').val('mary@contoso.com');
        // we need this to check if password is ignored or not in validation
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input')[0], 'input');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });

    it('should signin with enterprise connection specifying authParams', function (done) {
      client.login = function (options) {
        expect(options.state).to.equal('foo');
        expect(options.connection).to.equal('contoso');
        expect(options.username).to.not.exist;
        done();
      };

      widget
      .once('ready', function () {
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input').val('mary@contoso.com');
        // we need this to check if password is ignored or not in validation
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-email input')[0], 'input');
        $('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', authParams: { state: 'foo' }});
    });

    it('should send extra authParams to login', function (done) {
      client.login = function (options) {
        expect(options.access_type).to.equal('offline');
        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-iconlist [data-strategy="google-oauth2"]')[0], 'click');
      })
      .show({ callbackURL: callbackURL, responseType: 'token', authParams: { access_type: 'offline' } });
    });
  });

  describe('Sign Up with database connection', function () {

    it('should show only signup view when user clicks on signup button', function (done) {
      widget
      .once('signin ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action a.a0-sign-up')[0], 'click');
      })
      .once('signup ready', function (){
        expect($('#a0-lock .a0-notloggedin')[0]).to.not.exist;
        expect($('#a0-lock .a0-loggedin')[0]).to.not.exist;
        expect($('#a0-lock .a0-reset')[0]).to.not.exist;
        expect($('#a0-lock .a0-signup')[0]).to.exist;
        done();
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });

    it('should call auth0.a0-signup', function (done) {
      client.signup = function (options) {
        expect(options.connection).to.equal('dbTest');
        expect(options.username).to.equal('john@fabrikam.com');
        expect(options.password).to.equal('xyz');
        done();
      };

      widget
      .once('signin ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action a.a0-sign-up')[0], 'click');
      })
      .once('signup ready', function () {
        $('#a0-lock .a0-signup .a0-emailPassword .a0-email input').val('john@fabrikam.com');
        $('#a0-lock .a0-signup .a0-emailPassword .a0-password input').val('xyz');
        $('#a0-lock .a0-signup .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });
  });

  describe('Change Password with database connection', function () {
    it('should show reset view when user clicks on change password button', function (done) {
      widget
      .once('signin ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action a.a0-forgot-pass')[0], 'click');
      })
      .once('reset ready',function () {
        expect($('#a0-lock .a0-notloggedin')[0]).to.not.exist;
        expect($('#a0-lock .a0-loggedin')[0]).to.not.exist;
        expect($('#a0-lock .a0-signup')[0]).to.not.exist;
        expect($('#a0-lock .a0-reset')[0]).to.exist;
        done();
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });

    it('should call auth0.changePassword', function (done) {
      client.changePassword = function (options) {
        expect(options.connection).to.equal('dbTest');
        expect(options.username).to.equal('john@fabrikam.com');
        expect(options.password).to.equal('xyz');
        done();
      };

      widget
      .once('ready', function () {
        bean.fire($('#a0-lock .a0-notloggedin .a0-emailPassword .a0-action a.a0-forgot-pass')[0], 'click');
      })
      .once('reset ready', function () {
        $('#a0-lock .a0-reset .a0-emailPassword .a0-email input').val('john@fabrikam.com');
        $('#a0-lock .a0-reset .a0-emailPassword .a0-password input').val('xyz');
        $('#a0-lock .a0-reset .a0-emailPassword .a0-repeatPassword input').val('xyz');
        $('#a0-lock .a0-reset .a0-emailPassword .a0-action button.a0-primary').trigger('click');
      })
      .show({
        callbackURL: callbackURL,
        responseType: 'token'
      });
    });
  });

  describe('placeholder fallback support', function() {
    it('should have a0-no-placeholder-support class when not supported (' + supportString + 'supported)', function(done) {
      widget
      .once('ready', function() {
        var hasClass = $('#a0-lock .a0-overlay').hasClass('a0-no-placeholder-support');
        expect(hasClass).to.be(!placeholderSupport);
        if (!placeholderSupport) {
          var $fallback = $('#a0-lock .a0-no-placeholder-support .a0-sad-placeholder');
          expect($fallback[0]).to.exist;
          expect($fallback.css('display')).to.equal('block');
        };
        done();
      })
      .show()
    });

    it('should not have a0-no-placeholder-support class when supported (' + supportString + 'supported)', function(done) {
      widget
      .once('ready', function() {
        var hasClass = $('#a0-lock .a0-overlay').hasClass('a0-no-placeholder-support');
        expect(!hasClass).to.be(placeholderSupport);
        if (placeholderSupport) {
          var $fallback = $('#a0-lock .a0-no-placeholder-support .a0-sad-placeholder');
          expect($fallback[0]).to.not.exist;
          expect($('#a0-lock .a0-sad-placeholder').css('display')).to.equal('none');
        };
        done();
      })
      .show();
    });
  });
});
