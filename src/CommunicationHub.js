(function (global, EventRouter, undefined) {

    // holds singleton
    var _instance = null,
        _options  = {
            debug : true,
            logPrefix : '[CommunicationHub]'
        };

    /**
     * Custom logging function. Outputs logs if _options.debug is enabled.
     * 
     * @function
     * @name _log
     * @private
     */
    function _log() {
        if (_options.debug) {
            var temp = arguments;

			if (typeof temp === 'object') {
                temp = [];

                for (var p in arguments) {
                    if (arguments.hasOwnProperty(p)) {
                        temp.push(arguments[p]);
                	}
                }
            }

            temp.reverse();
            temp.push(_options.logPrefix);
            temp.reverse();

            console.log.apply(console, temp);
        }
    }

    /**
     * COMMUNICATION HUB
     * 
     * The purpose of the hub is to assure indirect communication between elements of an application, i.e. modules,
     * as well as to tie up actions to certain communication events, for things like capturing data and saving them in a DB,
     * before they are forwarded to event listeners.
     * The idea is to broadcast an event along with some data, then capture the event, forward it to the Event Router, which checks
     * whether there are any actions assigned to it. If actions are found, then they are triggered (for instance saves passed data to a DB),
     * and once the actions have finished, the event is passed along with data, to one or more independent modules, which are listening the event.
     * 
     * 1. ModuleA 	--> 	registers "jump" listener in the hub
     * 2. TheHub 	--> 	creates an event interceptor for ModuleA and "jump" event
     * 3. ModuleB 	--> 	triggers "jump" event along with some data
     * 4. TheHub 	--> 	the interceptor detects the event and forwards it to the event router, which checks whether we have any actions
     * 						for that event, to be triggered before the event is passed on to a recipient
     * 5. TheHub	-->		once all actions have been triggered and completed, the event is passed back to the interceptor and the interceptor
     * 						executes an event handler of a recipient
     * 6. ModuleA	-->		responds to the "jump" event
     * 
     * ## <HOW-TO> ##
     * 		
     * 		var CommHub = new CommunicationHub();
     * 
     * 		function MyModule() {
     * 			this.jumpEventHandler(event, data) {
     * 				console.log(event); // "jump"
     * 				console.log(data.animal); // "rabbit"
     * 				console.log(data.name); // "Roger"
     * 			}
     * 		}
     * 
     * 		var myModule = new MyModule();
     * 		
     * 		CommHub.registerModule({
     * 				target: myModule,
     * 				handlers: { "jump" : "jumpEventHandler" }
     * 			});
     * 
     * 		CommHub.emit("jump", {animal: "rabbit", name: "Roger"});
     * 
     * 		// the log output from the listener will be: event: "jump", animal: "rabbit", name: "Roger"
     * 
     * ## </HOW-TO> ##
     * 
     * 
     * ## <HOW-TO using EventRouter> ##
     * 		
     * 		var CommHub = new CommunicationHub();
     * 
     * 		EventRouter.setRoutes({
     * 			"jump" : function (data, done) {
     * 				// here you can do with passed data whatever you want
     * 				// e.g. Assume we have DB class with save method which returns boolean.
     * 				// 		We can append "save" property, which would be a boolean resposne from the DB.save() method,
     * 				//		to tell the handler whether passed data has been successfuly saved in a database
     * 				data.saved = DB.save(data);
     * 
     * 				done(data);
     * 			}
     * 		});
     * 
     * 		function MyModule() {
     * 			this.jumpEventHandler(event, data) {
     * 				console.log(event);
     * 				console.log(data.animal);
     * 				console.log(data.name);
     * 				console.log(data.saved);
     * 			}
     * 		}
     * 
     * 		var myModule = new MyModule();
     * 		
     * 		CommHub.registerModule({
     * 				target: myModule,
     * 				handlers: { "jump" : "jumpEventHandler" }
     * 			});
     * 
     * 		CommHub.emit("jump", {animal: "rabbit", name: "Roger"});
     * 
     * 		// the log output from the listener will be: event: "jump", animal: "mouse", name: "Mickey", saved: true
     * 
     * ## </HOW-TO> ##
     * 
     * @module
     * @name 	CommunicationHub
     */
	function CommunicationHub() {

        var _modules 			= {}, // holds a list of registered modules
            _events 			= {}, // holds references to modules and interceptors, grouped by event name
            _interceptors 		= {}, // holds a list of all event interceptors
            _interceptorFactory = {}; // a placeholder for the interceptor factory

        /**
         * Returns a unique id generated on a basis of current time stamp + random number and prepended with a custom or default prefix.
         * 
         * @method 	generateUID
         * @param	{Srting} prefix		A string the ID is to be prefixed with. Default: 'uid_'
         * @private
         * @returns	{String}
         */
        function generateUID(prefix) {
            prefix = prefix || 'uid_';
            return prefix + '' + (new Date()).getTime() + '' + parseInt(Math.random() * 1000, 0);
        }

        /**
         * EventInterceptor constructor.
         * Interceptors are created in the format interceptor-per-event and they handle one event and one event handler.
         * 
         * @method	EventInterceptor
         * @param	{String} 	event		Name of the event to intercept.
         * @param	{Function} 	handler		Event handler.
         * @private
         */
        function EventInterceptor(module, event) {
            this.id 	= generateUID('eiid_');
            this.event 	= event;
            this.module	= module;
        }

        /**
         * A prototype method to be called to capture an event and either call its handler,
         * or forward it to the EventRouter and call a handler once routing is done.
         * 
         * @method 	interceptEvent
         * @param	{*}	data	Data sent along with an event, to be passed to a handler.
         */
        EventInterceptor.prototype.interceptEvent = function (data) {
            data = data || false;

            var _self 		= this,
                handlerName = this.module.handlers[this.event];

            try {
                // use EventRouter to trigger actions assigned to the event. Once that's done, trigger the event handler.
                EventRouter.route(this.event, data, function (alteredData) {
                    _self.module.target[handlerName].call(_self.module.target, _self.event, alteredData || data);
                });
            } catch (err) {
                // most likely EventRouter is not available
                _log('EventRouter not found.');

                // no EventRouter, so just call the handler
                this.module.target[handlerName].call(this.module.target, this.event, data);
            }
        };

        /**
         * A factory to facilitate creating new interceptors and triggering events on them.
         * 
         * @name _interceptorFactory
         * @type {Object}
         */
        _interceptorFactory = {

            /**
             * Instantiates a new EventInterceptor and saves the instance in an array of interceptors associated with the same event.
             * 
             * @method	create
             * @param	{String}	e			Event name.
             * @param	{Function} 	listener	Event listener.
             * @returns {EventInterceptor}
             */
            create : function (e, module) {
                _interceptors[e] = _interceptors[e] || [];
                _interceptors[e].push(new EventInterceptor(module, e));

                return _interceptors[e][_interceptors[e].length - 1];
            },

           	/**
           	 * Finds an array of event interceptors assigned to the event and triggers iterceptEvent method
           	 * of all the interceptors from the array.
           	 * 
           	 * @method	triggerEvent
           	 * @param	{String}	e		Event name.
           	 * @param	{*}			data	Data to be passed through to recipients.
           	 * @private
           	 */
            triggerEvent : function (e, data) {
                var i = -1,
                    eventInterceptors = _interceptors[e] || [];

                while (eventInterceptors[++i]) {
                    eventInterceptors[i].interceptEvent(data);
                }
            }
        };

        /**
         * Registers a module listening on events passed through as parameters.
         * 
         * @method	registerModule
         * @param	{Object}	params	Expected parameters:
         * 								- target	A reference to the module.
         * 								- listeners	An object containing event name{String}-handler{Function} pairs (e.g. { "myEvent" : myEventHandler })
         */
        this.registerModule = function (params) {
            var id 		= generateUID('mid_'),
                module 	= _modules[id] = params,
                e 		= null;

            module.id = id;

            // go through all handlers and group interceptors by event name
            for (e in module.handlers) {
                _events[e] = _events[e] || [];
                _events[e].push({
                    module_id 		: id,
                    interceptor_id	: _interceptorFactory.create(e, module).id
                });
            }
        };

        /**
         * An alias to _interceptorFactory.triggerEvent.
         * 
         * @method	emit
         * @param	{String}	e 		Event name.
         * @param	{*}			data	Data to be passed through to event hadlers/recipients.
         */
        this.emit = function (e, data) {
            _interceptorFactory.triggerEvent(e, data);
        };
    }

    // ensures singleton; to be published as CommunicationHub
    function CommHub() {
        _instance = _instance instanceof CommunicationHub ? _instance : new CommunicationHub(arguments); 
        return _instance;
    }

    // expose to the global scope
	global.CommunicationHub = CommHub;

}(GLOBAL || window, EventRouter));
