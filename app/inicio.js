/* Entre Nós · abertura do app
   Carrega o conteúdo, cuida das rotas (o endereço depois do #), do topo, da barra de baixo,
   do menu, dos avisos e do funcionamento sem internet. */
(function(){
  "use strict";
  var EN = window.EN;
  var el = EN.el, txt = EN.txt;
  var appEl, main, nav, avisos, subtitulo, trilho, menuBtn, fab;
  var ultimoHash = null, ultimaRota = null, focoAtual = false;
  var pedidoInstalar = null;

  EN.versaoDoSite = function(){
    var m = document.querySelector('meta[name="entre-nos-versao"]');
    var v = m ? m.getAttribute("content") : "";
    return (!v || v.indexOf("__") === 0) ? "local" : v;
  };

  /* ------------------------------------------------------------ rotas */
  /* Endereços simples, só com letras, números e hífen: #inicio, #doar, #d-mapa-etapa-3.
     Por dentro, as rotas são escritas com barras: "d/mapa/etapa/3". */
  function partes(){
    var h = (location.hash || "").replace(/^#\/?/, "");
    try{ h = decodeURIComponent(h); }catch(e){}
    if(!h || h === "inicio") return [];
    if(h.indexOf("/") >= 0) return h.split("/").filter(Boolean);
    if(/^d-/.test(h)) return h.split("-");
    return [h];
  }
  function hashDe(caminho){ return "#" + (caminho ? String(caminho).replace(/\//g, "-") : "inicio"); }
  function profundidade(){ var s = history.state; return (s && typeof s.en === "number") ? s.en : 0; }

  EN.ir = function(caminho, substituir){
    var alvo = hashDe(caminho);
    if(substituir) history.replaceState({ en: profundidade() }, "", alvo);
    else if(location.hash !== alvo) history.pushState({ en: profundidade() + 1 }, "", alvo);
    EN.render(true);
  };
  /* volta uma tela; se o app foi aberto direto nesta tela, vai para a tela de reserva */
  EN.voltar = function(reserva){
    if(profundidade() > 0) history.back();
    else EN.ir(reserva || "", true);
  };

  function rotaDinamica(p){
    var d = EN.D(p[1]);
    if(!d){ EN.ir("dinamicas", true); return null; }
    var base = "d/" + d.id;
    var r = EN.run(d.id, false);
    var sit = EN.situacao(d.id);
    var n = d.etapas.length;
    if(!p[2]){
      EN.ir(sit === "done" ? base + "/resumo" : sit === "going" ? base + "/etapa/" + r.etapa : base + "/preparar", true);
      return null;
    }
    if(p[2] === "preparar") return { view: EN.telaPreparar(d.id), foco: true, d: d, passo: 0 };
    if(p[2] === "etapa"){
      var i = parseInt(p[3], 10);
      if(!r || !r.comecou){ EN.ir(base + "/preparar", true); return null; }
      if(!(i >= 1 && i <= n)){ EN.ir(base, true); return null; }
      if(!r.concluida && i > r.etapa){ EN.ir(base + "/etapa/" + r.etapa, true); return null; }
      return { view: EN.telaEtapa(d.id, i), foco: true, d: d, passo: i, titulo: "Etapa " + i };
    }
    if(p[2] === "resumo"){
      if(!r || !r.comecou){ EN.ir(base + "/preparar", true); return null; }
      if(!r.concluida && r.etapa < n){ EN.ir(base + "/etapa/" + r.etapa, true); return null; }
      return { view: EN.telaResumo(d.id), foco: true, d: d, passo: n, titulo: "Resumo" };
    }
    EN.ir(base, true);
    return null;
  }
  function resolver(p){
    var T = EN.telas;
    if(!p.length) return { view: T.inicio(), tab: "" };
    switch(p[0]){
      case "dinamicas": return { view: T.dinamicas(), tab: "dinamicas", titulo: "Dinâmicas" };
      case "combinados": return { view: T.combinados(), tab: "combinados", titulo: "Nossos combinados" };
      case "doar": return { view: T.doar(), tab: "doar", titulo: "Doar" };
      case "sobre": return { view: T.sobre(), titulo: "Sobre" };
      case "privacidade": return { view: T.privacidade(), titulo: "Privacidade" };
      case "como-funciona": return { view: T.como(), titulo: "Como funciona" };
      case "d": return rotaDinamica(p);
    }
    EN.ir("", true);
    return null;
  }

  EN.render = function(topo){
    if(!EN.conteudo.textos) return;
    fecharMenu(true);
    EN.apagarParadas();
    var res;
    try{
      res = resolver(partes());
    }catch(err){
      if(window.console) console.error(err);
      res = { view: telaErro(false), titulo: "Erro" };
    }
    if(!res) return;
    ultimoHash = location.hash;
    ultimaRota = res;
    focoAtual = !!res.foco;

    main.className = res.foco ? "focus" : "";
    main.textContent = "";
    main.appendChild(res.view);
    nav.hidden = !!res.foco;
    Array.prototype.forEach.call(nav.querySelectorAll(".tab"), function(b){
      var on = !res.foco && b.getAttribute("data-ir") === res.tab;
      b.classList.toggle("on", on);
      if(on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var g = EN.emAndamento();
    fab.setAttribute("aria-label", g ? "Continuar: " + g.d.titulo : "Ver as dinâmicas");
    atualizarTopo(res);
    mostrarAvisos();
    EN.manterTelaAcesa(!!res.foco);

    var nome = (EN.T().app && EN.T().app.nome) || "Entre Nós";
    document.title = res.d ? (res.titulo ? res.titulo + " · " : "") + res.d.titulo + " · " + nome : (res.titulo ? res.titulo + " · " + nome : nome);
    if(topo) window.scrollTo(0, 0);
    var f = main.querySelector(".foco");
    if(f){ try{ f.focus({ preventScroll: true }); }catch(e){} }
  };

  function aoMudarEndereco(){
    if(location.hash !== ultimoHash) EN.render(true);
  }

  /* ------------------------------------------------------------ topo e avisos */
  function atualizarTopo(res){
    if(res.foco && res.d){
      subtitulo.textContent = res.d.titulo;
      subtitulo.hidden = false;
      trilho.textContent = "";
      for(var i = 1; i <= res.d.etapas.length; i++) trilho.appendChild(el("i", i <= (res.passo || 0) ? "on" : ""));
      trilho.hidden = false;
    } else {
      subtitulo.textContent = "";
      subtitulo.hidden = true;
      trilho.hidden = true;
    }
  }

  function ehIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function instalado(){
    return navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }
  function banner(tipo, texto, botoes){
    var b = el("div", "banner " + tipo);
    b.setAttribute("role", tipo === "warn" ? "alert" : "status");
    b.appendChild(txt("div", "txt", texto));
    (botoes || []).forEach(function(x){ b.appendChild(EN.botao(x[0], "bl", x[1])); });
    return b;
  }
  function dispensar(chave){
    return function(){ EN.estado.avisos[chave] = true; EN.salvar(); mostrarAvisos(); };
  }
  function mostrarAvisos(){
    if(!avisos) return;
    avisos.textContent = "";
    if(!EN.armazenamentoOk){
      avisos.appendChild(banner("warn", "Este navegador não está deixando o Entre Nós guardar as respostas (pode ser uma aba anônima ou o armazenamento cheio). Dá para fazer a dinâmica, mas o que vocês escreverem some quando a página fechar."));
    }
    if(EN.estado.avisos.versao){
      avisos.appendChild(banner("info", "A dinâmica “" + EN.estado.avisos.versao + "” foi atualizada, e as respostas que estavam em andamento nela precisaram ser apagadas. Vocês podem começar de novo quando quiserem.", [
        ["Entendi", function(){ delete EN.estado.avisos.versao; EN.salvar(); mostrarAvisos(); }]
      ]));
    }
    if(!ultimaRota || ultimaRota.tab !== "") return;
    if(ehIOS() && !instalado() && !EN.estado.avisos.instalarIOS){
      avisos.appendChild(banner("info", "No iPhone, coloquem o Entre Nós na Tela de Início antes de começar e usem sempre pelo ícone. Assim o Safari não apaga as respostas depois de 7 dias sem uso.", [
        ["Como fazer", function(){ EN.ir("como-funciona"); }],
        ["Agora não", dispensar("instalarIOS")]
      ]));
    } else if(pedidoInstalar && !instalado() && !EN.estado.avisos.instalarApp){
      avisos.appendChild(banner("info", "Instalem o Entre Nós neste celular: ele abre mais rápido e funciona mesmo sem internet.", [
        ["Instalar", function(){ EN.instalar(); }],
        ["Agora não", dispensar("instalarApp")]
      ]));
    }
  }

  EN.podeInstalar = function(){ return !!pedidoInstalar; };
  EN.instalar = function(){
    if(!pedidoInstalar) return;
    var p = pedidoInstalar;
    pedidoInstalar = null;
    p.prompt();
    Promise.resolve(p.userChoice).catch(function(){}).then(function(){ mostrarAvisos(); });
  };

  function telaErro(rede){
    var v = el("div", "view");
    var t = el("div", "title");
    var h1 = txt("h1", "foco", rede ? "Não foi possível abrir o Entre Nós" : "Algo deu errado nesta tela");
    h1.setAttribute("tabindex", "-1");
    t.appendChild(h1);
    t.appendChild(txt("p", null, rede
      ? "Confiram a internet e tentem de novo. O que vocês já guardaram neste aparelho continua aqui."
      : "O que vocês já guardaram neste aparelho continua aqui. Tentem de novo ou voltem ao início."));
    v.appendChild(t);
    var a = el("div", "pad actions tight");
    a.appendChild(EN.botao("Tentar de novo", "btn", function(){ location.reload(); }));
    if(!rede) a.appendChild(EN.botao("Voltar ao início", "btn ghost", function(){ EN.ir("", true); }));
    v.appendChild(a);
    return v;
  }

  /* ------------------------------------------------------------ menu */
  function itensDoMenu(){
    var itens = [];
    if(focoAtual) itens.push(["Voltar ao início", function(){ EN.ir(""); }]);
    itens.push(
      ["Como funciona", function(){ EN.ir("como-funciona"); }],
      ["Sobre o projeto", function(){ EN.ir("sobre"); }],
      ["Privacidade", function(){ EN.ir("privacidade"); }],
      ["Compartilhar com outro casal", function(){ EN.compartilhar(); }]
    );
    return itens;
  }
  function abrirMenu(){
    if(document.getElementById("menu-lateral")) return;
    var T = EN.T();
    var fundo = el("div", "scrim");
    fundo.id = "menu-fundo";
    var sheet = el("aside", "sheet");
    sheet.id = "menu-lateral";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "menu-titulo");
    var fechar = EN.botao("Fechar", "close", function(){ fecharMenu(); });
    sheet.appendChild(fechar);
    var h = txt("h2", "sheet-title", (T.app && T.app.nome) || "Entre Nós");
    h.id = "menu-titulo";
    sheet.appendChild(h);
    itensDoMenu().forEach(function(it){
      sheet.appendChild(EN.botao(it[0], "mi", function(){ fecharMenu(); it[1](); }));
    });
    sheet.appendChild(txt("p", "ver", ((T.app && T.app.nome) || "Entre Nós") + " · " + ((T.app && T.app.versao) || "") + " · versão " + EN.versaoDoSite()));
    fundo.addEventListener("click", function(){ fecharMenu(); });
    sheet.addEventListener("keydown", function(e){
      if(e.key === "Escape"){ e.preventDefault(); fecharMenu(); return; }
      if(e.key !== "Tab") return;
      var foc = sheet.querySelectorAll("button, a[href]");
      if(!foc.length) return;
      var primeiro = foc[0], ultimo = foc[foc.length - 1];
      if(e.shiftKey && document.activeElement === primeiro){ e.preventDefault(); ultimo.focus(); }
      else if(!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primeiro.focus(); }
    });
    document.body.appendChild(fundo);
    document.body.appendChild(sheet);
    appEl.inert = true;
    appEl.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "true");
    fechar.focus();
  }
  function fecharMenu(semFoco){
    var s = document.getElementById("menu-lateral"), f = document.getElementById("menu-fundo");
    if(!s) return;
    s.remove();
    if(f) f.remove();
    appEl.inert = false;
    appEl.removeAttribute("aria-hidden");
    menuBtn.setAttribute("aria-expanded", "false");
    if(!semFoco) menuBtn.focus();
  }

  /* ------------------------------------------------------------ funcionamento sem internet */
  function registrarSW(){
    try{
      if(!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
      navigator.serviceWorker.register("sw.js").catch(function(){});
    }catch(e){}
  }

  /* ------------------------------------------------------------ abertura */
  function ligarControles(){
    document.getElementById("marca").addEventListener("click", function(){ EN.ir(""); });
    menuBtn.addEventListener("click", abrirMenu);
    fab.addEventListener("click", function(){
      var g = EN.emAndamento();
      EN.ir(g ? "d/" + g.d.id : "dinamicas");
    });
    Array.prototype.forEach.call(nav.querySelectorAll(".tab"), function(b){
      b.addEventListener("click", function(){ EN.ir(b.getAttribute("data-ir")); });
    });
    window.addEventListener("popstate", aoMudarEndereco);
    window.addEventListener("hashchange", aoMudarEndereco);
    window.addEventListener("storage", function(e){
      if(e.key === EN.CHAVE || e.key === null){ EN.carregar(); EN.render(false); }
    });
    document.addEventListener("visibilitychange", function(){
      if(document.visibilityState === "visible" && EN.conteudo.textos && EN.apagarParadas()) EN.render(true);
    });
    window.addEventListener("beforeinstallprompt", function(e){
      e.preventDefault();
      pedidoInstalar = e;
      mostrarAvisos();
    });
    window.addEventListener("appinstalled", function(){ pedidoInstalar = null; mostrarAvisos(); });
  }

  function iniciar(){
    appEl = document.getElementById("app");
    main = document.getElementById("main");
    nav = document.getElementById("nav");
    avisos = document.getElementById("avisos");
    subtitulo = document.getElementById("subtitulo");
    trilho = document.getElementById("trilho");
    menuBtn = document.getElementById("menu");
    fab = document.getElementById("fab");
    EN.carregar();
    EN.aoFalharArmazenamento = mostrarAvisos;
    ligarControles();
    EN.carregarConteudo().then(function(){
      EN.conferirVersoes();
      if(!history.state || typeof history.state.en !== "number") history.replaceState({ en: 0 }, "", location.hash || "#inicio");
      EN.render(true);
      registrarSW();
    }).catch(function(err){
      if(window.console) console.error(err);
      main.textContent = "";
      main.appendChild(telaErro(true));
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
