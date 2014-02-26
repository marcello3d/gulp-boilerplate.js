var gutil = require('gulp-util');
var merge = require('deepmerge');
var through = require('through2');
var watchify = require('watchify');

var cache = {};

module.exports = function(taskCallback) {

    function getBundle(file, opt) {
        var path = file.path;
        if (cache[path]) {
            return cache[path];
        }
        if (opt.watch !== false) {
            var bundle = watchify(opt);
            bundle.updateStatus = 'first';
            cache[path] = bundle;
            bundle.on('update', function() {
                bundle.updateStatus = 'updated';
                taskCallback(plugin);
            });
            return bundle;
        }
        return watchify.browserify(opt);
    }
    function plugin(opt) {
        return through.obj(function(file, enc, callback){
            if (file.isNull()) {
                this.push(file); // Do nothing if no contents
                return callback();
            }
            if (file.isStream()) {
                return callback(new gutil.PluginError('gulp-jshint', 'Streaming not supported'));
            }
            var options = merge(opt, { entries:'./'+file.relative, basedir:file.base })
            var bundle = getBundle(file, options);
            if (bundle.updateStatus) {
                gutil.log(
                    bundle.updateStatus === 'first' ? "Bundling" : "Rebundling",
                    gutil.colors.magenta(file.relative)
                );
                file = file.clone();
                delete bundle.updateStatus;
                file.contents = bundle.bundle(opt);
                file.contents.on('error', function(e) {
                    this.emit('error', e);
                });
                this.push(file);
            }
            callback();
        });
    }
    // Return wrapped Task
    return function() {
        return taskCallback(plugin);
    }
};