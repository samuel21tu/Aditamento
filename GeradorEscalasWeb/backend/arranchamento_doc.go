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
		margin: 10mm;
	}
	body {
		font-family: Arial, sans-serif;
		font-size: 10px;
		margin: 0;
		padding: 0;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 5px;
	}
	th, td {
		border: 1px solid black;
		padding: 2px 4px;
		vertical-align: middle;
	}
	.header-title {
		background-color: black;
		color: white;
		text-align: center;
		font-weight: bold;
		font-size: 14px;
		padding: 4px;
	}
	.section-title {
		background-color: black;
		color: white;
		text-align: center;
		font-weight: bold;
		font-size: 12px;
		padding: 2px;
	}
	.col-name {
		width: 25%;
		font-size: 9px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.col-mark {
		width: 3%;
		text-align: center;
		font-weight: bold;
	}
	.footer-table th, .footer-table td {
		text-align: center;
		font-size: 10px;
	}
	.signatures {
		width: 100%;
		margin-top: 20px;
		text-align: center;
		font-size: 10px;
		font-weight: bold;
	}
	.signatures td {
		border: none;
		padding-top: 20px;
	}
	.line {
		border-top: 1px solid black;
		width: 80%;
		margin: 0 auto;
		margin-bottom: 2px;
	}
	.page-footer {
		background-color: black;
		color: white;
		text-align: right;
		font-style: italic;
		font-size: 9px;
		padding: 2px 10px;
		margin-top: 10px;
	}
</style>
</head>
<body>
	<div class="header-title">Arranchamento – Bateria de Comando</div>
	<div style="font-weight: bold; font-size: 12px; margin: 4px 0;">Data: {{.DataFormatada}}</div>

	{{range .Secoes}}
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
			<td class="col-name text-left" style="font-size: 8px;">{{.Nome}}</td>
			<td class="col-mark">{{.C}}</td>
			<td class="col-mark">{{.A}}</td>
			<td class="col-mark">{{.J}}</td>
			{{end}}
		</tr>
		{{end}}
	</table>
	{{end}}

	<table class="footer-table">
		<tr>
			<th colspan="4" style="background-color: #f0f0f0;">Etapas reduzidas</th>
			<th colspan="4" style="background-color: #f0f0f0;">Etapas Completas</th>
			<th style="background-color: #f0f0f0;">Alimentar</th>
			<th style="background-color: #f0f0f0;">Soma</th>
			<th style="background-color: #f0f0f0;">Tipo</th>
			<th style="background-color: #f0f0f0;">Quantitativo</th>
			<th style="background-color: #f0f0f0;">C HOSP</th>
			<th style="background-color: #f0f0f0;">C ESC</th>
			<th style="background-color: #f0f0f0;">CF 60%</th>
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
		Arranchamento – BC – Pagina 1/1
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
	
	// Create a sorted slice of names from state
	var names []string
	for p := range state.Pessoas {
		names = append(names, p)
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
		p1 := state.Pessoas[n1]
		p2 := state.Pessoas[n2]

		w1 := postoWeight[p1.PostoGrad]
		if w1 == 0 {
			w1 = 99
		}
		w2 := postoWeight[p2.PostoGrad]
		if w2 == 0 {
			w2 = 99
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
		pData := state.Pessoas[p]
		if pData.PostoGrad == "Coronel" || pData.PostoGrad == "Tenente Coronel" || pData.PostoGrad == "Major" || pData.PostoGrad == "Capitão" || pData.PostoGrad == "1º Tenente" || pData.PostoGrad == "2º Tenente" || pData.PostoGrad == "Aspirante" {
			oficiais = append(oficiais, p)
		} else if pData.PostoGrad == "Subtenente" || pData.PostoGrad == "1º Sargento" || pData.PostoGrad == "2º Sargento" || pData.PostoGrad == "3º Sargento" {
			sargentos = append(sargentos, p)
		} else if pData.PostoGrad == "Soldado EV" {
			ev = append(ev, p)
		} else { // Cabo e Soldado EP
			ep = append(ep, p)
		}
	}

	secoes := []SecaoArranchamento{
		{Nome: "Oficiais", Linhas: agruparLinhas(oficiais, arranchados)},
		{Nome: "Subtenentes / Sargentos", Linhas: agruparLinhas(sargentos, arranchados)},
		{Nome: "Cabos / Soldados EP/ Alunos", Linhas: agruparLinhas(ep, arranchados)},
		{Nome: "Soldados EV", Linhas: agruparLinhas(ev, arranchados)},
	}

	// Calculate totals based on 'X'
	countC := func(linhas []LinhaArranchamento) int {
		c := 0
		for _, l := range linhas {
			for _, cel := range l.Celulas {
				if cel.C == "X" {
					c++
				}
			}
		}
		return c
	}
	countA := func(linhas []LinhaArranchamento) int {
		c := 0
		for _, l := range linhas {
			for _, cel := range l.Celulas {
				if cel.A == "X" {
					c++
				}
			}
		}
		return c
	}
	countJ := func(linhas []LinhaArranchamento) int {
		c := 0
		for _, l := range linhas {
			for _, cel := range l.Celulas {
				if cel.J == "X" {
					c++
				}
			}
		}
		return c
	}

	getTotais := func(linhas []LinhaArranchamento) TotaisArranchamento {
		return TotaisArranchamento{
			C: fmt.Sprintf("%02d", countC(linhas)),
			A: fmt.Sprintf("%02d", countA(linhas)),
			J: fmt.Sprintf("%02d", countJ(linhas)),
		}
	}

	totOf := getTotais(secoes[0].Linhas)
	totSgt := getTotais(secoes[1].Linhas)
	
	totCbSd := TotaisArranchamento{
		C: fmt.Sprintf("%02d", countC(secoes[2].Linhas) + countC(secoes[3].Linhas)),
		A: fmt.Sprintf("%02d", countA(secoes[2].Linhas) + countA(secoes[3].Linhas)),
		J: fmt.Sprintf("%02d", countJ(secoes[2].Linhas) + countJ(secoes[3].Linhas)),
	}

	totGeral := TotaisArranchamento{
		C: fmt.Sprintf("%02d", countC(secoes[0].Linhas) + countC(secoes[1].Linhas) + countC(secoes[2].Linhas) + countC(secoes[3].Linhas)),
		A: fmt.Sprintf("%02d", countA(secoes[0].Linhas) + countA(secoes[1].Linhas) + countA(secoes[2].Linhas) + countA(secoes[3].Linhas)),
		J: fmt.Sprintf("%02d", countJ(secoes[0].Linhas) + countJ(secoes[1].Linhas) + countJ(secoes[2].Linhas) + countJ(secoes[3].Linhas)),
	}

	dataObj := ArranchamentoData{
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
