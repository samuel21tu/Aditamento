package backend

import (
	"strings"
	"testing"
)

func TestGenerateArranchamentoHTML(t *testing.T) {
	state := GetDefaultState("BC")
	
	arranchados := map[string]Refeicoes{
		"3º Sgt JHONATAN": {C: true, A: true, J: true},
		"3º Sgt JOELITO":  {C: false, A: true, J: false},
		"Cb EP BALBINO":   {C: true, A: true, J: false},
	}

	html, err := GenerateArranchamentoHTML("2026-08-09", arranchados, state)
	if err != nil {
		t.Fatalf("Erro ao gerar HTML: %v", err)
	}

	if !strings.Contains(html, "3º Sgt JHONATAN") {
		t.Errorf("Esperava conter 3º Sgt JHONATAN")
	}
	if !strings.Contains(html, "3º Sgt JOELITO") {
		t.Errorf("Esperava conter 3º Sgt JOELITO")
	}
	if !strings.Contains(html, "Cb EP BALBINO") {
		t.Errorf("Esperava conter Cb EP BALBINO")
	}
	// Militares que não estão arranchados NÃO devem aparecer
	if strings.Contains(html, "Tc DANTAS") {
		t.Errorf("Tc DANTAS não deveria constar no arranchamento")
	}
	if strings.Contains(html, "301 ADRIANO") {
		t.Errorf("301 ADRIANO não deveria constar no arranchamento")
	}
}

func TestGenerateArranchamentoHTMLEmpty(t *testing.T) {
	state := GetDefaultState("BC")
	arranchados := map[string]Refeicoes{}

	html, err := GenerateArranchamentoHTML("2026-08-09", arranchados, state)
	if err != nil {
		t.Fatalf("Erro ao gerar HTML vazio: %v", err)
	}

	if !strings.Contains(html, "Nenhum militar arranchado nesta data.") {
		t.Errorf("Esperava mensagem de nenhum militar arranchado")
	}
}
