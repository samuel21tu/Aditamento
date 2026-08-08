package backend

type UnidadeData struct {
	Nome     string
	Sigla    string
	SiglaDoc string
	IDStart  int
}

var UnidadesData = map[string]UnidadeData{
	"BC":  {"BATERIA DE COMANDO", "Bia C", "BC", 301},
	"1BO": {"1ª BATERIA DE OBUSES", "1ª BO", "1ª BO", 401},
	"2BO": {"2ª BATERIA DE OBUSES", "2ª BO", "2ª BO", 501},
}

type FuncaoBase struct {
	Label string
	Key   string
}

var FuncoesBase = []FuncaoBase{
	{"OF DIA", "of_dia"},
	{"ADJ OF DIA", "adj_of_dia"},
	{"SGT DIA {unit}", "sgt_dia_bia_c"},
	{"CB DIA {unit}", "cb_dia_bia_c"},
	{"MOT DIA", "mot_dia"},
	{"PADIOLEIRO", "padioleiro"},
	{"SOMBRA", "sombra"},
	{"MOT VILA", "mot_vila"},
	{"GDA VILA", "gda_vila"},
	{"CMT GDA", "cmt_gda"},
	{"CMT GDA VILA", "cmt_gda_vila"},
	{"CB GDA QTEL", "cb_gda_qtel"},
	{"CB GDA VILA", "cb_gda_vila"},
	{"MOT SUP DIA", "mot_sup_dia"},
	{"GDA QTEL EP", "gda_qtel_ep"},
	{"REFORÇO EP", "reforco_ep"},
	{"PERM. HT", "permanencia_ht"},
	{"REFORÇO EV", "reforco_ev"},
}

var HasCategory = []string{"mot_dia", "padioleiro", "mot_vila"}

const DefaultCmt = "RENAN LOUREIRO LENTZ - Cap"
const DefaultSgte = "HEBERT CARLOS VIANA - 2° Sgt"
