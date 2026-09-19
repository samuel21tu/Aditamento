package backend

import (
	"testing"
)

func TestGenerateDailySchedule_CategoriesAndAptos(t *testing.T) {
	state := GetDefaultState("BC")
	
	// Ensure roles have 0 aptos by default (testing default category fallback)
	for rName, rc := range state.RoleConfigs {
		rc.Aptos = []string{}
		state.RoleConfigs[rName] = rc
	}

	opts := GenerateOpts{
		TargetDate: "2026-08-10", // Monday
		EnabledRoles: []string{
			"GDA VILA",
			"MOT VILA",
			"PLANTÃO ALOJ EP",
			"PLANTÃO ALOJ EV",
		},
	}

	hist, err := GenerateDailySchedule(opts, state)
	if err != nil {
		t.Fatalf("GenerateDailySchedule failed unexpectedly: %v", err)
	}

	// Verify GDA VILA allocated 1 EV
	gdaVila := hist.Escalados["GDA VILA"]
	if len(gdaVila) != 1 {
		t.Errorf("Expected 1 soldier for GDA VILA, got %d", len(gdaVila))
	} else {
		pData := state.Pessoas[gdaVila[0]]
		if !isMilitarEV(gdaVila[0], pData) {
			t.Errorf("Expected EV soldier for GDA VILA, got %s (%s)", gdaVila[0], pData.PostoGrad)
		}
	}

	// Verify PLANTÃO ALOJ EP allocated EP soldiers
	plantaoEP := hist.Escalados["PLANTÃO ALOJ EP"]
	for _, p := range plantaoEP {
		pData := state.Pessoas[p]
		if !isMilitarEP(p, pData) {
			t.Errorf("Expected EP soldier for PLANTÃO ALOJ EP, got %s (%s)", p, pData.PostoGrad)
		}
	}

	// Verify all allocated personnel are Soldados (EV or EP), never officers, sergeants, or cabos
	for roleName, escalados := range hist.Escalados {
		for _, p := range escalados {
			pData := state.Pessoas[p]
			if !isMilitarSoldado(p, pData) {
				t.Errorf("Expected Soldado (EV or EP) for %s, but got %s (%s)", roleName, p, pData.PostoGrad)
			}
		}
	}
}
