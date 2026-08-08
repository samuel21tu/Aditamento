package backend

var ListaMilitaresBC = []string{
	// Oficiais
	"Tc DANTAS", "Tc SILVA SANTOS", "Cap CAMARA", "Cap THEOPHILO", "Cap LENTZ", 
	"1º Ten RENATO", "1º Ten RAUL", "1º Ten GABRIEL MARQUES", "1º Ten GUSTAVO BUARQUE", 
	"1º Ten RODRIGO VREA", "2º Ten CARVALHO", "2º Ten WOLNEY",
	// Sargentos
	"ST SEVERO", "ST GRACO", "1º Sgt MONIQUE", "2º Sgt CABRAL", "ST FERREIRA", 
	"3º Sgt PESSOA", "1º Sgt SÉRGIO C.", "1º Sgt SILVANILDO", "2º Sgt RAFAEL P.", 
	"2º Sgt HEBERT", "2º Sgt KENNEDY", "3º Sgt ALAN ALVES", "2º Sgt LANCASTER", 
	"2º Sgt ANILDO", "2º Sgt ARAUJO", "3º Sgt NETO", "3º Sgt HENRRY", "2º Sgt AQUINO", 
	"3º Sgt SAVIO", "3º Sgt JHONATAN", "3º Sgt GABRIEL NETO", "3º Sgt JOELITO", 
	"3º Sgt FIGUEIRA", "3º Sgt FEITOSA", "3º Sgt VARELA", "3º Sgt CUNHA", 
	"3º Sgt HIPOLITA", "3º Sgt TEIXEIRA",
	// EP
	"Cb EP BALBINO", "Cb EP VALMIR", "Cb EP SAMUEL", "Cb CET FABIO HUDSON", 
	"Cb EP HENRIQUE SOARES", "Cb EP SALES", "SD EP DOS SANTOS", "Cb EP ALYSSON COSTA", 
	"Cb EP MATOS", "SD EP HIGINO", "SD EP ANDREY", "Cb EP WILLAME", "Cb EP SILVA", 
	"Cb EP ROQUE", "SD EP MAEL", "SD EP PRAXEDES", "Cb CET GETÚLIO", "Cb EP JOALISON", 
	"Cb EP DOUGLAS", "SD EP IGOR", "SD EP QUEIROZ", "Cb CET VITOR", "SD EP VINICIUS", 
	"SD EP ALU CRISTIAN", "Cb EP PAULO", "SD EP COSTA", "SD EP IZAU", "SD EP ALU LIMA ALVES", 
	"SD EP ALU FONSECA", "SD EP ALEXANDRE", "SD EP ARTHUR", "SD EP FILHO", "CB AYROM", 
	"SD EP ANTUNES", "SD EP AMORIM", "SD EP DA CRUZ", "SD EP ALU DE MELO", "SD EP LOAN", 
	"SD EP AMERICO", "SD EP ALU ABDIAS", "SD EP GOMES",
	// EV
	"301 ADRIANO", "302 ROCHA", "303 ARNÓBIO", "304 RAMOS", "305 CAUÃ", 
	"306 MIRANDA", "307 DE LIMA", "308 MATIAS", "309 DO NASCIMENTO", "310 NUNES", 
	"311 RODRIGUES", "312 BANDEIRA", "313 EVANDRO", "314 WALLES", "315 BATISTA", 
	"316 FREITAS", "317 R. SANTOS", "318 THIAGO", "319 ESTEVAM", "320 TOSCANO", 
	"321 SALDANHA", "322 BEZERRA", "323 FERNANDO", "324 PEDRO SANTOS", "325 JOÃO GOMES", 
	"326 MENDONÇA", "327 CÂMARA", "328 FAUSTO", "329 LINHARES", "330 JAIR", 
	"331 KAUÃ", "332 BORBA", "333 XAVIER", "334 LEANDRO", "335", "336 RUFINO", 
	"337 DE AQUINO", "338 F. SANTOS", "339 FLORÊNCION", "340 SANTOS", "341 EPIFANIO", 
	"342 M. SOUZA", "343 DE FRANÇA", "344 MACHADO", "345", "346 NICÁSSIO", "347 MOURA", 
	"348 KAIURY", "349 BRAZ", "350 VICTOR ALVES", "351 RAIKKONEN", "352 FERNANDES", 
	"353 MANOEL", "354 GABRIEL", "355 V. SILVA", "356 LUCAS LIMA", "357 PONTES", 
	"358 WILSON", "359 YAN",
}

var ListaMilitares1BO = []string{}
var ListaMilitares2BO = []string{}

// Map used to migrate old ID (e.g. "301") to new Name ("301 ADRIANO")
var MigrateMilitarMap map[string]string

// Original order for seniority sorting
var OriginalOrderMap map[string]int

func init() {
	MigrateMilitarMap = make(map[string]string)
	OriginalOrderMap = make(map[string]int)
	todasAsListas := [][]string{ListaMilitaresBC, ListaMilitares1BO, ListaMilitares2BO}
	globalIndex := 0
	for _, lista := range todasAsListas {
		for _, name := range lista {
			OriginalOrderMap[name] = globalIndex
			globalIndex++

			if len(name) >= 3 {
				// If it's an EV, map its number to its full name
				if name[0] == '3' || name[0] == '4' || name[0] == '5' {
					num := name[:3]
					MigrateMilitarMap[num] = name
				}
			}
		}
	}
}
