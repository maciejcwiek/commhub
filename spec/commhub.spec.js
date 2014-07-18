require('../src/EventRouter.js');
require('../src/CommunicationHub.js');

describe("Communication Hub test.", function () {
    var _testCounter = 0,
    	router  = new EventRouter({verbose : true}),
        commhub = new CommunicationHub({eventRouter : router, verbose : true}),
        testModuleInstance = {};

    function TestModule() {
        function Module() {}
        
        Module.eventHandlerOne = function () {
            return;
        };
        
        Module.eventHandlerTwo = function () {
            return;
        };

        return Module;
    }
    
    beforeEach(function () {
        console.log('>>> TEST #' + (++_testCounter).toString());

        testModuleInstance = new TestModule();
        commhub.reset();
        commhub.useRouter(router);
    });

    describe("Test basic setup.", function () {
      
        it("should successfuly register a module along with an event and a handler", function () {
            var spy = spyOn(commhub, 'registerModule');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });

            expect(spy).toHaveBeenCalledWith({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
        });
    });

    describe("Test event triggering, passing data between modules and event routing.", function () {

        it("should trigger a handler once an event is broadcasted", function () {
            var spy = spyOn(testModuleInstance, 'eventHandlerOne');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandlerOne'}
            });

            commhub.emit('bar');

            expect(spy).toHaveBeenCalled();
        });

        it("should pass on an event name and data, sent along with triggered event, to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandlerOne');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandlerOne'}
            });

            commhub.emit('bar', {foo: true, baz: false});

            expect(spy).toHaveBeenCalledWith('bar', {foo: true, baz: false});
        });
        
        it("should route an event to process associated data invisibly, and forward everything on to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandlerOne'),
            	testRoute = {
                    routeForFooEvent: function (data, done) {
                        done();
                    }
                };

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
            
            router.setRoutes({
                'foo' : testRoute.routeForFooEvent
            });

            commhub.emit('foo', {foo: true, bar: false});

            expect(spy).toHaveBeenCalledWith('foo', {foo: true, bar: false});
        });
        
        it("should route an event to process associated data and forward the event along with modified data, to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandlerOne'),
            	testRoute = {
                    routeForFooEventWithFakeResponse: function (data, done) {
                        done('fake data');
                    }
                };

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
            
            router.setRoutes({
                'foo' : testRoute.routeForFooEventWithFakeResponse
            });

            commhub.emit('foo', {foo: true, bar: false});

            expect(spy).toHaveBeenCalledWith('foo', 'fake data');
        });

        it("should not route an event, if there is no modules registered in the CommunicationHub, for that event", function () {
            var spy = spyOn(testModuleInstance, 'eventHandlerOne'),
            	testRoute = {
                    routeForBarEvent: function (data, done) {
                        done();
                    }
                };

            router.setRoutes({
                'bar' : testRoute.routeForBarEvent
            });

            commhub.emit('bar');

            expect(spy).not.toHaveBeenCalled();
        });
        
        it("should not route an event, if routing for that event has been switched off", function () {
            var testRoute = {
                    routeForFooEvent: function (data, done) {
                        done();
                    },
                    routeForBarEvent: function (data, done) {
                        done();
                    }
                },
                spyOne = spyOn(testRoute, 'routeForFooEvent'),
                spyTwo = spyOn(testRoute, 'routeForBarEvent');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne', 'bar': 'eventHandlerTwo'}
            });

            router.setRoutes({
                'foo' : testRoute.routeForFooEvent,
                'bar' : testRoute.routeForBarEvent
            });

            router.toggleRoute('bar', false);
            
            commhub.emit('foo');
            commhub.emit('bar');

            expect(spyOne).toHaveBeenCalled();
            expect(spyTwo).not.toHaveBeenCalled();
        });
    });
});
