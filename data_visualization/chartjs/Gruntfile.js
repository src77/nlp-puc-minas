'use strict';
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            main: {
                files: [{
                    cwd: 'src',
                    src: '**',
                    dest: 'dist/',
                    expand: true
                }]
            },
            docker: {
                files: [
                {
                    cwd: 'src',
                    src: ['**','!file.csv'],
                    dest: 'docker/src/app',
                    expand: true
                },
                {
                    cwd: 'api',
                    src: ['**'],
                    dest: 'docker/src/api',
                    expand: true
                }, {
                    src: 'package.json',
                    dest: 'docker/',
                    expand: true
                },{
                    src: 'server.js',
                    dest: 'docker/src/',
                    expand: true
                }]
            }
        },
        clean: {
            dist: {
                src: ['dist/*','docker/package.json', 'docker/src/*.js','docker/src/*/*']
            }
        },
        watch: {
            html: {
                files: [
                    'src/*.html',
                ]
            },
            js: {
                files: [
                    'src/*.js'
                ]
            },
            css: {
                files: 'src/*.css'
            },
            livereload: {
                options: {
                    livereload: true
                },
                files: [
                    'src/*'
                ],
                tasks: ['clean', 'copy']
            }
        },
        connect: {
            server: {
                options: {
                    livereload: true,
                    // base: 'src/index.html',
                    port: 3000,
                    open: {
                        target: "http://localhost:3000/src/index.html"
                    }
                }
            }
        }


    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-connect-route');
    grunt.loadNpmTasks('grunt-serve');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('dist', ['clean', 'copy:main']);
    grunt.registerTask('docker', ['clean', 'copy:docker']);
    grunt.registerTask('serve', ['dist', 'connect', 'watch']);
};