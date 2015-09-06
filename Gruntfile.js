module.exports = function(grunt) {

    var cfg = {
		pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                validthis: true
            },
            test: {
                src: ['src/*']
            }
        },
        jsdoc: {
            dist : {
                src: ['src/*.js'],
                options: {
                    destination: 'docs'
                }
            }
        },
		uglify: {
            dynamic_mappings: {
                files: [{
                    expand: true,
                    cwd: 'src',
                    src: ['*.js'],
                    dest: 'build/js',
                    ext: '.min.js'
                }]
            }
		},
        jasmine_node: {
            options: {
            	forceExit: true,
      			match: '.',
			    matchall: false,
      			extensions: 'js',
      			specNameMatcher: 'spec',
                helperNameMatcher: 'helper'
            },
            all: ['spec/']
        },
        watch: {
            scripts: {
                files: 'src/*.js',
                tasks: ['jshint', 'uglify'],
                options: {
                    debounceDelay: 1000
                }
            }
        }
	};

	// Project configuration.
	grunt.initConfig(cfg);

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');

    // load jshint plugin
    grunt.loadNpmTasks('grunt-contrib-jshint');

	// load jasmine plugin
    grunt.loadNpmTasks('grunt-jasmine-node');

    // load watch plugin
    grunt.loadNpmTasks('grunt-contrib-watch');

    // load jsdoc documenting plugin
    // grunt.loadNpmTasks('grunt-jsdoc');

    // Default task(s).
	grunt.registerTask('default', ['jshint', 'jasmine_node', 'uglify']);
};
