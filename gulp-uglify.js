'use strict';

var through = require('through2');
var uglify = require('uglify-js');
var merge = require('deepmerge');
var BufferStreams = require('bufferstreams');
var streams = require('readable-stream');

module.exports = function(opt) {
    var generalOptions = merge(opt || {}, {
        fromString:true,
        output: {}
    });

    if (generalOptions.preserveComments === 'all') {
        generalOptions.output.comments = true;
    } else if (generalOptions.preserveComments === 'some') {
        // preserve comments with directives or that start with a bang (!)
        generalOptions.output.comments = /^!|@preserve|@license|@cc_on/i;
    } else if (typeof generalOptions.preserveComments === 'function') {
        generalOptions.output.comments = generalOptions.preserveComments;
    }

    return through.obj(function(file, encoding, callback) {
        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        var options = merge(generalOptions, {});

        if (options.outSourceMap === true) {
            options.outSourceMap = file.relative + '.map';
        }

        var mapFile;

        if (options.outSourceMap) {
            mapFile = file.clone();
            mapFile.path += '.map';
            this.push(mapFile);
        }

        function makeSourceMapBuffer(minified) {
            var sourceMap = JSON.parse(minified.map);
            sourceMap.sources = [ file.relative ];
            return new Buffer(JSON.stringify(sourceMap), 'utf8');
        }

        if (file.isBuffer()) {
            try {
                var minified = uglify.minify(file.contents.toString('utf8'), options);
                file.contents = new Buffer(minified.code, 'utf8');
                this.push(file);
                if (options.outSourceMap) {
                    mapFile.contents = makeSourceMapBuffer(minified);
                }
                return callback();
            } catch (e) {
                console.log("error", e);
                this.emit('error', e);
                callback();
            }
        }

        if (file.isStream()) {
            var stream = file.contents

            file.contents = new streams.PassThrough();
            this.push(file);
            if (options.outSourceMap) {
                mapFile.contents = new streams.PassThrough();
                this.push(mapFile);
            }
            stream.pipe(new BufferStreams(function(err, buf, cb) {
                var minified = uglify.minify(buf.toString('utf8'), options);
                file.contents.end(new Buffer(minified.code, 'utf8'));
                if (mapFile) {
                    mapFile.contents.end(makeSourceMapBuffer(minified));
                }
            }));

            return callback();
        }

        throw new Error("File is neither stream nor buffer. Are you running with {read:false} perhaps?");
    })
};
