#!/usr/bin/env python3
"""Gera docs/versiculos-para-revisao.md com todos os versículos do app, na ordem em que aparecem.

Uso:  python3 ferramentas/listar_versiculos.py
Serve para o pastor (ou quem for revisar) conferir cada citação e o lugar onde ela é usada.
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(RAIZ, "conteudo")


def carregar(*partes):
    with open(os.path.join(C, *partes), encoding="utf-8-sig") as f:
        return json.load(f)


def bloco(linhas, ref, texto, onde):
    linhas.append("- [ ] **%s** (%s)  " % (ref, onde))
    linhas.append("  %s" % texto)
    linhas.append("")


def main():
    t = carregar("textos.json")
    ordem = carregar("dinamicas", "lista.json")["ordem"]
    linhas = [
        "# Versículos do Entre Nós, para revisão",
        "",
        "Todas as citações bíblicas do app, na ordem em que aparecem. O texto é o da NVI, edição 2023, e precisa ser copiado sem mudanças. Quando a citação usa só parte de um versículo, o corte aparece como “…”.",
        "",
        "Para cada uma, vale conferir duas coisas: se o texto está igual ao da Bíblia e se o versículo faz sentido no lugar onde aparece. Marque o quadradinho quando estiver conferido.",
        "",
        "Este arquivo é gerado a partir do conteúdo do app. Depois de mudar um versículo, gere de novo com `python3 ferramentas/listar_versiculos.py`.",
        "",
        "## Telas gerais",
        "",
    ]
    total = 0
    d0 = t.get("destaque") or {}
    if d0.get("texto"):
        bloco(linhas, d0.get("ref", ""), d0["texto"], "destaque da tela inicial")
        total += 1
    pv = (t.get("preparacao") or {}).get("versiculo") or {}
    if pv.get("texto"):
        bloco(linhas, pv.get("ref", ""), pv["texto"], "preparação, antes de toda dinâmica")
        total += 1
    for did in ordem:
        d = carregar("dinamicas", did + ".json")
        linhas.append("## %s" % d["titulo"])
        linhas.append("")
        for i, e in enumerate(d["etapas"], 1):
            for v in e.get("versiculos") or []:
                bloco(linhas, v["ref"], v["texto"], "etapa %d, %s" % (i, e["titulo"]))
                total += 1
        fe = d.get("fechamento")
        if fe:
            bloco(linhas, fe["ref"], fe["texto"], "fechamento, no resumo")
            total += 1
    linhas.append("---")
    linhas.append("")
    linhas.append("%d citações no total." % total)
    linhas.append("")
    linhas.append("Aviso de direitos exibido no app: " + t.get("aviso_biblia", ""))
    linhas.append("")
    os.makedirs(os.path.join(RAIZ, "docs"), exist_ok=True)
    destino = os.path.join(RAIZ, "docs", "versiculos-para-revisao.md")
    with open(destino, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas))
    print("Gerado: docs/versiculos-para-revisao.md (%d citações)" % total)


if __name__ == "__main__":
    main()
