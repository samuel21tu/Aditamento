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

	// Verify MOT VILA allocated 1 EP
	motVila := hist.Escalados["MOT VILA"]
	if len(motVila) != 1 {
		t.Errorf("Expected 1 soldier for MOT VILA, got %d", len(motVila))
	} else {
		pData := state.Pessoas[motVila[0]]
		if !isMilitarEP(motVila[0], pData) {
			t.Errorf("Expected EP soldier for MOT VILA, got %s (%s)", motVila[0], pData.PostoGrad)
		}
	}

	// Verify PLANTÃO ALOJ EP allocated 3 EP
	plantaoEP := hist.Escalados["PLANTÃO ALOJ EP"]
	if len(plantaoEP) != 3 {
		t.Errorf("Expected 3 soldiers for PLANTÃO ALOJ EP, got %d", len(plantaoEP))
	}
	for _, p := range plantaoEP {
		pData := state.Pessoas[p]
		if !isMilitarEP(p, pData) {
			t.Errorf("Expected EP soldier for PLANTÃO ALOJ EP, got %s (%s)", p, pData.PostoGrad)
		}
	}

	// Verify PLANTÃO ALOJ EV allocated 3 EV
	plantaoEV := hist.Escalados["PLANTÃO ALOJ EV"]
	if len(plantaoEV) != 3 {
		t.Errorf("Expected 3 soldiers for PLANTÃO ALOJ EV, got %d", len(plantaoEV))
	}
	for _, p := range plantaoEV {
		pData := state.Pessoas[p]
		if !isMilitarEV(p, pData) {
			t.Errorf("Expected EV soldier for PLANTÃO ALOJ EV, got %s (%s)", p, pData.PostoGrad)
		}
	}
}
