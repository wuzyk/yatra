require('basis.utils.info');
require('basis.ui');

function runInContext(contextWindow, code){
  (contextWindow.execScript || function(code){
    contextWindow['eval'].call(contextWindow, code);
  })(code);
}

var FrameEnv = basis.ui.Node.subclass({
  applyEnvironment: null,
  initEnv: null,
  html: null,

  postInit: function(){
    basis.ui.Node.prototype.postInit.call(this);
    basis.doc.body.add(this.element);
  },

  template:
    '<iframe src="{src}"' +
      ' event-load="ready"' +
      ' style="width: 10px; height: 10px; top: -100px; position: absolute; border: none; opacity: 0.0001"/>',
  binding: {
    src: function(node){
      return node.html || basis.asset(__dirname + 'iframe.html');
    }
  },
  action: {
    ready: function(){
      var frameWindow = this.element.contentWindow;
      var initCode = typeof this.initEnv == 'function' ? basis.utils.info.fn(this.initEnv).body : '';

      runInContext(frameWindow, resource('iframe_inject.js').get(true));

      this.applyEnvironment = frameWindow.__initTestEnvironment(initCode, function(){
        // env deprecates
        this.destroy();
      }.bind(this));

      if (this.runArgs)
      {
        this.run.apply(this, this.runArgs);
        this.runArgs = null;
      }
    }
  },

  run: function(code, context, runTest){
    if (this.applyEnvironment)
      runTest.call(context, this.applyEnvironment(code));
    else
      this.runArgs = arguments;
  }
});

module.exports = FrameEnv;