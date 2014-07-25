require('../src/EventRouter.js');
require('../src/CommunicationHub.js');

describe("Communication Hub test.", function () {
    var _testCounter = 0,
        _verbose = true,
    	router = new EventRouter({verbose : _verbose}),
        commhub = new CommunicationHub({verbose : _verbose}),
        testModuleInstance = {},
        testRoutes = {};

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

    testRoutes = {
        routeOne: function (data, done) {
            done();
        },
        routeTwo: function (data, done) {
            done();
        },
        routeAlterData : function (data, done) {
            done('altered data');
        }
    };
    
    beforeEach(function () {
        if (_verbose) { console.log('>>> TEST #' + (++_testCounter)); }

        router.reset();
        commhub.reset();
        commhub.useRouter(router);
        testModuleInstance = new TestModule();
    });

    describe("Test basic setup.", function () {
      
        it("should successfuly register a module along with an event and a handler", function () {
            spyOn(commhub, 'registerModule');

            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });

            expect(commhub.registerModule).toHaveBeenCalledWith({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
        });
    });

    describe("Test event triggering, passing data between modules and event routing.", function () {

        it("should trigger a handler once an event is broadcasted", function () {
            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandlerOne'}
            });
            
            spyOn(testModuleInstance, 'eventHandlerOne');

            commhub.emit('bar');

            expect(testModuleInstance.eventHandlerOne).toHaveBeenCalled();
        });

        it("should pass on an event name and data, sent along with triggered event, to a handler", function () {
            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'bar': 'eventHandlerOne'}
            });

            spyOn(testModuleInstance, 'eventHandlerOne');
            
            commhub.emit('bar', {foo: true, baz: false});

            expect(testModuleInstance.eventHandlerOne).toHaveBeenCalledWith('bar', {foo: true, baz: false});
        });
        
        it("should route an event to process associated data invisibly, and forward everything on to a handler", function () {
            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
            
            router.setRoutes({
                'foo' : testRoutes.routeOne
            });

            spyOn(testModuleInstance, 'eventHandlerOne');
            
            commhub.emit('foo', {foo: true, bar: false});

            expect(testModuleInstance.eventHandlerOne).toHaveBeenCalledWith('foo', {foo: true, bar: false});
        });
        
        it("should route an event to process associated data and forward the event along with modified data, to a handler", function () {
            commhub.registerModule({
                target: testModuleInstance,
                handlers: {'foo': 'eventHandlerOne'}
            });
            
            router.setRoutes({
                'foo' : testRoutes.routeAlterData
            });

            var spyHandler = spyOn(testModuleInstance, 'eventHandlerOne');
            
            commhub.emit('foo', {foo: true, bar: false});

            expect(spyHandler).toHaveBeenCalledWith('foo', 'altered data');
        });

        it("should not route an event, if there is no modules registered in the CommunicationHub, for that event", function () {
            router.setRoutes({
                'foo' : testRoutes.routeOne
            });

            var spyHandler = spyOn(testModuleInstance, 'eventHandlerOne');

            commhub.emit('foo');

            expect(spyHandler).not.toHaveBeenCalled();
        });
        
        it("should not route an event, if routing for that event has been switched off", function () {
            commhub.registerModule({
                target   : testModuleInstance,
                handlers : {'foo': 'eventHandlerOne'}
            });

            router.setRoutes({
                'foo' : testRoutes.routeOne
            });

            var spyHandler = spyOn(testModuleInstance, 'eventHandlerOne'),
            	spyOne = spyOn(testRoutes, 'routeOne');

            router.toggleRoute('foo', false);

            commhub.emit('foo');
            expect(spyHandler).toHaveBeenCalled();
            expect(spyOne).not.toHaveBeenCalled();
        });

        it("should not invoke handlers when a module has been deregistered by event name", function () {
            commhub.registerModule({
                target   : testModuleInstance,
                handlers : {'foo': 'eventHandlerOne', 'bar': 'eventHandlerTwo'}
            });

            commhub.deregisterModule({
                target : testModuleInstance,
                events : ['foo']
            });

            spyOn(testModuleInstance, 'eventHandlerOne');

            commhub.emit('foo');

            expect(testModuleInstance.eventHandlerOne).not.toHaveBeenCalled();
        });
    });
});
