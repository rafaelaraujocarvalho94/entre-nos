/* Entre Nós · telas fora das dinâmicas
   Início, lista de dinâmicas, combinados, doação, sobre, privacidade e como funciona.
   Todos os textos vêm de conteudo/textos.json e dos arquivos das dinâmicas. */
(function(){
  "use strict";
  var EN = window.EN;
  var el = EN.el, txt = EN.txt;

  /* ------------------------------------------------------------ desenhos das capas */
  var COR = "#D9BC78";
  function onda(fase){
    var d = "";
    for(var x = 6; x <= 94; x += 2){
      var y = 30 + 12 * Math.sin((x - 6) / 88 * Math.PI * 4 + fase);
      d += (x === 6 ? "M" : "L") + x + " " + y.toFixed(1);
    }
    return d;
  }
  var TERCO = Math.PI * 2 / 3;
  var abre = '<svg viewBox="0 0 100 60" fill="none" stroke="' + COR + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ART = {
    cordao: abre + '<path d="' + onda(TERCO * 2) + '" opacity=".5"/><path d="' + onda(TERCO) + '" opacity=".75"/><path d="' + onda(0) + '"/></svg>',
    cabo: abre + '<path d="M10 30h30"/><path d="M60 30h30"/><path d="M40 30c0-9 20-9 20 0s-20 9-20 0z"/><path d="M18 22l-8 8 8 8" opacity=".7"/><path d="M82 22l8 8-8 8" opacity=".7"/></svg>',
    mapa: abre + '<path d="M12 48c12-4 14-20 28-20s14 12 26 8 12-18 22-22" stroke-dasharray="2 8"/><circle cx="12" cy="48" r="3.5" fill="' + COR + '"/><path d="M88 6c-5 0-8 3.5-8 7.5 0 5 8 12.5 8 12.5s8-7.5 8-12.5c0-4-3-7.5-8-7.5z"/></svg>',
    casa: abre + '<path d="M14 30l18-16 18 16"/><path d="M19 27v21h26V27"/><path d="M29 48V37h6v11"/><path d="M56 34l14-12 14 12" opacity=".7"/><path d="M60 32v16h20V32" opacity=".7"/></svg>',
    sol: abre + '<path d="M10 46h80"/><path d="M28 46a22 22 0 0 1 44 0"/><path d="M50 8v8M22 20l5 5M78 20l-5 5" opacity=".7"/></svg>',
    aneis: abre + '<circle cx="40" cy="30" r="19"/><circle cx="60" cy="30" r="19"/></svg>'
  };
  var TRANCA = '<svg class="weave" viewBox="0 0 100 100" fill="none" stroke="' + COR + '" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M20 0c22 22 22 78 0 100"/><path d="M50 0c-22 22-22 78 0 100"/><path d="M50 0c22 22 22 78 0 100"/><path d="M80 0c-22 22-22 78 0 100"/></svg>';
  EN.CAPAS = Object.keys(ART);

  var SITUACAO = { done: "Concluída", going: "Em andamento", none: "Não começada" };

  EN.capa = function(d, comSituacao){
    var c = el("div", "cover", ART[d.capa] || ART.aneis);
    if(comSituacao){
      var s = EN.situacao(d.id);
      c.appendChild(txt("span", "state" + (s === "going" ? " going" : s === "none" ? " none" : ""), SITUACAO[s]));
    }
    return c;
  };

  /* ------------------------------------------------------------ consultas */
  /* a dinâmica em andamento mexida por último */
  EN.emAndamento = function(){
    var melhor = null;
    EN.conteudo.lista.forEach(function(d){
      if(EN.situacao(d.id) !== "going") return;
      var r = EN.estado.runs[d.id];
      if(!melhor || (r.atualizado || 0) > (melhor.r.atualizado || 0)) melhor = { d: d, r: r };
    });
    return melhor;
  };
  function concluidas(){
    return EN.conteudo.lista.filter(function(d){ return EN.situacao(d.id) === "done" && d.combinado; })
      .map(function(d){ return { d: d, r: EN.estado.runs[d.id] }; })
      .sort(function(x, y){ return (y.r.concluida || 0) - (x.r.concluida || 0); });
  }
  function titulo(h, texto, apoio){
    var t = el("div", "title");
    var h1 = txt("h1", "foco", texto);
    h1.setAttribute("tabindex", "-1");
    t.appendChild(h1);
    if(apoio) t.appendChild(txt("p", null, apoio));
    return t;
  }
  function linkExterno(texto, url, cls){
    var a = txt("a", cls || "btn", texto);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }
  function urlSegura(u){ return typeof u === "string" && /^https:\/\/[^\s]+$/i.test(u.trim()); }
  function emailValido(u){ return typeof u === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.trim()); }

  function cartaoCombinado(x){
    var d = x.d, r = x.r;
    var n = el("button", "note");
    n.type = "button";
    n.appendChild(txt("span", "k", d.combinado.rotulo));
    n.appendChild(txt("b", null, d.titulo));
    if(d.combinado.descricao) n.appendChild(txt("p", null, d.combinado.descricao));
    var linha;
    if(r.data){
      linha = ((d.data && d.data.curto) || "Data combinada:") + " " + EN.dataBR(r.data);
      if(r.data < EN.hojeISO()) linha += " · a data já passou";
    } else {
      linha = "Sem data marcada";
    }
    n.appendChild(txt("span", "d", linha));
    n.addEventListener("click", function(){ EN.ir("d/" + d.id + "/resumo"); });
    return n;
  }

  /* ============================================================ início */
  function telaInicio(){
    var T = EN.T();
    var v = el("div", "view");
    var h1 = txt("h1", "sr foco", "Entre Nós: início");
    h1.setAttribute("tabindex", "-1");
    v.appendChild(h1);

    var H = T.destaque || {};
    var hero = el("section", "hero", TRANCA);
    hero.appendChild(txt("div", "kick", H.rotulo || ""));
    hero.appendChild(txt("q", null, H.texto || ""));
    hero.appendChild(txt("div", "ref", H.ref || ""));
    v.appendChild(hero);

    var g = EN.emAndamento();
    if(g){
      var c = el("section", "cont");
      c.appendChild(txt("div", "lbl", "Continuar de onde pararam"));
      c.appendChild(txt("h2", null, g.d.titulo));
      var rail = el("div", "rail");
      rail.setAttribute("aria-hidden", "true");
      for(var i = 1; i <= g.d.etapas.length; i++) rail.appendChild(el("i", i < g.r.etapa ? "on" : ""));
      c.appendChild(rail);
      c.appendChild(txt("div", "meta", "Etapa " + g.r.etapa + " de " + g.d.etapas.length + " · " + g.d.tempo));
      c.appendChild(EN.botao("Continuar", "btn", function(){ EN.ir("d/" + g.d.id); }));
      v.appendChild(c);
    }

    var algumaComecou = EN.conteudo.lista.some(function(d){ return EN.situacao(d.id) !== "none"; });
    if(!algumaComecou){
      var cf = T.como_funciona || {};
      var p1 = el("div", "pad");
      var n1 = el("button", "note");
      n1.type = "button";
      n1.appendChild(txt("span", "k", "Primeira vez aqui"));
      n1.appendChild(txt("b", null, cf.titulo || "Como funciona"));
      if(cf.texto) n1.appendChild(txt("p", null, cf.texto));
      n1.addEventListener("click", function(){ EN.ir("como-funciona"); });
      p1.appendChild(n1);
      v.appendChild(p1);
    }

    var s1 = el("section");
    var h = el("div", "rowhead");
    h.appendChild(txt("h2", "rowtitle", "Dinâmicas"));
    h.appendChild(EN.botao("Ver todas", "more", function(){ EN.ir("dinamicas"); }));
    s1.appendChild(h);
    var sc = el("div", "scroller");
    EN.conteudo.lista.forEach(function(d){
      var card = el("button", "card");
      card.type = "button";
      card.appendChild(EN.capa(d, true));
      card.appendChild(txt("b", null, d.titulo));
      card.appendChild(txt("span", "t", d.tempo + " · " + d.etapas.length + " etapas"));
      card.addEventListener("click", function(){ EN.ir("d/" + d.id); });
      sc.appendChild(card);
    });
    s1.appendChild(sc);
    var paginas = Math.ceil(EN.conteudo.lista.length / 2);
    if(paginas > 1){
      var dots = el("div", "dots");
      dots.setAttribute("aria-hidden", "true");
      for(var pg = 0; pg < paginas; pg++) dots.appendChild(el("i", pg === 0 ? "on" : ""));
      sc.addEventListener("scroll", function(){
        var w = sc.clientWidth - 32 + 16;
        var atual = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4 ? paginas - 1 : Math.min(paginas - 1, Math.max(0, Math.round(sc.scrollLeft / w)));
        Array.prototype.forEach.call(dots.children, function(n, ix){ n.className = ix === atual ? "on" : ""; });
      }, { passive: true });
      s1.appendChild(dots);
    }
    v.appendChild(s1);

    var s2 = el("section");
    var lista = concluidas();
    var h2 = el("div", "rowhead");
    h2.appendChild(txt("h2", "rowtitle", "Nossos combinados"));
    if(lista.length) h2.appendChild(EN.botao("Ver todos", "more", function(){ EN.ir("combinados"); }));
    s2.appendChild(h2);
    var st = el("div", "stack");
    if(lista.length){
      lista.slice(0, 2).forEach(function(x){ st.appendChild(cartaoCombinado(x)); });
    } else {
      st.appendChild(txt("p", "empty-note", "Quando vocês concluírem uma dinâmica, o combinado que fizeram aparece aqui, com a data marcada para voltar a ele."));
    }
    s2.appendChild(st);
    v.appendChild(s2);
    return v;
  }

  /* ============================================================ dinâmicas */
  function telaDinamicas(){
    var v = el("div", "view");
    v.appendChild(titulo("h1", "Dinâmicas", "Conversas guiadas para fazer a dois, em um celular só. Comecem por qualquer uma."));
    var list = el("div", "list");
    EN.conteudo.lista.forEach(function(d){
      var s = EN.situacao(d.id);
      var r = EN.estado.runs[d.id];
      var it = el("button", "item");
      it.type = "button";
      it.appendChild(EN.capa(d, false));
      var box = el("div");
      box.appendChild(txt("b", null, d.titulo));
      if(d.descricao) box.appendChild(txt("p", null, d.descricao));
      var linha = SITUACAO[s] + " · " + (s === "going" ? "etapa " + r.etapa + " de " + d.etapas.length : d.tempo);
      box.appendChild(txt("span", "st" + (s === "none" ? " none" : ""), linha));
      it.appendChild(box);
      it.addEventListener("click", function(){ EN.ir("d/" + d.id); });
      list.appendChild(it);
    });
    v.appendChild(list);
    return v;
  }

  /* ============================================================ combinados */
  function telaCombinados(){
    var v = el("div", "view");
    v.appendChild(titulo("h1", "Nossos combinados", "O que vocês combinaram em cada dinâmica concluída, e a data marcada para voltar a ela. Toque para ver tudo o que ficou escrito."));
    var list = el("div", "list");
    var lista = concluidas();
    if(lista.length){
      lista.forEach(function(x){ list.appendChild(cartaoCombinado(x)); });
    } else {
      list.appendChild(txt("p", "empty-note", "Ainda não há combinados. Eles aparecem aqui quando vocês concluírem a primeira dinâmica."));
    }
    v.appendChild(list);
    v.appendChild(txt("p", "pad soft-note", "As etapas privadas não aparecem aqui. Elas são apagadas do aparelho quando a dinâmica termina."));
    return v;
  }

  /* ============================================================ doar */
  function crc16(s){
    var bytes = (window.TextEncoder ? new TextEncoder().encode(s) : s.split("").map(function(c){ return c.charCodeAt(0) & 255; }));
    var crc = 0xFFFF;
    for(var i = 0; i < bytes.length; i++){
      crc ^= bytes[i] << 8;
      for(var j = 0; j < 8; j++){
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return ("0000" + crc.toString(16).toUpperCase()).slice(-4);
  }
  /* confere o código PIX copia e cola (BR Code) antes de mostrar: começo, campo do CRC e o próprio CRC */
  EN.pixValido = function(p){
    p = String(p || "").trim();
    if(!/^000201/.test(p) || p.length < 30) return false;
    if(p.slice(-8, -4) !== "6304") return false;
    return crc16(p.slice(0, -4)) === p.slice(-4).toUpperCase();
  };
  function caixaPix(rotulo, valor, msg){
    var pix = el("div", "pix");
    var pd = el("div");
    pd.appendChild(txt("small", null, rotulo));
    pd.appendChild(txt("code", null, valor));
    pix.appendChild(pd);
    var b = EN.botao("Copiar", "btn small", function(){ EN.copiar(valor, msg); });
    b.setAttribute("aria-label", "Copiar " + rotulo.toLowerCase());
    pix.appendChild(b);
    return pix;
  }
  function telaDoar(){
    var T = EN.T(), D = T.doacao || {};
    var v = el("div", "view");
    v.appendChild(titulo("h1", D.titulo || "Doar", D.texto));
    var s = el("section", "page give");
    var copia = String(D.pix_copia_e_cola || "").trim();
    var copiaOk = copia && EN.pixValido(copia);
    var chave = String(D.chave_pix || "").trim();
    if(!copiaOk && !chave){
      s.appendChild(txt("p", "soft", D.texto_sem_dados || "Os dados para doação ainda vão ser publicados."));
    } else {
      if(copiaOk && window.qrcode){
        try{
          if(qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs["UTF-8"]) qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
          var q = qrcode(0, "M");
          q.addData(copia, "Byte");
          q.make();
          s.appendChild(el("div", "qr", q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, title: "QR Code do PIX para doar à igreja" })));
          s.appendChild(txt("p", "qrcap", "Para pagar com outro celular, abra o app do banco, escolha PIX e aponte a câmera para o código. Neste celular, use o copia e cola."));
        }catch(e){}
      }
      if(chave) s.appendChild(caixaPix("Chave PIX", chave, "Chave PIX copiada"));
      if(copiaOk) s.appendChild(caixaPix("PIX copia e cola", copia, "Código copiado. No app do banco, escolha PIX copia e cola."));
      var who = el("dl", "who");
      [["Quem recebe", D.recebedor], ["CNPJ", D.cnpj], ["Banco", D.banco]].forEach(function(row){
        if(!row[1]) return;
        who.appendChild(txt("dt", null, row[0]));
        who.appendChild(txt("dd", null, row[1]));
      });
      if(who.children.length) s.appendChild(who);
      s.appendChild(txt("p", "legal", "Antes de confirmar, confira no app do banco se o nome de quem recebe é o da igreja."));
    }
    v.appendChild(s);
    if(urlSegura(D.apoio_desenvolvedor_link)){
      var dev = el("div", "dev");
      dev.appendChild(txt("p", null, D.apoio_desenvolvedor_texto || "Quer ajudar quem desenvolve o app?"));
      dev.appendChild(linkExterno(D.apoio_desenvolvedor_rotulo || "Saiba como", D.apoio_desenvolvedor_link.trim(), "linklike"));
      v.appendChild(dev);
    }
    return v;
  }

  /* ============================================================ sobre */
  function contato(S){
    if(!S.responsavel && !S.contato) return null;
    var box = el("div");
    box.appendChild(txt("h3", null, "Quem faz"));
    var p = el("p");
    if(S.responsavel) p.appendChild(document.createTextNode(S.responsavel));
    if(S.contato){
      if(S.responsavel) p.appendChild(document.createTextNode(" · "));
      if(emailValido(S.contato)){
        var a = txt("a", null, S.contato.trim());
        a.href = "mailto:" + S.contato.trim();
        p.appendChild(a);
      } else if(urlSegura(S.contato)){
        p.appendChild(linkExterno(S.contato.trim(), S.contato.trim(), "inline"));
      } else {
        p.appendChild(document.createTextNode(S.contato));
      }
    }
    box.appendChild(p);
    return box;
  }
  function telaSobre(){
    var T = EN.T(), S = T.sobre || {};
    var v = el("div", "view");
    v.appendChild(titulo("h1", S.titulo || "Sobre"));
    var pg = el("section", "page");
    (S.paragrafos || []).forEach(function(t){ pg.appendChild(EN.elRico("p", null, t)); });
    if(S.limites) pg.appendChild(txt("p", "callout", S.limites));
    var c = contato(S);
    if(c) pg.appendChild(c);
    var acts = el("div", "actions tight");
    if(urlSegura(S.formulario_beta)) acts.appendChild(linkExterno(S.formulario_beta_rotulo || "Contar como foi", S.formulario_beta.trim(), "btn"));
    acts.appendChild(EN.botao("Como funciona", "btn ghost small", function(){ EN.ir("como-funciona"); }));
    acts.appendChild(EN.botao("Privacidade", "btn ghost small", function(){ EN.ir("privacidade"); }));
    pg.appendChild(acts);
    var app = T.app || {};
    pg.appendChild(txt("p", "legal", (app.nome || "Entre Nós") + " · " + (app.versao || "") + " · versão do site " + EN.versaoDoSite()));
    if(T.aviso_biblia) pg.appendChild(txt("p", "legal", T.aviso_biblia));
    v.appendChild(pg);
    return v;
  }

  /* ============================================================ privacidade */
  function telaPrivacidade(){
    var T = EN.T(), P = T.privacidade || {}, S = T.sobre || {};
    var v = el("div", "view");
    v.appendChild(titulo("h1", P.titulo || "Privacidade", P.atualizado_em ? "Atualizada em " + P.atualizado_em : ""));
    var pg = el("section", "page");
    if(P.resumo) pg.appendChild(txt("p", "lead-in", P.resumo));
    (P.secoes || []).forEach(function(sec){
      pg.appendChild(txt("h2", "sub", sec.titulo));
      pg.appendChild(EN.elRico("p", null, sec.texto));
    });
    var c = contato(S);
    if(c){
      c.firstChild.textContent = "Dúvidas";
      pg.appendChild(c);
    }
    v.appendChild(pg);

    var zona = el("section", "page");
    zona.appendChild(txt("h2", null, "Apagar tudo deste aparelho"));
    var qtd = Object.keys(EN.estado.runs).filter(function(id){ return EN.estado.runs[id] && EN.estado.runs[id].comecou; }).length;
    var temNomes = !!((EN.estado.nomes.a || "").trim() || (EN.estado.nomes.b || "").trim());
    var agora = qtd ? ("Hoje este aparelho guarda " + (qtd === 1 ? "as respostas de 1 dinâmica" : "as respostas de " + qtd + " dinâmicas") + (temNomes ? " e os nomes de vocês." : "."))
      : (temNomes ? "Hoje este aparelho guarda só os nomes de vocês." : "Hoje este aparelho não guarda nada do Entre Nós.");
    zona.appendChild(txt("p", null, agora));
    zona.appendChild(txt("p", "soft", "Apaga os nomes, todas as respostas, os resumos e os combinados. Não dá para desfazer, e o PDF ou o texto que vocês já salvaram fora do app continua onde está."));
    var a = el("div", "actions tight");
    a.appendChild(EN.botaoConfirmar("Apagar tudo", "Toque de novo para apagar tudo", "btn danger-solid", function(){
      EN.apagarTudo();
      EN.toast("Tudo apagado deste aparelho");
      EN.ir("", true);
    }));
    zona.appendChild(a);
    v.appendChild(zona);
    return v;
  }

  /* ============================================================ como funciona */
  function telaComo(){
    var T = EN.T(), C = T.como_funciona || {};
    var v = el("div", "view");
    v.appendChild(titulo("h1", C.titulo || "Como funciona", C.texto));
    var pg = el("section", "page");
    var how = el("ol", "how");
    (C.passos || []).forEach(function(s){ var li = document.createElement("li"); li.appendChild(EN.elRico("span", "txt", s)); how.appendChild(li); });
    pg.appendChild(how);
    pg.appendChild(txt("p", "soft", "Algumas etapas são privadas: o que for escrito nelas aparece só na hora de ler e é apagado do aparelho quando o resumo aparece."));
    v.appendChild(pg);

    var inst = el("section", "page");
    inst.id = "instalar";
    inst.appendChild(txt("h2", null, C.instalar_titulo || "Instalar"));
    if(C.instalar_iphone) inst.appendChild(txt("p", null, C.instalar_iphone));
    if(C.instalar_android) inst.appendChild(txt("p", null, C.instalar_android));
    if(EN.podeInstalar && EN.podeInstalar()){
      var ai = el("div", "actions tight");
      ai.appendChild(EN.botao("Instalar agora", "btn", function(){ EN.instalar(); }));
      inst.appendChild(ai);
    }
    v.appendChild(inst);
    var fim = el("div", "pad");
    fim.appendChild(EN.botao("Ver as dinâmicas", "btn", function(){ EN.ir("dinamicas"); }));
    v.appendChild(fim);
    return v;
  }

  EN.telas = {
    inicio: telaInicio,
    dinamicas: telaDinamicas,
    combinados: telaCombinados,
    doar: telaDoar,
    sobre: telaSobre,
    privacidade: telaPrivacidade,
    como: telaComo
  };
})();
