var gulp = require('gulp');
var fs = require('fs');

// add require for tasks from all js files in gulp subfolder 
fs.readdirSync(__dirname + '/gulp').forEach(function (task) {
  require('./gulp/' + task);
});

gulp.task('build', ['js'])
gulp.task('watch', ['watch:js'])
gulp.task('dev', ['watch', 'dev:server'])