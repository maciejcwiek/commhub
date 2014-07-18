(function (global, undefined) {

    var _instance 		 = {},
    	_eventActionsMap = {},
        _options 		 = {
            debug : true,
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

		var temp = arguments;

		if (typeof temp === 'object') {
	        var p = null;
	        temp = [];

            for (p in arguments) {
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
     * @method	setRoutes
     * @param	{Object}	routes	Event{String}:Function Name{String} pairs.
     */
    EventRouter.prototype.setRoutes = function (routes) {
        _eventActionsMap = routes;
    };

    /**
	 * Handles triggering appriopriate actions (functions) based on an event name the interceptor was created for.
	 * Passes through data sent along with the event. Triggers callback to the interceptor, once actions have been completed.
	 * Doesn't do anything if the event doesn't exist in the _eventActionsMap.
	 * 
	 * @method	route
	 * @param	{EventInterceptor}	interceptor
	 * @param	{*}					data
	 * @param	{Function}			callback
	 */
    EventRouter.prototype.route = function (event, data, callback) {
        try {
            var eventAction = _eventActionsMap[event];

            eventAction.call({}, data, function (fakeData) {
                callback(fakeData || data);
                log("Routing done for event:", event);
            });
        } catch (err) {
            // most likely the route was not found
            log("Route not found for event:", event);

            // so just bounce the data back to the interceptor
            callback(data);
        }
    };

    // ensures singleton; to be published as EventRouter
    function Router(opts) {
        _instance = _instance instanceof EventRouter ? _instance : new EventRouter(opts);
        return _instance;
    }

    // expose the instance to the global scope
    global.EventRouter = Router;

}(GLOBAL || window));
