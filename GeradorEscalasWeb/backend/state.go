package backend

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Pessoa struct {
	Ativo             bool   `json:"ativo"`
	ApenasSemana      bool   `json:"apenas_semana,omitempty"`
	ApenasFimDeSemana bool   `json:"apenas_fim_de_semana,omitempty"`
	IsEP              bool   `json:"is_ep,omitempty"` // Mantido por compatibilidade
	FoiDeRota         bool   `json:"foi_de_rota,omitempty"`
	PostoGrad         string `json:"posto_grad,omitempty"`
	// Legacy fields
	IsPO           bool `json:"is_po,omitempty"`
	IsSargentiacao bool `json:"is_sargentiacao,omitempty"`
}

type RoleConfig struct {
	Name        string   `json:"name"`
	Weight      float64  `json:"weight"`
	Required    int      `json:"required"`
	ServiceType string   `json:"service_type,omitempty"` // "Interno" ou "Externo"
	DestinadoA  string   `json:"destinado_a,omitempty"`  // "EV", "EP", "AMBOS"
	Aptos       []string `json:"aptos,omitempty"`        // Lista de militares aptos para essa função
}

type Dispensa struct {
	Inicio string `json:"inicio"`
	Fim    string `json:"fim"`
}

type HistoricoEscala struct {
	Data          string              `json:"data"`
	DiaSemana     int                 `json:"dia_semana"`
	Escalados     map[string][]string `json:"escalados,omitempty"`
	SemExpediente bool                `json:"sem_expediente,omitempty"`
	GuardaComp    map[string]string   `json:"guarda_comp,omitempty"`
	ManualRoles   map[string]string   `json:"manual_roles,omitempty"`
	BoletimNr        string              `json:"boletim_nr,omitempty"`
	AditamentoNr     int                 `json:"aditamento_nr,omitempty"`
	BoletimInternoNr int                 `json:"boletim_interno_nr,omitempty"`
	InstrucaoNome      string            `json:"instrucao_nome,omitempty"`
	InstrucaoHorario   string            `json:"instrucao_horario,omitempty"`
	InstrucaoFardamento string           `json:"instrucao_fardamento,omitempty"`
	AssuntosGeraisText  string           `json:"assuntos_gerais_text,omitempty"`
	AssuntosAdminText   string           `json:"assuntos_admin_text,omitempty"`
	AtividadeTipo       string           `json:"atividade_tipo,omitempty"`
	ParadaDiaria        string           `json:"parada_diaria,omitempty"`
	JusticaDisciplinaText string         `json:"justica_disciplina_text,omitempty"`

	// Legacy fields for backward compatibility during unmarshal
	Guarda     []string `json:"guarda,omitempty"`
	Plantao    []string `json:"plantao,omitempty"`
	PlantaoEP  []string `json:"plantao_ep,omitempty"`
	PlantaoEV  []string `json:"plantao_ev,omitempty"`
	Apoio      []string `json:"apoio,omitempty"`
	SobreAviso []string `json:"sobre_aviso,omitempty"`
}

type Refeicoes struct {
	C bool `json:"c"`
	A bool `json:"a"`
	J bool `json:"j"`
}

type HistoricoArranchamento struct {
	Data      string               `json:"data"`
	Refeicoes map[string]Refeicoes `json:"refeicoes"`
}

type AppState struct {
	Unidade          string                 `json:"unidade"`
	Pessoas          map[string]Pessoa      `json:"pessoas"`
	HistoricoEscalas []HistoricoEscala      `json:"historico_escalas"`
	HistoricoArranchamentos []HistoricoArranchamento `json:"historico_arranchamentos,omitempty"`
	Dispensas        map[string][]Dispensa  `json:"dispensas_v2"`
	DispensasLegacy  map[string][][]string  `json:"dispensas,omitempty"`
	NomeCmt          string                 `json:"nome_cmt"`
	NomeSgte         string                 `json:"nome_sgte"`
	AditamentoNr     int                    `json:"aditamento_nr"`
	BoletimInternoNr int                    `json:"boletim_interno_nr"`
	RoleConfigs      map[string]RoleConfig  `json:"role_configs"`
}

