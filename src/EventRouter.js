(function (global, undefined) {

    var _eventActionsMap = {},
        _options 		 = {
            debug : true,
            logPrefix : '[EventRouter]'
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
     * Provides event-action routing.
     */
    var EventRouter = {

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
        route : function (event, data, callback) {
            try {
                var eventAction = _eventActionsMap[event];

                eventAction.call({}, data, function (fakeData) {
                    callback(fakeData || data);
                });
            } catch (err) {
                // most likely the route was not found
                _log("Route not found for event:", event);
                
                // so just bounce the data back to the interceptor
                callback(data);
            }
        },

        /**
         * Sets _eventActionsMap, which is an object containing a list of event-function pairs,
         * where the function is the action to be triggered when the event occurs.
         * 
         * @method	setRoutes
         * @param	{Object}	routes	Event:Function pairs.
         */
        setRoutes : function (routes) {
            _eventActionsMap = routes;
        }
    };

    global.EventRouter = EventRouter;

}(GLOBAL || window));