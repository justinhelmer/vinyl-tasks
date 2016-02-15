# vinyl-tasks
A `JavaScript` task runner using [Orchestrator](https://github.com/robrich/orchestrator) and [Vinyl](https://github.com/gulpjs/vinyl-fs) adapters. Works with [Gulp](http://gulpjs.com/).

[![npm package](https://badge.fury.io/js/vinyl-tasks.svg)](https://www.npmjs.com/package/vinyl-tasks)
[![node version](https://img.shields.io/node/v/vinyl-tasks.svg?style=flat)](http://nodejs.org/download/)
[![dependency status](https://david-dm.org/justinhelmer/vinyl-tasks.svg)](https://github.com/justinhelmer/vinyl-tasks)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/justinhelmer/vinyl-tasks/issues)
[![devDependency status](https://david-dm.org/justinhelmer/vinyl-tasks/dev-status.svg)](https://github.com/justinhelmer/vinyl-tasks)

Anyone who has used [Gulp](http://gulpjs.com/) knows of its power.

The truth is, `Gulp` is merely a wrapper around other libraries. The _real_ power lies in the [vinyl](https://github.com/gulpjs/vinyl-fs) filesystem adapter (which happens to have also been written by the [gulpjs](https://github.com/gulpjs) organization).

When combined with [orchestrator](https://github.com/robrich/orchestrator) to run tasks in maximum concurrency and manage events, some amazing things can be accomplished.

However, `Gulp` also comes with its share of limitations. Most importantly, there is no supported `node JS` interface. `Gulp` expects to be installed _globally_, and run via the `CLI`. This can be a _huge_ limitation when developing robust automation workflows.

It is also very difficult to pass run-time options to `Gulp` tasks without manually parsing command-line options, and arguably _impossible_ to chain reusable streams in a single pipeline for maximum performance (at least out-of-the-box).

Although some limitations will be addressed in [Gulp 4](https://github.com/gulpjs/gulp/milestones/gulp%204) (which will take on a new flavor), the `3.x` branch will remain tried and true, and has an abundance of community-built [plugins](http://gulpjs.com/plugins/) that can be used to accomplish some truly remarkable things.

As an alternative to `Gulp`, in an attempt to address some of the current limitations, `vinyl-tasks` was created. It supports everything `Gulp` supports, in a simplified interface with enhanced functionality.

Also, `vinyl-streams` is built on the same foundation and thus, the [learning curve](#transitioning-from-gulp) is a breeze.

## Installation

```bash
$ npm install --save-dev vinyl-tasks
```

## Usage

The `vinyl-tasks` interface consists of three main methods:

1. [create(task)](#createtask)
2. [filter(filterName, pattern, options)](#filterfiltername-pattern-options)
3. [pipeline(taskNames, options)](#pipelinetasknames-options)

> If looking for more information on how `vinyl-tasks` and [Gulp](https://github.com/gulpjs/) coexist, learn about how to make the [transition](#transitioning-from-gulp).

### create(task)

> Create a `task runner` for the given `task` object.

The `task` object contains all information necessary to define a `task`. Additionally, it **returns** a `task runner` that can be used any number of times, passing different [options](#options) to modify the behavior of the run.

The `task runner`, when invoked, returns a [Bluebird](http://bluebirdjs.com/docs/getting-started.html) promise that is _resolved_ or _rejected_ based on the success/failure of the `task` run.

Additionally, `tasks` that are set up to be [chainable](#taskchainable) can take advantage of the `vinyl-tasks` [pipeline](#pipelinetasknames-options) for maximum performance.

```js
const runner = tasks.create({
  name: 'something',
  callback: callback
});

runner(options)
    .then(function() {
      console.log('everything is done!');
    })
    .catch(function(err) {
      console.error('something messed up :-(');
      console.error(err);
    })
    .done();
```

> See the [single task example](#example-single-task) or [pipeline example](#example-pipeline) for discrete implementation details.

##### task.name

> _{string}_ - The unique `name` for identification. _(required)_

##### task.callback

> _{function}_ - The `callback` that when invoked, returns the `task function` for performing all operations related to the `task`. _(required)_

The returned `task function` is assumed to be _synchronous_. For the `task function` to be _asynchronous_, one of the following must hold true:

1. `task.callback` returns a `task function` that accepts a callback.
2. `task.callback` returns a `task function` that returns a promise.
3. `task.callback` returns a `task function` that returns a stream.

These rules are dictated by [orchestrator.fn](https://github.com/robrich/orchestrator#fn) and are cohesive with the [Gulp API](https://github.com/gulpjs/gulp/blob/master/docs/API.md#async-task-support).

Additionally, the `task` has the opportunity to be [chainable](#taskchainable) for use with `vinyl-tasks` [pipeline](#pipelinetasknames-options).

```js
tasks.create({
  name: 'some-sync',
  callback: someSyncCallback
});

function someSyncCallback(options) {
  return function() {
    doSyncThing();
  };
}

tasks.create({
  name: 'some-async',
  callback: someAsyncCallback
});

function someAsyncCallback(options) {
  return function(callback) {
    doAsyncThing(function() {
      callback();
    }); 
  };
}

tasks.create({
  name: 'some-promise',
  callback: somePromiseCallback
});

function somePromiseCallback(options) {
  return function() {
    return doPromiseThing().then(function() {
      console.log('Promise fulfilled!');
    });
  };
}

tasks.create({
  name: 'some-stream',
  callback: someStreamCallback
});

function someStreamCallback() {
  return function() {
    return vfs.src('**/*.foo.js').pipe(streamPlugin()).pipe(vfs.dest('build'));
  }
}
```

> See the [single task example](#example-single-task) or [pipeline example](#example-pipeline) for more detailed implementations.

##### task.chainable

> _{boolean}_ - At runtime, create a top-level `pipeline` for use with `vinyl-tasks` [pipeline](#pipelinetasknames-options). Defaults to `true`.

By default, all `tasks` registered with the [create](#createtask) interface are assumed to be `chainable`. A `chainable task` is an immutable pipeline that is invoked at runtime.

> [lazypipe](https://github.com/OverZealous/lazypipe) does an exceptional job at creating such pipelines.

A `chainable task` should **not** create a `vinyl` stream; the stream will be created automatically by `vinyl-tasks`. Instead, it should [filter](#filterfiltername-pattern-options) the incoming stream.

The following example illustrates the difference between implementing a `chainable task` and a `task` that is _not_ `chainable`:

```js
tasks.create({
  name: 'not-chainable',
  callback: notChainable,
  chainable: false
});

tasks.create({
  name: 'chainable',
  callback: chainable
  chainable: true // superfluous; 'chainable: true' is the default behavior.
});

function notChainable() {
  return function() {
    return vfs.src('**/*.foo.js') // could be swapped for gulp.src
        .pipe(streamPlugin())
        .pipe(vfs.dest('build')); // could be swapped for gulp.dest
  };
}

function chainable() {
  return lazypipe() // must return a lazy-evaluated stream
  
    // will filter from ['**/*', '!node_modules'] - @see filter(filterName, options)
    .pipe(tasks.filter('chainable.foo', '**/*.foo.js'))
    .pipe(streamPlugin)
    .pipe(vfs.dest, 'build')
}
```

> `chainable tasks` are most useful in larger [pipelines](#pipelinetasknames-options).

##### task.color

> The `color` to use when logging certain characteristics about the task.

Can be any `color` supported by [chalk](https://github.com/chalk/chalk). Defaults to `cyan`.

##### task.hooks

> A function that when invoked, returns an object containing `hooks` for tapping into the `vinyl-tasks` workflow.

Since `vinyl-tasks` can be used both _individually_ (using the `task runner` returned by [create](#createtask)) or in _sequence_ (using `vinyl-tasks` [pipeline](#pipelinetasknames-options), the `tasks` can be built in a _reusable_ fashion.

In order to perform common operations regardless of whether a `task` is run _individually_ or in a [pipeline](#pipelinetasknames-options), `hooks` have been established for tapping into the `vinyl-tasks` workflow.

The following demonstrates all of the possible `hooks` and their meanings:

```js
tasks.create({
  name: 'something',
  callback: callback,
  hooks: hooks
});

function hooks(options) {
  return {
    before: function() {
      console.log('I am doing something before the task starts');
    }
    
    done: function() {
      console.log('I am doing something after the task completes successfully');
    },
    
    /**
     * Provide the opportunity to prevent a task from running,
     * whether individually or when a part of a sequence.
     *
     * Should return `true` or `false` to validate the operation.
     * Additionally, can return a promise that should be fulfilled
     * with the value of `true` or `false`.
     */
    validate: function() {
      console.log('I am preventing the task from running');
      return false; // or return a promise
    }
  }
}
```

##### task.label

> The `label` to use when logging, to identify the task action.

For the following `task` configuration:

```js
task.create({
  name: 'something',
  callback: callback,
  label: 'the thing that things the thing'
});

```

...the resulting `STDOUT` would be:

```bash
Running the thing that things the thing...
Done
```

If not set, `label` will default to the `task` [name](#taskname):

```bash
Running something...
Done
```

### filter(filterName, pattern, options)

> Create a `filter` function that filters a `vinyl` stream when invoked. Additionally stores the `filter` in memory for use with [filter.restore](#filterrestorefiltername).

Uses [gulp-filter](https://github.com/sindresorhus/gulp-filter) to register a lazy-evaulated `filter` that is invoked at runtime. Useful in conjunction with creating [chainable tasks](#taskchainable); the `filter` can be used to limit the scope of a [pipeline](#pipelinetasknames-options), and then [restored](#filterrestorefiltername) afterwards for [chainability](#taskchainable).

The `filterName` should be _namespaced_. It is used to identify the `filter`, and all `tasks` share the same internal memory storage for `filters`. This name is also used for lookup when using [filter.restore](#filterrestorefiltername) later in the `task`.

The `pattern` and `options` arguments are dictated by [gulp-filter.filter](https://github.com/sindresorhus/gulp-filter#filterpattern-options).

```js
tasks.create({
  name: 'something',
  callback: callback
});

function callback() {
  return lazypipe()
    .pipe(tasks.filter('something.foo', '**/*.foo.js'))
    .pipe(streamPlugin)
    .pipe(vfs.dest, 'build');
}
```

#### filter.restore(filterName)

> Restore a `filter` that was created through the [filter](#filterfiltername-pattern-options) interface.

Assuming a [filter](#filterfiltername-pattern-options) was created for [chainability](#taskchainable), it is often useful to create the `filter` with [options.restore](https://github.com/sindresorhus/gulp-filter#optionsrestore) set to `true`. In doing so, a [chainable task](#taskchainable) can limit the scope of a [pipeline](#pipelinetasknames-options), and then restore it afterwards so subsequent `tasks` can assume the same incoming `vinyl` stream.

```js
tasks.create({
  name: 'something',
  callback: callback
});

function callback() {
  return lazypipe()
    
    // will filter from ['**/*', '!node_modules'], because task.chainable === true (default)
    .pipe(tasks.filter('something.foo', '**/*.foo.js', {restore: true}))
    .pipe(streamPlugin)
    .pipe(vfs.dest, 'build')
    
    // restores the stream to ['**/*', '!node_modules']
    .pipe(tasks.filter.restore('something.foo'))
}
```

> `filter.restore` does **not** sanity check that the `filter` exists.

### pipeline(taskNames, options)

> Run a single continuous pipeline of multiple `tasks`, by piping the `vinyl` stream from one `task` to the next.

Accepts an _{Array}_ of `task` [names](#taskname), and an _(object}_ of [options](#options) that are passed through the _entire_ `pipeline`.

`taskNames` can only contain the `task` [names](#taskname) for `tasks` that have been registered via the [create](#createtask) interface. Additionally, the registered `tasks` must all be [chainable](#taskchainable).

```js
tasks.pipeline(['task1', 'task2', 'task3'], options)
    .then(function() {
      console.log('everything is done!');
    })
    .catch(function(err) {
      console.error('something messed up :-(');
      console.error(err);
    })
    .done();
```

> For implementation details, see the [complete pipeline example](#example-pipeline).

## Options

When using the `task runner` returned by [create](#createtask), or when using the `vinyl-tasks` [pipeline](#pipelinetasknames-options), `options` can be passed to the interface at runtime to modify the behavior of a particular run. The `options` then become available to all [callbacks](#taskcallback) and [hooks](#taskhooks). Additionally, `vinyl-tasks` understands the following `options` internally and uses them internally at runtime:

### quiet

> _{boolean}_ - Suppress all output (suppress `STDOUT` and `STDERR`).

### verbose

> _{*}_ - Show more output. Can be `true`, `false`, or a _{Number}_ indicating the _verbosity level_. The higher the level, the more output is displayed.

## Transitioning from Gulp

To reiterate, [Gulp](http://gulpjs.com/) is a thin layer around [vinyl-fs](https://github.com/gulpjs/vinyl-fs) and [orchestrator](https://github.com/robrich/orchestrator).

Although `vinyl-tasks` does not use `Gulp` _directly_, it does not argue with the _philosophies_ of `Gulp`. In fact, `vinyl-tasks` **depends** on `Gulp`. Much of the module is built on the same principles and hard work done by the [Gulp organization](https://github.com/gulpjs/), as well as the community-driven [plugins](http://gulpjs.com/plugins/) that make `Gulp` so easy to use.

By **extending** the _functionality_ and _concepts_ of `Gulp` (and [orchestrator](https://github.com/robrich/orchestrator)), it is possible to take advantage of the power of these tools to do incredible things.

Therefore _"Transitioning from Gulp"_ is a bit of a misnomer, since `vinyl-tasks` is built on top of the same foundation.
 
To create a `"Gulp"` task (again, a misnomer) using the `vinyl-tasks` interface would mean to disable all of the extra functionality, and just take advantage of the `node` / [Bluebird](http://bluebirdjs.com/docs/getting-started.html) promise interface.

To illustrate, here is a rudimentary task written for `Gulp`:

```js
const gulp = require('gulp');

gulp.task(['something'], callback);

function callback() {
  doSyncThing();
}
```

.. and its usage:

```bash
$ gulp something
```

Here is the **same** tasks (and its usage), using the [create](#createtask) interface provided with `vinyl-tasks`:

```js
const tasks = require('vinyl-tasks');

const runner = tasks.create({
  name: 'something',
  callback: callback,
  chainable: false
});

// "options" not needed, just demonstrating that they can be used in any capacity at runtime
function callback(options) {
  return function() {
    if (options.wow) {
      doSyncThing();
    }
  };
}

// Usage
const options = {
  wow: 'you mean',
  i: 'can pass',
  runtime: 'options?'
};

runner(options)
    .then(function() {
      console.log('everything is done!');
    })
    .catch(function(err) {
      console.error('something messed up :-(');
      console.error(err);
    })
    .done();
```

**HOWEVER**, to _truly_ take advantage of the power of `vinyl-tasks`, consider tacking on the additional functionality, as demonstrated in the [single task example](#example-single-task) and [pipeline example](#example-pipeline).

## Example (single task)

The following example demonstrates all of the functionality in `vinyl-tasks`, for a **single task**. More detailed explanations of each block of code can be found in the related sections of documentation.

> Additionally, _multiple_ `tasks` can be run in a [single pipeline](#example-pipeline).

For an arbitrary `task`, called _"something"_:

```js
const gulpif = require('gulp-if');             // it is always useful to take advantage of `Gulp` plugins
const lazypipe = require('lazypipe');          // make a lazy pipeline for chainability
const streamPlugin = require('stream-plugin'); // arbitrary stream plugin
const tasks = require('vinyl-tasks');          // this module
const vfs = require('vinyl-fs');               // `gulp.src` and `gulp.dest` actually come from `vinyl-fs`

const runner = tasks.create({
  name: 'something',
  callback: callback,
  color: 'magenta',
  hooks: hooks,
  label: 'the thing that things the thing'
});

function callback(options) {
  return lazypipe()
      
      // will filter from ['**/*', '!node_modules']
      .pipe(task.filter('something.foo.js', '**/*.foo.js'))
      .pipe(gulpif, options.wow, streamPlugin) 
      .pipe(vfs.dest, 'build')
      
      // restores the stream to ['**/*', '!node_modules']
      .pipe(task.filter.restore('something.foo.js'));
}

function hooks(options) {
  return {
    before: function() {
      console.log('I am doing something before the task starts');
    }
    
    done: function() {
      console.log('I am doing something after the task completes');
    },
    
    validate: function() {
      console.log('I am preventing the task from running');
      return false; // or return a promise
    }
  }
}

// Usage
const options = {
  wow: 'you mean',
  i: 'can pass',
  runtime: 'options?'
};

runner(options)
    .then(function() {
      console.log('everything is done!');
    })
    .catch(function(err) {
      console.error('something messed up :-(');
      console.error(err);
    })
    .done();
```

## Example (pipeline)

The following example demonstrates how to run _multiple_ `tasks` in a _single_ [pipeline](#pipelinetasknames-options) using `vinyl-tasks`. More detailed explanations of each block of code can be found in the related sections of documentation.

> This example does not show the _full_ configuration/setup for each `task`. For more details on setting up a _single_ task, see the [single task example](#example-single-task).

```js
const tasks = require('vinyl-tasks');

tasks.create({
  name: 'task1',
  callback: callback1
});

tasks.create({
  name: 'task2',
  callback: callback2
});

tasks.create({
  name: 'task3',
  callback: callback3
});

// Usage
const options = {
  wow: 'you mean',
  i: 'can pass',
  runtime: 'options?'
};

// options get passed through entire pipeline to all task callbacks/hooks
tasks.pipeline(['task1', 'task2', 'task3'], options)
    .then(function() {
      console.log('everything is done!');
    })
    .catch(function(err) {
      console.error('something messed up :-(');
      console.error(err);
    })
    .done();
```

## Contributing

[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/justinhelmer/vinyl-tasks/issues)
[![devDependency status](https://david-dm.org/justinhelmer/vinyl-tasks/dev-status.svg)](https://github.com/justinhelmer/vinyl-tasks)

## License

The MIT License (MIT)

Copyright (c) 2016 Justin Helmer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

