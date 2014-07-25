(function (global, undefined) {

    var _instance        = {},
        _eventActionsMap = {},
        _options         = {
            debug : false,
            logPrefix : '[EventRouter]'
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
     * Provides event-action routing.
     * 
     * @class EventRouter
     */
    function EventRouter(options) {
        options = options || {};
        _options.debug = typeof options.verbose === 'boolean' ? options.verbose : false;
    }

    /**
     * Sets _eventActionsMap, which is an object containing a list of event-function pairs,
     * where the function is the action to be triggered when the event occurs.
     * 
     * @method  setRoutes
     * @param   {Object}    routes  Event{String}:Function Name{String} pairs.
     */
    EventRouter.prototype.setRoutes = function (routes) {
        _eventActionsMap = routes;
    };

    /**
     * Handles triggering appriopriate actions (functions) based on an event name the interceptor was created for.
     * Passes through data sent along with the event. Triggers callback to the interceptor, once actions have been completed.
     * Doesn't do anything if the event doesn't exist in the _eventActionsMap.
     * 
     * @method  route
     * @param   {EventInterceptor}  interceptor
     * @param   {*}                 data
     * @param   {Function}          callback
     */
    EventRouter.prototype.route = function (event, data, callback) {
        try {
            var eventAction = _eventActionsMap[event];

            if (eventAction && eventAction.disabled) {
                // routing for this particular event has been switched off
                log("Routing disabled for event:", event, "- invoking handler directly.");

                // so just bounce the data back to the interceptor
            	callback(data);

                return;
            }

            eventAction.call({}, data, function (alteredData) {
            	callback(alteredData || data);
                log("Routing done for event:", event);
            });
        } catch (err) {
            // most likely the route was not found
            log("Route not found for event:", event, "- invoking handler directly.");

            // so just bounce the data back to the interceptor
            callback(data);
        }
    };

    /**
     * Gives the ability to turn off/on routing for a particular event.
     * 
     * @method	toggleRoute
     * @param	{String}	event	Event name.
     * @param	{Boolean}	enable	A flag to enable/disable routing.
     */
    EventRouter.prototype.toggleRoute = function (event, enable) {
        enable = (typeof enable === 'boolean') ? enable : true;

        try {
            _eventActionsMap[event].disabled = !enable;
        } catch (err) {
            throw ("Can't disable routing for event: " + event + " - no route defined for this event.");
        }
    };

    /**
     * Clears all routes.
     * 
     * @method reset
     */
    EventRouter.prototype.reset = function () {
        _eventActionsMap = {};
    };

    // ensures singleton; to be published as EventRouter - DO WE NEED A SINGLETON??
    function Router(opts) {
        _instance = _instance instanceof EventRouter ? _instance : new EventRouter(opts);
        return _instance;
    }

    // expose the instance to the global scope
    global.EventRouter = Router;

}(GLOBAL));
