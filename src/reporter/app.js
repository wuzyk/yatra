var Value = require('basis.data').Value;
var Expression = require('basis.data.value').Expression;
var DataObject = require('basis.data').Object;
var Node = require('basis.ui').Node;
var runner = require('core.runner');
var toc = require('./module/toc/index.js');
var testDetails = require('./module/test-tree/index.js');
var rootTestSuite = new DataObject({
  getChildNodesDataset: function(){
    // stub method
  }
});

function findTest(test, filename){
  if (test.data.filename_ === filename)
    return test;

  if (test.childNodes)
    for (var i = 0, child; child = test.childNodes[i]; i++)
    {
      var res = findTest(child, filename);
      if (res)
        return res;
    }
}

// table of content setup
toc.addHandler({
  delegateChanged: function(){
    var cursor = this;

    while (!cursor.data.filename_ && cursor.root.parentNode)
      cursor = cursor.root.parentNode;

    location.hash = '#' + (
      cursor.root.parentNode && cursor.data.filename_
        ? cursor.data.filename_
        : ''
    );
  },
  childNodesModified: function(){
    runner.loadTests(basis.array(this.childNodes));
  }
});
toc.selection.addHandler({
  itemsChanged: function(selection){
    this.setDelegate(selection.pick());
  }
}, testDetails);

// content section setup
testDetails.selection.addHandler({
  itemsChanged: function(selection){
    var selected = selection.pick();
    if (selected)
      this.setDelegate(selected.root);
  }
}, toc);

var view = new Node({
  template: resource('./template/view.tmpl'),
  action: {
    reset: function(){
      toc.setDelegate(rootTestSuite);
    },
    run: function(){
      runner.run();
    }
  },
  binding: {
    // subview
    toc: toc,
    tests: testDetails,

    runnerState: new Expression(
      runner.state,
      runner.count.total,
      runner.count.fault,
      runner.count.left,
      function(state, total, fault, left){
        if (fault)
          return 'fault';
        if (state != 'running' && total && !left)
          return 'ok';
        return state;
      }
    ),

    // values
    name: Value.from(rootTestSuite, 'update', 'data.name'),
    time: runner.time.as(function(val){
      return (val / 1000).toFixed(1);
    }),
    total: runner.count.total,
    assert: runner.count.assert,
    left: runner.count.left,
    done: runner.count.done
  }
});

module.exports = {
  loadTests: function(data, autorun){
    if (Array.isArray(data))
      data = { test: data };

    var rootTest = require('core.test').create(data);
    var marker = location.hash.substr(1);
    var testByFilename;

    if (marker)
      testByFilename = findTest(rootTest, marker);

    toc.setDelegate(testByFilename || rootTestSuite);
    rootTestSuite.setDelegate(rootTest);

    if (autorun)
      setTimeout(function(){
        runner.run();
      }, 100);
  }
};

// for lib build
if (basis.config.exports)
{
  global.basisjsTestRunner = basis.object.extend(module.exports, {
    setup: function(config){
      for (var key in config)
      {
        var value = config[key];
        switch (key)
        {
          case 'element':
            if (typeof value == 'string')
              value = document.getElementById(value);

            basis.nextTick(function(){
              this.appendChild(view.element);
            }.bind(value));

            break;

          case 'baseURI':
            require('core.env').baseURI = value;
            break;
        }
      }
    },
    run: function(){
      runner.run();
    }
  });
}
else
{
  basis.ready(function(){
    basis.doc.body.add(view.element);
  });
}
