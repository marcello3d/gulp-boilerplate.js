var gulp = require('gulp')

var clean = require('gulp-clean')
var livereload = require('gulp-livereload')

var jshint = require('gulp-jshint')
var watchify = require('gulp-watchify')
var uglify = require('gulp-uglify')
var streamify = require('gulp-streamify')
var imagemin = require('gulp-imagemin')
var autoprefixer = require('gulp-autoprefixer')
var csso = require('gulp-csso')
var htmlmin = require('gulp-htmlmin')
var bust = require('gulp-buster')

var HTTP_SERVER_PORT = 9000

var paths = {
    js: [
        // All JavaScript files (for syntax validation and linting)
        '*.js',
        'server/**/*.js',
        'client/js/**/*.js'
    ],
    client: {
        build: 'build/',
        html: {
            src:[
                'client/**/*.html'
            ],
            dest: 'build/'
        },
        browserify: {
            src: [
                'client/js/**/*.js',
                "!client/js/**/lib/**" // Don't bundle libs
            ],
            dest:'build/js/'
        },
        css: {
            src:[
                'client/css/**/*.css',
                "!client/css/**/lib/**" // Don't bundle libs
            ],
            dest:'build/css/'
        },
        images: {
            src:[
                'client/img/**/*'
            ],
            dest:'build/img/'
        }
    }
}
paths.fileHashFilename = 'manifest.json'
paths.fileHashFile = paths.client.build+'/'+paths.fileHashFilename
paths.fileHashes = [paths.client.build+'/**/*', '!'+paths.fileHashFile]


// Hack to enable configurable watchify watching
var watching = false
gulp.task('enable-watch-mode', function() { watching = true })

function markAsFailed(err) {
    console.error(err.stack)
    if (watching) {
        console.log("Continuing despite error... (watch mode)")
    } else {
        process.exit(1)
    }
}

// Browserify and copy js files
gulp.task('browserify', watchify(function scriptsTask(watchify) {
    return gulp.src(paths.client.browserify.src)
        .pipe(watchify({
            watch:watching
        }))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest(paths.client.browserify.dest))
        .on('error', markAsFailed)
}))

gulp.task('watchify', ['enable-watch-mode', 'browserify'])

// Validate JavaScript
gulp.task('lint-js', function(){
    return gulp.src(paths.js)
        .pipe(jshint())
        .pipe(jshint.reporter(require('jshint-stylish')))
        .pipe(jshint.reporter('fail'))
        .on('error', markAsFailed)
})


// Minify and copy all css
gulp.task('css', function() {
    return gulp.src(paths.client.css.src)
        .pipe(autoprefixer('last 5 version', 'safari 4', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
        .pipe(csso())
        .pipe(gulp.dest(paths.client.css.dest))
        .on('error', markAsFailed)
})

// Optimize and copy static images
gulp.task('images', function() {
    return gulp.src(paths.client.images.src)
        // Pass in options to the task
        .pipe(imagemin({optimizationLevel: 5}))
        .pipe(gulp.dest(paths.client.images.dest))
        .on('error', markAsFailed)
})


// Minify and copy html files
gulp.task('html', function() {
    return gulp.src(paths.client.html.src)
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(paths.client.html.dest))
        .on('error', markAsFailed)
})

// Generate hashes
gulp.task('hash-generation', function() {
    return gulp.src(paths.fileHashes)
        .pipe(bust(paths.fileHashFilename))
        .pipe(gulp.dest(paths.client.build))
})

// Run static HTTP server
gulp.task('static-server', function(next) {
    var http = require('http')
    var NodeStatic = require('node-static')

    var server = new NodeStatic.Server(paths.client.html.dest)
    var httpServer = http.createServer(function (request, response) {
        request.addListener('end', function () {
            server.serve(request, response)
        }).resume()
    }).listen(HTTP_SERVER_PORT, function() {
        console.log('DEVELOPMENT-ONLY file server listening: http://'+httpServer.address().address+":"+httpServer.address().port)
        next()
    })
})


// Rerun tasks when a file changes
gulp.task('watch', ['enable-watch-mode', 'build', 'validate'], function () {
    gulp.watch(paths.client.css.src, ['css'])
    gulp.watch(paths.client.images.src, ['images'])
    gulp.watch(paths.client.html.src, ['html'])
    gulp.watch(paths.js, ['lint-js'])
    gulp.watch(paths.fileHashes, ['hash-generation'])
    gulp.watch('gulpfile.js', function() {
        console.error("\nWarning! gulpfile.js has changed, but you'll need to restart gulp to see them\n")
    })
})

gulp.task('serve', ['watch', 'static-server', 'livereload-server'])


// Live reload server detects any changes in our build directory
gulp.task('livereload-server', function () {
    var server = livereload()
    gulp.watch(paths.client.build+'/**/*').on('change', function(file) {
        server.changed(file.path)
    })
})

// clean out built files
gulp.task('clean', function() {
    return gulp.src(paths.client.build, {read: false})
               .pipe(clean())
               .on('error', markAsFailed)
})

// Build only
gulp.task('build', ['browserify', 'css', 'html', 'images', 'hash-generation'])

// Build and validate
gulp.task('validate', ['lint-js'])

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['validate', 'build'])