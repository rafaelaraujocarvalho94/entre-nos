/* Entre Nós · motor das dinâmicas
   Lê o arquivo de uma dinâmica (pasta conteudo/dinamicas) e conduz a preparação,
   as etapas e o resumo. Não conhece nenhuma dinâmica em particular. */
(function(){
  "use strict";
  var EN = window.EN;
  var el = EN.el, txt = EN.txt;

  var ICONE_PRIVADA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var ICONE_PASSAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/><path d="M2.5 9.5h3m0 0-1.6-1.6M5.5 9.5 3.9 11.1"/><path d="M21.5 14.5h-3m0 0 1.6-1.6m-1.6 1.6 1.6 1.6"/></svg>';

  /* ============================================================ consultas */
  function idxEtapa(d, sid){
    for(var i = 0; i < d.etapas.length; i++) if(d.etapas[i].id === sid) return i;
    return -1;
  }
  function etapaPorId(d, sid){ var i = idxEtapa(d, sid); return i < 0 ? null : d.etapas[i]; }
  function leitor(r, i){ return r.ordem[i - 1] === "b" ? "b" : "a"; }

  function campoPreenchido(r, sid, p, c){
    var v = EN.valor(r, sid, p, c.id);
    if(c.tipo === "escala") return !!v && typeof v === "object" && Object.keys(v).length > 0;
    if(c.tipo === "escolha") return !!EN.textoEscolha(r, c, v);
    return typeof v === "string" && v.trim().length > 0;
  }
  function temResposta(r, e, p){
    if(EN.pulou(r, e.id, p)) return false;
    return (e.campos || []).some(function(c){ return campoPreenchido(r, e.id, p, c); });
  }
  function autoPulou(r, sid, p){ return EN.pulou(r, sid, p) === "auto"; }

  /* etapa encadeada: se a resposta de que ela depende não existe, a etapa é pulada para essa pessoa */
  function dependeAuto(d, r, e, p){
    var dep = e.depende_de;
    if(!dep) return false;
    var q = dep.quem === "eu" ? p : EN.outro(p);
    var lista = dep.etapas || [];
    if(dep.basta_uma){
      return lista.every(function(sid){ var s = etapaPorId(d, sid); return !s || !temResposta(r, s, q); });
    }
    return lista.some(function(sid){ return !!EN.pulou(r, sid, q); });
  }
  function ajustarDependencias(d, r, e){
    if(!e.depende_de || e.tipo !== "individual") return;
    ["a", "b"].forEach(function(p){
      var precisa = dependeAuto(d, r, e, p);
      var atual = EN.pulou(r, e.id, p);
      if(precisa && atual !== "auto"){
        EN.marcarPulo(r, e.id, p, "auto");
        if(r.respostas[e.id]) delete r.respostas[e.id][p];
        delete r.fases[e.id];
      } else if(!precisa && atual === "auto"){
        EN.marcarPulo(r, e.id, p, false);
        delete r.fases[e.id];
      }
    });
  }
  function faseInicial(r, e, i){
    if(e.tipo === "leitura") return "ler";
    if(e.tipo === "a_quatro_maos") return "juntos";
    var R = leitor(r, i), O = EN.outro(R);
    if(!autoPulou(r, e.id, R)) return "escrever:" + R;
    if(!autoPulou(r, e.id, O)) return "passar:" + O;
    return "revelar";
  }
  function faseAtual(d, r, e, i){
    ajustarDependencias(d, r, e);
    var f = r.fases[e.id];
    var m = f && /^(escrever|passar):(a|b)$/.exec(f);
    if(!f || (m && autoPulou(r, e.id, m[2]))) f = r.fases[e.id] = faseInicial(r, e, i);
    return f;
  }

  /* maior diferença numa escala por área */
  function maiorDiferenca(d, r, sid){
    var e = etapaPorId(d, sid);
    if(!e) return null;
    var c = (e.campos || [])[0];
    if(!c || c.tipo !== "escala") return null;
    var va = EN.valor(r, sid, "a", c.id) || {}, vb = EN.valor(r, sid, "b", c.id) || {};
    var best = null;
    c.areas.forEach(function(area, ai){
      var a = va[ai], b = vb[ai];
      if(typeof a !== "number" || typeof b !== "number") return;
      var dif = Math.abs(a - b);
      if(!best || dif > best.dif) best = { i: ai, area: area, a: a, b: b, dif: dif };
    });
    return best;
  }

  /* ============================================================ pedaços de tela */
  function versiculos(lista){
    var frag = document.createDocumentFragment();
    (lista || []).forEach(function(v){
      var b = el("div", "verse");
      b.appendChild(txt("p", null, v.texto));
      b.appendChild(txt("span", null, v.ref));
      frag.appendChild(b);
    });
    return frag;
  }
  EN.versiculos = versiculos;
  function regras(lista){
    var ul = el("ul", "rules");
    (lista || []).forEach(function(t){ ul.appendChild(txt("li", null, t)); });
    return ul;
  }
  function notaPrivada(){
    var n = el("div", "private-note");
    n.innerHTML = ICONE_PRIVADA;
    n.appendChild(txt("span", null, "Etapa privada: o que for escrito aqui não entra no resumo nem no PDF, e é apagado do aparelho quando o resumo aparecer."));
    return n;
  }
  function titulo(tag, texto){
    var h = txt(tag, null, texto);
    h.setAttribute("tabindex", "-1");
    h.className = "foco";
    return h;
  }
  function rodape(d, r, i){
    var f = el("div", "dynfoot");
    if(i) f.appendChild(txt("div", null, "Etapa " + i + " de " + d.etapas.length + " · tempo sugerido: " + d.etapas[i - 1].tempo + ", sem pressa"));
    if(!r || !r.comecou) return f;
    f.appendChild(EN.botaoConfirmar("Recomeçar esta dinâmica", "Toque de novo para apagar as respostas desta dinâmica", "btn quiet danger", function(){
      EN.recomecar(d.id);
      EN.toast("Respostas de “" + d.titulo + "” apagadas");
      EN.ir("d/" + d.id + "/preparar", true);
    }));
    return f;
  }
  function avisoApagadas(d, r){
    if(!r.avisoApagadas) return null;
    var b = el("div", "banner warn");
    b.appendChild(txt("div", "txt", "Esta dinâmica ficou parada por mais de um dia. Como prometido, as respostas das etapas privadas foram apagadas, e vocês continuam da etapa " + r.etapa + "."));
    delete r.avisoApagadas;
    EN.salvar();
    return b;
  }

  /* ============================================================ preparação */
  EN.telaPreparar = function(id){
    var d = EN.D(id);
    var T = EN.T();
    var r = EN.run(id, true);
    var wrap = el("div", "dyn-wrap");
    var aviso = avisoApagadas(d, r);
    if(aviso) wrap.appendChild(aviso);
    var c = el("section", "sheetcard");

    if(r.concluida){
      c.appendChild(txt("div", "eyebrow", d.titulo));
      c.appendChild(titulo("h2", "Vocês já concluíram esta dinâmica"));
      c.appendChild(txt("p", "lead", "O resumo continua guardado neste aparelho. Para fazer de novo, recomecem: as respostas anteriores serão apagadas."));
      var a0 = el("div", "actions");
      a0.appendChild(EN.botao("Ver o resumo", "btn", function(){ EN.ir("d/" + id + "/resumo"); }));
      a0.appendChild(EN.botaoConfirmar("Recomeçar", "Toque de novo para apagar e recomeçar", "btn ghost", function(){
        EN.recomecar(id);
        EN.ir("d/" + id + "/preparar", true);
      }));
      c.appendChild(a0);
      wrap.appendChild(c);
      return wrap;
    }

    var P = T.preparacao || {};
    c.appendChild(txt("div", "eyebrow", "Antes de começar · " + d.titulo));
    c.appendChild(titulo("h2", P.titulo || "Preparar o ambiente"));
    if(P.texto) c.appendChild(txt("p", "lead", P.texto));
    if(P.versiculo) c.appendChild(versiculos([P.versiculo]));

    var itens = (P.itens || []).map(function(x){ return { titulo: x.titulo, texto: x.texto, limite: false }; })
      .concat((d.avisos_preparacao || []).map(function(x){ return { titulo: x.titulo, texto: x.texto, limite: true }; }));
    if(r.prep.length !== itens.length) r.prep = itens.map(function(){ return false; });
    var box = el("div", "check");
    itens.forEach(function(it, k){
      var lbl = el("label", "chk" + (it.limite ? " limit" : "") + (r.prep[k] ? " on" : ""));
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = !!r.prep[k];
      cb.addEventListener("change", function(){
        r.prep[k] = cb.checked;
        lbl.classList.toggle("on", cb.checked);
        EN.salvar(); validar();
      });
      var t = el("span", "txt");
      t.appendChild(txt("b", null, it.titulo));
      t.appendChild(txt("span", null, it.texto));
      lbl.appendChild(cb); lbl.appendChild(t);
      box.appendChild(lbl);
    });
    c.appendChild(box);

    c.appendChild(txt("p", "sectlabel", "Quem é quem"));
    var names = el("div", "names");
    [["a", "Pessoa 1"], ["b", "Pessoa 2"]].forEach(function(t){
      var f = el("div", "field");
      var row = el("div", "row");
      var lab = txt("label", null, t[1]);
      lab.setAttribute("for", "nome-" + t[0]);
      row.appendChild(lab);
      f.appendChild(row);
      var inp = document.createElement("input");
      inp.type = "text"; inp.id = "nome-" + t[0]; inp.placeholder = "Nome"; inp.autocomplete = "off";
      inp.value = EN.estado.nomes[t[0]] || "";
      inp.addEventListener("input", function(){ EN.estado.nomes[t[0]] = inp.value; EN.salvar(); validar(); });
      f.appendChild(inp);
      names.appendChild(f);
    });
    c.appendChild(names);

    var CF = T.como_funciona || {};
    if(CF.passos && CF.passos.length){
      c.appendChild(txt("p", "sectlabel", "Como funciona a leitura"));
      var how = el("ul", "how");
      CF.passos.forEach(function(s){ var li = document.createElement("li"); li.appendChild(EN.elRico("span", "txt", s)); how.appendChild(li); });
      c.appendChild(how);
    }
    if(P.frase_final) c.appendChild(txt("p", "startline", P.frase_final));
    var gate = el("div", "gate");
    gate.setAttribute("role", "alert");
    c.appendChild(gate);
    var act = el("div", "actions");
    act.appendChild(EN.botao("Voltar", "btn ghost", function(){ EN.voltar("dinamicas"); }));
    var tentou = false;
    act.appendChild(EN.botao(r.comecou ? "Continuar a dinâmica" : "Começar a dinâmica", "btn", function(){
      var falta = pendencias();
      if(falta.length){
        tentou = true; validar();
        gate.textContent = "Falta " + falta.join(" e ") + ".";
        var bad = c.querySelector(".chk.bad, .field.bad input");
        if(bad && bad.scrollIntoView) bad.scrollIntoView({ block: "center" });
        return;
      }
      r.comecou = true;
      EN.tocar(r);
      EN.pedirPersistencia();
      EN.ir("d/" + id + "/etapa/" + r.etapa);
    }));
    c.appendChild(act);
    c.appendChild(txt("p", "fineprint", "As respostas ficam guardadas só neste aparelho."));

    function nomesIguais(){
      var a = (EN.estado.nomes.a || "").trim().toLowerCase(), b = (EN.estado.nomes.b || "").trim().toLowerCase();
      return a && b && a === b;
    }
    function pendencias(){
      var falta = [];
      if(!(EN.estado.nomes.a || "").trim() || !(EN.estado.nomes.b || "").trim()) falta.push("preencher os dois nomes");
      else if(nomesIguais()) falta.push("usar nomes diferentes para cada um");
      var pend = r.prep.filter(function(x){ return !x; }).length;
      if(pend) falta.push(pend === 1 ? "marcar 1 item da preparação" : "marcar " + pend + " itens da preparação");
      return falta;
    }
    function validar(){
      if(!tentou) return;
      Array.prototype.forEach.call(box.querySelectorAll(".chk"), function(n, k){ n.classList.toggle("bad", !r.prep[k]); });
      Array.prototype.forEach.call(names.querySelectorAll(".field"), function(n, k){
        var v = (EN.estado.nomes[k === 0 ? "a" : "b"] || "").trim();
        n.classList.toggle("bad", !v || nomesIguais());
      });
      if(!pendencias().length) gate.textContent = "";
    }

    wrap.appendChild(c);
    wrap.appendChild(rodape(d, r, 0));
    return wrap;
  };

  /* ============================================================ etapa */
  EN.telaEtapa = function(id, i){
    var d = EN.D(id);
    var r = EN.run(id, false);
    var e = d.etapas[i - 1];
    var wrap = el("div", "dyn-wrap");
    var aviso = avisoApagadas(d, r);
    if(aviso) wrap.appendChild(aviso);
    var c = el("section", "sheetcard");
    wrap.appendChild(c);
    wrap.appendChild(rodape(d, r, i));

    if(e.privada && (r.privadasApagadas || r.apagadas[e.id])){
      cabecalho(c, d, r, e, i, false);
      c.appendChild(txt("p", "kept", "As respostas desta etapa já foram apagadas do aparelho, como prometido."));
      c.appendChild(navegacao(d, r, i));
      return wrap;
    }

    var f = faseAtual(d, r, e, i);
    EN.salvar();
    var m = /^(escrever|passar):(a|b)$/.exec(f);
    if(m && m[1] === "passar"){ telaPassar(c, d, r, e, i, m[2]); return wrap; }

    if(f === "revelar"){
      revelar(c, d, r, e, i);
    } else if(f === "ler"){
      cabecalho(c, d, r, e, i, true);
      var pts = el("ul", "points");
      (e.pontos || []).forEach(function(t){ pts.appendChild(EN.elRico("li", null, t)); });
      c.appendChild(pts);
      var act = el("div", "actions");
      act.appendChild(EN.botao("Voltar", "btn ghost", function(){ irAnterior(d, i); }));
      act.appendChild(EN.botao(i === d.etapas.length ? "Ver o que ficou escrito" : "Lemos juntos. Próxima etapa", "btn", function(){ irProxima(d, r, i); }));
      c.appendChild(act);
    } else {
      cabecalho(c, d, r, e, i, true);
      escrever(c, d, r, e, i, f === "juntos" ? "j" : m[2]);
    }
    return wrap;
  };

  function cabecalho(c, d, r, e, i, completo){
    var extra = (e.tipo === "a_quatro_maos" ? " · a quatro mãos" : "") + (e.tipo === "leitura" ? " · só leitura" : "") + (e.privada ? " · privada" : "");
    c.appendChild(txt("div", "eyebrow", "Etapa " + i + " · cerca de " + e.tempo + extra));
    c.appendChild(titulo("h2", e.titulo));
    if(!completo) return;
    var rd = el("div", "reader");
    rd.appendChild(txt("b", null, EN.nome(leitor(r, i))));
    rd.appendChild(document.createTextNode(" lê esta etapa em voz alta."));
    c.appendChild(rd);
    instrucoes(c, e);
  }
  function instrucoes(c, e){
    if(e.instrucao) c.appendChild(EN.elRico("p", "lead", e.instrucao));
    c.appendChild(versiculos(e.versiculos));
    if(e.regras && e.regras.length) c.appendChild(regras(e.regras));
    if(e.privada) c.appendChild(notaPrivada());
  }

  function irAnterior(d, i){
    if(i > 1) EN.ir("d/" + d.id + "/etapa/" + (i - 1));
    else EN.ir("d/" + d.id + "/preparar");
  }
  function irProxima(d, r, i){
    if(i >= d.etapas.length){ EN.ir("d/" + d.id + "/resumo"); return; }
    r.etapa = Math.max(r.etapa, i + 1);
    EN.tocar(r);
    EN.ir("d/" + d.id + "/etapa/" + (i + 1));
  }
  function navegacao(d, r, i){
    var act = el("div", "actions");
    act.appendChild(EN.botao("Voltar", "btn ghost", function(){ irAnterior(d, i); }));
    act.appendChild(EN.botao(i === d.etapas.length ? "Ver o que ficou escrito" : "Próxima etapa", "btn", function(){ irProxima(d, r, i); }));
    return act;
  }
  function mudarFase(r, e, f){
    r.fases[e.id] = f;
    EN.tocar(r);
    EN.render(true);
  }

  /* ------------------------------------------------------------ passar o celular */
  function telaPassar(c, d, r, e, i, p){
    var R = leitor(r, i);
    var devolvendo = (p === R);
    c.classList.add("handoff");
    c.appendChild(el("div", null, ICONE_PASSAR));
    c.appendChild(txt("div", "eyebrow", "Etapa " + i + " · " + e.titulo));
    c.appendChild(titulo("h2", (devolvendo ? "Devolva o celular para " : "Passe o celular para ") + EN.nome(p)));
    c.appendChild(txt("p", null, devolvendo
      ? "Para voltar à vez de " + EN.nome(p) + ", o celular precisa estar com " + EN.nome(p) + "."
      : "Até a revelação, ninguém lê a resposta do outro. Toque abaixo quando o celular estiver com " + EN.nome(p) + "."));
    c.appendChild(EN.botao("Sou " + EN.nome(p) + ", continuar", "btn block", function(){ mudarFase(r, e, "escrever:" + p); }));
    c.appendChild(EN.botao("Voltar", "btn quiet", function(){
      var outro = EN.outro(p);
      if(!autoPulou(r, e.id, outro)) mudarFase(r, e, "escrever:" + outro);
      else irAnterior(d, i);
    }));
  }

  /* ------------------------------------------------------------ escrever */
  function escrever(c, d, r, e, i, p){
    var R = leitor(r, i), O = EN.outro(R);
    var juntos = (p === "j");
    if(juntos){
      c.appendChild(txt("p", "privacy", "Escrevam juntos: um segura o celular, os dois decidem cada palavra."));
    } else {
      var turns = el("div", "turns");
      ["a", "b"].forEach(function(q){ turns.appendChild(txt("span", "chip" + (q === p ? " on" : ""), EN.nome(q))); });
      c.appendChild(turns);
      c.appendChild(txt("p", "privacy", "Vez de " + EN.nome(p) + " escrever. O outro não olha a tela até a revelação."));
    }
    var resp = EN.resp(r, e.id, p);
    var checks = [];
    var tentou = false;

    e.campos.forEach(function(cp){
      var wrap = el("div", "field");
      var fid = "f-" + e.id + "-" + p + "-" + cp.id;
      if(cp.contexto && !juntos){
        cp.contexto.forEach(function(cx){
          var q = cx.quem === "eu" ? p : EN.outro(p);
          if(EN.pulou(r, cx.etapa, q)) return;
          var vals = (cx.campos || []).map(function(f){ return EN.textoDe(r, cx.etapa, q, f); }).filter(Boolean);
          if(!vals.length) return;
          var box = el("div", "ctx");
          box.appendChild(txt("span", null, EN.fmt(cx.rotulo, p)));
          vals.forEach(function(v){ box.appendChild(txt("p", null, v)); });
          wrap.appendChild(box);
        });
      }
      if(cp.contexto_diferenca){
        var g = maiorDiferenca(d, r, cp.contexto_diferenca);
        if(g && g.dif > 0){
          var gx = el("div", "ctx");
          gx.appendChild(txt("span", null, "Onde vocês mais enxergaram diferente"));
          gx.appendChild(txt("p", null, g.area + ": " + EN.nome("a") + " " + g.a + " · " + EN.nome("b") + " " + g.b));
          wrap.appendChild(gx);
        }
      }
      var row = el("div", "row");
      var simples = cp.tipo === "linha" || cp.tipo === "texto";
      var lab = txt(simples ? "label" : "span", "flabel", EN.fmt(cp.rotulo, p));
      if(simples) lab.setAttribute("for", fid);
      var hint = txt("span", "hint", "");
      row.appendChild(lab); row.appendChild(hint);
      wrap.appendChild(row);
      var ch = { c: cp, wrap: wrap, hint: hint };

      if(cp.tipo === "escala"){
        var cur = resp[cp.id];
        if(!cur || typeof cur !== "object"){ cur = {}; resp[cp.id] = cur; }
        cp.areas.forEach(function(area, ai){
          var linha = el("div", "rate scale-row");
          linha.appendChild(txt("p", "lbl", area));
          var btns = el("div", "btns");
          btns.setAttribute("role", "group");
          btns.setAttribute("aria-label", area);
          for(var n = 0; n <= 10; n++){
            (function(n){
              var b = EN.botao(String(n), cur[ai] === n ? "nb on" : "nb", function(){
                cur[ai] = n; EN.tocar(r);
                Array.prototype.forEach.call(btns.children, function(x){ x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
                b.classList.add("on"); b.setAttribute("aria-pressed", "true");
                validar();
              });
              b.setAttribute("aria-label", area + ": nota " + n);
              b.setAttribute("aria-pressed", cur[ai] === n ? "true" : "false");
              btns.appendChild(b);
            })(n);
          }
          linha.appendChild(btns);
          wrap.appendChild(linha);
        });
        ch.status = function(){
          var o = resp[cp.id] || {}, cnt = 0;
          cp.areas.forEach(function(_, ai){ if(typeof o[ai] === "number") cnt++; });
          return { ok: cnt === cp.areas.length, hint: cnt + "/" + cp.areas.length + " áreas" };
        };
      } else if(cp.tipo === "escolha"){
        var opts = EN.opcoesEscolha(r, cp, p);
        var box = el("div", "opts");
        box.setAttribute("role", "radiogroup");
        if(opts.length){
          opts.forEach(function(o, oi){
            var lbl = el("label", "opt" + (resp[cp.id] === o.valor ? " sel" : ""));
            var rd = document.createElement("input");
            rd.type = "radio"; rd.name = fid; rd.value = o.valor;
            rd.checked = resp[cp.id] === o.valor;
            rd.addEventListener("change", function(){
              resp[cp.id] = o.valor; EN.tocar(r);
              Array.prototype.forEach.call(box.querySelectorAll(".opt"), function(n){ n.classList.remove("sel"); });
              lbl.classList.add("sel");
              validar();
            });
            lbl.appendChild(rd);
            lbl.appendChild(document.createTextNode(o.texto));
            box.appendChild(lbl);
          });
        } else {
          box.appendChild(txt("p", "privacy", "Não há o que escolher porque a etapa de origem ficou sem resposta. Escrevam aqui com as próprias palavras."));
          var livre = document.createElement("input");
          livre.type = "text"; livre.id = fid; livre.placeholder = "Escreva aqui";
          var atual = resp[cp.id];
          livre.value = (typeof atual === "string" && atual.indexOf("livre:") === 0) ? atual.slice(6) : "";
          livre.addEventListener("input", function(){ resp[cp.id] = "livre:" + livre.value; EN.tocar(r); validar(); });
          box.appendChild(livre);
        }
        wrap.appendChild(box);
        ch.status = function(){
          var ok = !!EN.textoEscolha(r, cp, resp[cp.id]);
          if(!ok && cp.opcional) return { ok: true, hint: "opcional", quieto: true };
          return { ok: ok, hint: ok ? "ok" : "escolha uma opção" };
        };
      } else {
        var input = cp.tipo === "linha" ? document.createElement("input") : document.createElement("textarea");
        if(cp.tipo === "linha") input.type = "text"; else input.rows = 3;
        input.id = fid;
        input.placeholder = EN.fmt(cp.exemplo || "", p);
        input.value = typeof resp[cp.id] === "string" ? resp[cp.id] : "";
        input.setAttribute("autocomplete", "off");
        input.addEventListener("input", function(){ resp[cp.id] = input.value; EN.tocar(r); validar(); });
        wrap.appendChild(input);
        ch.status = function(){
          var v = String(resp[cp.id] || "").trim();
          var min = cp.minimo || 10;
          var obrig = !cp.opcional || (cp.par && String(resp[cp.par] || "").trim().length > 0);
          if(!v.length) return obrig ? { ok: false, hint: "mín. " + min + " caracteres" } : { ok: true, hint: "opcional", quieto: true };
          if(v.length >= min) return { ok: true, hint: v.length + " caracteres" };
          return { ok: false, hint: v.length + "/" + min + " · faltam " + (min - v.length) };
        };
      }
      c.appendChild(wrap);
      checks.push(ch);
    });

    var gate = el("div", "gate");
    gate.setAttribute("role", "alert");
    c.appendChild(gate);
    var primeiro = !juntos && p === R;
    var outroPulado = autoPulou(r, e.id, O);
    var act = el("div", "actions");
    act.appendChild(EN.botao("Voltar", "btn ghost", function(){
      if(!juntos && p === O && !autoPulou(r, e.id, R)) mudarFase(r, e, "passar:" + R);
      else irAnterior(d, i);
    }));
    var rotulo = juntos ? "Pronto: ver o que escrevemos"
      : (primeiro && !outroPulado ? "Pronto: passar o celular para " + EN.nome(O) : "Revelar as respostas");
    act.appendChild(EN.botao(rotulo, "btn", function(){
      var falta = faltando();
      if(falta > 0){
        tentou = true; validar();
        gate.textContent = falta === 1 ? "Falta 1 resposta. Dê uma olhada no campo marcado." : "Faltam " + falta + " respostas. Dê uma olhada nos campos marcados.";
        var bad = c.querySelector(".field.bad input, .field.bad textarea, .field.bad button");
        if(bad){ if(bad.scrollIntoView) bad.scrollIntoView({ block: "center" }); try{ bad.focus({ preventScroll: true }); }catch(x){} }
        return;
      }
      if(!juntos) EN.marcarPulo(r, e.id, p, false);
      concluirEscrita(r, e, i, p);
    }));
    c.appendChild(act);

    if(e.sensivel && !juntos){
      var sk = el("div", "actions");
      sk.style.marginTop = "6px";
      sk.appendChild(EN.botao("Prefiro não falar disso hoje", "btn quiet", function(){
        EN.marcarPulo(r, e.id, p, "manual");
        if(r.respostas[e.id]) delete r.respostas[e.id][p];
        EN.toast("Tudo bem.");
        concluirEscrita(r, e, i, p);
      }));
      c.appendChild(sk);
    }

    function faltando(){ var n = 0; checks.forEach(function(ch){ if(!ch.status().ok) n++; }); return n; }
    function validar(){
      checks.forEach(function(ch){
        var st = ch.status();
        ch.wrap.classList.toggle("bad", tentou && !st.ok);
        ch.hint.textContent = st.hint;
        ch.hint.className = (st.ok && !st.quieto) ? "hint ok" : "hint";
      });
      if(faltando() === 0) gate.textContent = "";
    }
    validar();
  }
  function concluirEscrita(r, e, i, p){
    if(p === "j"){ mudarFase(r, e, "revelar"); return; }
    var R = leitor(r, i), O = EN.outro(R);
    if(p === R && !autoPulou(r, e.id, O)) mudarFase(r, e, "passar:" + O);
    else mudarFase(r, e, "revelar");
  }

  /* ------------------------------------------------------------ revelação */
  function valorExibido(r, e, p, cp){
    var v = EN.valor(r, e.id, p, cp.id);
    if(cp.tipo === "escolha") return EN.textoEscolha(r, cp, v);
    if(cp.tipo === "escala") return "";
    return typeof v === "string" ? v.trim() : "";
  }
  function cartaoPessoa(r, e, p, byline, textoPulo){
    var col = el("div", "col");
    col.appendChild(txt("h3", null, "Respostas de " + EN.nome(p)));
    if(byline) col.appendChild(txt("p", "byline", byline));
    if(EN.pulou(r, e.id, p)){
      col.appendChild(txt("p", "empty", textoPulo));
      return col;
    }
    var algum = false;
    e.campos.forEach(function(cp){
      var v = valorExibido(r, e, p, cp);
      if(!v) return;
      algum = true;
      col.appendChild(txt("p", "jl", EN.fmt(cp.rotulo, p)));
      col.appendChild(txt("p", "jv", v));
    });
    if(!algum) col.appendChild(txt("p", "empty", "Nada escrito."));
    return col;
  }
  function cartaoJuntos(r, e){
    var col = el("div", "col full");
    col.appendChild(txt("h3", null, "Escrito por " + EN.nome("a") + " e " + EN.nome("b")));
    var algum = false;
    e.campos.forEach(function(cp){
      var v = valorExibido(r, e, "j", cp);
      if(!v) return;
      algum = true;
      col.appendChild(txt("p", "jl", EN.fmt(cp.rotulo, "j")));
      col.appendChild(txt("p", "jv", v));
    });
    if(!algum) col.appendChild(txt("p", "empty", "Nada escrito."));
    return col;
  }
  function tabelaEscala(d, r, e){
    var cp = e.campos[0];
    var destacar = cp.destacar_diferenca !== false;
    var g = destacar ? maiorDiferenca(d, r, e.id) : null;
    var hot = (g && g.dif > 0) ? g.i : -1;
    var va = EN.valor(r, e.id, "a", cp.id) || {}, vb = EN.valor(r, e.id, "b", cp.id) || {};
    var w = el("div", "scale-wrap");
    var t = el("table", "scale-tbl");
    var th = el("tr");
    th.appendChild(txt("th", null, "Área"));
    th.appendChild(txt("th", "n", EN.nome("a")));
    th.appendChild(txt("th", "n", EN.nome("b")));
    if(destacar) th.appendChild(txt("th", "n", "Diferença"));
    var thead = el("thead"); thead.appendChild(th); t.appendChild(thead);
    var tb = el("tbody");
    cp.areas.forEach(function(area, ai){
      var a = va[ai], b = vb[ai];
      var tr = el("tr", ai === hot ? "hot" : "");
      tr.appendChild(txt("td", null, area));
      tr.appendChild(txt("td", "n", typeof a === "number" ? String(a) : "sem nota"));
      tr.appendChild(txt("td", "n", typeof b === "number" ? String(b) : "sem nota"));
      if(destacar) tr.appendChild(txt("td", "n", (typeof a === "number" && typeof b === "number") ? String(Math.abs(a - b)) : ""));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    w.appendChild(t);
    if(g) w.appendChild(txt("p", "hotnote", g.dif > 0 ? "Maior diferença: " + g.area + " (" + g.dif + (g.dif === 1 ? " ponto)" : " pontos)") : "Vocês deram a mesma nota em todas as áreas."));
    return w;
  }
  function caixaNota(r, e, p){
    if(!r.notas[e.id]) r.notas[e.id] = {};
    var box = el("div", "rate noprint");
    var rot = (e.nota && e.nota.rotulo) || "Nota de {OUTRO} para esse palpite";
    box.appendChild(txt("p", "lbl", EN.fmt(rot, p)));
    var btns = el("div", "btns");
    btns.setAttribute("role", "group");
    btns.setAttribute("aria-label", EN.fmt(rot, p));
    for(var n = 0; n <= 10; n++){
      (function(n){
        var b = EN.botao(String(n), r.notas[e.id][p] === n ? "nb on" : "nb", function(){
          r.notas[e.id][p] = n; EN.tocar(r);
          Array.prototype.forEach.call(btns.children, function(x){ x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("on");
          b.setAttribute("aria-pressed", "true");
        });
        b.setAttribute("aria-label", "Nota " + n);
        b.setAttribute("aria-pressed", r.notas[e.id][p] === n ? "true" : "false");
        btns.appendChild(b);
      })(n);
    }
    box.appendChild(btns);
    return box;
  }

  /* quem lê o quê, considerando quem respondeu */
  function ordemLeitura(r, e, i){
    var R = leitor(r, i), O = EN.outro(R);
    var tem = { a: temResposta(r, e, "a"), b: temResposta(r, e, "b") };
    var N = EN.nome;
    if(!tem.a && !tem.b) return { ordem: [], html: "Nesta etapa não há texto para ler. Sigam para a próxima quando os dois estiverem prontos." };
    if(e.leitura_propria){
      var p1 = tem[R] ? R : O, p2 = EN.outro(p1);
      var h = "<b>" + EN.esc(N(p1)) + "</b> lê o próprio texto em voz alta, olhando para <b>" + EN.esc(N(p2)) + "</b>.";
      if(tem[p2]) h += " Depois é a vez de <b>" + EN.esc(N(p2)) + "</b>.";
      return { ordem: tem[p2] ? [p1, p2] : [p1], html: h };
    }
    if(tem[R] && tem[O]) return { ordem: [R, O], html: "<b>" + EN.esc(N(O)) + "</b> começa: lê em voz alta as respostas de <b>" + EN.esc(N(R)) + "</b>. Depois <b>" + EN.esc(N(R)) + "</b> lê as de <b>" + EN.esc(N(O)) + "</b>. Ninguém lê a própria resposta: leiam como quem lê uma carta que recebeu." };
    var quem = tem[R] ? R : O;
    return { ordem: [quem], html: "<b>" + EN.esc(N(EN.outro(quem))) + "</b> lê em voz alta as respostas de <b>" + EN.esc(N(quem)) + "</b>, como quem lê uma carta que recebeu." };
  }
  function textoPulo(e, r, p){
    if(EN.pulou(r, e.id, p) === "auto") return EN.fmt((e.depende_de && e.depende_de.texto) || "Sem resposta nesta etapa.", p);
    return "Preferiu não falar disso hoje.";
  }

  function revelar(c, d, r, e, i){
    cabecalho(c, d, r, e, i, false);
    var R = leitor(r, i);
    var nada = false;
    var ord = el("div", "order");
    var grid = el("div", "reveal");
    if(e.tipo === "a_quatro_maos"){
      ord.innerHTML = "<b>" + EN.esc(EN.nome(R)) + "</b> lê em voz alta o que vocês escreveram juntos.";
      grid.appendChild(cartaoJuntos(r, e));
    } else if(e.campos.length === 1 && e.campos[0].tipo === "escala"){
      ord.innerHTML = "<b>" + EN.esc(EN.nome(R)) + "</b> lê as notas em voz alta, área por área.";
      grid = tabelaEscala(d, r, e);
    } else {
      var o = ordemLeitura(r, e, i);
      ord.innerHTML = o.html;
      nada = !o.ordem.length;
      var ordem = o.ordem.slice();
      ["a", "b"].forEach(function(p){ if(ordem.indexOf(p) < 0) ordem.push(p); });
      ordem.forEach(function(p){
        var lido = o.ordem.indexOf(p) >= 0;
        var by = lido ? (e.leitura_propria ? "lidas por " + EN.nome(p) + ", com a própria voz" : "lidas em voz alta por " + EN.nome(EN.outro(p))) : "";
        var col = cartaoPessoa(r, e, p, by, textoPulo(e, r, p));
        if(e.nota && temResposta(r, e, p)) col.appendChild(caixaNota(r, e, p));
        grid.appendChild(col);
      });
    }
    c.appendChild(ord);
    c.appendChild(grid);
    if(!nada){
      if(e.em_voz_alta) c.appendChild(EN.elRico("div", "aloud", e.em_voz_alta));
      if(e.pergunta){
        var t = el("div", "tip");
        t.appendChild(txt("b", null, "Para puxar a conversa"));
        t.appendChild(document.createTextNode(e.pergunta));
        c.appendChild(t);
      }
    }
    var det = el("details", "noprint");
    det.style.marginTop = "16px";
    det.appendChild(txt("summary", null, "Rever as instruções desta etapa"));
    instrucoes(det, e);
    c.appendChild(det);

    var ultima = (i === d.etapas.length);
    if(ultima && d.data) c.appendChild(campoData(d, r));

    var act = el("div", "actions");
    act.appendChild(EN.botao("Voltar", "btn ghost", function(){ irAnterior(d, i); }));
    act.appendChild(EN.botao(ultima ? "Ver o que ficou escrito" : "Próxima etapa", "btn", function(){ irProxima(d, r, i); }));
    act.appendChild(el("span", "spacer"));
    act.appendChild(EN.botao("Refazer esta etapa", "btn quiet", function(){
      ["a", "b"].forEach(function(p){ if(EN.pulou(r, e.id, p) === "manual") EN.marcarPulo(r, e.id, p, false); });
      r.fases[e.id] = faseInicial(r, e, i);
      EN.tocar(r);
      EN.render(true);
    }));
    c.appendChild(act);
    c.appendChild(txt("p", "fineprint", "Avancem quando a conversa terminar, não quando o tempo acabar."));
  }

  function campoData(d, r, aoMudar){
    var fd = el("div", "field noprint");
    var row = el("div", "row");
    var l = txt("label", null, d.data.rotulo);
    l.setAttribute("for", "data-combinada");
    row.appendChild(l);
    fd.appendChild(row);
    var inp = document.createElement("input");
    inp.type = "date"; inp.id = "data-combinada";
    var hoje = EN.hojeISO();
    inp.min = hoje;
    inp.value = r.data || "";
    var agenda = EN.botao("Adicionar à agenda do celular", "btn ghost small", function(){
      if(r.data) EN.baixarAgenda("Entre Nós · " + d.titulo, d.data.rotulo, r.data);
    });
    agenda.disabled = !r.data;
    inp.addEventListener("change", function(){
      if(inp.value && inp.value < hoje){ inp.value = hoje; EN.toast("A data precisa ser de hoje em diante"); }
      r.data = inp.value; EN.tocar(r);
      agenda.disabled = !r.data;
      if(aoMudar) aoMudar();
    });
    fd.appendChild(inp);
    if(d.data.dica) fd.appendChild(txt("p", "hint", d.data.dica));
    var a = el("div", "actions");
    a.style.marginTop = "8px";
    a.appendChild(agenda);
    fd.appendChild(a);
    return fd;
  }

  /* ============================================================ resumo */
  function apagarPrivadas(d, r){
    d.etapas.forEach(function(e){
      if(e.privada){ delete r.respostas[e.id]; delete r.notas[e.id]; }
    });
    r.privadasApagadas = true;
  }
  EN.apagarPrivadas = apagarPrivadas;
  function temConteudo(v){
    if(typeof v === "string") return v.trim().length > 0;
    if(typeof v === "number") return true;
    if(v && typeof v === "object") return Object.keys(v).some(function(k){ return temConteudo(v[k]); });
    return false;
  }
  EN.temPrivadas = function(d, r){
    return d.etapas.some(function(e){
      return e.privada && (temConteudo(r.respostas[e.id]) || temConteudo(r.notas[e.id]));
    });
  };

  EN.telaResumo = function(id){
    var d = EN.D(id);
    var r = EN.run(id, false);
    var T = EN.T();
    if(!r.concluida){
      r.concluida = Date.now();
      r.etapa = d.etapas.length;
      apagarPrivadas(d, r);
      EN.tocar(r);
    }
    var wrap = el("div", "dyn-wrap");
    var c = el("section", "sheetcard");
    var ph = el("div", "printhead");
    ph.appendChild(txt("b", null, ((T.app && T.app.nome) || "Entre Nós") + " · " + d.titulo));
    ph.appendChild(txt("span", null, EN.nome("a") + " e " + EN.nome("b") + " · concluída em " + EN.dataDeTs(r.concluida)));
    c.appendChild(ph);
    c.appendChild(txt("div", "eyebrow", "Fim · guardem isto"));
    c.appendChild(titulo("h2", "O que ficou escrito"));
    c.appendChild(txt("p", "lead", d.texto_resumo || "Tudo o que vocês escreveram hoje. Salvem em PDF ou copiem: daqui a um mês esta página vale como combinado."));

    var sum = el("div", "sum");
    d.etapas.forEach(function(e, k){
      if(e.tipo === "leitura") return;
      var sec = el("section");
      sec.appendChild(txt("h3", null, (k + 1) + ". " + e.titulo));
      if(e.privada){
        sec.appendChild(txt("p", "kept", "Esta etapa não fica guardada."));
      } else if(e.campos.length === 1 && e.campos[0].tipo === "escala"){
        sec.appendChild(tabelaEscala(d, r, e));
      } else if(e.tipo === "a_quatro_maos"){
        var pj = el("div", "pair");
        pj.appendChild(cartaoJuntos(r, e));
        sec.appendChild(pj);
      } else {
        var pair = el("div", "pair");
        ["a", "b"].forEach(function(p){
          var col = cartaoPessoa(r, e, p, null, textoPulo(e, r, p));
          var nota = r.notas[e.id] && r.notas[e.id][p];
          if(e.nota && typeof nota === "number") col.appendChild(txt("p", "rated", "Nota de " + EN.nome(EN.outro(p)) + ": " + nota + "/10"));
          pair.appendChild(col);
        });
        sec.appendChild(pair);
      }
      sum.appendChild(sec);
    });
    c.appendChild(sum);

    if(r.data){
      var dd = el("div", "aloud");
      dd.appendChild(document.createTextNode("Combinado. " + d.data.rotulo + ": "));
      dd.appendChild(txt("b", null, EN.dataBR(r.data)));
      dd.appendChild(document.createTextNode("."));
      c.appendChild(dd);
      var ag = el("div", "actions noprint");
      ag.style.marginTop = "10px";
      ag.appendChild(EN.botao("Adicionar à agenda do celular", "btn ghost small", function(){ EN.baixarAgenda("Entre Nós · " + d.titulo, d.data.rotulo, r.data); }));
      c.appendChild(ag);
    } else if(d.data){
      c.appendChild(txt("p", "sectlabel noprint", "Ainda sem data"));
      c.appendChild(campoData(d, r, function(){ EN.render(false); }));
    }
    if(d.fechamento) c.appendChild(versiculos([d.fechamento]));

    var act = el("div", "actions");
    act.appendChild(EN.botao("Salvar em PDF", "btn", function(){
      try{ window.print(); }catch(x){ EN.toast("Este navegador não abriu a impressão. Use “Copiar tudo”."); }
    }));
    act.appendChild(EN.botao("Copiar tudo", "btn ghost", function(){ EN.copiar(textoResumo(d, r), "Copiado"); }));
    act.appendChild(el("span", "spacer"));
    act.appendChild(EN.botao("Voltar ao início", "btn quiet", function(){ EN.ir(""); }));
    c.appendChild(act);
    var fp = el("p", "fineprint noprint");
    fp.innerHTML = "No “Salvar em PDF”, escolha <b>Salvar como PDF</b> no destino da impressão. Se a janela não abrir, use “Copiar tudo”.";
    c.appendChild(fp);
    if(T.aviso_biblia) c.appendChild(txt("p", "bible-note", T.aviso_biblia));
    wrap.appendChild(c);
    wrap.appendChild(rodape(d, r, 0));
    return wrap;
  };

  function textoResumo(d, r){
    var T = EN.T();
    var out = [((T.app && T.app.nome) || "Entre Nós").toUpperCase() + " · " + d.titulo.toUpperCase(), EN.nome("a") + " e " + EN.nome("b") + " · concluída em " + EN.dataDeTs(r.concluida || Date.now()), ""];
    d.etapas.forEach(function(e, k){
      if(e.tipo === "leitura") return;
      out.push((k + 1) + ". " + e.titulo.toUpperCase());
      if(e.privada){
        out.push("  (esta etapa não fica guardada)");
      } else if(e.campos.length === 1 && e.campos[0].tipo === "escala"){
        var cp = e.campos[0];
        var va = EN.valor(r, e.id, "a", cp.id) || {}, vb = EN.valor(r, e.id, "b", cp.id) || {};
        cp.areas.forEach(function(area, ai){
          out.push("  " + area + ": " + EN.nome("a") + " " + (typeof va[ai] === "number" ? va[ai] : "sem nota") + " · " + EN.nome("b") + " " + (typeof vb[ai] === "number" ? vb[ai] : "sem nota"));
        });
      } else if(e.tipo === "a_quatro_maos"){
        e.campos.forEach(function(cp){
          var v = valorExibido(r, e, "j", cp);
          if(v) out.push("  " + EN.fmt(cp.rotulo, "j") + ": " + v);
        });
      } else {
        ["a", "b"].forEach(function(p){
          out.push("  " + EN.nome(p) + ":");
          if(EN.pulou(r, e.id, p)){ out.push("   " + textoPulo(e, r, p)); return; }
          e.campos.forEach(function(cp){
            var v = valorExibido(r, e, p, cp);
            if(v) out.push("   " + EN.fmt(cp.rotulo, p) + ": " + v);
          });
          var nota = r.notas[e.id] && r.notas[e.id][p];
          if(e.nota && typeof nota === "number") out.push("   Nota de " + EN.nome(EN.outro(p)) + ": " + nota + "/10");
        });
      }
      out.push("");
    });
    if(r.data) out.push(d.data.rotulo + ": " + EN.dataBR(r.data));
    if(d.fechamento) out.push("", d.fechamento.texto + " (" + d.fechamento.ref + ")");
    if(T.aviso_biblia) out.push("", T.aviso_biblia);
    return out.join("\n");
  }
  EN.textoResumo = textoResumo;

  /* ============================================================ dinâmica parada por mais de um dia */
  /* etapas cujo conteúdo uma etapa usa: depende_de, contexto, opções e diferença de notas */
  function usa(e){
    var out = [];
    if(e.depende_de) out = out.concat(e.depende_de.etapas || []);
    (e.campos || []).forEach(function(c){
      (c.contexto || []).forEach(function(cx){ out.push(cx.etapa); });
      if(c.opcoes_de) out.push(c.opcoes_de.etapa);
      if(c.contexto_diferenca) out.push(c.contexto_diferenca);
    });
    return out;
  }
  /* a primeira etapa privada de que a etapa atual precisa (ela mesma, se for privada); 0 se não precisa de nenhuma */
  function inicioDaCadeia(d, atual){
    var vistos = {}, fila = [d.etapas[atual - 1].id], menor = 0;
    while(fila.length){
      var sid = fila.shift();
      if(vistos[sid]) continue;
      vistos[sid] = true;
      var k = idxEtapa(d, sid);
      if(k < 0) continue;
      if(d.etapas[k].privada && (!menor || k + 1 < menor)) menor = k + 1;
      fila = fila.concat(usa(d.etapas[k]));
    }
    return menor;
  }

  /* Dinâmica parada por mais de um dia: as respostas das etapas privadas são apagadas.
     Etapas privadas já conversadas ficam marcadas como apagadas. Se a etapa atual é privada
     ou usa o conteúdo de uma etapa privada, o casal volta para o começo desse trecho. */
  EN.apagarParadas = function(){
    var mudou = false;
    Object.keys(EN.estado.runs).forEach(function(id){
      var d = EN.D(id);
      var r = d ? EN.run(id, false) : null;
      if(!d || !r || r.concluida || !r.comecou) return;
      if(Date.now() - (r.atualizado || 0) < EN.DIA) return;
      if(!EN.temPrivadas(d, r)) return;
      var atual = Math.min(Math.max(1, r.etapa || 1), d.etapas.length);
      var volta = inicioDaCadeia(d, atual);
      d.etapas.forEach(function(e, k){
        var n = k + 1;
        if(e.privada){
          delete r.respostas[e.id];
          delete r.notas[e.id];
          if(n < atual && (!volta || n < volta)) r.apagadas[e.id] = true;
        }
        if(volta && n >= volta){
          delete r.fases[e.id];
          delete r.pulos[e.id];
          delete r.apagadas[e.id];
        }
      });
      if(volta) r.etapa = volta;
      r.avisoApagadas = true;
      mudou = true;
    });
    if(mudou) EN.salvar();
    return mudou;
  };

  /* conteúdo mudou de estrutura: dinâmica em andamento recomeça */
  EN.conferirVersoes = function(){
    Object.keys(EN.estado.runs).forEach(function(id){
      var d = EN.D(id), r = EN.estado.runs[id];
      if(!d || !r || typeof r !== "object"){ if(d) delete EN.estado.runs[id]; return; }
      if((r.versao || 1) !== (d.versao || 1) && !r.concluida){
        delete EN.estado.runs[id];
        if(r.comecou) EN.estado.avisos.versao = d.titulo;
      }
    });
    EN.salvar();
  };
})();
