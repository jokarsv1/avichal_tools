/* Runs qpdf (WebAssembly) off the main thread. Message in: { id, args, input }. Out: { id, code, stdout, stderr, output }.
   The input file is written to /in.pdf and the output is read from /out.pdf. Nothing leaves the device. */
importScripts('/vendor/qpdf/qpdf.js');
var factory = self.Module;
var wasmP = null;
function compile() {
  var url = '/vendor/qpdf/qpdf.wasm';
  var viaBuffer = function () { return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return WebAssembly.compile(b); }); };
  if (WebAssembly.compileStreaming) return WebAssembly.compileStreaming(fetch(url)).catch(viaBuffer);
  return viaBuffer();
}
self.onmessage = function (e) {
  var d = e.data, so = '', se = '';
  wasmP = wasmP || compile();
  wasmP.then(function (mod) {
    return factory({
      noInitialRun: true,
      instantiateWasm: function (imports, cb) { WebAssembly.instantiate(mod, imports).then(function (inst) { cb(inst); }); return {}; },
      stdout: function (c) { if (c !== null) so += String.fromCharCode(c); },
      stderr: function (c) { if (c !== null) se += String.fromCharCode(c); },
    });
  }).then(function (m) {
    m.FS.writeFile('/in.pdf', d.input);
    var code;
    try { code = m.callMain(d.args); } catch (err) { code = err && typeof err.status === 'number' ? err.status : -1; if (!(err && typeof err.status === 'number')) se += String((err && err.message) || err); }
    var output = null;
    try { output = m.FS.readFile('/out.pdf'); } catch (x) {}
    self.postMessage({ id: d.id, code: code, stdout: so, stderr: se, output: output }, output ? [output.buffer] : []);
  }).catch(function (err) { self.postMessage({ id: d.id, code: -1, stdout: so, stderr: String((err && err.message) || err), output: null }); });
};
