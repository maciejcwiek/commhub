(function (global, undefined) {

    var _instance = {}, // a placeholder for an instance of CommunicationHub class
        _modules  = {}, // holds a list of registered modules
        _events   = {}, // holds references to modules and interceptors, grouped by event name
        _router   = {}, // assigned EventRouter instance
        _options  = {
            debug : false,
            logPrefix : '[CommunicationHub]'
        };

    /**
     * Custom logging function. Outputs logs if _options.debug is enabled.
     *
     * @function log
     * @private
     */
    function log() {
        if (!_options.debug) { return; }

        var args = arguments;

        if (typeof args === 'object') {
            var p = null;
            args = [];

            for (p in arguments) {
                if (arguments.hasOwnProperty(p)) {
                    args.push(arguments[p]);
                }
            }
        }

        args.reverse();
        args.push(_options.logPrefix);
        args.reverse();

        console.log.apply(console, args);
    }

    /**
     * Returns a unique id generated on a basis of current time stamp + random number and prepended with a custom or default prefix.
     *
     * @function generateUID
     * @param   {Srting} prefix     A string the ID is to be prefixed with. Default: 'uid_'
     * @private
     * @returns {String}
     */
    function generateUID(prefix) {
        prefix = prefix || 'uid_';
        return prefix + '' + (new Date()).getTime() + '' + parseInt(Math.random() * 1000, 0);
    }

    /**
     * A utility function, checking whether the object is an instance of EventRouter class.
     *
     * @function isRouter
     * @param   {Object}
     * @private
     * @returns {Boolean}
     */
    function isRouter(obj) {
        return ( (obj instanceof EventRouter) || (obj && obj.constructor && obj.constructor.name === 'EventRouter') );
    }

    /**
     * EventInterceptor constructor.
     * Interceptors are created in the format interceptor-per-event and they handle one event and one event handler.
     *
     * @class EventInterceptor
     * @param   {String}    event       Name of the event to intercept.
     * @param   {Function}  handler     Event handler.
     * @private
     */
    function EventInterceptor(module, event) {
        this.id     = generateUID('eiid_');
        this.event  = event;
        this.module = module;
    }

    /**
     * A prototype method to be called to capture an event and either call its handler,
     * or forward it to the EventRouter and call a handler once routing is done.
     *
     * @method  interceptEvent
     * @param   {*} data    Data sent along with an event, to be passed to a handler.
     */
    EventInterceptor.prototype.interceptEvent = function (data) {
        data = data || false;

        var self        = this,
            handlerName = this.module.handlers[this.event];

        try {
            log('Attempting to route event:', this.event, '[module: ' + this.module.id + ']');

            // use EventRouter to trigger actions assigned to the event. Once that's done, trigger the event handler.
            _router.route(this.event, data, function (alteredData) {
                self.module.target[handlerName].call(self.module.target, self.event, alteredData || data);
            });
        } catch (err) {
            // most likely EventRouter is not available
            log('EventRouter not found. Triggering handler for event:', this.event, '[module: ' + this.module.id + ']', err.message);

            // no EventRouter, so just call the handler
            this.module.target[handlerName].call(this.module.target, this.event, data);
        }
    };

    /**
     * A factory to facilitate creating new interceptors and triggering events on them.
     *
     * @mixin interceptorFactory
     */
    var interceptorFactory = {

        /**
         * Holds a list of all event interceptors. To be accessed from within the factory only.
         *
         * @type {Object}
         * @name _interceptors
         */
        _interceptors : {},

        /**
         * Instantiates a new EventInterceptor and saves the instance in an array of interceptors associated with the same event.
         *
         * @method  create
         * @param   {String}    e           Event name.
         * @param   {Function}  listener    Event listener.
         * @returns {EventInterceptor}
         */
        create : function (e, module) {
            this._interceptors[e] = this._interceptors[e] || [];
            this._interceptors[e].push(new EventInterceptor(module, e));

            log('Successfully created EventInterceptor for event:', e, '[module: ' + module.id + ']');

            return this._interceptors[e][this._interceptors[e].length - 1];
        },

        /**
         * Finds an array of event interceptors assigned to the event and triggers iterceptEvent method
         * of all the interceptors from the array.
         *
         * @method  invokeInterceptors
         * @param   {String}    e       Event name.
         * @param   {*}         data    Data to be passed through to recipients.
         */
        invokeInterceptors : function (e, data) {
            var i = -1,
                eventInterceptors = this._interceptors[e] || [];

            if (!this._interceptors[e]) {
                log("No event interceptors found for event:", e);
                return;
            }

            while (eventInterceptors[++i]) {
                eventInterceptors[i].interceptEvent(data);
            }
        },

        /**
         * Removes one interceptor by its id.
         *
         * @method removeInterceptor
         * @param  id	Interceptor's id.
         */
        removeInterceptor : function (id) {
            var event = null;

            for (event in this._interceptors) {
                if (this._interceptors.hasOwnProperty(event)) {
                    var i = -1;

                    while (this._interceptors[event][++i]) {
                        var interceptor = this._interceptors[event][i];

                        if (interceptor.id === id) {
                            try {
                                delete this._interceptors[event][i];
                                log('Interceptor removed succesfully.', interceptor.event, interceptor.id);
                            } catch (err) {
                                log('Can\'t remove interceptor', err);
                            }
                        }
                    }
                }
            }
        },

        /**
         * Removes all interceptors.
         *
         * @method removeAllInterceptors
         */
        removeAllInterceptors : function () {
            var event = null;

            for (event in this._interceptors) {
                if (this._interceptors.hasOwnProperty(event)) {
                    try {
						delete this._interceptors[event];
                    } catch (err) {
                        log('Can\'t remove interceptor', err);
                    }
                }
            }
        }
    };

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
     * 1. ModuleA   -->     registers "jump" listener in the hub
     * 2. TheHub    -->     creates an event interceptor for ModuleA and "jump" event
     * 3. ModuleB   -->     triggers "jump" event along with some data
     * 4. TheHub    -->     the interceptor detects the event and forwards it to the event router, which checks whether we have any actions
     *                      for that event, to be triggered before the event is passed on to a recipient
     * 5. TheHub    -->     once all actions have been triggered and completed, the event is passed back to the interceptor and the interceptor
     *                      executes an event handler of a recipient
     * 6. ModuleA   -->     responds to the "jump" event
     *
     * @example
     *      var CommHub = new CommunicationHub();
     *
     *      function MyModule() {
     *          this.jumpEventHandler(event, data) {
     *              console.log(event); // "jump"
     *              console.log(data.animal); // "rabbit"
     *              console.log(data.name); // "Roger"
     *          }
     *      }
     *
     *      var myModule = new MyModule();
     *
     *      CommHub.registerModule({
     *              target: myModule,
     *              handlers: { "jump" : "jumpEventHandler" }
     *          });
     *
     *      CommHub.emit("jump", {animal: "rabbit", name: "Roger"});
     *
     *      // the log output from the listener will be: event: "jump", animal: "rabbit", name: "Roger"
     *
     * @example
     *      // using EventRouter
     *
     *      var Router  = new EventRouter()
     *          CommHub = new CommunicationHub({router: Router});
     *
     *      Router.setRoutes({
     *          "jump" : function (data, done) {
     *              // here you can do with passed data whatever you want
     *              // e.g. Assume we have DB class with save method which returns boolean.
     *              //      We can append "save" property, which would be a boolean resposne from the DB.save() method,
     *              //      to tell the handler whether passed data has been successfuly saved in a database
     *              data.saved = DB.save(data);
     *
     *              done(data);
     *          }
     *      });
     *
     *      function MyModule() {
     *          this.jumpEventHandler(event, data) {
     *              console.log(event);
     *              console.log(data.animal);
     *              console.log(data.name);
     *              console.log(data.saved);
     *          }
     *      }
     *
     *      var myModule = new MyModule();
     *
     *      CommHub.registerModule({
     *              target: myModule,
     *              handlers: { "jump" : "jumpEventHandler" }
     *          });
     *
     *      CommHub.emit("jump", {animal: "rabbit", name: "Roger"});
     *
     *      // the log output from the listener will be: event: "jump", animal: "mouse", name: "Mickey", saved: true
     *
     * @class   CommunicationHub
     */
    function CommunicationHub(options) {
        options = options || {};

        _options.debug = (typeof options.verbose === 'boolean') ? options.verbose : false;

        if (options.eventRouter) {
            this.useRouter(options.eventRouter);
        }
    }

    /**
     * Registers a module listening on events passed through as parameters.
     *
     * @method  registerModule
     * @param   {Object}    params  Expected parameters:
     *                              - target    A reference to the module.
     *                              - listeners An object containing event name{String}-handler{Function} pairs (e.g. { "myEvent" : myEventHandler })
     */
    CommunicationHub.prototype.registerModule = function (params) {
        var id      = generateUID('mid_'),
            module  = _modules[id] = params,
            e       = null;

        module.id = id;
        module.target.__id = id;

        // go through all handlers, create event interceptors and group them by event name
        for (e in module.handlers) {
            _events[e] = _events[e] || {};
            _events[e] = {
                module_id       : id,
                interceptor_id  : interceptorFactory.create(e, module).id
            };
        }

        return true;
    };

    /**
     * Deregisters module by event name. Removes associated event interceptors and mid-eiid details.
     *
     * @method deregisterModule
     * @param   {Object}    params  Expected parameters:
     *                              - target    A reference to the module.
     *                              - events 	An array of event names for which event interceptors will be removed.
     */
    CommunicationHub.prototype.deregisterModule = function (params) {
        var events = params.events,
            mid    = params.target.__id,
            i      = 0,
            e      = events[i];

        while (e) {
            interceptorFactory.removeInterceptor(_events[e].interceptor_id);
            delete _events[e];

            i += 1;
            e = events[i];
        }
    };

    /**
     * An alias to interceptorFactory.triggerEvent.
     *
     * @method  emit
     * @param   {String}    e       Event name.
     * @param   {*}         data    Data to be passed through to event hadlers/recipients.
     */
    CommunicationHub.prototype.emit = function (e, data) {
        interceptorFactory.invokeInterceptors(e, data);
    };

    /**
     * Assigns a router to the hub.
     *
     * @method  useRouter
     * @param   {Object}    router  An instance of EventRouter class.
     */
    CommunicationHub.prototype.useRouter = function (router) {
        if (isRouter(router)) {
            _router = router;
        } else {
            throw ('Argument is not an instance of EventRouter class.');
        }
    };

    /**
     * Resets the hub to it's initial state.
     *
     * @method  reset
     */
    CommunicationHub.prototype.reset = function () {
        _modules = {};
        _events = {};
        _router = {};
        interceptorFactory.removeAllInterceptors();
    };

    // ensures singleton; to be published as CommunicationHub - DO WE NEED A SINGLETON??
    function CommHub(opts) {
        _instance = _instance instanceof CommunicationHub ? _instance : new CommunicationHub(opts);
        return _instance;
    }

    // expose the instance to the global scope
    global.CommunicationHub = CommHub;

}(
    (function () {
        if (typeof GLOBAL != 'undefined') return GLOBAL;
        return window;
    })()
));
