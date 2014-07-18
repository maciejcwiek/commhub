require('../src/EventRouter.js');
require('../src/CommunicationHub.js');

describe("Communication Hub test.", function () {
    var router  = new EventRouter({verbose : true}),
        commhub = new CommunicationHub({verbose : true}),
        testModuleInstance = {};

    function TestModule() {
        function Module() {}
        
        Module.eventHandler = function () {
            return;
        };

        return Module;
    }
    
    beforeEach(function () {
        testModuleInstance = new TestModule();
        commhub.reset();
    });

    describe("Test basic setup.", function () {
      
        it("should successfuly register a module along with an event and a handler", function () {
            var spy = spyOn(commhub, 'registerModule');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandler'}
            });

            expect(spy).toHaveBeenCalledWith({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandler'}
            });
        });
    });

    describe("Test event triggering, passing data between modules and event routing.", function () {

        it("should trigger a handler once an event is broadcasted", function () {
            var spy = spyOn(testModuleInstance, 'eventHandler');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandler'}
            });

            commhub.emit('bar');

            expect(spy).toHaveBeenCalled();
        });

        it("should pass on an event name and data, sent along with triggered event, to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandler');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandler'}
            });

            commhub.emit('bar', {foo: true, baz: false});

            expect(spy).toHaveBeenCalledWith('bar', {foo: true, baz: false});
        });
        
        it("should route an event to process associated data invisibly, and forward everything on to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandler'),
            	testRoute = {
                    routeForFooEvent: function (data, done) {
                        done();
                    }
                };

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandler'}
            });
            
            router.setRoutes({
                'foo' : testRoute.routeForFooEvent
            });

            commhub.emit('foo', {foo: true, bar: false});

            expect(spy).toHaveBeenCalledWith('foo', {foo: true, bar: false});
        });
        
        it("should route an event to process associated data and forward the event along with modified data, to a handler", function () {
            var spy = spyOn(testModuleInstance, 'eventHandler'),
            	testRoute = {
                    routeForFooEventWithFakeResponse: function (data, done) {
                        done('fake data');
                    }
                };

            commhub.assignRouter(router);

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandler'}
            });
            
            router.setRoutes({
                'foo' : testRoute.routeForFooEventWithFakeResponse
            });

            commhub.emit('foo', {foo: true, bar: false});

            expect(spy).toHaveBeenCalledWith('foo', 'fake data');
        });

        it("should not route an event, if there is no modules registered in the CommunicationHub, for that event", function () {
            var spy = spyOn(testModuleInstance, 'eventHandler'),
            	testRoute = {
                    routeForBarEvent: function (data, done) {
                        done();
                    }
                };

            router.setRoutes({
                'bar' : testRoute.routeForBarEvent
            });

            commhub.emit('bar', {foo: true, bar: false});

            expect(spy).not.toHaveBeenCalled();
        });
    });
});