func GetDefaultState(unidade string) AppState {
	if unidade == "" {
		return AppState{
			Unidade:          "",
			Pessoas:          make(map[string]Pessoa),
			HistoricoEscalas: []HistoricoEscala{},
			Dispensas:        make(map[string][]Dispensa),
			DispensasLegacy:  make(map[string][][]string),
			RoleConfigs:      make(map[string]RoleConfig),
		}
	}

	_, ok := UnidadesData[unidade]
	if !ok {
		unidade = ""
	}

	var listaAlvo []string
	if unidade == "BC" {
		listaAlvo = ListaMilitaresBC
	} else if unidade == "1BO" {
		listaAlvo = ListaMilitares1BO
	} else if unidade == "2BO" {
		listaAlvo = ListaMilitares2BO
	}

	pessoas := make(map[string]Pessoa)
	for _, name := range listaAlvo {
		ativo := !strings.Contains(name, "ALU")
		
		isEP := false
		if !strings.HasPrefix(name, "3") && !strings.HasPrefix(name, "4") && !strings.HasPrefix(name, "5") {
			isEP = true
		}

		postoGrad := "Cabo/Soldado EP"
		if strings.HasPrefix(name, "Cel") {
			postoGrad = "Coronel"
		} else if strings.HasPrefix(name, "Tc") {
			postoGrad = "Tenente Coronel"
		} else if strings.HasPrefix(name, "Maj") {
			postoGrad = "Major"
		} else if strings.HasPrefix(name, "Cap") {
			postoGrad = "Capitão"
		} else if strings.HasPrefix(name, "1º Ten") {
			postoGrad = "1º Tenente"
		} else if strings.HasPrefix(name, "2º Ten") {
			postoGrad = "2º Tenente"
		} else if strings.HasPrefix(name, "Asp") {
			postoGrad = "Aspirante"
		} else if strings.HasPrefix(name, "ST") {
			postoGrad = "Subtenente"
		} else if strings.HasPrefix(name, "1º Sgt") {
			postoGrad = "1º Sargento"
		} else if strings.HasPrefix(name, "2º Sgt") {
			postoGrad = "2º Sargento"
		} else if strings.HasPrefix(name, "3º Sgt") {
			postoGrad = "3º Sargento"
		} else if strings.HasPrefix(name, "Cb") || strings.HasPrefix(name, "CB") {
			postoGrad = "Cabo"
		} else if !isEP {
			postoGrad = "Soldado EV"
		} else {
			postoGrad = "Soldado EP"
		}

		pessoas[name] = Pessoa{
			Ativo:             ativo,
			ApenasSemana:      false,
			ApenasFimDeSemana: false,
			IsEP:              isEP,
			FoiDeRota:         !ativo,
			PostoGrad:         postoGrad,
		}
	}

	roles := map[string]RoleConfig{
		"MOT VILA":         {Name: "MOT VILA", Weight: 2.0, Required: 1, ServiceType: "Externo", DestinadoA: "EP"},
		"GDA VILA":         {Name: "GDA VILA", Weight: 3.0, Required: 1, ServiceType: "Externo", DestinadoA: "EV"},
		"PADIOLEIRO":       {Name: "PADIOLEIRO", Weight: 1.0, Required: 1, ServiceType: "Interno", DestinadoA: "EV"},
		"SOMBRA":           {Name: "SOMBRA", Weight: 1.0, Required: 1, ServiceType: "Interno", DestinadoA: "EV"},
		"GDA QTEL":         {Name: "GDA QTEL", Weight: 3.0, Required: 7, ServiceType: "Interno", DestinadoA: "EV"},
		"PLANTÃO ALOJ EP":  {Name: "PLANTÃO ALOJ EP", Weight: 2.0, Required: 3, ServiceType: "Interno", DestinadoA: "EP"},
		"PLANTÃO ALOJ EV":  {Name: "PLANTÃO ALOJ EV", Weight: 2.0, Required: 3, ServiceType: "Interno", DestinadoA: "EV"},
		"APOIO PRAIA/HT":   {Name: "APOIO PRAIA/HT", Weight: 1.0, Required: 2, ServiceType: "Interno", DestinadoA: "EP"},
		"SOBRE AVISO":      {Name: "SOBRE AVISO", Weight: 0.5, Required: 2, ServiceType: "Interno", DestinadoA: "AMBOS"},
	}

	return AppState{
		Unidade:          unidade,
		Pessoas:          pessoas,
		HistoricoEscalas: []HistoricoEscala{},
		Dispensas:        make(map[string][]Dispensa),
		NomeCmt:          DefaultCmt,
		NomeSgte:         DefaultSgte,
		RoleConfigs:      roles,
	}
}

