package backend

import (
	"bytes"
	"fmt"
	"html/template"
	"sort"
	"strings"
	"time"
)

const arranchamentoTemplate = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
	@page {
		size: A4 portrait;
		margin: 8mm 10mm;
	}
	* {
		box-sizing: border-box;
	}
	body {
		font-family: Arial, sans-serif;
		font-size: 9px;
		margin: 0;
		padding: 0;
		color: #000;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 4px;
		page-break-inside: avoid;
		break-inside: avoid;
	}
	th, td {
		border: 1px solid black;
		padding: 2px 3px;
		vertical-align: middle;
	}
	.header-title {
		background-color: black !important;
		color: white !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		text-align: center;
		font-weight: bold;
		font-size: 13px;
		padding: 3px;
	}
	.section-title {
		background-color: black !important;
		color: white !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		text-align: center;
		font-weight: bold;
		font-size: 10.5px;
		padding: 2px;
	}
	.col-name {
		width: 25%;
		font-size: 8.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.col-mark {
		width: 2.7%;
		text-align: center;
		font-weight: bold;
		font-size: 8.5px;
	}
	.footer-table th, .footer-table td {
		text-align: center;
		font-size: 8.5px;
		padding: 2px;
	}
	.footer-table th {
		background-color: #f0f0f0 !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.signatures {
		width: 100%;
		margin-top: 15px;
		text-align: center;
		font-size: 9px;
		font-weight: bold;
		page-break-inside: avoid;
		break-inside: avoid;
	}
	.signatures td {
		border: none;
		padding-top: 15px;
	}
	.line {
		border-top: 1px solid black;
		width: 80%;
		margin: 0 auto;
		margin-bottom: 2px;
	}
	.page-footer {
		background-color: black !important;
		color: white !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		text-align: right;
		font-style: italic;
		font-size: 8.5px;
		padding: 2px 10px;
		margin-top: 8px;
		page-break-inside: avoid;
		break-inside: avoid;
	}
	@media print {
		body {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
</style>
</head>
<body>
	<div class="header-title">Arranchamento – {{.UnidadeNome}}</div>
	<div style="font-weight: bold; font-size: 11px; margin: 3px 0;">Data: {{.DataFormatada}}</div>

	{{if .Secoes}}
	{{range .Secoes}}
	{{if .Linhas}}
	<table style="table-layout: fixed;">
		<tr>
			<td colspan="12" class="section-title" style="border: none;">{{.Nome}}</td>
		</tr>
		<tr>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
		</tr>
		{{range .Linhas}}
		<tr>
			{{range .Celulas}}
			<td class="col-name text-left">{{.Nome}}</td>
			<td class="col-mark">{{.C}}</td>
			<td class="col-mark">{{.A}}</td>
			<td class="col-mark">{{.J}}</td>
			{{end}}
		</tr>
		{{end}}
	</table>
	{{end}}
	{{end}}
	{{else}}
	<table style="table-layout: fixed;">
		<tr>
			<td colspan="12" class="section-title" style="border: none;">Militares Arranchados</td>
		</tr>
		<tr>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
			<th class="col-name text-left">Nome</th><th class="col-mark">C</th><th class="col-mark">A</th><th class="col-mark">J</th>
		</tr>
		<tr>
			<td colspan="12" style="text-align: center; font-style: italic; padding: 6px;">Nenhum militar arranchado nesta data.</td>
		</tr>
	</table>
	{{end}}

	<table class="footer-table">
		<tr>
			<th colspan="4">Etapas reduzidas</th>
			<th colspan="4">Etapas Completas</th>
			<th>Alimentar</th>
			<th>Soma</th>
			<th>Tipo</th>
			<th>Quantitativo</th>
			<th>C HOSP</th>
			<th>C ESC</th>
			<th>CF 60%</th>
		</tr>
		<tr>
			<td colspan="1"></td>
			<td><b>C</b></td><td><b>A</b></td><td><b>J</b></td>
			<td colspan="4"></td>
			<td></td><td></td><td></td><td></td><td></td><td></td><td></td>
		</tr>
		<tr>
			<td><b>Oficiais</b></td>
			<td>{{.TotalOficiais.C}}</td><td>{{.TotalOficiais.A}}</td><td>{{.TotalOficiais.J}}</td>
			<td colspan="4"><b>Oficiais</b></td>
			<td>{{.TotalOficiais.A}}</td><td>{{.TotalOficiais.A}}</td><td>RR</td><td>{{.TotalOficiais.A}}</td>
			<td>*</td><td>*</td><td>*</td>
		</tr>
		<tr>
			<td><b>S Ten / Sgt</b></td>
			<td>{{.TotalSgt.C}}</td><td>{{.TotalSgt.A}}</td><td>{{.TotalSgt.J}}</td>
			<td colspan="4"><b>S Ten / Sgt</b></td>
			<td>{{.TotalSgt.A}}</td><td>{{.TotalSgt.A}}</td><td>RR</td><td>{{.TotalSgt.A}}</td>
			<td>*</td><td>*</td><td>*</td>
		</tr>
		<tr>
			<td><b>Cb / Sd</b></td>
			<td>{{.TotalCbSd.C}}</td><td>{{.TotalCbSd.A}}</td><td>{{.TotalCbSd.J}}</td>
			<td colspan="4"><b>Cb / Sd</b></td>
			<td>{{.TotalCbSd.A}}</td><td>{{.TotalCbSd.A}}</td><td>QR</td><td>{{.TotalCbSd.A}}</td>
			<td>*</td><td>*</td><td>*</td>
		</tr>
		<tr>
			<td><b>Total</b></td>
			<td>{{.TotalGeral.C}}</td><td>{{.TotalGeral.A}}</td><td>{{.TotalGeral.J}}</td>
			<td colspan="4"><b>Total</b></td>
			<td>{{.TotalGeral.A}}</td><td>{{.TotalGeral.A}}</td><td>CF</td><td>{{.TotalGeral.A}}</td>
			<td>*</td><td>*</td><td>*</td>
		</tr>
	</table>

	<table class="signatures">
		<tr>
			<td><div class="line"></div>Furriel</td>
			<td><div class="line"></div>Cmt SU</td>
			<td><div class="line"></div>Aprovisionador</td>
			<td><div class="line"></div>Fiscal administrativo</td>
		</tr>
	</table>

	<div class="page-footer">
		Arranchamento – {{.UnidadeSigla}} – Pagina 1/1
	</div>
</body>
</html>
`

type CelulaArranchamento struct {
	Nome string
	C    string
	A    string
	J    string
}

type LinhaArranchamento struct {
	Celulas []CelulaArranchamento
}

type SecaoArranchamento struct {
	Nome   string
	Linhas []LinhaArranchamento
}

type TotaisArranchamento struct {
	C string
	A string
	J string
}

type ArranchamentoData struct {
	UnidadeNome   string
	UnidadeSigla  string
	DataFormatada string
	Secoes        []SecaoArranchamento
	TotalOficiais TotaisArranchamento
	TotalSgt      TotaisArranchamento
	TotalCbSd     TotaisArranchamento
	TotalGeral    TotaisArranchamento
}

func parseDataFormatada(dataStr string) string {
	t, err := time.Parse("2006-01-02", dataStr)
	if err != nil {
		return dataStr
	}
	return t.Format("02/01/2006")
}

func boolToX(b bool) string {
	if b {
		return "X"
	}
	return ""
}

func agruparLinhas(nomes []string, refeicoes map[string]Refeicoes) []LinhaArranchamento {
	var linhas []LinhaArranchamento
	for i := 0; i < len(nomes); i += 3 {
		var celulas []CelulaArranchamento
		for j := 0; j < 3; j++ {
			idx := i + j
			if idx < len(nomes) {
				nome := nomes[idx]
				r := refeicoes[nome]
				
				celulas = append(celulas, CelulaArranchamento{
					Nome: nome,
					C:    boolToX(r.C),
					A:    boolToX(r.A),
					J:    boolToX(r.J),
				})
			} else {
				celulas = append(celulas, CelulaArranchamento{Nome: "", C: "", A: "", J: ""})
			}
		}
		linhas = append(linhas, LinhaArranchamento{Celulas: celulas})
	}
	return linhas
}

func isOficial(nome string) bool {
	upper := strings.ToUpper(nome)
	return strings.Contains(upper, "TEN ") || strings.Contains(upper, "CAP ") || strings.Contains(upper, "MAJ ") || strings.Contains(upper, "TC ") || strings.Contains(upper, "CEL ")
}

func isSargento(nome string) bool {
	upper := strings.ToUpper(nome)
	return strings.Contains(upper, "SGT ") || strings.Contains(upper, "ST ")
}

func isCbSd(nome string) bool {
	return !isOficial(nome) && !isSargento(nome)
}

func GenerateArranchamentoHTML(data string, arranchados map[string]Refeicoes, state AppState) (string, error) {
	var oficiais, sargentos, ep, ev []string
	
	// Only include militares that have at least one meal checked (C, A, or J)
	var names []string
	for p, r := range arranchados {
		if r.C || r.A || r.J {
			names = append(names, p)
		}
	}

	postoWeight := map[string]int{
		"Coronel":         1,
		"Tenente Coronel": 2,
		"Major":           3,
		"Capitão":         4,
		"1º Tenente":      5,
		"2º Tenente":      6,
		"Aspirante":       7,
		"Subtenente":      8,
		"1º Sargento":     9,
		"2º Sargento":     10,
		"3º Sargento":     11,
		"Cabo":            12,
		"Soldado EP":      13,
		"Soldado EV":      14,
	}

	sort.SliceStable(names, func(i, j int) bool {
		n1 := names[i]
		n2 := names[j]
		p1, has1 := state.Pessoas[n1]
		p2, has2 := state.Pessoas[n2]

		w1 := 99
		if has1 && postoWeight[p1.PostoGrad] > 0 {
			w1 = postoWeight[p1.PostoGrad]
		}
		w2 := 99
		if has2 && postoWeight[p2.PostoGrad] > 0 {
			w2 = postoWeight[p2.PostoGrad]
		}

		if w1 != w2 {
			return w1 < w2
		}

		idx1, ok1 := OriginalOrderMap[n1]
		idx2, ok2 := OriginalOrderMap[n2]

		if ok1 && ok2 {
			return idx1 < idx2
		} else if ok1 && !ok2 {
			return true
		} else if !ok1 && ok2 {
			return false
		}
		
		return n1 < n2
	})

	for _, p := range names {
		pData, exists := state.Pessoas[p]
		posto := ""
		if exists {
			posto = pData.PostoGrad
		}

		if posto == "Coronel" || posto == "Tenente Coronel" || posto == "Major" || posto == "Capitão" || posto == "1º Tenente" || posto == "2º Tenente" || posto == "Aspirante" || (posto == "" && isOficial(p)) {
			oficiais = append(oficiais, p)
		} else if posto == "Subtenente" || posto == "1º Sargento" || posto == "2º Sargento" || posto == "3º Sargento" || (posto == "" && isSargento(p)) {
			sargentos = append(sargentos, p)
		} else if posto == "Soldado EV" || (posto == "" && len(p) >= 3 && (p[0] == '3' || p[0] == '4' || p[0] == '5')) {
			ev = append(ev, p)
		} else { // Cabo e Soldado EP
			ep = append(ep, p)
		}
	}

	var secoes []SecaoArranchamento
	if len(oficiais) > 0 {
		secoes = append(secoes, SecaoArranchamento{Nome: "Oficiais", Linhas: agruparLinhas(oficiais, arranchados)})
	}
	if len(sargentos) > 0 {
		secoes = append(secoes, SecaoArranchamento{Nome: "Subtenentes / Sargentos", Linhas: agruparLinhas(sargentos, arranchados)})
	}
	if len(ep) > 0 {
		secoes = append(secoes, SecaoArranchamento{Nome: "Cabos / Soldados EP / Alunos", Linhas: agruparLinhas(ep, arranchados)})
	}
	if len(ev) > 0 {
		secoes = append(secoes, SecaoArranchamento{Nome: "Soldados EV", Linhas: agruparLinhas(ev, arranchados)})
	}

	countRefeicoes := func(nomes []string) TotaisArranchamento {
		c, a, j := 0, 0, 0
		for _, nome := range nomes {
			r := arranchados[nome]
			if r.C {
				c++
			}
			if r.A {
				a++
			}
			if r.J {
				j++
			}
		}
		return TotaisArranchamento{
			C: fmt.Sprintf("%02d", c),
			A: fmt.Sprintf("%02d", a),
			J: fmt.Sprintf("%02d", j),
		}
	}

	totOf := countRefeicoes(oficiais)
	totSgt := countRefeicoes(sargentos)
	allCbSd := append(append([]string{}, ep...), ev...)
	totCbSd := countRefeicoes(allCbSd)
	allMil := append(append(append([]string{}, oficiais...), sargentos...), allCbSd...)
	totGeral := countRefeicoes(allMil)

	unidadeNome := "Bateria de Comando"
	unidadeSigla := "BC"
	if uData, ok := UnidadesData[state.Unidade]; ok {
		if uData.Nome != "" {
			unidadeNome = uData.Nome
		}
		if uData.SiglaDoc != "" {
			unidadeSigla = uData.SiglaDoc
		}
	}

	dataObj := ArranchamentoData{
		UnidadeNome:   unidadeNome,
		UnidadeSigla:  unidadeSigla,
		DataFormatada: parseDataFormatada(data),
		Secoes:        secoes,
		TotalOficiais: totOf,
		TotalSgt:      totSgt,
		TotalCbSd:     totCbSd,
		TotalGeral:    totGeral,
	}

	tmpl, err := template.New("arr").Parse(arranchamentoTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, dataObj); err != nil {
		return "", err
	}

	return buf.String(), nil
}
