UNIDADES_DATA = {
    "BC": {"nome": "BATERIA DE COMANDO", "sigla": "Bia C", "sigla_doc": "BC", "id_start": 301},
    "1BO": {"nome": "1ª BATERIA DE OBUSES", "sigla": "1ª BO", "sigla_doc": "1ª BO", "id_start": 401},
    "2BO": {"nome": "2ª BATERIA DE OBUSES", "sigla": "2ª BO", "sigla_doc": "2ª BO", "id_start": 501},
}

NUM_WORDS = {
    0: "ZERO", 1: "UM", 2: "DOIS", 3: "TRÊS", 4: "QUATRO", 5: "CINCO", 
    6: "SEIS", 7: "SETE", 8: "OITO", 9: "NOVE", 10: "DEZ", 
    11: "ONZE", 12: "DOZE", 13: "TREZE", 14: "QUATORZE", 15: "QUINZE", 
    16: "DEZESSEIS", 17: "DEZESSETE", 18: "DEZOITO", 19: "DEZENOVE", 20: "VINTE",
    21: "VINTE E UM", 22: "VINTE E DOIS", 23: "VINTE E TRÊS", 24: "VINTE E QUATRO", 25: "VINTE E CINCO",
    26: "VINTE E SEIS", 27: "VINTE E SETE", 28: "VINTE E OITO", 29: "VINTE E NOVE", 30: "TRINTA",
    31: "TRINTA E UM", 32: "TRINTA E DOIS", 33: "TRINTA E TRÊS", 34: "TRINTA E QUATRO", 35: "TRINTA E CINCO",
    36: "TRINTA E SEIS", 37: "TRINTA E SETE", 38: "TRINTA E OITO", 39: "TRINTA E NOVE", 40: "QUARENTA",
    41: "QUARENTA E UM", 42: "QUARENTA E DOIS", 43: "QUARENTA E TRÊS", 44: "QUARENTA E QUATRO", 45: "QUARENTA E CINCO",
    46: "QUARENTA E SEIS", 47: "QUARENTA E SETE", 48: "QUARENTA E OITO", 49: "QUARENTA E NOVE", 50: "CINQUENTA"
}

# Funções de preenchimento manual
# A sigla da unidade (u_sigla_doc) é injetada dinamicamente no app.py
FUNCOES_BASE = [
    ("OF DIA", "of_dia"), 
    ("ADJ OF DIA", "adj_of_dia"), 
    ("SGT DIA {unit}", "sgt_dia_bia_c"), 
    ("CB DIA {unit}", "cb_dia_bia_c"), 
    ("MOT DIA", "mot_dia"), 
    ("PADIOLEIRO", "padioleiro"), 
    ("SOMBRA", "sombra"), 
    ("MOT VILA", "mot_vila"), 
    ("GDA VILA", "gda_vila"),
    ("CMT GDA", "cmt_gda"), 
    ("CMT GDA VILA", "cmt_gda_vila"),
    ("CB GDA QTEL", "cb_gda_qtel"), 
    ("CB GDA VILA", "cb_gda_vila"),
    ("MOT SUP DIA", "mot_sup_dia"), 
    ("GDA QTEL EP", "gda_qtel_ep"), 
    ("REFORÇO EP", "reforco_ep"),
    ("PERM. HT", "permanencia_ht"), 
    ("REFORÇO EV", "reforco_ev")
]

HAS_CATEGORY = ["mot_dia", "padioleiro", "mot_vila"]

DEFAULT_CMT = "RENAN LOUREIRO LENTZ - Cap"
DEFAULT_SGTE = "HEBERT CARLOS VIANA - 2° Sgt"