func LoadState(filepath string) (AppState, error) {
	bytes, err := os.ReadFile(filepath)
	if err != nil {
		if os.IsNotExist(err) {
			return GetDefaultState(""), nil
		}
		return AppState{}, err
	}

	var state AppState
	err = json.Unmarshal(bytes, &state)
	if err != nil {
		return AppState{}, fmt.Errorf("error unmarshaling state: %v", err)
	}

	if state.Unidade == "" {
		state.Unidade = "BC"
	}
	if state.RoleConfigs == nil {
		state.RoleConfigs = GetDefaultState("BC").RoleConfigs
	}
	if state.Dispensas == nil {
		state.Dispensas = make(map[string][]Dispensa)
	}

	// Migrate RoleConfigs DestinadoA
	for rName, rc := range state.RoleConfigs {
		if rc.DestinadoA == "" {
			upperName := strings.ToUpper(rName)
			if strings.Contains(upperName, "EP") {
				rc.DestinadoA = "EP"
			} else if strings.Contains(upperName, "EV") {
				rc.DestinadoA = "EV"
			} else if rName == "GDA VILA" || rName == "GDA QTEL" || rName == "PADIOLEIRO" || rName == "SOMBRA" {
				rc.DestinadoA = "EV"
			} else if rName == "MOT VILA" || rName == "MOT DIA" || rName == "APOIO PRAIA/HT" {
				rc.DestinadoA = "EP"
			} else {
				rc.DestinadoA = "AMBOS"
			}
			state.RoleConfigs[rName] = rc
		}
	}

	// Migrate Pessoa Legacy flags
	for id, p := range state.Pessoas {
		migrated := false
		if p.IsSargentiacao {
			p.ApenasSemana = true
			p.IsSargentiacao = false
			migrated = true
		}
		if p.IsPO {
			p.ApenasFimDeSemana = true
			p.IsPO = false
			migrated = true
		}
		if migrated {
			state.Pessoas[id] = p
		}
	}

	// Migrate Dispensas Legacy
	if len(state.DispensasLegacy) > 0 {
		for id, ranges := range state.DispensasLegacy {
			for _, r := range ranges {
				if len(r) == 2 {
					state.Dispensas[id] = append(state.Dispensas[id], Dispensa{Inicio: r[0], Fim: r[1]})
				}
			}
		}
		state.DispensasLegacy = nil
	}
	for i := range state.HistoricoEscalas {
		if state.HistoricoEscalas[i].Escalados == nil {
			state.HistoricoEscalas[i].Escalados = make(map[string][]string)
		}
		
		// Migrate legacy fields to new map structure dynamically
		migrateLegacy := func(oldSlice []string, newRole string) []string {
			if len(oldSlice) > 0 {
				state.HistoricoEscalas[i].Escalados[newRole] = oldSlice
				return nil
			}
			return oldSlice
		}
		
		state.HistoricoEscalas[i].Guarda = migrateLegacy(state.HistoricoEscalas[i].Guarda, "Guarda")
		state.HistoricoEscalas[i].Plantao = migrateLegacy(state.HistoricoEscalas[i].Plantao, "Plantao")
		state.HistoricoEscalas[i].PlantaoEP = migrateLegacy(state.HistoricoEscalas[i].PlantaoEP, "Plantao EP")
		state.HistoricoEscalas[i].PlantaoEV = migrateLegacy(state.HistoricoEscalas[i].PlantaoEV, "Plantao EV")
		state.HistoricoEscalas[i].Apoio = migrateLegacy(state.HistoricoEscalas[i].Apoio, "Apoio")
		state.HistoricoEscalas[i].SobreAviso = migrateLegacy(state.HistoricoEscalas[i].SobreAviso, "Sobre Aviso")
	}

	// Migrate IDs to Names in Pessoas and HistoricoEscalas
	migratedPessoas := make(map[string]Pessoa)
	for id, p := range state.Pessoas {
		if newName, ok := MigrateMilitarMap[id]; ok {
			migratedPessoas[newName] = p
		} else {
			migratedPessoas[id] = p
		}
	}
	// Add missing from BC
	if state.Unidade == "BC" {
		for _, name := range ListaMilitaresBC {
			if _, exists := migratedPessoas[name]; !exists {
				isEP := false
				if !strings.HasPrefix(name, "3") {
					isEP = true
				}
				ativo := true
				if name == "335" || name == "345" {
					ativo = false
				}
				migratedPessoas[name] = Pessoa{Ativo: ativo, IsEP: isEP, FoiDeRota: !ativo}
			}
		}
	}
	state.Pessoas = migratedPessoas

	for i := range state.HistoricoEscalas {
		for role, list := range state.HistoricoEscalas[i].Escalados {
			for j, id := range list {
				if newName, ok := MigrateMilitarMap[id]; ok {
					state.HistoricoEscalas[i].Escalados[role][j] = newName
				}
			}
		}
	}

	return state, nil
}

func SaveState(filepath string, state AppState) error {
	bytes, err := json.MarshalIndent(state, "", "    ")
	if err != nil {
		return fmt.Errorf("error marshaling state: %v", err)
	}
	return os.WriteFile(filepath, bytes, 0644)
}
