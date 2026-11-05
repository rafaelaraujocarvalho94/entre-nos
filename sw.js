/* Entre Nós · funcionamento sem internet
   Com internet, busca sempre a versão mais nova do site e guarda uma cópia.
   Sem internet, abre a cópia guardada. Não guarda nem envia respostas: elas ficam só no navegador. */
var VERSAO = "__VERSAO__";
var CACHE = "entre-nos-" + VERSAO;
var BASE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "app/app.css?v=" + VERSAO,
  "app/nucleo.js?v=" + VERSAO,
  "app/dinamica.js?v=" + VERSAO,
  "app/telas.js?v=" + VERSAO,
  "app/qrcode.js?v=" + VERSAO,
  "app/inicio.js?v=" + VERSAO,
  "conteudo/textos.json",
  "conteudo/dinamicas/lista.json",
  "assets/fontes/fraunces-latin-opsz-normal.woff2",
  "assets/fontes/fraunces-latin-opsz-italic.woff2",
  "assets/fontes/karla-latin-400-normal.woff2",
  "assets/fontes/karla-latin-500-normal.woff2",
  "assets/fontes/karla-latin-700-normal.woff2",
  "assets/icones/favicon.svg",
  "assets/icones/icone-192.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(BASE.map(function(u){ return new Request(u, { cache: "reload" }); })).then(function(){
        return fetch("conteudo/dinamicas/lista.json", { cache: "reload" }).then(function(r){ return r.json(); }).then(function(l){
          var ids = (l && l.ordem) || [];
          return c.addAll(ids.map(function(id){ return new Request("conteudo/dinamicas/" + id + ".json", { cache: "reload" }); }));
        });
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(nomes){
      return Promise.all(nomes.filter(function(n){ return n.indexOf("entre-nos-") === 0 && n !== CACHE; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  var rede = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" });
  e.respondWith(
    rede.then(function(res){
      if(res && res.ok && res.type === "basic"){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ return c.put(req, copia); }).catch(function(){});
      }
      return res;
    }).catch(function(){
      return caches.open(CACHE).then(function(c){
        return c.match(req).then(function(r){
          if(r) return r;
          if(req.mode === "navigate") return c.match("index.html").then(function(i){ return i || c.match("./"); });
          return c.match(req, { ignoreSearch: true });
        });
      }).then(function(r){
        return r || new Response("Sem internet e sem cópia guardada deste arquivo.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      });
    })
  );
});
