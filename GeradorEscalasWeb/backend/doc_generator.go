package backend

import (
	"bytes"
	_ "embed"
	"fmt"
	"html/template"
	"sort"
	"strings"
	"time"
)

//go:embed brasao.png
var brasaoBytes []byte

const docTemplate = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
	body { font-family: "Times New Roman", Times, serif; font-size: 14px; margin: 40px; }
	table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
	table.data-table th, table.data-table td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; }
	
	table.pernoite-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 11px; font-weight: bold; }
	table.pernoite-table th, table.pernoite-table td { border: 1px solid black; padding: 4px; text-align: center; vertical-align: middle; }

	table.header-table { width: 100%; border: none; margin-bottom: 20px; border-collapse: collapse; }
	table.header-table td { border: none; padding: 0; vertical-align: top; }
	
	.text-center { text-align: center; }
	body { font-family: 'Times New Roman', Times, serif; }
	.bold { font-weight: bold; }
	.underline { text-decoration: underline; }
	
	.right-box { width: 100px; height: 70px; border: 1px solid black; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 5px; float: right; margin-top: 15px; }
	.center-header { text-align: center; font-weight: bold; font-size: 14px; line-height: 1.1; }
	.brasao, svg { width: 60px; height: auto; display: block; margin: 0 auto 2px auto; background-color: white; }
	.bg-gray { background-color: #d9d9d9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.parte-title { font-weight: bold; text-align: center; margin-top: 30px; margin-bottom: 15px;}
	.text-left { text-align: left; }
</style>
</head>
<body>
	<table class="header-table" style="width: 100%;">
		<tr>
			<td style="width: 120px; vertical-align: top;"></td>
			<td class="center-header" style="vertical-align: top;">
				{{.BrasaoSVG}}
				MINISTÉRIO DA DEFESA<br>
				EXÉRCITO BRASILEIRO<br>
				17º GRUPO DE ARTILHARIA DE CAMPANHA<br>
				(6º Regimento de Artilharia Montada/1915)<br>
				GRUPO JERÔNIMO DE ALBUQUERQUE
			</td>
			<td style="width: 120px; vertical-align: top;">
				<div class="right-box">
					<span style="font-size: 10px;">_______________</span>
					<span style="font-size: 12px; margin-top: 2px;" class="bold underline">Visto Sgte</span>
				</div>
			</td>
		</tr>
	</table>
	
	<div class="text-center" style="margin-bottom: 20px;">
		Quartel em Natal /RN, {{.DataExtenso}}.<br>
		({{.DiaSemana}})
	</div>

	<div class="text-center bold" style="margin-bottom: 20px; padding: 0 10px;">
		ADITAMENTO AO BOLETIM INTERNO DA BATERIA DE COMANDO Nr {{.AditamentoNr}}/{{.Year}}, referente ao BOLETIM INTERNO Nr {{.BoletimInternoNr}}/{{.Year}}, do 17º GAC.
	</div>

	<div class="text-center" style="margin-bottom: 20px;">
		Para conhecimento desta Subunidade e devida execução, publico o seguinte:
	</div>

	<div class="parte-title" style="margin-top: 10px;">
		1ª Parte:<br>
		SERVIÇOS DIÁRIOS
	</div>

	{{range .Days}}
	<table class="data-table">
		{{if .ServicoExterno}}
		<tr><td colspan="3" bgcolor="#d9d9d9" style="background-color: #d9d9d9; font-weight: bold; text-align: center;">Serviço Externo para {{.DiaSemanaTitle}}, {{.DataExtenso}}.</td></tr>
		{{range .ServicoExterno}}
		<tr>
			<td style="width: 25%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">{{.RoleName}}</td>
			<td style="width: 15%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">{{.PostoGrad}}</td>
			<td class="text-center">{{.Names}}</td>
		</tr>
		{{end}}
		{{end}}

		{{if .ServicoInterno}}
		<tr><td colspan="3" bgcolor="#d9d9d9" style="background-color: #d9d9d9; font-weight: bold; text-align: center;">Serviço Interno para {{.DiaSemanaTitle}}, {{.DataExtenso}}.</td></tr>
		{{range .ServicoInterno}}
		<tr>
			<td style="width: 25%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">{{.RoleName}}</td>
			<td style="width: 15%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">{{.PostoGrad}}</td>
			<td class="text-center">{{.Names}}</td>
		</tr>
		{{end}}
		{{end}}
		<tr>
			<td style="width: 25%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">PARADA DIÁRIA</td>
			<td style="width: 15%; background-color: #d9d9d9; text-align: center;" bgcolor="#d9d9d9">-</td>
			<td class="text-center">{{if eq .ParadaDiaria "Personalizado"}}{{else if eq .ParadaDiaria ""}}09h30min{{else}}{{.ParadaDiaria}}min{{end}}</td>
		</tr>
	</table>
	{{end}}

	<div class="parte-title" style="margin-top: 30px;">
		2ª Parte<br>
		INSTRUÇÃO
	</div>
	{{if .HasInstrucao}}
	<div class="text-left" style="font-size: 14px; margin-bottom: 10px;">
		- Instrução: {{.InstrucaoNome}}<br>
		- Horário: {{.InstrucaoHorario}}<br>
		- Fardamento: {{.InstrucaoFardamento}}
	</div>
	{{else}}
	<div class="text-left" style="margin-bottom: 10px;">- Sem Alteração.</div>
	{{end}}

	<div class="parte-title">
		3ª Parte<br>
		ASSUNTOS GERAIS E ADMINISTRATIVOS
	</div>
	
	<div class="text-left bold">1. ASSUNTOS GERAIS</div>
	{{if .HasAssuntosGerais}}
	<div class="text-left" style="margin-bottom: 15px; font-size: 12px; white-space: pre-wrap;">{{.AssuntosGeraisText}}</div>
	{{else}}
	<div class="text-left" style="margin-bottom: 15px;">- Sem Alteração.</div>
	{{end}}
	
	<div class="text-left bold">2. ASSUNTOS ADMINISTRATIVOS</div>
	{{if .HasAssuntosAdmin}}
	<div class="text-left" style="margin-bottom: 10px; font-size: 12px; white-space: pre-wrap;">{{.AssuntosAdminText}}</div>
	{{else}}
	<div class="text-left" style="margin-bottom: 10px;">- Sem Alteração.</div>
	{{end}}
	
	{{range .Days}}
	{{if ne .AtividadeTipo "SEM EXPEDIENTE"}}
	<div class="text-left" style="margin-bottom: 10px; font-weight: bold; margin-top: 10px;">- INÍCIO DO EXPEDIENTE PARA {{.DiaSemanaUpper}}, {{.DataExtensoUpper}}</div>
	<div class="text-left" style="font-size: 12px; margin-bottom: 20px;">
		a. Atividade: {{.AtividadeTipo}}<br>
		{{if eq .AtividadeTipo "TFM"}}
		- Início do Expediente para OF/ST/SGT: 07h30min pronto no Campo de Futebol; Unif 14º.<br>
		- Início do Expediente para CB/SD EP: 07h30min pronto no Campo de Futebol; Unif 14º.<br>
		- Início do Expediente para SD EV: 06h45min pronto na SU; Unif 14º.
		{{else if eq .AtividadeTipo "FAXINA"}}
		- Início do Expediente para OF/ST/SGT: 07h30min pronto; Unif 12º.<br>
		- Início do Expediente para CB/SD EP: 07h30min pronto; Unif 12º.<br>
		- Início do Expediente para SD EV: 06h45min pronto na SU; Unif 12º.
		{{else if eq .AtividadeTipo "SEÇÃO"}}
		- Início do Expediente para OF/ST/SGT: 07h30min pronto; Unif da Seção.<br>
		- Início do Expediente para CB/SD EP: 07h30min pronto; Unif da Seção.<br>
		- Início do Expediente para SD EV: 06h45min pronto na SU; Unif 12º ou da Seção.
		{{else}}
		- Início do Expediente para OF/ST/SGT: 07h30min pronto.<br>
		- Início do Expediente para CB/SD EP: 07h30min pronto.<br>
		- Início do Expediente para SD EV: 06h45min pronto na SU.
		{{end}}
	</div>
	{{end}}
	{{end}}

	<div class="parte-title">
		4ª Parte<br>
		JUSTIÇA E DISCIPLINA
	</div>
	{{if .HasJusticaDisciplina}}
	<div class="text-left" style="white-space: pre-wrap; font-size: 12px; margin-bottom: 15px;">{{.JusticaDisciplinaText}}</div>
	{{else}}
	<div class="text-left">- Sem Alteração.</div>
	{{end}}

	<br><br><br><br>
	<div class="text-center">
		<p class="bold" style="margin-bottom: 0;">{{.CmtName}}</p>
		<p class="bold underline" style="margin-top: 0;">Comandante da Bateria De Comando</p>
	</div>

	{{range .Days}}
	<div style="page-break-before: always;"></div>
	<table style="width: 100%; border-collapse: collapse; text-align: center; font-weight: bold; font-size: 11px; border: 1px solid black;">
		<!-- Pernoite Header -->
		<tr>
			<td style="width: 15%; border-right: 1px solid black; vertical-align: top; padding: 5px;">
				<div style="text-decoration: underline; text-align: left;">Visto:</div>
				<br><br><br>
				<div>Cmt SU</div>
			</td>
			<td colspan="4" style="width: 85%; padding: 5px;">
				MINISTÉRIO DA DEFESA<br>
				EXÉRCITO BRASILEIRO<br>
				17º GRUPO DE ARTILHARIA DE CAMPANHA<br>
				Bateria De Comando
			</td>
		</tr>
		<tr>
			<td colspan="5" bgcolor="#d9d9d9" style="background-color: #d9d9d9; border-top: 1px solid black; padding: 5px;">
				Controle de Efetivo para {{.DiaSemanaTitle}}, {{.DataExtenso}}.
			</td>
		</tr>

		<!-- EM FORMA -->
		<tr>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">GRAD</td>
			<td colspan="3" style="width: 70%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">EM FORMA</td>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">SOMA</td>
		</tr>
		{{range .Pernoite.EmForma}}
		<tr>
			<td style="border: 1px solid black; padding: 4px;">{{.Grad}}</td>
			<td colspan="3" class="text-left" style="border: 1px solid black; padding: 4px 4px 4px 10px;">{{.Text}}</td>
			<td style="border: 1px solid black; padding: 4px;">{{.Soma}}</td>
		</tr>
		{{end}}
		<tr>
			<td colspan="4" class="text-left" style="border: 1px solid black; padding: 4px 4px 4px 10px;">TOTAL EM FORMA: {{.Pernoite.TotalEmFormaExtenso}}</td>
			<td style="border: 1px solid black; padding: 4px;">{{.Pernoite.TotalEmFormaNum}}</td>
		</tr>

		<!-- PUNIDOS -->
		<tr>
			<td colspan="5" bgcolor="#d9d9d9" style="background-color: #d9d9d9; border: 1px solid black; padding: 4px;">PUNIDOS DISCIPLINARMENTE</td>
		</tr>
		<tr>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">PROC.</td>
			<td style="width: 40%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">GRAD/NOME</td>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">TIPO</td>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">INÍCIO</td>
			<td style="width: 15%; border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">TÉRMINO</td>
		</tr>
		<tr>
			<td style="border: 1px solid black; padding: 4px;">-</td>
			<td style="border: 1px solid black; padding: 4px;">-</td>
			<td style="border: 1px solid black; padding: 4px;">-</td>
			<td style="border: 1px solid black; padding: 4px;">-</td>
			<td style="border: 1px solid black; padding: 4px;">-</td>
		</tr>

		<!-- OUTROS DESTINOS -->
		<tr>
			<td colspan="4" bgcolor="#d9d9d9" style="background-color: #d9d9d9; border: 1px solid black; padding: 4px;">EM OUTROS DESTINOS</td>
			<td style="border: 1px solid black; padding: 4px; background-color: #d9d9d9;" bgcolor="#d9d9d9">SOMA</td>
		</tr>
		{{range .Pernoite.OutrosDestinos}}
		<tr>
			<td style="border: 1px solid black; padding: 4px;">{{.Grad}}</td>
			<td colspan="3" class="text-left" style="border: 1px solid black; padding: 4px 4px 4px 10px;">{{.Text}}</td>
			<td style="border: 1px solid black; padding: 4px;">{{.Soma}}</td>
		</tr>
		{{end}}
		<tr>
			<td colspan="4" class="text-left" style="border: 1px solid black; padding: 4px 4px 4px 10px;">TOTAL EM OUTROS DESTINOS: {{.Pernoite.TotalOutrosDestinosExtenso}}</td>
			<td style="border: 1px solid black; padding: 4px;">{{.Pernoite.TotalOutrosDestinosNum}}</td>
		</tr>
		<tr>
			<td colspan="4" class="text-left" style="border: 1px solid black; padding: 4px 4px 4px 10px;">TOTAL GERAL: {{.Pernoite.TotalGeralExtenso}}</td>
			<td style="border: 1px solid black; padding: 4px;">{{.Pernoite.TotalGeralNum}}</td>
		</tr>

		<!-- Footer via colspan nested table -->
		<tr>
			<td colspan="5" style="border: 1px solid black; padding: 0;">
				<table style="width: 100%; border-collapse: collapse; text-align: center; font-weight: bold; font-size: 11px;">
					<tr>
						<td style="width: 25%; border-right: 1px solid black; vertical-align: top; padding: 5px; height: 80px;">
							<div style="text-align: left; text-decoration: underline;">Visto:</div>
							<br><br><br>
							<div style="text-decoration: underline;">Sgt Dia</div>
						</td>
						<td style="width: 50%; vertical-align: top; padding: 5px;">
							Quartel em Natal/RN, {{.DataExtenso}}.<br><br>
							<span style="font-size: 13px;">HEBERT CARLOS VIANA - 2º Sgt</span><br>
							<span style="text-decoration: underline; font-weight: normal;">Sargenteante da Bateria De Comando</span>
						</td>
						<td style="width: 25%; border-left: 1px solid black; vertical-align: top; padding: 5px;">
							<div style="text-align: left; text-decoration: underline;">Visto:</div>
							<br><br><br>
							<div style="text-decoration: underline;">Of Dia</div>
						</td>
					</tr>
					<tr>
						<td colspan="3" style="border-top: 1px solid black; padding: 5px 5px 15px 5px; text-align: left; font-weight: normal; line-height: 1.5;">
							Alteração: Com alteração ( &nbsp;&nbsp; ) Sem alteração ( &nbsp;&nbsp; )
							<br>
							__________________________________________________________________________________________________________________________________<br>
							__________________________________________________________________________________________________________________________________<br>
							__________________________________________________________________________________________________________________________________<br>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
	{{end}}

</body>
</html>
`

type RoleRow struct {
	RoleName  string
	PostoGrad string
	Names     string
	IsManual  bool
	Weight    float64
}

type PernoiteRow struct {
	Grad string
	Text template.HTML
	Soma string
}

type PernoiteData struct {
	EmForma                    []PernoiteRow
	TotalEmFormaNum            string
	TotalEmFormaExtenso        string
	OutrosDestinos             []PernoiteRow
	TotalOutrosDestinosNum     string
	TotalOutrosDestinosExtenso string
	TotalGeralNum              string
	TotalGeralExtenso          string
}

type DocDataDay struct {
	DataExtenso      string
	DataExtensoUpper string
	DiaSemanaTitle   string
	DiaSemanaUpper   string
	AtividadeTipo    string
	ParadaDiaria     string
	ServicoExterno   []RoleRow
	ServicoInterno   []RoleRow
	Pernoite         PernoiteData
}

type DocData struct {
	DataExtenso      string
	DataExtensoUpper string
	DiaSemana        string
	DiaSemanaUpper   string
	DiaSemanaTitle   string
	AditamentoNr     int
	BoletimInternoNr int
	Year             string
	CmtName          string
	UnidadeName      string
	BrasaoSVG        template.HTML
	HasInstrucao         bool
	InstrucaoNome        string
	InstrucaoHorario     string
	InstrucaoFardamento  string
	AssuntosGeraisText   string
	AssuntosAdminText    string
	HasAssuntosGerais    bool
	HasAssuntosAdmin     bool
	AtividadeTipo        string
	ParadaDiaria         string
	HasJusticaDisciplina bool
	JusticaDisciplinaText string
	Days []DocDataDay
}

var meses = []string{"janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"}
var diasSemana = []string{"Domingo", "Segunda - feira", "Terça - feira", "Quarta - feira", "Quinta - feira", "Sexta - feira", "Sábado"}

func formatarData(dataStr string) (string, string) {
	t, err := time.Parse("2006-01-02", dataStr)
	if err != nil {
		return dataStr, ""
	}
	dia := t.Day()
	mes := meses[t.Month()-1]
	ano := t.Year()
	
	dataExtenso := fmt.Sprintf("%d de %s de %d", dia, mes, ano)
	diaSemana := diasSemana[t.Weekday()]
	
	return dataExtenso, diaSemana
}

func toTitleCaseDia(d string) string {
	parts := strings.Split(d, " ")
	for i, p := range parts {
		if len(p) > 0 && p != "-" {
			runes := []rune(p)
			runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
			parts[i] = string(runes)
		}
	}
	return strings.Join(parts, " ")
}

func GenerateHTMLReport(items []HistoricoEscala, cmtName string, unidade string, state AppState, isWord bool) (string, error) {
	if len(items) == 0 {
		return "", fmt.Errorf("no items provided")
	}

	// Use the first item for the header dates
	firstItem := items[0]
	dataExtenso, diaSemana := formatarData(firstItem.Data)

	t, _ := time.Parse("2006-01-02", firstItem.Data)
	year := ""
	if !t.IsZero() {
		year = fmt.Sprintf("%d", t.Year())
	} else {
		year = "2026"
	}

	var days []DocDataDay

	for _, item := range items {
		var externo []RoleRow
		var interno []RoleRow

		dayDataExtenso, dayDiaSemana := formatarData(item.Data)

		// Process Manual Roles First
		for roleName, val := range item.ManualRoles {
			if strings.TrimSpace(val) == "" {
				continue
			}
			parts := strings.SplitN(val, "|", 2)
			postoGrad := "-"
			names := val
			if len(parts) == 2 {
				postoGrad = strings.TrimSpace(parts[0])
				names = strings.TrimSpace(parts[1])
			} else {
				// Try to guess from common prefixes
				prefixes := []string{"1º TEN", "2º TEN", "ASP", "ST", "1º SGT", "2º SGT", "3º SGT", "CB EP", "CB CET", "SD EP", "SD EV"}
				for _, p := range prefixes {
					if strings.HasPrefix(strings.ToUpper(val), p) {
						postoGrad = p
						names = strings.TrimSpace(val[len(p):])
						break
					}
				}
			}

			row := RoleRow{
				RoleName:  roleName,
				PostoGrad: postoGrad,
				Names:     names,
				IsManual:  true,
				Weight:    0, 
			}

			if strings.Contains(strings.ToUpper(roleName), "VILA") {
				externo = append(externo, row)
			} else {
				interno = append(interno, row)
			}
		}

		// Process Generated Roles (EV / EP)
		for roleName, list := range item.Escalados {
			if len(list) == 0 {
				continue
			}
			if strings.HasPrefix(strings.ToUpper(roleName), "MISSÃO:") {
				continue
			}

			// Determine if it's EP or EV
			isEP := false
			isEV := false
			for _, personID := range list {
				if p, ok := state.Pessoas[personID]; ok {
					if p.IsEP {
						isEP = true
					} else {
						isEV = true
					}
				} else {
					// If not found in state, assume EP if it's not a number
					isEV = true // fallback
				}
			}

			postoGrad := "-"
			if isEP && !isEV {
				postoGrad = "SD EP"
			} else if isEV && !isEP {
				postoGrad = "SD EV"
			} else if isEP && isEV {
				postoGrad = "SD EP/EV"
			}

			// Format names for EVs
			var formattedNames []string
			for _, personID := range list {
				if p, ok := state.Pessoas[personID]; ok && p.PostoGrad == "Soldado EV" {
					formattedNames = append(formattedNames, strings.Split(personID, " ")[0])
				} else {
					formattedNames = append(formattedNames, personID)
				}
			}

			names := strings.Join(formattedNames, " - ")
			weight := 0.0
			if cfg, ok := state.RoleConfigs[roleName]; ok {
				weight = cfg.Weight
			}

			row := RoleRow{
				RoleName:  roleName,
				PostoGrad: postoGrad,
				Names:     names,
				IsManual:  false,
				Weight:    weight,
			}

			if cfg, ok := state.RoleConfigs[roleName]; ok && cfg.ServiceType == "Externo" {
				externo = append(externo, row)
			} else if strings.Contains(strings.ToUpper(roleName), "VILA") {
				externo = append(externo, row)
			} else {
				interno = append(interno, row)
			}
		}

		// Map of military ranks for sorting (higher value = higher in the list)
		rankValue := map[string]int{
			"CEL":    100,
			"TC":     90,
			"MAJ":    80,
			"CAP":    70,
			"1º TEN": 60,
			"2º TEN": 50,
			"ASP":    45,
			"ST":     40,
			"1º SGT": 35,
			"2º SGT": 30,
			"3º SGT": 25,
			"CB EP":  20,
			"CB CET": 15,
			"SD EP":  10,
			"SD EV":  5,
			"-":      0,
		}

		getRankVal := func(pg string) int {
			pg = strings.TrimSpace(strings.ToUpper(pg))
			if val, exists := rankValue[pg]; exists {
				return val
			}
			// Try prefixes
			for k, v := range rankValue {
				if strings.HasPrefix(pg, k) {
					return v
				}
			}
			return 0
		}

		getStrictOrderVal := func(role string) int {
			r := strings.ToUpper(strings.TrimSpace(role))
			if strings.Contains(r, "ADJ OF DIA") { return 990 }
			if strings.Contains(r, "OF DIA") { return 1000 }
			if strings.Contains(r, "SGT DIA") { return 980 }
			if strings.Contains(r, "CMT GDA") { return 970 }
			if strings.Contains(r, "CB DIA") { return 960 }
			if strings.Contains(r, "MOT DIA") { return 950 }
			if strings.Contains(r, "PADIOLEIRO") { return 940 }
			if strings.Contains(r, "MOT VILA") { return 930 }
			if strings.Contains(r, "GDA VILA") { return 920 }
			if strings.Contains(r, "GDA QTEL EP") { return 910 }
			if strings.Contains(r, "GDA QTEL EV") { return 900 }
			if strings.Contains(r, "PLANTÃO ALOJ EP") || strings.Contains(r, "PLANTAO ALOJ EP") { return 890 }
			if strings.Contains(r, "PLANTÃO ALOJ EV") || strings.Contains(r, "PLANTAO ALOJ EV") { return 880 }
			return 0
		}

		// Helper to sort roles logically by Antiguidade and Importância
		sortFn := func(slice []RoleRow) {
			sort.SliceStable(slice, func(i, j int) bool {
				ordI := getStrictOrderVal(slice[i].RoleName)
				ordJ := getStrictOrderVal(slice[j].RoleName)
				
				// 1. Sort by Strict Manual Order
				if ordI != ordJ {
					return ordI > ordJ
				}

				rankI := getRankVal(slice[i].PostoGrad)
				rankJ := getRankVal(slice[j].PostoGrad)
				
				// 2. Sort by Rank (Antiguidade) descending
				if rankI != rankJ {
					return rankI > rankJ
				}
				
				// 3. Sort by Weight (Importância) descending
				if slice[i].Weight != slice[j].Weight {
					return slice[i].Weight > slice[j].Weight
				}
				
				// 4. Fallback to RoleName ascending
				return slice[i].RoleName < slice[j].RoleName
			})
		}

		sortFn(externo)
		sortFn(interno)

		allRoles := append([]RoleRow{}, interno...)
		allRoles = append(allRoles, externo...)
		
		emFormaMap := make(map[string][]string)
		outrosMap := make(map[string][]string)
		somaEmForma := make(map[string]int)
		somaOutros := make(map[string]int)
		
		for _, row := range allRoles {
			rank := mapToPernoiteRank(row.PostoGrad)
			c := countNames(row.Names)
			if c == 0 {
				continue
			}
			
			entry := fmt.Sprintf("%s: %s", row.RoleName, row.Names)
			
			if isEmForma(row.RoleName) {
				emFormaMap[rank] = append(emFormaMap[rank], entry)
				somaEmForma[rank] += c
			} else {
				outrosMap[rank] = append(outrosMap[rank], entry)
				somaOutros[rank] += c
			}
		}
		
		rankOrder := []string{"TEN", "SGT", "CB EP", "SD EP", "SD EV", "SD EP/EV"}
		for r := range emFormaMap {
			found := false
			for _, ro := range rankOrder { if r == ro { found = true; break } }
			if !found { rankOrder = append(rankOrder, r) }
		}
		for r := range outrosMap {
			found := false
			for _, ro := range rankOrder { if r == ro { found = true; break } }
			if !found { rankOrder = append(rankOrder, r) }
		}
		
		var efRows []PernoiteRow
		totalEf := 0
		for _, rank := range rankOrder {
			if list, ok := emFormaMap[rank]; ok && len(list) > 0 {
				total := somaEmForma[rank]
				totalEf += total
				efRows = append(efRows, PernoiteRow{
					Grad: rank,
					Text: template.HTML(strings.Join(list, "<br>")),
					Soma: fmt.Sprintf("%02d", total),
				})
			}
		}
		
		var odRows []PernoiteRow
		totalOd := 0
		for _, rank := range rankOrder {
			if list, ok := outrosMap[rank]; ok && len(list) > 0 {
				total := somaOutros[rank]
				totalOd += total
				odRows = append(odRows, PernoiteRow{
					Grad: rank,
					Text: template.HTML(strings.Join(list, "<br>")),
					Soma: fmt.Sprintf("%02d", total),
				})
			}
		}
		
		pernoiteData := PernoiteData{
			EmForma: efRows,
			TotalEmFormaNum: fmt.Sprintf("%02d", totalEf),
			TotalEmFormaExtenso: numeroPorExtenso(totalEf),
			OutrosDestinos: odRows,
			TotalOutrosDestinosNum: fmt.Sprintf("%02d", totalOd),
			TotalOutrosDestinosExtenso: numeroPorExtenso(totalOd),
			TotalGeralNum: fmt.Sprintf("%02d", totalEf + totalOd),
			TotalGeralExtenso: numeroPorExtenso(totalEf + totalOd),
		}

		atividadeDay := item.AtividadeTipo
		if atividadeDay == "" {
			atividadeDay = "TFM"
		}

		days = append(days, DocDataDay{
			DataExtenso:      dayDataExtenso,
			DataExtensoUpper: strings.ToUpper(dayDataExtenso),
			DiaSemanaTitle:   toTitleCaseDia(dayDiaSemana),
			DiaSemanaUpper:   strings.ToUpper(dayDiaSemana),
			AtividadeTipo:    atividadeDay,
			ParadaDiaria:     item.ParadaDiaria,
			ServicoExterno:   externo,
			ServicoInterno:   interno,
			Pernoite:         pernoiteData,
		})
	}

	var brasaoHTML template.HTML
	if isWord {
		brasaoHTML = template.HTML(`<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Coat_of_arms_of_Brazil.svg/200px-Coat_of_arms_of_Brazil.svg.png" style="width:60px;height:auto;display:block;margin:0 auto 5px auto;" />`)
	} else {
		brasaoHTML = template.HTML(BrasaoSVG)
	}

	hasInstrucao := firstItem.InstrucaoNome != "" || firstItem.InstrucaoHorario != "" || firstItem.InstrucaoFardamento != ""
	
	atividade := firstItem.AtividadeTipo
	if atividade == "" {
		atividade = "TFM"
	}

	data := DocData{
		DataExtenso:      dataExtenso,
		DataExtensoUpper: strings.ToUpper(dataExtenso),
		DiaSemana:        diaSemana,
		DiaSemanaUpper:   strings.ToUpper(diaSemana),
		DiaSemanaTitle:   toTitleCaseDia(diaSemana),
		AditamentoNr:     firstItem.AditamentoNr,
		BoletimInternoNr: firstItem.BoletimInternoNr,
		Year:             year,
		CmtName:          cmtName,
		UnidadeName:      unidade,
		BrasaoSVG:        brasaoHTML,
		HasInstrucao:        hasInstrucao,
		InstrucaoNome:       firstItem.InstrucaoNome,
		InstrucaoHorario:    firstItem.InstrucaoHorario,
		InstrucaoFardamento: firstItem.InstrucaoFardamento,
		AssuntosGeraisText:  firstItem.AssuntosGeraisText,
		AssuntosAdminText:   firstItem.AssuntosAdminText,
		HasAssuntosGerais:   firstItem.AssuntosGeraisText != "",
		HasAssuntosAdmin:    firstItem.AssuntosAdminText != "",
		AtividadeTipo:       atividade,
		ParadaDiaria:        firstItem.ParadaDiaria,
		HasJusticaDisciplina: firstItem.JusticaDisciplinaText != "",
		JusticaDisciplinaText: firstItem.JusticaDisciplinaText,
		Days:             days,
	}

	tmpl, err := template.New("doc").Parse(docTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func numeroPorExtenso(n int) string {
	if n < 0 || n > 99 {
		return fmt.Sprintf("%d", n)
	}
	unidades := []string{"ZERO", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"}
	dezenas := []string{"", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"}
	
	if n < 20 {
		return unidades[n]
	}
	
	u := n % 10
	d := n / 10
	
	if u == 0 {
		return dezenas[d]
	}
	return dezenas[d] + " E " + unidades[u]
}

func countNames(names string) int {
	parts := strings.Split(names, "-")
	count := 0
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			count++
		}
	}
	if count == 0 && strings.TrimSpace(names) != "" {
		return 1
	}
	return count
}

func mapToPernoiteRank(postoGrad string) string {
	pg := strings.ToUpper(strings.TrimSpace(postoGrad))
	if strings.Contains(pg, "TEN") || strings.Contains(pg, "ASP") || strings.Contains(pg, "OF") {
		return "TEN"
	}
	if strings.Contains(pg, "SGT") || strings.Contains(pg, "ST") {
		return "SGT"
	}
	if strings.Contains(pg, "CB") {
		return "CB EP"
	}
	if strings.Contains(pg, "SD EP") {
		return "SD EP"
	}
	if strings.Contains(pg, "SD EV") {
		return "SD EV"
	}
	if strings.Contains(pg, "SD EP/EV") || strings.Contains(pg, "SD") {
		return "SD EP/EV"
	}
	return pg 
}

func isEmForma(roleName string) bool {
	rn := strings.ToUpper(roleName)
	if strings.Contains(rn, "OF DIA") && !strings.Contains(rn, "ADJ") {
		return true 
	}
	if strings.Contains(rn, "SGT DIA") && !strings.Contains(rn, "SUP") {
		return true 
	}
	if strings.Contains(rn, "CB DIA") {
		return true 
	}
	if strings.Contains(rn, "PLANTÃO") || strings.Contains(rn, "PLANTAO") {
		return true 
	}
	return false
}
