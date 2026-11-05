/* Entre Nós · núcleo
   Estado guardado no aparelho, carregamento do conteúdo e utilidades.
   Nada aqui envia dados para fora do aparelho. */
(function(){
  "use strict";
  var EN = window.EN = window.EN || {};

  EN.CHAVE = "entre-nos-v3";
  EN.DIA = 24 * 60 * 60 * 1000;
  EN.conteudo = { textos: null, lista: [], porId: {} };

  /* ------------------------------------------------------------ elementos */
  EN.el = function(tag, cls, html){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(html != null) n.innerHTML = html;
    return n;
  };
  EN.txt = function(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    n.textContent = text == null ? "" : text;
    return n;
  };
  EN.esc = function(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  };
  /* texto com negrito simples: só <strong> e <b> passam; o resto vira texto */
  EN.rico = function(s){
    return EN.esc(s).replace(/&lt;(\/?)(strong|b)&gt;/g, "<$1$2>");
  };
  EN.elRico = function(tag, cls, s){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    n.innerHTML = EN.rico(s);
    return n;
  };
  EN.botao = function(texto, cls, fn){
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls || "btn";
    b.textContent = texto;
    if(fn) b.addEventListener("click", fn);
    return b;
  };
  /* botão que pede um segundo toque antes de agir */
  EN.botaoConfirmar = function(texto, textoConfirmar, cls, fn){
    var b = EN.botao(texto, cls);
    var armado = false, timer = null;
    b.addEventListener("click", function(){
      if(!armado){
        armado = true;
        b.textContent = textoConfirmar;
        timer = setTimeout(function(){ armado = false; b.textContent = texto; }, 4000);
      } else {
        clearTimeout(timer);
        fn();
      }
    });
    return b;
  };

  /* ------------------------------------------------------------ aviso rápido */
  var toastTimer = null;
  EN.toast = function(msg){
    var t = document.getElementById("toast");
    if(!t) return;
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("on"); }, 2800);
  };

  /* ------------------------------------------------------------ armazenamento */
  function vazio(){ return { schema: 3, nomes: { a: "", b: "" }, runs: {}, avisos: {} }; }
  EN.estado = vazio();
  EN.armazenamentoOk = true;

  EN.testarArmazenamento = function(){
    try{
      var k = "__entre_nos_teste";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    }catch(e){ return false; }
  };
  EN.carregar = function(){
    EN.armazenamentoOk = EN.testarArmazenamento();
    try{
      var raw = localStorage.getItem(EN.CHAVE);
      if(raw){
        var p = JSON.parse(raw);
        if(p && p.schema === 3) EN.estado = Object.assign(vazio(), p);
      }
    }catch(e){}
    var s = EN.estado;
    if(!s.runs || typeof s.runs !== "object") s.runs = {};
    if(!s.nomes) s.nomes = { a: "", b: "" };
    if(!s.avisos) s.avisos = {};
  };
  EN.salvar = function(){
    try{
      localStorage.setItem(EN.CHAVE, JSON.stringify(EN.estado));
    }catch(e){
      if(EN.armazenamentoOk){
        EN.armazenamentoOk = false;
        if(EN.aoFalharArmazenamento) EN.aoFalharArmazenamento();
      }
    }
  };
  EN.apagarTudo = function(){
    EN.estado = vazio();
    try{ localStorage.removeItem(EN.CHAVE); }catch(e){}
  };
  EN.pedirPersistencia = function(){
    try{
      if(navigator.storage && navigator.storage.persist){
        navigator.storage.persisted().then(function(ja){ if(!ja) navigator.storage.persist(); });
      }
    }catch(e){}
  };

  /* ------------------------------------------------------------ conteúdo */
  function getJSON(url){
    return fetch(url, { cache: "no-cache" }).then(function(r){
      if(!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    });
  }
  EN.carregarConteudo = function(){
    return Promise.all([
      getJSON("conteudo/textos.json"),
      getJSON("conteudo/dinamicas/lista.json")
    ]).then(function(res){
      EN.conteudo.textos = res[0];
      var ids = (res[1] && res[1].ordem) || [];
      return Promise.all(ids.map(function(id){ return getJSON("conteudo/dinamicas/" + id + ".json"); }));
    }).then(function(ds){
      EN.conteudo.lista = ds;
      EN.conteudo.porId = {};
      ds.forEach(function(d){ EN.conteudo.porId[d.id] = d; });
    });
  };
  EN.D = function(id){ return EN.conteudo.porId[id] || null; };
  EN.T = function(){ return EN.conteudo.textos || {}; };

  /* ------------------------------------------------------------ nomes e marcadores */
  EN.outro = function(p){ return p === "a" ? "b" : "a"; };
  EN.nome = function(p){
    var n = EN.estado.nomes || {};
    if(p === "a") return (n.a || "").trim() || "Pessoa 1";
    if(p === "b") return (n.b || "").trim() || "Pessoa 2";
    return "Vocês dois";
  };
  /* {A} e {B} viram os nomes; {OUTRO} vira o nome de quem não é p */
  EN.fmt = function(s, p){
    return String(s == null ? "" : s)
      .replace(/\{A\}/g, EN.nome("a"))
      .replace(/\{B\}/g, EN.nome("b"))
      .replace(/\{OUTRO\}/g, (p === "a" || p === "b") ? EN.nome(EN.outro(p)) : "o outro");
  };

  /* ------------------------------------------------------------ datas */
  EN.hojeISO = function(){
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  EN.dataBR = function(iso){
    if(!iso) return "";
    var p = String(iso).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
  };
  EN.dataDeTs = function(ts){
    var d = new Date(ts);
    return EN.dataBR(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  };

  /* ------------------------------------------------------------ andamento de cada dinâmica */
  EN.sortear = function(n){
    var arr = [];
    for(var i = 0; i < n; i++) arr.push(i % 2 === 0 ? "a" : "b");
    for(var j = arr.length - 1; j > 0; j--){
      var k = Math.floor(Math.random() * (j + 1));
      var t = arr[j]; arr[j] = arr[k]; arr[k] = t;
    }
    return arr;
  };
  EN.run = function(id, criar){
    var r = EN.estado.runs[id];
    var d = EN.D(id);
    if(!r && criar && d){
      r = EN.estado.runs[id] = {
        versao: d.versao || 1, ordem: EN.sortear(d.etapas.length), etapa: 1, prep: [],
        fases: {}, respostas: {}, notas: {}, pulos: {}, apagadas: {}, data: "",
        comecou: false, inicio: Date.now(), atualizado: Date.now(), concluida: null, privadasApagadas: false
      };
    }
    if(r){
      ["fases", "respostas", "notas", "pulos", "apagadas"].forEach(function(k){ if(!r[k] || typeof r[k] !== "object") r[k] = {}; });
      if(!Array.isArray(r.prep)) r.prep = [];
      if(d && (!Array.isArray(r.ordem) || r.ordem.length !== d.etapas.length)) r.ordem = EN.sortear(d.etapas.length);
      if(d){
        var n = parseInt(r.etapa, 10);
        r.etapa = (n >= 1) ? Math.min(n, d.etapas.length) : 1;
      }
    }
    return r || null;
  };
  EN.tocar = function(r){
    if(r) r.atualizado = Date.now();
    EN.salvar();
  };
  /* none = não começada · going = em andamento · done = concluída */
  EN.situacao = function(id){
    var r = EN.estado.runs[id];
    if(!r || !r.comecou) return "none";
    return r.concluida ? "done" : "going";
  };
  EN.recomecar = function(id){
    delete EN.estado.runs[id];
    EN.salvar();
  };

  /* ------------------------------------------------------------ respostas */
  EN.resp = function(r, sid, p){
    if(!r.respostas[sid]) r.respostas[sid] = {};
    if(!r.respostas[sid][p] || typeof r.respostas[sid][p] !== "object") r.respostas[sid][p] = {};
    return r.respostas[sid][p];
  };
  EN.valor = function(r, sid, p, fid){
    var s = r.respostas[sid];
    return (s && s[p]) ? s[p][fid] : undefined;
  };
  EN.textoDe = function(r, sid, p, fid){
    var v = EN.valor(r, sid, p, fid);
    return typeof v === "string" ? v.trim() : "";
  };
  EN.pulou = function(r, sid, p){
    var k = r.pulos[sid];
    return (k && k[p]) || false;
  };
  EN.marcarPulo = function(r, sid, p, v){
    if(!r.pulos[sid]) r.pulos[sid] = {};
    if(v) r.pulos[sid][p] = v; else delete r.pulos[sid][p];
  };

  /* escolha: guarda a referência à resposta de origem, e não uma cópia do texto.
     Se a resposta de origem muda, a escolha acompanha. */
  EN.opcoesEscolha = function(r, campo, p){
    if(campo.opcoes) return campo.opcoes.map(function(t){ return { valor: t, texto: t }; });
    var de = campo.opcoes_de || {};
    var quem = de.quem === "os_dois" ? ["a", "b"] : [de.quem === "eu" ? p : EN.outro(p)];
    var out = [], vistos = {};
    quem.forEach(function(q){
      if(EN.pulou(r, de.etapa, q)) return;
      (de.campos || []).forEach(function(fid){
        var t = EN.textoDe(r, de.etapa, q, fid);
        var chave = t.toLowerCase();
        if(t && !vistos[chave]){
          vistos[chave] = 1;
          out.push({ valor: de.etapa + "/" + q + "/" + fid, texto: t });
        }
      });
    });
    return out;
  };
  EN.textoEscolha = function(r, campo, valor){
    if(!valor || typeof valor !== "string") return "";
    if(valor.indexOf("livre:") === 0) return valor.slice(6).trim();
    if(campo.opcoes) return campo.opcoes.indexOf(valor) >= 0 ? valor : "";
    var m = valor.split("/");
    if(m.length !== 3) return "";
    return EN.textoDe(r, m[0], m[1], m[2]);
  };

  /* ------------------------------------------------------------ copiar, compartilhar, agenda */
  EN.copiar = function(texto, msgOk){
    function reserva(){
      var ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand("copy"); EN.toast(msgOk || "Copiado"); }
      catch(e){ EN.toast("Não consegui copiar. Selecione o texto na tela."); }
      document.body.removeChild(ta);
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(texto).then(function(){ EN.toast(msgOk || "Copiado"); }, reserva);
    } else { reserva(); }
  };
  EN.enderecoDoApp = function(){ return location.href.split("#")[0]; };
  EN.compartilhar = function(){
    var T = EN.T();
    var dados = { title: (T.app && T.app.nome) || "Entre Nós", text: (T.compartilhar && T.compartilhar.texto) || "", url: EN.enderecoDoApp() };
    function copiarLink(){ EN.copiar(dados.text + " " + dados.url, "Link copiado. Agora é só colar na conversa."); }
    if(navigator.share){
      try{
        navigator.share(dados).catch(function(err){ if(!err || err.name !== "AbortError") copiarLink(); });
      }catch(e){ copiarLink(); }
    } else {
      copiarLink();
    }
  };
  /* arquivo de agenda gerado no próprio aparelho, sem servidor */
  EN.baixarAgenda = function(titulo, descricao, iso){
    if(!iso) return;
    var ini = iso.replace(/-/g, "");
    var d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + 1);
    var fim = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    var agora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    function linha(s){ return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Entre Nos//PT-BR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "-" + Math.random().toString(36).slice(2) + "@entre-nos",
      "DTSTAMP:" + agora,
      "DTSTART;VALUE=DATE:" + ini,
      "DTEND;VALUE=DATE:" + fim,
      "SUMMARY:" + linha(titulo),
      "DESCRIPTION:" + linha(descricao),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "entre-nos-" + iso + ".ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  /* ------------------------------------------------------------ tela acesa durante a dinâmica */
  var trava = null, querTrava = false;
  EN.manterTelaAcesa = function(ligar){
    querTrava = !!ligar;
    if(!("wakeLock" in navigator)) return;
    if(ligar && !trava && document.visibilityState === "visible"){
      navigator.wakeLock.request("screen").then(function(t){
        trava = t;
        t.addEventListener("release", function(){ trava = null; });
      }).catch(function(){});
    } else if(!ligar && trava){
      trava.release().catch(function(){});
      trava = null;
    }
  };
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "visible" && querTrava) EN.manterTelaAcesa(true);
  });
})();
