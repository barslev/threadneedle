const assert = require('assert');

const _ = require('lodash');
const when = require('when');

const globalize = require('../lib/addMethod/globalize');
const validateObjectArgumentByReference = require('../lib/addMethod/globalize/validateObjectArgumentByReference');

const referenceModificationErrorMessage = 'Modification by reference is deprecated.',
	nonObjectErrorMessage = 'An object must be returned';
const referenceValidator = validateObjectArgumentByReference(referenceModificationErrorMessage, nonObjectErrorMessage);

const devMode = process.env.NODE_ENV === 'development';
const { handleDevFlagTest } = require('./testUtils.js');

describe('#globalize', function () {

	describe('#method', function () {

		it('should allow static method to be set', function () {
			const sample = {
				_globalOptions: {}
			};

			assert.strictEqual(
				globalize.method.call(sample, { method: 'get' }, {}),
				'get'
			);
			assert.strictEqual(
				globalize.method.call(sample, { method: 'POST' }, {}),
				'post'
			);
		});

		it('should allow moustaching of method', function () {
			const sample = {
				_globalOptions: {}
			};

			assert.strictEqual(
				globalize.method.call(sample, { method: '{{method}}' }, { method: 'head' }),
				'head'
			);
			assert.strictEqual(
				globalize.method.call(sample, { method: '{{method}}' }, { method: 'DELETE' }),
				'delete'
			);
		});

		it('should allow function to return method string', function () {
			const sample = {
				_globalOptions: {}
			};

			assert.strictEqual(
				globalize.method.call(
					sample,
					{
						method: function (params) {
							return params.method;
						}
					},
					{
						method: 'PATCH'
					}
				),
				'patch'
			);
		});

		describe('should only allow valid HTTP verbs as methods', function () {

			const validMethods = [
				'head',
				'options',
				'get',
				'post',
				'put',
				'patch',
				'delete',
			].map((verb) => {
				return ( _.sample([ true, false ]) ? verb.toUpperCase() : verb );
			});

			const sample = {
				_globalOptions: {}
			};

			describe('valid methods via static', () => {

				validMethods.forEach((method) => {

					it(`${method}`, () => {
						assert.strictEqual(
							globalize.method.call(
								sample,
								{
									method: method
								},
								{}
							),
							method.toLowerCase()
						);
					});

				});

			});

			describe('valid methods via moustaching', () => {

				validMethods.forEach((method) => {

					it(`${method}`, () => {
						assert.strictEqual(
							globalize.method.call(
								sample,
								{
									method: '{{method}}'
								},
								{
									method: method
								}
							),
							method.toLowerCase()
						);
					});

				});

			});

			describe('valid methods via function', () => {

				validMethods.forEach((method) => {

					it(`${method}`, () => {
						assert.strictEqual(
							globalize.method.call(
								sample,
								{
									method: function (params) {
										return params.method;
									}
								},
								{
									method: method
								}
							),
							method.toLowerCase()
						);
					});

				});

			});

			it('should error for invalid method', () => {
				let returnedMethod;
				try {
					returnedMethod = globalize.method.call(
						sample,
						{
							method: 'test'
						},
						{}
					);
				} catch (methodError) {
					assert(_.includes(
						methodError.message,
						'Invalid method:'
					));
					assert(_.includes(
						methodError.message,
						'\'method\' must be a valid HTTP verb.'
					));
					return;
				}
				assert.fail(returnedMethod);
			});

		});

	});

	describe('#url', function () {

		it('should add the global baseUrl on the front unless method url starts with http(s)://', function () {
			var sample = {
				_globalOptions: {
					baseUrl: 'http://mydomain.com'
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '/mypath' }, {}),
				'http://mydomain.com/mypath'
			);

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: 'http://yourdomain.com/mypath' }, {}),
				'http://yourdomain.com/mypath'
			);

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: 'https://yourdomain.com/mypath' }, {}),
				'https://yourdomain.com/mypath'
			);
		});

		it('should substitute parameters to string urls', function () {
			var sample = {
				_globalOptions: {
					baseUrl: 'http://{{dc}}.mydomain.com'
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '/mypath/{{id}}' }, {
					dc: 'us5',
					id: '123'
				}),
				'http://us5.mydomain.com/mypath/123'
			);
		});

		it('should substitute array parameters as comma separated', function () {
			var sample = {
				_globalOptions: {
					baseUrl: 'http://{{dc}}.mydomain.com'
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '/mypath/{{id}}?opt_fields={{fields}}' }, {
					dc: 'us5',
					id: '123',
					fields: [ 'id', 'name', 'is_organization' ]
				}),
				'http://us5.mydomain.com/mypath/123?opt_fields=id,name,is_organization'
			);
		});

		it('should substitute parameters to function urls', function () {
			var sample = {
				_globalOptions: {
					baseUrl: function (params) {
						return 'http://'+params.dc+'.mydomain.com';
					}
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, {
					url: function (params) {
						return '/mypath/' + params.id;
					}
				}, {
					dc: 'us5',
					id: '123'
				}),
				'http://us5.mydomain.com/mypath/123'
			);
		});

		it('should allow method url to be empty string, but baseUrl must be valid', () => {
			const sample = {
				_globalOptions: {
					baseUrl: 'http://mydomain.com'
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '' }, {}),
				'http://mydomain.com'
			);

			const sample2 = {
				_globalOptions: {}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample2, { url: 'http://mydomain.com' }, {}),
				'http://mydomain.com'
			);
		});

		it('should throw error for empty string url', () => {
			const sample = {
				_globalOptions: {
					baseUrl: ''
				}
			};

			let returnedUrl;
			try {
				returnedUrl = globalize.baseUrl.call(sample, { url: '' }, {});
			} catch (urlError) {
				assert(_.includes(urlError.message, 'A valid URL has not been supplied.'));
				return;
			}
			assert.fail(returnedUrl);
		});

		it('should not run the global when globals is false', function () {
			var sample = {
				_globalOptions: {
					baseUrl: 'http://mydomain.com'
				}
			};

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '/mypath', globals: false }, {}),
				'/mypath'
			);

			assert.strictEqual(
				globalize.baseUrl.call(sample, { url: '/mypath', globals: { baseUrl: false } }, {}),
				'/mypath'
			);
		});

		describe('should use `baseUrl` in global configuration instead of `url`; throw error in development mode', function () {

			it('uses baseUrl', function () {
				assert.strictEqual(
					globalize.baseUrl.call({
						_globalOptions: {
							baseUrl: 'http://mydomain.com'
						}
					}, { url: '/mypath' }, {}),
					'http://mydomain.com/mypath'
				);
			});

			it('uses url in global configuration (console only)', function () {
				assert.strictEqual(
					globalize.baseUrl.call({
						_globalOptions: {
							url: 'http://mydomain.com'
						}
					}, { url: '/mypath' }, {}),
					'http://mydomain.com/mypath'
				);
			});

			handleDevFlagTest('uses url in global configuration and errors (development mode)', function (done) {
				try {
					assert.strictEqual(
						globalize.baseUrl.call({
							_globalOptions: {
								url: 'http://mydomain.com'
							}
						}, { url: '/mypath' }, {}),
						'http://mydomain.com/mypath'
					);
					done(assert.fail('Error expected'));
				} catch (urlError) {
					assert.strictEqual(urlError.message, '`url` in global configuration is deprecated. Use `baseUrl` instead.');
					done();
				}
			});
		});

	});


	describe('#object', function () {

		it('should globalize to an object on a shallow level', function () {
			var sample = {
				_globalOptions: {
					data: {
						id: '123',
						name: 'Chris'
					}
				}
			};

			assert.deepEqual(globalize.object.call(sample, 'data', {
				data: {
					age: 25,
					height: 180
				}
			}, {}), {
				id: '123',
				name: 'Chris',
				age: 25,
				height: 180
			});
		});

		it('should globalize to an object on a deep level', function () {
			var sample = {
				_globalOptions: {
					data: {
						id: '123',
						name: 'Chris',
						height: {
							m: 1.9
						}
					}
				}
			};

			assert.deepEqual(globalize.object.call(sample, 'data', {
				data: {
					age: 25,
					height: {
						cm: 180,
						m: 1.8
					}
				}
			}, {}), {
				id: '123',
				name: 'Chris',
				age: 25,
				height: {
					cm: 180,
					m: 1.8
				}
			});
		});

		it('should substitute to an global object on a deep level', function () {
			var sample = {
				_globalOptions: {
					data: {
						id: '123',
						firstName: '{{firstName}}',
						lastName: '{{lastName}}'
					}
				}
			};

			assert.deepEqual(globalize.object.call(sample, 'data', {
				data: {
					name: '{{name}}'
				}
			}, {
				name: 'Chris Houghton',
				firstName: 'Chris',
				lastName: 'Houghton'
			}), {
				id: '123',
				name: 'Chris Houghton',
				firstName: 'Chris',
				lastName: 'Houghton'
			});
		});

		it('should return local string if data is a string', function () {
			var sample = {
				_globalOptions: {
					data: {
						id: '123',
						name: 'Chris'
					}
				}
			};

			assert.deepEqual(
				globalize.object.call(sample, 'data', {
					globals: false,
					data: 'Lorem ipsum'
				}, {}),
				'Lorem ipsum'
			);


		});

		it('should not globalize when globals is false', function () {
			var sample = {
				_globalOptions: {
					data: {
						id: '123',
						name: 'Chris'
					}
				}
			};

			assert.deepEqual(globalize.object.call(sample, 'data', {
				globals: false,
				data: {
					age: 25,
					height: 180
				}
			}, {}), {
				age: 25,
				height: 180
			});

			assert.deepEqual(globalize.object.call(sample, 'data', {
				globals: {
					data: false
				},
				data: {
					age: 25,
					height: 180
				}
			}, {}), {
				age: 25,
				height: 180
			});
		});


	});


	describe('validateObjectArgumentByReference', function () {

		const originalObject = {
			test: 'Hello world'
		};

		handleDevFlagTest('throws an error if modified by reference in dev mode', () => {

			const referenceObject = _.cloneDeep(originalObject);

			const validateResult = referenceValidator(referenceObject);

			referenceObject.something = 'something';

			try {
				const result = validateResult();
				assert.fail(result);
			} catch (referenceModificationError) {
				assert.strictEqual(referenceModificationError.message, referenceModificationErrorMessage);
			}

		});

		it('passes on modification by reference when not in dev mode', () => {

			const referenceObject = _.cloneDeep(originalObject);

			const validateResult = referenceValidator(referenceObject);

			referenceObject.something = 'something';

			try {
				const result = validateResult();
				assert.deepEqual(result, referenceObject);
			} catch (validationError) {
				assert.fail(validationError);
			}

		});

		it('maintains reference on further calls with modification by reference when not in dev mode', () => {

			const referenceObject = _.cloneDeep(originalObject);

			const validateResult = referenceValidator(referenceObject);

			referenceObject.something = 'something';

			try {
				const result = validateResult();
				assert.deepEqual(result, referenceObject);
				result.notes = 'testing';
				const secondResult = validateResult();
				assert.deepEqual(secondResult, referenceObject);
			} catch (validationError) {
				assert.fail(validationError);
			}

		});

	});

	describe('#before', function () {

		it('should run normally with global first and then method', function (done) {
			globalize.before.call(
				{
					_globalOptions: {
						before: function (params) {
							params.notes = 'Hello';
							return params;
						}
					}
				},
				{
					before: function (params) {
						params.notes += ' World';
						return params;
					}
				},
				{
					id: 'abc123'
				}
			)
			.then(function (params) {
				assert.deepEqual(params, {
					id: 'abc123',
					notes: 'Hello World'
				});
			})
			.then(done, done);
		});

		it('should run normally with global first and then method - new object', function (done) {
			globalize.before.call(
				{
					_globalOptions: {
						before: function (params) {
							return {
								...params,
								notes: 'Hello'
							};
						}
					}
				},
				{
					before: function (params) {
						if (!params.notes) {
							throw new Error('notes does not exist');
						}
						return {
							...params,
							description: 'World'
						};
					}
				},
				{
					id: 'abc123'
				}
			)
			.then(function (params) {
				assert.deepEqual(params, {
					id: 'abc123',
					notes: 'Hello',
					description: 'World'
				});
			})
			.then(done, done);
		});

		it('should run async normally with global first and then method', function (done) {
			globalize.before.call(
				{
					_globalOptions: {
						before: function (params) {
							params.notes = 'Hello';
							return when.resolve(params);
						}
					}
				},
				{
					before: function (params) {
						params.notes += ' World';
						return when.resolve(params);
					}
				},
				{
					id: 'abc123'
				}
			)
			.then(function (params) {
				assert.deepEqual(params, {
					id: 'abc123',
					notes: 'Hello World'
				});
			})
			.then(done, done);
		});

		it('should error when non-object is returned (except undefined)', function (done) {
			globalize.before.call(
				{
					_globalOptions: {
						before: function (params) {
							return null;
						}
					}
				},
				{},
				{
					id: 'abc123'
				}
			)
			.then(assert.fail)
			.catch((returnError) => {
				assert.strictEqual(returnError.message, '`before` must return an object.');
			})
			.then(done, done);
		});

		describe('should use reference params if modified but not returned (and console warn)', function () {

			const sampleGlobal = {
				_globalOptions: {
					before: function (params) {
						params.notes = 'Hello';
					}
				}
			};

			const sampleMethodConfig = {
				before: function (params) {
					params.notes += ' World';
				}
			};

			const originalParams = {
				id: 'abc123',
				notes: ''
			};

			it('global - no local `before`', function (done) {
				globalize.before.call(sampleGlobal, {}, _.cloneDeep(originalParams))
				.then(function (params) {
					assert.deepEqual(
						params,
						{
							id: 'abc123',
							notes: 'Hello'
						}
					);
				})
				.then(done, done);
			});

			it('global - non-returning local `before`', function (done) {
				globalize.before.call(
					sampleGlobal,
					{ before: () => {} },
					_.cloneDeep(originalParams)
				)
				.then(function (params) {
					assert.deepEqual(
						params,
						{
							id: 'abc123',
							notes: 'Hello'
						}
					);
				})
				.then(done, done);
			});

			it('method - no global `before`', function (done) {
				globalize.before.call(
					{ _globalOptions: {} },
					sampleMethodConfig,
					_.cloneDeep(originalParams)
				)
				.then(function (params) {
					assert.deepEqual(
						params,
						{
							id: 'abc123',
							notes: ' World'
						}
					);
				})
				.then(done, done);
			});

			it('method - non-returning global `before`', function (done) {
				globalize.before.call(
					{ _globalOptions: { before: () => {} } },
					sampleMethodConfig,
					_.cloneDeep(originalParams)
				)
				.then(function (params) {
					assert.deepEqual(
						params,
						{
							id: 'abc123',
							notes: ' World'
						}
					);
				})
				.then(done, done);
			});

			it('both', function (done) {
				globalize.before.call(
					sampleGlobal,
					sampleMethodConfig,
					_.cloneDeep(originalParams)
				)
				.then(function (params) {
					assert.deepEqual(
						params,
						{
							id: 'abc123',
							notes: 'Hello World'
						}
					);
				})
				.then(done, done);
			});

		});

		it('should pass on global modification even if method is undefined', function (done) {

			const originalParams = {
				id: 'abc123',
				notes: ''
			};

			globalize.before.call(
				{
					_globalOptions: {
						before: function (params) {
							return { //new object instead of same referebce object
								...params,
								notes: 'Hello'
							};
						}
					}
				},
				{
					before: function (params) {
						if (!params.notes) {
							throw new Error('notes does not exist in params');
						}
						assert(params.notes);
					}
				},
				_.cloneDeep(originalParams)
			)
			.then(function (params) {
				assert.deepEqual(
					params,
					{
						id: 'abc123',
						notes: 'Hello'
					}
				);
			})
			.then(done, done);

		});

		describe('should throw an error if params is modified but not returned in development mode', function () {

			const sampleMethodConfig = {
				before: function (params) {
					params.notes += ' World';
				}
			};

			const originalParams = {
				id: 'abc123',
				notes: ''
			};

			handleDevFlagTest('global', function (done) {
				globalize.before.call(
					{
						_globalOptions: {
							before: function (params) {
								params.notes = 'Hello';
							}
						}
					},
					{},
					_.cloneDeep(originalParams)
				)
				.then(function (params) {
					assert.deepEqual(params, originalParams);
				})
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `before` must return the modified object.');
				})
				.then(done, done);
			});

			handleDevFlagTest('method', function (done) {
				globalize.before.call(
					{ _globalOptions: {} },
					sampleMethodConfig,
					_.cloneDeep(originalParams)
				)
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `before` must return the modified object.');
				})
				.then(done, done);
			});

			handleDevFlagTest('ok global but invalid method', function (done) {
				globalize.before.call(
					{
						_globalOptions: {
							before: function (params) {
								params.notes = 'Hello';
								return params;
							}
						}
					},
					sampleMethodConfig,
					_.cloneDeep(originalParams)
				)
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `before` must return the modified object.');
				})
				.then(done, done);
			});

		});

		describe('should not run global before when globals is false', function (done) {
			const sampleGlobal = {
				_globalOptions: {
					before: function (params) {
						params.notes = 'Hello';
						return params;
					}
				}
			};

			it('all globals false', function (done) {
				globalize.before.call(
					sampleGlobal,
					{
						globals: false,
						before: function (params) {
							params.notes += ' World';
							return params;
						}
					},
					{
						id: 'abc123',
						notes: ''
					}
				)
				.then(function (params) {
					assert.deepEqual(params, {
						id: 'abc123',
						notes: ' World'
					});
				})
				.then(done, done);
			});

			it('only before globals false', function (done) {
				globalize.before.call(
					sampleGlobal,
					{
						globals: {
							before: false
						},
						before: function (params) {
							params.notes += ' World';
							return params;
						}
					},
					{
						id: 'abc123',
						notes: ''
					}
				)
				.then(function (params) {
					assert.deepEqual(params, {
						id: 'abc123',
						notes: ' World'
					});
				})
				.then(done, done);
			});
		});

	});

	describe('#beforeRequest', function () {

		it('should run normally with global first and then method', function (done) {

			const sampleParams = {
				user_id: 123
			};

			const sampleGlobal = {
				_globalOptions: {
					beforeRequest: function (request, params) {
						assert.deepEqual(params, sampleParams);
						request.url += '?hello=world';
						return request;
					}
				}
			};

			const sampleMethodConfig = {
				beforeRequest: function (request, params) {
					assert.deepEqual(params, sampleParams);
					request.url += '&test=123';
					return request;
				}
			};

			globalize.beforeRequest.call(
				sampleGlobal,
				sampleMethodConfig,
				{
					method: 'get',
					url: 'test.com'
				},
				sampleParams
			)
			.then(function (request) {
				assert.deepEqual(
					request,
					{
						method: 'get',
						url: 'test.com?hello=world&test=123'
					}
				);
			})
			.then(done, done);
		});

		it('should run normally with global first and then method - new object', function (done) {

			const sampleParams = {
				user_id: 123
			};

			const sampleGlobal = {
				_globalOptions: {
					beforeRequest: function (request, params) {
						assert.deepEqual(params, sampleParams);
						const url = request.url +  '?hello=world';
						return {
							method: 'get',
							url
						};
					}
				}
			};

			const sampleMethodConfig = {
				beforeRequest: function (request, params) {
					assert.deepEqual(params, sampleParams);
					assert(request.url);
					request.url += '&test=123';
					return {
						...request,
						data: {}
					};
				}
			};

			globalize.beforeRequest.call(
				sampleGlobal,
				sampleMethodConfig,
				{
					method: 'get',
					url: 'test.com'
				},
				sampleParams
			)
			.then(function (request) {
				assert.deepEqual(
					request,
					{
						method: 'get',
						url: 'test.com?hello=world&test=123',
						data: {}
					}
				);
			})
			.then(done, done);
		});

		it('should run async normally with  global first and then method', function (done) {
			const sampleGlobal = {
				_globalOptions: {
					beforeRequest: function (request) {
						request.url += '?hello=world';
						return when.resolve(request);
					}
				}
			};

			const sampleMethodConfig = {
				beforeRequest: function (request) {
					request.url += '&test=123';
					return when.resolve(request);
				}
			};

			globalize.beforeRequest.call(
				sampleGlobal,
				sampleMethodConfig,
				{
					method: 'get',
					url: 'test.com'
				}
			)
			.then(function (request) {
				assert.deepEqual(
					request,
					{
						method: 'get',
						url: 'test.com?hello=world&test=123'
					}
				);
			})
			.then(done, done);
		});

		it('should error when non-object is returned (except undefined)', function (done) {
			globalize.beforeRequest.call(
				{
					_globalOptions: {
						beforeRequest: function (request) {
							return null;
						}
					}
				},
				{},
				{
					method: 'get',
					url: 'test.com'
				}
			)
			.then(assert.fail)
			.catch((returnError) => {
				assert.strictEqual(returnError.message, '`beforeRequest` must return an object.');
			})
			.then(done, done);
		});

		describe('should use reference request if modified but not returned (and console warn)', function () {

			const sampleGlobal = {
				_globalOptions: {
					beforeRequest: function (request) {
						request.url += '?hello=world';
					}
				}
			};

			const sampleMethodConfig = {
				beforeRequest: function (request) {
					request.url += '&test=123';
				}
			};

			const originalRequest = {
				method: 'get',
				url: 'test.com'
			};

			it('global - no local `beforeRequest`', function (done) {
				globalize.beforeRequest.call(sampleGlobal, {}, _.cloneDeep(originalRequest))
				.then(function (request) {
					assert.deepEqual(
						request,
						{
							method: 'get',
							url: 'test.com?hello=world'
						}
					);
				})
				.then(done, done);
			});

			it('global - non-returning local `beforeRequest`', function (done) {
				globalize.beforeRequest.call(
					sampleGlobal,
					{ beforeRequest: () => {} },
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(
						request,
						{
							method: 'get',
							url: 'test.com?hello=world'
						}
					);
				})
				.then(done, done);
			});

			it('method - no global `beforeRequest`', function (done) {
				globalize.beforeRequest.call(
					{ _globalOptions: {} },
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(
						request,
						{
							method: 'get',
							url: 'test.com&test=123'
						}
					);
				})
				.then(done, done);
			});

			it('method - non-returning global `beforeRequest`', function (done) {
				globalize.beforeRequest.call(
					{ _globalOptions: { beforeRequest: () => {} } },
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(
						request,
						{
							method: 'get',
							url: 'test.com&test=123'
						}
					);
				})
				.then(done, done);
			});

			it('both', function (done) {
				globalize.beforeRequest.call(
					sampleGlobal,
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(
						request,
						{
							method: 'get',
							url: 'test.com?hello=world&test=123'
						}
					);
				})
				.then(done, done);
			});

		});

		it('should pass on global modification even if method is undefined', function (done) {

			const originalRequest = {
				method: 'get',
				url: 'test.com'
			};

			globalize.beforeRequest.call(
				{
					_globalOptions: {
						beforeRequest: function (request) {
							const url = request.url +  '?hello=world';
							return { //new object instead of same referebce object
								...request,
								url
							};
						}
					}
				},
				{
					beforeRequest: function (request) {
						if (!request.url) {
							throw new Error('url does not exist in request object');
						}
					}
				},
				_.cloneDeep(originalRequest)
			)
			.then(function (request) {
				assert.deepEqual(
					request,
					{
						method: 'get',
						url: 'test.com?hello=world'
					}
				);
			})
			.then(done, done);

		});

		describe('should throw an error if request is modified but not returned in development mode', function () {

			const sampleMethodConfig = {
				beforeRequest: function (request) {
					request.url += '&test=123';
				}
			};

			const originalRequest = {
				method: 'get',
				url: 'test.com'
			};

			handleDevFlagTest('global', function (done) {
				globalize.beforeRequest.call(
					{
						_globalOptions: {
							beforeRequest: function (request) {
								request.url += '?hello=world';
							}
						}
					},
					{},
					_.cloneDeep(originalRequest)
				)
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `beforeRequest` must return the modified object.');
				})
				.then(done, done);
			});

			handleDevFlagTest('method', function (done) {
				globalize.beforeRequest.call(
					{ _globalOptions: {} },
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `beforeRequest` must return the modified object.');
				})
				.then(done, done);
			});

			handleDevFlagTest('ok global but invalid method', function (done) {
				globalize.beforeRequest.call(
					{
						_globalOptions: {
							beforeRequest: function (request) {
								request.url += '?hello=world';
								return request;
							}
						}
					},
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(assert.fail)
				.catch((modError) => {
					assert.strictEqual(modError.message, 'Modification by reference is deprecated. `beforeRequest` must return the modified object.');
				})
				.then(done, done);
			});

		});

		describe('should not run global before when globals is false', function () {
			const sampleGlobal = {
				_globalOptions: {
					beforeRequest: function (request) {
						request.url += '?hello=world';
						return request;
					}
				}
			};

			const originalRequest = {
				method: 'get',
				url: 'test.com'
			};

			it('all globals false', function (done) {
				const sampleMethodConfig = {
					globals: false,
					beforeRequest: function (request) {
						request.url += '&test=123';
						return request;
					}
				};
				globalize.beforeRequest.call(
					sampleGlobal,
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(request, {
						method: 'get',
						url: 'test.com&test=123'
					});
				})
				.then(done, done);
			});

			it('only beforeRequest globals false', function (done) {
				const sampleMethodConfig = {
					globals: {
						beforeRequest: false
					},
					beforeRequest: function (request) {
						request.url += '&test=123';
						return request;
					}
				};
				globalize.beforeRequest.call(
					sampleGlobal,
					sampleMethodConfig,
					_.cloneDeep(originalRequest)
				)
				.then(function (request) {
					assert.deepEqual(request, {
						method: 'get',
						url: 'test.com&test=123'
					});
				})
				.then(done, done);
			});


		});

	});


	describe('#expects', function () {

		it('should set the expects object when specified in global', function () {
			var sample = {
				_globalOptions: {
					expects: 200
				}
			};
			assert.deepEqual(globalize.expects.call(sample, {}), [{ statusCode: [200] }]);

			var sample2 = {
				_globalOptions: {
					expects: {
						statusCode: [ 200, 201 ],
						body: 'chris'
					}
				}
			};
			assert.deepEqual(globalize.expects.call(sample2, {}), [
				{
					statusCode: [ 200, 201 ],
					body: ['chris']
				}
			]);
		});

		it('should be overridden by the local config', function () {
			var sample = {
				_globalOptions: {
					expects: 200
				}
			};
			assert.deepEqual(globalize.expects.call(sample, {
				expects: {
					statusCode: 201
				}
			}), [
				{
					statusCode: [201]
				}
			]);

			assert.deepEqual(globalize.expects.call(sample, {
				expects: 202
			}), [
				{
					statusCode: [202]
				}
			]);
		});

		it('should not merge when there are functions on the global or local level', function () {
			var sample = {
				_globalOptions: {
					expects: function () {
						return 'Bad things';
					}
				}
			};
			assert.strictEqual(globalize.expects.call(sample, {
				expects: {
					body: 'steve'
				}
			}).length, 2);

			var sample2 = {
				_globalOptions: {
					expects: function () {
						return 'Bad things';
					}
				}
			};
			assert.strictEqual(globalize.expects.call(sample2, {
				expects: function () {
					return 'Locally bad things';
				}
			}).length, 2);

			var sample3 = {
				_globalOptions: {
					notExpects: [200]
				}
			};
			assert.strictEqual(globalize.expects.call(sample3, {
				expects: function () {
					return 'Locally bad things';
				}
			}).length, 2);
		});

		it('should not run global when globals is false', function () {
			var sample = {
				_globalOptions: {
					expects: 200
				}
			};
			assert.deepEqual(globalize.expects.call(sample, {}), [{ statusCode: [200] }]);

			var sample2 = {
				_globalOptions: {
					expects: {
						statusCode: [ 200, 201 ],
						body: 'chris'
					}
				}
			};
			assert.deepEqual(globalize.expects.call(sample2, {
				globals: false
			}), [{}]);
		});

		it('should not run global when globals.expects is false', function () {
			var sample = {
				_globalOptions: {
					expects: 200
				}
			};
			assert.deepEqual(globalize.expects.call(sample, {}), [{ statusCode: [200] }]);

			var sample2 = {
				_globalOptions: {
					expects: {
						statusCode: [ 200, 201 ],
						body: 'chris'
					}
				}
			};
			assert.deepEqual(globalize.expects.call(sample2, {
				globals: {
					expects: false
				}
			}), [{}]);
		});

	});

	describe('#notExpects', function () {

		it('should set the expects object when specified in global', function () {
			var sample = {
				_globalOptions: {
					notExpects: 200
				}
			};
			assert.deepEqual(globalize.notExpects.call(sample, {}), [{ statusCode: [200] }]);

			var sample2 = {
				_globalOptions: {
					notExpects: {
						statusCode: [ 200, 201 ],
						body: 'chris'
					}
				}
			};
			assert.deepEqual(globalize.notExpects.call(sample2, {}), [
				{
					statusCode: [ 200, 201 ],
					body: ['chris']
				}
			]);
		});

		it('should be overridden by the local config', function () {
			var sample = {
				_globalOptions: {
					notExpects: 200
				}
			};
			assert.deepEqual(globalize.notExpects.call(sample, {
				notExpects: {
					statusCode: 201
				}
			}), [
				{
					statusCode: [201]
				}
			]);

			assert.deepEqual(globalize.notExpects.call(sample, {
				notExpects: 202
			}), [
				{
					statusCode: [202]
				}
			]);
		});


		it('should not set the notExpects object when false is specified in globals', function () {
			var sample = {
				_globalOptions: {
					notExpects: {
						statusCode: [ 200, 201 ],
						body: 'chris'
					}
				}
			};

			assert.deepEqual(globalize.notExpects.call(sample, {
				notExpects: {
					body: 'steve'
				},
				globals: false
			}), [
				{
					body: ['steve']
				}
			]);

			assert.deepEqual(globalize.notExpects.call(sample, {
				notExpects: {
					body: 'steve'
				},
				globals: {
					notExpects: false
				}
			}), [
				{
					body: ['steve']
				}
			]);
		});

		it('should not merge when there are functions on the global or local level', function () {
			var sample = {
				_globalOptions: {
					notExpects: function () {
						return 'Bad things';
					}
				}
			};
			assert.strictEqual(globalize.notExpects.call(sample, {
				notExpects: {
					body: 'steve'
				}
			}).length, 2);

			var sample2 = {
				_globalOptions: {
					notExpects: function () {
						return 'Bad things';
					}
				}
			};
			assert.strictEqual(globalize.notExpects.call(sample2, {
				notExpects: function () {
					return 'Locally bad things';
				}
			}).length, 2);

			var sample3 = {
				_globalOptions: {
					notExpects: [200]
				}
			};
			assert.strictEqual(globalize.notExpects.call(sample3, {
				notExpects: function () {
					return 'Locally bad things';
				}
			}).length, 2);
		});

	});


	describe('#afterSuccess', function () {

		it('should run the global before method when declared', function (done) {
			var sample = {
				_globalOptions: {
					afterSuccess: function (body) {
						body.success = true;
					}
				}
			};

			globalize.afterSuccess.call(sample, {}, {}).done(function (body) {
				assert.deepEqual(body, { success: true });
				done();
			});
		});

		it('should allow for a global promise async', function (done) {
			var sample = {
				_globalOptions: {
					afterSuccess: function (body) {
						return when.promise(function (resolve, reject) {
							body.success = true;
							resolve();
						});
					}
				}
			};

			globalize.afterSuccess.call(sample, {}, {}).done(function (body) {
				assert.deepEqual(body, { success: true });
				done();
			});
		});

		it('should call the global promise before the local one', function (done) {
			var calledFirst;
			var calls = 0;

			var sample = {
				_globalOptions: {
					afterSuccess: function (params) {
						if (!calledFirst) calledFirst = 'global';
						calls++;
					}
				}
			};

			globalize.afterSuccess.call(sample, {
				afterSuccess: function () {
					if (!calledFirst) calledFirst = 'local';
					calls++;
				}
			}, {}).done(function (params) {
				assert.equal(calledFirst, 'global');
				assert.equal(calls, 2);
				done();
			});
		});

		it('should not run the globals when globals is false', function (done) {
			var sample = {
				_globalOptions: {
					afterSuccess: function (body) {
						body.success = true;
					}
				}
			};

			globalize.afterSuccess.call(sample, {
				globals: false
			}, {}).done(function (body) {
				assert.deepEqual(body, {});
				//done();
			});

			globalize.afterSuccess.call(sample, {
				globals: {
					afterSuccess: false
				}
			}, {}).done(function (body) {
				assert.deepEqual(body, {});
				done();
			});
		});

	});

	describe('#afterFailure', function () {

		it('should run the global before method when declared', function (done) {
			var sample = {
				_globalOptions: {
					afterFailure: function (err) {
						err.code = 'oauth_refresh';
					}
				}
			};

			globalize.afterFailure.call(sample, {}, {}).done(function (err) {
				assert.deepEqual(err, { code: 'oauth_refresh' });
				done();
			});
		});

		it('should allow for a global promise async', function (done) {
			var sample = {
				_globalOptions: {
					afterFailure: function (err) {
						return when.promise(function (resolve, reject) {
							err.code = 'oauth_refresh';
							resolve();
						});
					}
				}
			};

			globalize.afterFailure.call(sample, {}, {}).done(function (err) {
				assert.deepEqual(err, { code: 'oauth_refresh' });
				done();
			});
		});

		it('should call the global promise before the local one', function (done) {
			var calledFirst;
			var calls = 0;

			var sample = {
				_globalOptions: {
					afterFailure: function () {
						if (!calledFirst) calledFirst = 'global';
						calls++;
					}
				}
			};

			globalize.afterFailure.call(sample, {
				afterFailure: function () {
					if (!calledFirst) calledFirst = 'local';
					calls++;
				}
			}, {}).done(function () {
				assert.equal(calledFirst, 'global');
				assert.equal(calls, 2);
				done();
			});
		});

		it('should not run the global when globals is false', function (done) {
			var sample = {
				_globalOptions: {
					afterFailure: function (err) {
						err.code = 'oauth_refresh';
					}
				}
			};

			globalize.afterFailure.call(sample, {
				globals: false
			}, {}).done(function (err) {
				assert.deepEqual(err, {});
				//done();
			});

			globalize.afterFailure.call(sample, {
				globals: {
					afterFailure: false
				}
			}, {}).done(function (err) {
				assert.deepEqual(err, {});
				done();
			});
		});


	});


	describe('#afterHeaders', function () {

		it('should run the global before method when declared', function (done) {
			const sampleThread = {
				_globalOptions: {
					afterHeaders: function (error, params, body, res) {
						return {
							success: true
						};
					}
				}
			};

			globalize.afterHeaders.call(sampleThread, {}, null, {}, {}, {})
			.then(function (header) {
				assert.deepEqual(header, {
					success: true
				});
			})
			.then(done, done);
		});

		it('should allow for a global promise async', function (done) {
			const sampleThread = {
				_globalOptions: {
					afterHeaders: function (error, params, body, res) {
						return when.promise(function (resolve, reject) {
							resolve({
								success: true
							});
						});
					}
				}
			};

			globalize.afterHeaders.call(sampleThread, {}, {})
			.then(function (header) {
				assert.deepEqual(header, {
					success: true
				});
			})
			.then(done, done);
		});

		it('should call the global promise before the local one', function (done) {
			let calledFirst;
			let calls = 0;

			const sampleThread = {
				_globalOptions: {
					afterHeaders: function (error, params, body, res) {
						calledFirst = calledFirst || 'global';
						calls++;
					}
				}
			};

			globalize.afterHeaders.call(sampleThread, {
				afterHeaders: function () {
					calledFirst = calledFirst || 'local';
					calls++;
				}
			}, {})
			.then(function (params) {
				assert.equal(calledFirst, 'global');
				assert.equal(calls, 2);
			})
			.then(done, done);
		});

		it('should make local take precedence over global via defaultsDeep', function (done) {
			const sampleThread = {
				_globalOptions: {
					afterHeaders: function (error, params, body, res) {
						return {
							test: 123
						};
					}
				}
			};

			globalize.afterHeaders.call(sampleThread, {
				afterHeaders: function () {
					return {
						test: 456
					};
				}
			}, {})
			.then(function (headers) {
				assert.equal(headers.test, 456);
			})
			.then(done, done);
		});

		describe('should throw an error if headers is not an object in development mode', function () {

			const AFTER_HEADERS_RETURN_ERROR = '`afterHeaders` must return an object.';

			const sampleMethodConfig = {
				afterHeaders: function (request) {
					return null;
				}
			};

			const originalRequest = {
				method: 'get',
				url: 'test.com'
			};

			handleDevFlagTest('global', function (done) {
				globalize.afterHeaders.call(
					{
						_globalOptions: {
							afterHeaders: function (request) {
								return null;
							}
						}
					},
					{},
					null,
					{},
					{},
					{}
				)
				.then(assert.fail)
				.catch((returnError) => {
					assert.strictEqual(returnError.message, AFTER_HEADERS_RETURN_ERROR);
				})
				.then(done, done);
			});

			handleDevFlagTest('method', function (done) {
				globalize.afterHeaders.call(
					{ _globalOptions: {} },
					sampleMethodConfig,
					null,
					{},
					{},
					{}
				)
				.then(assert.fail)
				.catch((returnError) => {
					assert.strictEqual(returnError.message, AFTER_HEADERS_RETURN_ERROR);
				})
				.then(done, done);
			});

			handleDevFlagTest('ok global but invalid method', function (done) {
				globalize.afterHeaders.call(
					{
						_globalOptions: {
							afterHeaders: function (request) {
								return {};
							}
						}
					},
					sampleMethodConfig,
					null,
					{},
					{},
					{}
				)
				.then(assert.fail)
				.catch((returnError) => {
					assert.strictEqual(returnError.message, AFTER_HEADERS_RETURN_ERROR);
				})
				.then(done, done);
			});

		});

		describe('should not run the globals when globals is false', function (done) {
			const sampleThread = {
				_globalOptions: {
					afterHeaders: function (error, params, body, res) {
						return {
							success: true
						};
					}
				}
			};

			it('all globals false', (done) => {
				globalize.afterHeaders.call(sampleThread, {
					globals: false
				}, {})
				.then(function (headers) {
					assert.deepEqual(headers, {});
				})
				.then(done, done);

			});

			it('only afterHeaders globals false', (done) => {
				globalize.afterHeaders.call(sampleThread, {
					globals: {
						afterHeaders: false
					}
				}, {})
				.then(function (headers) {
					assert.deepEqual(headers, {});
				})
				.then(done, done);
			});

		});

	});

});
