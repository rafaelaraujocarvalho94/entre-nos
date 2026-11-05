#!/usr/bin/env python3
"""Confere o conteúdo do Entre Nós antes de publicar.

Roda sozinho no GitHub a cada alteração (veja .github/workflows/publicar.yml).
Também dá para rodar no computador:  python3 ferramentas/validar.py

ERRO impede a publicação, para o site não ir ao ar quebrado.
AVISO não impede, mas vale olhar.
"""
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, "conteudo")
NO_GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"

CAPAS = {"cordao", "cabo", "mapa", "casa", "sol", "aneis"}
TIPOS_ETAPA = {"individual", "a_quatro_maos", "leitura"}
TIPOS_CAMPO = {"linha", "texto", "escolha", "escala"}
MARCADORES = {"A", "B", "OUTRO"}

erros = []
avisos = []


def rel(caminho):
    return os.path.relpath(caminho, RAIZ).replace(os.sep, "/")


def erro(arquivo, onde, msg):
    erros.append((arquivo, onde, msg))


def aviso(arquivo, onde, msg):
    avisos.append((arquivo, onde, msg))


def sem_repetidas(pares):
    vistos = {}
    for k, v in pares:
        if k in vistos:
            raise ValueError('a chave "%s" aparece duas vezes no mesmo bloco' % k)
        vistos[k] = v
    return vistos


def ler_json(caminho):
    arq = rel(caminho)
    if not os.path.exists(caminho):
        erro(arq, "", "arquivo não encontrado")
        return None
    with open(caminho, encoding="utf-8-sig") as f:
        texto = f.read()
    try:
        return json.loads(texto, object_pairs_hook=sem_repetidas)
    except json.JSONDecodeError as e:
        dica = "confira vírgulas e aspas perto desse ponto"
        if "Expecting property name" in e.msg or "trailing comma" in e.msg:
            dica = "provavelmente sobrou uma vírgula antes de } ou ]"
        elif "Expecting ',' delimiter" in e.msg:
            dica = "provavelmente falta uma vírgula entre dois itens, ou há aspas \" dentro de um texto (use aspas curvas “ ” dentro dos textos)"
        elif "Invalid control character" in e.msg:
            dica = "há uma quebra de linha dentro de um texto; escreva tudo na mesma linha"
        trecho = texto.splitlines()[e.lineno - 1] if 0 < e.lineno <= len(texto.splitlines()) else ""
        if "“" in trecho[:e.colno + 1] and trecho.lstrip().startswith("“"):
            dica = "as aspas que abrem e fecham os textos do arquivo precisam ser retas (\"), não curvas (“ ”)"
        erro(arq, "linha %d, coluna %d" % (e.lineno, e.colno), "o arquivo não é um JSON válido: %s" % dica)
        return None
    except ValueError as e:
        erro(arq, "", str(e))
        return None


