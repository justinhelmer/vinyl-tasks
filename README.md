# vinyl-tasks
An opinionated task runner using vinyl adapters. Works with Gulp.

[![npm package](https://badge.fury.io/js/vinyl-tasks.svg)](https://www.npmjs.com/package/vinyl-tasks)
[![node version](https://img.shields.io/node/v/vinyl-tasks.svg?style=flat)](http://nodejs.org/download/)
[![dependency status](https://david-dm.org/justinhelmer/vinyl-tasks.svg)](https://github.com/justinhelmer/vinyl-tasks)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/justinhelmer/vinyl-tasks/issues)
[![devDependency status](https://david-dm.org/justinhelmer/vinyl-tasks/dev-status.svg)](https://github.com/justinhelmer/vinyl-tasks)

Anyone who has used `[Gulp](http://gulpjs.com/)` knows of its power.

The truth is, `Gulp` is merely a wrapper around other libraries. The _real_ power lies in the [vinyl](https://github.com/gulpjs/vinyl-fs) adapter (which happens to have also been written by the [gulpjs](https://github.com/gulpjs) organization). When combined with [orchestrator](https://github.com/robrich/orchestrator) to run tasks in maximum concurrency and manage events, some amazing things can be accomplished.

However, `Gulp` also comes with its share of limitations. Most importantly, there is no supported `node JS` interface. `Gulp` expects to be installed _globally_, and run via the `CLI`. This can be a _huge_ limitation when developing robust automation workflows.

It is also very difficult to pass run-time options to `Gulp` tasks without manually parsing command-line options, and arguably impossible to chain reusable streams in a single pipeline for maximum performance (at least out-of-the-box).

Although many of the limitations will be addressed in [Gulp 4](https://github.com/gulpjs/gulp/milestones/gulp%204) which will take on a new flavor, the `3.x` branch isn't going away any time soon, and has an abundance of community-built [plugins](http://gulpjs.com/plugins/) that can be used to accomplish some truly remarkable things.

As an alternative to `Gulp`, in an attempt to address some of the current limitations, `vinyl-tasks` was created. It supports everything `Gulp` supports, in a simplified interface with enhanced functionality.

Also, `vinyl-streams` is built on the same foundation and thus, the [learning curve](#transitioning-from-gulp) is a breeze.

## Installation

```bash
$ npm install --save-dev vinyl-tasks
```

## Usage

The `vinyl-tasks` interface consists of three main methods:

1. [create(task)](#createtask)
2. [filter(name, source, options)](#filtername-source-options)
3. [pipeline(taskNames, options)](#pipelinetasknames-options)

> If looking for more information on how `vinyl-tasks` and [Gulp](https://github.com/gulpjs/) coexist, learn about how to make the [transition](#transitioning-from-gulp).

### create(task)

> Create a task runner for the given `task` object.

The `task` object contains all information necessary to define a `task`. Additionally, it **returns** a `task runner` that can be used any number of times, passing different [options](#options) to modify the behavior of the run.

The `task runner`, when invoked, returns a [Bluebird](http://bluebirdjs.com/docs/getting-started.html) promise that is resolved or rejected based on the success/failure of the `task` run.

Additionally, `tasks` that are set up to be [chainable](#taskchainable) can take advantage of the `vinyl-tasks` [pipeline](#pipeline) for maximum performance.

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

> _{string}_ - The unique name for identification. _(required)_

##### task.callback

> _{string}_ - The callback for performing all operations related to the `task`. _(required)_

The provided callback is assumed to be _synchronous_. To make the callback _asynchronous_, one of the following must hold true:

1. The callback itself accepts a callback.
2. The callback returns a promise.
3. The callback returns a stream.

These rules are dictated by [orchestrator](https://github.com/robrich/orchestrator) and are cohesive with [gulp](https://github.com/gulpjs/gulp/blob/master/docs/API.md#async-task-support).

Additionally, if a [lazy](https://github.com/OverZealous/lazypipe) pipeline is returned, the `task` has the opportunity to be [chainable](#taskchainable).

```js
tasks.create({
  name: 'some-sync',
  callback: someSync
});

tasks.create({
  name: 'some-async',
  callback: someAsync
});

tasks.create({
  name: 'some-promise',
  callback: somePromise
});

tasks.create({
  name: 'some-stream',
  callback: someStream
});

function someSync(options) {
  return function() {
    doSyncThing();
  };
}

function someAsync(options) {
  return function(callback) {
    doAsyncThing(function() {
      callback();
    }); 
  };
}

function somePromise(options) {
  return function() {
    return doPromiseThing().then(function() {
      console.log('Promise fulfilled!');
    });
  };
}

function someStream() {
  return function() {
    return vfs.src('**/*.foo.js').pipe(streamPlugin()).pipe(vfs.dest('build'));
  }
}
```

> See the [single task example](#example-single-task) or [pipeline example](#example-pipeline) for more detailed implementations.

##### task.chainable

> _{boolean}_ - At runtime, create a top-level pipeline for use with the `vinyl-task` [pipeline](#pipeline) functionality. Defaults to `true`.

By default, all `tasks` registered with the [create](#createtask) interface are assumed to be `chainable`. A `chainable task` is an immutable pipeline that is invoked at runtime.

Specifically, [lazypipe](https://github.com/OverZealous/lazypipe) does an exceptional job at creating such pipelines.

A `chainable task` should **not** create a `vinyl` stream; the stream will be created automatically by `vinyl-tasks`. Instead, it should [filter](#filter) the incoming stream.

The following example illustrates the difference between implementing a task that is either `chainable` or _not_ `chainable`:

```js
tasks.create({
  name: 'not-chainable',
  callback: notChainable,
  chainable: false
});

tasks.create({
  name: 'chainable',
  callback: chainable
});

function notChainable() {
  return function() {
    return vfs.src('**/*.foo.js')                  // could be swapped for gulp.src
        .pipe(streamPlugin())
        .pipe(vfs.dest('build'));                  // could be swapped for gulp.dest
  };
}

function chainable() {
  return lazypipe()                                               // must return a lazy-evaluated stream
    .pipe(tasks.filter('mytask', '**/*.foo.js', {restore: true})) // will filter from ['**/*', '!node_modules']
    .pipe(streamPlugin)
    .pipe(vfs.dest, 'build')
    .pipe(tasks.filter.restore('mytask'))                         // restores the stream to ['**/*', '!node_modules']
}
```

> `chainable` tasks are most useful in larger [pipelines](#pipelinetasknames-options).

##### task.color

> The color to use when logging certain characteristics about the task.

Can be any color supported by [chalk](https://github.com/chalk/chalk. Defaults to `cyan`.

##### task.hooks

> A function that when invoked, returns an object containing `hooks` for tapping into the tasks workflow.

Since `vinyl-tasks` can be used both _individually_ (using the `task runner` returned by [create](#createtask)) or in _sequence_ (using `vinyl-tasks` [pipeline](#pipelinetaskNames-options), the `tasks` can be built in a _reusable_ fashion. In order to perform common operations regardless of whether or not a `task` is run _individually_ or in a [pipeline](#pipelinetaskNames-options), `hooks` have been established for `vinyl-tasks`.

The following illustrates all of the possible `hooks` and their meanings:

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
      return false;        // or return a promise
    }
  }
}
```

##### task.label

> The label to use when logging to identify the task action.

Defaults to the `task` [name](#taskname).

Assuming that `task.label` is `the thing that things the thing`, The resulting `STDOUT` would be:

```bash
Running the thing that things the thing...
Done
```

### filter(name, pattern, options)

> Create a filter function that filters a `vinyl` stream when invoked. Additionally stores the filter in memory for use with [filter.restore](#filterrestorename).

Uses [gulp-filter](https://github.com/sindresorhus/gulp-filter) to register a lazy-evaulated filter that is invoked at runtime. Useful in conjunction with creating [chainable tasks](#taskchainable); the filter can be used to limit the scope of a [pipeline](#pipelinetasknames-options), and then [restored](#filterrestorename) afterwards for [chainability](#taskchainable).

The `name` of the filter should be namespaced; all tasks share the same internal memory storage for retrieval later in the pipeline via [filter.restore](#filterrestorename).

The `pattern` and `options` arguments are dictated by [gulp-filter.filter](https://github.com/sindresorhus/gulp-filter#filterpattern-options).

```js
tasks.create({
  name: 'something',
  callback: callback
});

function callback() {
  return lazypipe()
    .pipe(tasks.filter('mytask', '**/*.foo.js'))
    .pipe(plugin)
    .pipe(vfs.dest, 'build');
}
```

#### filter.restore(name)

> Restore a filter that was created through the [filter](#filtername-source-options) interface. Does not sanity check that the filter exists.

Assuming a [filter](#filtername-pattern-options) was created for [chainability](#taskchainable), it is often useful to create said filter with [options.restore](https://github.com/sindresorhus/gulp-filter#optionsrestore) set to `true`. In doing so, a [chainable](#taskchainable) task can limit the scope of a [pipeline](#pipelinetasknames-options), and then restore it afterwards so subsequent tasks can assume the same incoming stream.

```js
tasks.create({
  name: 'something',
  callback: callback
});

function callback() {
  return lazypipe()
    .pipe(tasks.filter('mytask', '**/*.foo.js', {restore: true}))   // will filter from ['**/*', '!node_modules']
    .pipe(streamPlugin)                                             // perform some arbitrary action
    .pipe(vfs.dest, 'build')
    .pipe(tasks.filter.restore('mytask'))                           // restores the stream to ['**/*', '!node_modules']
}
```

> See [task.chainable](#taskchainable) or the [examples](#example-single-task) for further implementation details.

### pipeline(taskNames, options)

> Run a single continuous pipeline of multiple `tasks`, by piping the result stream from one `task` to the next.

Accepts an _{Array}_ of `task` [names](#taskname), and an _(object}_ of [options](#options) that are passed through the _entire_ pipeline.

`taskNames` can only contain the `task` [names](#taskname) for `tasks` that have been registered via the [create](#create) interface. Additionally, the registered `tasks` must all be [chainable](#taskchainable).

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

When using the `task runner` returned by [create](#createtask), or when using the [pipeline](#pipelinetasknames-options) runner, `options` can be passed to the interface at runtime to modify the behavior of a particular run. The `options` then become available to all [callbacks](#taskcallback) and [hooks](#taskhooks). Additionally, `vinyl-tasks` understands the following `options` internally and uses them at runtime:

### quiet

> _{boolean}_ - Suppress all output (suppress `STDOUT` and `STDERR`).

### verbose

> _{*}_ - Show more output. Can be `true`, `false`, or a _{Number}_ indicating the _verbosity level_. The higher the level, the more output is displayed.

## Transitioning from Gulp

To reiterate, [Gulp](http://gulpjs.com/) is a thin layer around [vinyl-fs](https://github.com/gulpjs/vinyl-fs) and [orchestrator](https://github.com/robrich/orchestrator).

Although `vinyl-tasks` does not use `Gulp` _directly_, it does not argue with the _philosophies_ of `Gulp`. In fact, `vinyl-tasks` **loves** `Gulp`. Much of the module is built on the same principles and hard work done by the [Gulp organization](https://github.com/gulpjs/), as well as the community-driven [plugins](http://gulpjs.com/plugins/) that make `Gulp` so easy to use.

By **extending** the _functionality_ and _concepts_ of `Gulp` (and [orchestrator](https://github.com/robrich/orchestrator)), it is possible to take advantage of their power to do incredible things.

Therefore `"Transitioning from Gulp"` is a bit of a misnomer, since `vinyl-tasks` is built on top of the same foundation.
 
To create a `"Gulp"` task (again, a misnomer) using `vinyl-tasks` would be to simply disable all of the extra functionality, and just take advantage of the `node` / [Bluebird](http://bluebirdjs.com/docs/getting-started.html) promise interface.

To illustrate, here is a task written for `Gulp`:

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

const sync = tasks.create({
  name: 'something',
  callback: callback,
  chainable: false
});

// Usage
const options = {
  wow: 'you mean',
  i: 'can pass',
  runtime: 'options?'
};

// "options" not needed, just demonstrating that they can be used in any capacity at runtime
function callback(options) {
  return function() {
    if (options.wow) {
      doSyncThing();
    }
  };
}
```

**HOWEVER**, to _truly_ take advantage of the power of `vinyl-tasks`, consider tacking on the additional functionality, as demonstrated in the [single task example](#example-single-task) and [pipeline example](#example-pipeline).

## Example (single task)

The following example demonstrates all of the functionality in `vinyl-tasks`, for a **single task**.

> Additionally, _multiple_ `tasks` can be run in a [single pipeline](#example-pipeline).

For an arbitrary `task`, called `"something"`:

```js
const gulpif = require('gulp-if');       // it is always useful to take advantage of `Gulp` plugins
const lazypipe = require('lazypipe');    // make a lazy pipeline for chainability
const plugin = require('stream-plugin'); // arbitrary stream plugin
const tasks = require('vinyl-tasks');    // this module
const vfs = require('vinyl-fs');         // demonstrating that `gulp.src` and `gulp.dest` actually come from `vinyl-fs`

const runner = tasks.create({
  name: 'something',
  callback: callback,
  color: 'magenta',
  hooks: hooks,
  label: 'the thing that things the thing'
});

function callback(options) {
  return lazypipe()
      .pipe(task.filter('something.foo.js', '**/*.foo.js'))   // will filter from ['**/*', '!node_modules']
      .pipe(gulpif, options.wow, plugin) 
      .pipe(vfs.dest, 'build')
      .pipe(task.filter.restore('something.foo.js'));         // restores the stream to ['**/*', '!node_modules']
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
      return false;        // or return a Bluebird promise
    }
  }
}
```

## Example (pipeline)

The following example demonstrates how to run _multiple_ `tasks` in a _single_ [pipeline](#pipelinetasknames-options) using `vinyl-tasks`.

> This example does not show the _full_ configuration/setup for each task. For more details on setting up a _single_ task, see the corresponding [example](#example-single-task).

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