def textos_de(obj, caminho=""):
    """Percorre todos os textos de um objeto, devolvendo (caminho, texto)."""
    if isinstance(obj, str):
        yield caminho, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from textos_de(v, (caminho + "." if caminho else "") + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from textos_de(v, "%s[%d]" % (caminho, i))


def eh_citacao(caminho):
    """Textos bíblicos podem ter travessão, porque são citação literal."""
    return bool(re.search(r"(versiculos\[\d+\]\.texto|fechamento\.texto|versiculo\.texto|destaque\.texto)$", caminho))


def conferir_textos(arq, obj):
    for caminho, t in textos_de(obj):
        if caminho.endswith(("link", "formulario_beta", "pix_copia_e_cola", "chave_pix", "contato")):
            continue
        for m in re.findall(r"\{([^{}]*)\}", t):
            if m not in MARCADORES:
                erro(arq, caminho, "marcador {%s} desconhecido; use só {A}, {B} ou {OUTRO}" % m)
        sobra = re.sub(r"</?(strong|b)>", "", t)
        if "<" in sobra or ">" in sobra:
            erro(arq, caminho, "só dá para usar <strong> e </strong> (ou <b> e </b>) nos textos; troque os sinais < e > por palavras")
        if not eh_citacao(caminho) and ("—" in t or " – " in t):
            erro(arq, caminho, "texto com travessão (—). Troque por vírgula, dois-pontos, ponto ou parênteses")
        if t != t.strip():
            aviso(arq, caminho, "texto com espaço sobrando no começo ou no fim")
        if "  " in t:
            aviso(arq, caminho, "texto com dois espaços seguidos")


def crc16(s):
    crc = 0xFFFF
    for b in s.encode("utf-8"):
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if (crc & 0x8000) else (crc << 1)
            crc &= 0xFFFF
    return "%04X" % crc


def conferir_textos_gerais(t):
    arq = "conteudo/textos.json"
    if not isinstance(t, dict):
        erro(arq, "", "o arquivo precisa ser um objeto { ... }")
        return
    obrigatorios = [
        ("app", "nome"), ("destaque", "texto"), ("destaque", "ref"), ("preparacao", "titulo"),
        ("preparacao", "itens"), ("como_funciona", "passos"), ("sobre", "titulo"), ("sobre", "paragrafos"),
        ("privacidade", "titulo"), ("privacidade", "secoes"), ("doacao", "titulo"),
    ]
    for a, b in obrigatorios:
        if not isinstance(t.get(a), dict) or not t[a].get(b):
            erro(arq, "%s.%s" % (a, b), "campo obrigatório vazio ou ausente")
    if not t.get("aviso_biblia"):
        erro(arq, "aviso_biblia", "o aviso de direitos da NVI é obrigatório enquanto o app usar a NVI")
    for item in (t.get("preparacao") or {}).get("itens", []) or []:
        if not item.get("titulo") or not item.get("texto"):
            erro(arq, "preparacao.itens", "cada item precisa de titulo e texto")
    for s in (t.get("privacidade") or {}).get("secoes", []) or []:
        if not s.get("titulo") or not s.get("texto"):
            erro(arq, "privacidade.secoes", "cada seção precisa de titulo e texto")

    sobre = t.get("sobre") or {}
    doa = t.get("doacao") or {}
    for onde, url in (("sobre.formulario_beta", sobre.get("formulario_beta")), ("doacao.apoio_desenvolvedor_link", doa.get("apoio_desenvolvedor_link"))):
        if url and not re.match(r"^https://\S+$", url.strip()):
            erro(arq, onde, "o link precisa começar com https:// e não pode ter espaços")

    copia = (doa.get("pix_copia_e_cola") or "").strip()
    chave = (doa.get("chave_pix") or "").strip()
    if copia:
        if not copia.startswith("000201") or copia[-8:-4] != "6304":
            erro(arq, "doacao.pix_copia_e_cola", "não parece um PIX copia e cola. Copie de novo o código inteiro no app do banco")
        elif crc16(copia[:-4]) != copia[-4:].upper():
            erro(arq, "doacao.pix_copia_e_cola", "o código PIX está incompleto ou foi alterado (o dígito de conferência não bate). Copie de novo no app do banco")
    if chave:
        so_num = re.sub(r"\D", "", chave)
        formatos = [
            re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", chave),
            len(so_num) in (11, 14) and re.match(r"^[\d.\-/ ]+$", chave),
            re.match(r"^\+55\d{10,11}$", chave.replace(" ", "")),
            re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", chave),
        ]
        if not any(formatos):
            aviso(arq, "doacao.chave_pix", "a chave PIX não parece e-mail, CPF, CNPJ, celular (+55...) nem chave aleatória. Confira")
    if (copia or chave) and not doa.get("recebedor"):
        aviso(arq, "doacao.recebedor", "há dados de PIX, mas falta o nome de quem recebe. Ele ajuda as pessoas a conferirem antes de pagar")
    conferir_textos(arq, t)


def conferir_dinamica(caminho, d, id_esperado):
    arq = rel(caminho)
    if not isinstance(d, dict):
        erro(arq, "", "o arquivo precisa ser um objeto { ... }")
        return 0, 0
    if d.get("id") != id_esperado:
        erro(arq, "id", 'o id precisa ser "%s", igual ao nome do arquivo' % id_esperado)
    if not re.match(r"^[a-z0-9]+$", id_esperado or ""):
        erro(arq, "id", "o nome do arquivo (e o id) usa só letras minúsculas sem acento e números, sem espaço, hífen ou _")
    if not isinstance(d.get("versao"), int) or d.get("versao") < 1:
        erro(arq, "versao", "a versão precisa ser um número inteiro (1, 2, 3...)")
    for k in ("titulo", "tempo", "descricao"):
        if not d.get(k):
            erro(arq, k, "campo obrigatório vazio ou ausente")
    if d.get("capa") not in CAPAS:
        erro(arq, "capa", "capa desconhecida; use uma destas: " + ", ".join(sorted(CAPAS)))
    for a in d.get("avisos_preparacao", []) or []:
        if not a.get("titulo") or not a.get("texto"):
            erro(arq, "avisos_preparacao", "cada aviso precisa de titulo e texto")

    etapas = d.get("etapas")
    if not isinstance(etapas, list) or not etapas:
        erro(arq, "etapas", "a dinâmica precisa de etapas")
        return 0, 0
    pos = {}
    for i, e in enumerate(etapas):
        sid = e.get("id")
        if not sid or not re.match(r"^[a-z0-9_]+$", sid or ""):
            erro(arq, "etapa %d" % (i + 1), "id da etapa vazio ou com caracteres inválidos (use letras minúsculas sem acento, números e _)")
        elif sid in pos:
            erro(arq, 'etapa "%s"' % sid, "id repetido")
        pos[sid] = i
    campos_de = {e.get("id"): {c.get("id"): c for c in (e.get("campos") or [])} for e in etapas}

    citacoes = 0
    for i, e in enumerate(etapas):
        sid = e.get("id")
        onde = 'etapa "%s"' % sid
        tipo = e.get("tipo")
        if tipo not in TIPOS_ETAPA:
            erro(arq, onde, "tipo desconhecido; use individual, a_quatro_maos ou leitura")
            continue
        if not e.get("titulo") or not e.get("tempo"):
            erro(arq, onde, "a etapa precisa de titulo e tempo")
        for v in e.get("versiculos", []) or []:
            citacoes += 1
            if not v.get("texto") or not v.get("ref"):
                erro(arq, onde, "cada versículo precisa de texto e ref")
        if e.get("leitura_propria") and tipo != "individual":
            erro(arq, onde, "leitura_propria só vale para etapas individuais")
        if e.get("nota") and tipo != "individual":
            erro(arq, onde, "nota só vale para etapas individuais")
        if e.get("depende_de") and tipo != "individual":
            erro(arq, onde, "depende_de só vale para etapas individuais")

        dep = e.get("depende_de")
        if dep:
            if dep.get("quem") not in ("outro", "eu"):
                erro(arq, onde + " · depende_de", 'quem precisa ser "outro" ou "eu"')
            for x in dep.get("etapas") or []:
                if x not in pos:
                    erro(arq, onde + " · depende_de", 'a etapa "%s" não existe' % x)
                elif pos[x] >= i:
                    erro(arq, onde + " · depende_de", 'a etapa "%s" precisa vir antes desta' % x)
            if not dep.get("etapas"):
                erro(arq, onde + " · depende_de", "faltou a lista de etapas")
            if not dep.get("texto"):
                aviso(arq, onde + " · depende_de", "sem texto para explicar a etapa pulada")

        if tipo == "leitura":
            if not e.get("pontos"):
                erro(arq, onde, "etapa de leitura precisa de pontos")
            if e.get("campos"):
                erro(arq, onde, "etapa de leitura não tem campos")
            continue

        campos = e.get("campos") or []
        if not campos:
            erro(arq, onde, "a etapa precisa de pelo menos um campo")
        ids = set()
        for c in campos:
            cid = c.get("id")
            oc = onde + ' · campo "%s"' % cid
            if not cid or not re.match(r"^[a-z0-9_]+$", cid or ""):
                erro(arq, onde, "campo sem id ou com id inválido")
            elif cid in ids:
                erro(arq, oc, "id de campo repetido nesta etapa")
            ids.add(cid)
            ct = c.get("tipo")
            if ct not in TIPOS_CAMPO:
                erro(arq, oc, "tipo de campo desconhecido; use linha, texto, escolha ou escala")
                continue
            if not c.get("rotulo"):
                erro(arq, oc, "o campo precisa de rotulo")
            if "minimo" in c and (not isinstance(c["minimo"], int) or c["minimo"] < 1):
                erro(arq, oc, "minimo precisa ser um número inteiro maior que zero")
            if c.get("par"):
                par = c["par"]
                if par not in campos_de.get(sid, {}):
                    erro(arq, oc, 'par aponta para "%s", que não existe nesta etapa' % par)
                elif campos_de[sid][par].get("par") != cid:
                    erro(arq, oc, 'o campo "%s" também precisa apontar de volta com "par": "%s"' % (par, cid))
                if not c.get("opcional"):
                    aviso(arq, oc, "campos em par costumam ser opcionais (os dois em branco ou os dois preenchidos)")
            if ct == "escolha":
                if c.get("opcoes"):
                    if not isinstance(c["opcoes"], list) or not all(isinstance(o, str) and o for o in c["opcoes"]):
                        erro(arq, oc, "opcoes precisa ser uma lista de textos")
                else:
                    de = c.get("opcoes_de") or {}
                    if not de:
                        erro(arq, oc, "escolha precisa de opcoes ou de opcoes_de")
                    else:
                        if de.get("etapa") not in pos or pos[de.get("etapa")] >= i:
                            erro(arq, oc, "opcoes_de precisa apontar para uma etapa anterior")
                        if de.get("quem") not in ("outro", "eu", "os_dois"):
                            erro(arq, oc, 'opcoes_de.quem precisa ser "outro", "eu" ou "os_dois"')
                        for f in de.get("campos") or []:
                            if f not in campos_de.get(de.get("etapa"), {}):
                                erro(arq, oc, 'opcoes_de usa o campo "%s", que não existe na etapa "%s"' % (f, de.get("etapa")))
                        if tipo == "a_quatro_maos" and de.get("quem") != "os_dois":
                            erro(arq, oc, 'em etapa a quatro mãos, opcoes_de.quem precisa ser "os_dois"')
            if ct == "escala":
                if not isinstance(c.get("areas"), list) or not c.get("areas"):
                    erro(arq, oc, "escala precisa da lista de areas")
                if len(campos) != 1:
                    erro(arq, onde, "uma etapa com escala precisa ter só esse campo")
            for cx in c.get("contexto") or []:
                if cx.get("etapa") not in pos or pos[cx.get("etapa")] >= i:
                    erro(arq, oc, "contexto precisa apontar para uma etapa anterior")
                if cx.get("quem") not in ("outro", "eu"):
                    erro(arq, oc, 'contexto.quem precisa ser "outro" ou "eu"')
                for f in cx.get("campos") or []:
                    if f not in campos_de.get(cx.get("etapa"), {}):
                        erro(arq, oc, 'contexto usa o campo "%s", que não existe na etapa "%s"' % (f, cx.get("etapa")))
                if not cx.get("rotulo"):
                    erro(arq, oc, "contexto precisa de rotulo")
                if tipo == "a_quatro_maos":
                    erro(arq, oc, "contexto só funciona em etapas individuais")
            if c.get("contexto_diferenca"):
                alvo = c["contexto_diferenca"]
                if alvo not in pos or pos[alvo] >= i:
                    erro(arq, oc, "contexto_diferenca precisa apontar para uma etapa anterior")
                else:
                    cs = list(campos_de.get(alvo, {}).values())
                    if not cs or cs[0].get("tipo") != "escala":
                        erro(arq, oc, 'a etapa "%s" não tem escala para comparar' % alvo)

    if not isinstance(d.get("data"), dict) or not d["data"].get("rotulo") or not d["data"].get("curto"):
        erro(arq, "data", "a dinâmica precisa de data com rotulo e curto")
    comb = d.get("combinado")
    if not isinstance(comb, dict) or not comb.get("rotulo") or not comb.get("etapas"):
        erro(arq, "combinado", "a dinâmica precisa de combinado com rotulo e etapas")
    else:
        for x in comb.get("etapas"):
            if x not in pos:
                erro(arq, "combinado", 'a etapa "%s" não existe' % x)
            elif etapas[pos[x]].get("privada"):
                erro(arq, "combinado", 'a etapa "%s" é privada e é apagada no fim, então não pode ser o combinado' % x)
    fe = d.get("fechamento")
    if fe:
        citacoes += 1
        if not fe.get("texto") or not fe.get("ref"):
            erro(arq, "fechamento", "o fechamento precisa de texto e ref")
    conferir_textos(arq, d)
    return len(etapas), citacoes


def main():
    print("Conferindo o conteúdo do Entre Nós...")
    textos = ler_json(os.path.join(PASTA, "textos.json"))
    if textos is not None:
        conferir_textos_gerais(textos)
    lista = ler_json(os.path.join(PASTA, "dinamicas", "lista.json"))
    n_din = n_etapas = n_cit = 0
    if lista is not None:
        ordem = lista.get("ordem") if isinstance(lista, dict) else None
        if not isinstance(ordem, list) or not ordem:
            erro("conteudo/dinamicas/lista.json", "ordem", "a lista precisa de \"ordem\" com os ids das dinâmicas")
            ordem = []
        if len(set(ordem)) != len(ordem):
            erro("conteudo/dinamicas/lista.json", "ordem", "há dinâmica repetida na lista")
        for did in ordem:
            caminho = os.path.join(PASTA, "dinamicas", "%s.json" % did)
            d = ler_json(caminho)
            if d is not None:
                e, c = conferir_dinamica(caminho, d, did)
                n_din += 1
                n_etapas += e
                n_cit += c
        pasta = os.path.join(PASTA, "dinamicas")
        for nome in sorted(os.listdir(pasta)):
            if nome.endswith(".json") and nome != "lista.json" and nome[:-5] not in ordem:
                aviso("conteudo/dinamicas/" + nome, "", "este arquivo não está em lista.json, então não aparece no app")
        if isinstance(textos, dict):
            if (textos.get("preparacao") or {}).get("versiculo"):
                n_cit += 1
            if (textos.get("destaque") or {}).get("texto"):
                n_cit += 1

    for arq, onde, msg in avisos:
        print("AVISO  %s%s: %s" % (arq, (" · " + onde) if onde else "", msg))
        if NO_GITHUB:
            print("::warning file=%s::%s%s" % (arq, (onde + ": ") if onde else "", msg))
    for arq, onde, msg in erros:
        print("ERRO   %s%s: %s" % (arq, (" · " + onde) if onde else "", msg))
        if NO_GITHUB:
            print("::error file=%s::%s%s" % (arq, (onde + ": ") if onde else "", msg))
    if erros:
        print("\n%d erro(s). O site não foi publicado; corrija e salve de novo." % len(erros))
        return 1
    print("\nTudo certo: %d dinâmicas, %d etapas, %d citações bíblicas.%s" % (
        n_din, n_etapas, n_cit, (" %d aviso(s) acima." % len(avisos)) if avisos else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
