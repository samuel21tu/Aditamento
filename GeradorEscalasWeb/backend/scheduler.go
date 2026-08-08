package backend

import (
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"time"
)

type ScoreData struct {
	PontosPreta           map[string]float64 `json:"pontos_preta"`
	PontosVermelha        map[string]float64 `json:"pontos_vermelha"`
	RecentDutiesCount     map[string]int     `json:"recent_duties_count"`
	LastWeekendWorked     map[string]int     `json:"last_weekend_worked"`
	LastWeekendWorkedYear map[string]int     `json:"last_weekend_worked_year"`
	LastWorkedDate        map[string]string  `json:"last_worked_date"`
}

func parseDt(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

func getWeekNumber(dt time.Time) (int, int) {
	return dt.ISOWeek()
}

func CalculatePoints(historico []HistoricoEscala, pessoasKeys []string, targetDate time.Time, roleConfigs map[string]RoleConfig) ScoreData {
	sd := ScoreData{
		PontosPreta:           make(map[string]float64),
		PontosVermelha:        make(map[string]float64),
		RecentDutiesCount:     make(map[string]int),
		LastWeekendWorked:     make(map[string]int),
		LastWeekendWorkedYear: make(map[string]int),
		LastWorkedDate:        make(map[string]string),
	}

	activeInLast30Days := make(map[string]bool)

	for _, p := range pessoasKeys {
		sd.PontosPreta[p] = 0
		sd.PontosVermelha[p] = 0
		sd.RecentDutiesCount[p] = 0
	}

	sort.Slice(historico, func(i, j int) bool {
		dtI, _ := parseDt(historico[i].Data)
		dtJ, _ := parseDt(historico[j].Data)
		return dtI.Before(dtJ)
	})

	for _, reg := range historico {
		dt, err := parseDt(reg.Data)
		if err != nil {
			continue
		}

		wkdy := int(dt.Weekday()) // 0=Sun..6=Sat
		isRegVermelha := wkdy == 5 || wkdy == 6 || wkdy == 0
		isWe := wkdy == 6 || wkdy == 0

		year, cWeek := getWeekNumber(dt)
		daysDiff := int(targetDate.Sub(dt).Hours() / 24)
		isRecent := daysDiff > 0 && daysDiff <= 7
		isActive := daysDiff > 0 && daysDiff <= 30

		for roleName, personList := range reg.Escalados {
			peso := 1.0
			if cfg, ok := roleConfigs[roleName]; ok {
				peso = cfg.Weight
			}

			for _, p := range personList {
				if _, exists := sd.PontosPreta[p]; !exists {
					continue
				}
				if isActive {
					activeInLast30Days[p] = true
				}
				if isRegVermelha {
					sd.PontosVermelha[p] += peso
				} else {
					sd.PontosPreta[p] += peso
				}
				sd.LastWorkedDate[p] = dt.Format("2006-01-02")
				if isWe {
					sd.LastWeekendWorked[p] = cWeek
					sd.LastWeekendWorkedYear[p] = year
				}
				if isRecent {
					sd.RecentDutiesCount[p]++
				}
			}
		}
	}

	avgPreta, avgVermelha := 0.0, 0.0
	if len(activeInLast30Days) > 0 {
		sumPreta, sumVermelha := 0.0, 0.0
		for p := range activeInLast30Days {
			sumPreta += sd.PontosPreta[p]
			sumVermelha += sd.PontosVermelha[p]
		}
		avgPreta = sumPreta / float64(len(activeInLast30Days))
		avgVermelha = sumVermelha / float64(len(activeInLast30Days))
	}

	// Calculate max weight just for minimum threshold logic
	maxWeight := 0.0
	for _, rc := range roleConfigs {
		if rc.Weight > maxWeight {
			maxWeight = rc.Weight
		}
	}
	if maxWeight == 0 {
		maxWeight = 1.0
	}

	for _, p := range pessoasKeys {
		thresholdPreta := avgPreta - maxWeight
		if thresholdPreta < 0 {
			thresholdPreta = 0
		}
		if sd.PontosPreta[p] < thresholdPreta {
			sd.PontosPreta[p] = thresholdPreta
		}

		thresholdVermelha := avgVermelha - maxWeight
		if thresholdVermelha < 0 {
			thresholdVermelha = 0
		}
		if sd.PontosVermelha[p] < thresholdVermelha {
			sd.PontosVermelha[p] = thresholdVermelha
		}
	}

	return sd
}

type GenerateOpts struct {
	TargetDate   string
	EnabledRoles []string
}

func GenerateDailySchedule(opts GenerateOpts, currentState AppState) (HistoricoEscala, error) {
	targetDate, err := parseDt(opts.TargetDate)
	if err != nil {
		return HistoricoEscala{}, err
	}

	pessoasKeys := make([]string, 0, len(currentState.Pessoas))
	for k := range currentState.Pessoas {
		pessoasKeys = append(pessoasKeys, k)
	}

	sd := CalculatePoints(currentState.HistoricoEscalas, pessoasKeys, targetDate, currentState.RoleConfigs)

	wkdy := int(targetDate.Weekday())
	isMeioSemana := wkdy >= 1 && wkdy <= 4
	isWeekend := wkdy == 6 || wkdy == 0
	targetIsVermelha := wkdy == 5 || wkdy == 6 || wkdy == 0

	var available []string
	for pStr, pData := range currentState.Pessoas {
		if !pData.Ativo {
			continue
		}
		if pData.PostoGrad != "Soldado EP" && pData.PostoGrad != "Soldado EV" {
			continue
		}
		if pData.ApenasFimDeSemana && isMeioSemana {
			continue
		}
		if pData.ApenasSemana && targetIsVermelha {
			continue
		}

		isDispensado := false
		if dispensas, ok := currentState.Dispensas[pStr]; ok {
			for _, d := range dispensas {
				dStart, _ := parseDt(d.Inicio)
				dEnd, _ := parseDt(d.Fim)
				if (targetDate.After(dStart) || targetDate.Equal(dStart)) && (targetDate.Before(dEnd) || targetDate.Equal(dEnd)) {
					isDispensado = true
					break
				}
			}
		}
		if !isDispensado {
			available = append(available, pStr)
		}
	}

	currYear, currWeek := getWeekNumber(targetDate)
	delta := 24 * time.Hour

	scores := make(map[string]float64)
	for _, p := range available {
		baseScore := sd.PontosPreta[p]
		if targetIsVermelha {
			baseScore = sd.PontosVermelha[p]
		}
		recentPenalty := float64(sd.RecentDutiesCount[p] * 15)
		consecPenalty := 0.0

		lastWorkedStr, hasWorked := sd.LastWorkedDate[p]
		if hasWorked && lastWorkedStr == targetDate.Add(-delta).Format("2006-01-02") {
			consecPenalty = 50.0
		}

		scoreVal := baseScore + recentPenalty + consecPenalty

		pData := currentState.Pessoas[p]
		if pData.ApenasSemana && pData.ApenasFimDeSemana {
			scoreVal -= 10000
		}
		if p == "349" || p == "344" {
			scoreVal -= 4
		}

		scores[p] = scoreVal
	}

	filterCandidates := func(cands []string, blockConsecDays, blockConsecWeekends bool) []string {
		var valid []string
		for _, p := range cands {
			if blockConsecDays {
				lastWorkedStr, hasWorked := sd.LastWorkedDate[p]
				if hasWorked && lastWorkedStr == targetDate.Add(-delta).Format("2006-01-02") {
					continue
				}
			}
			if blockConsecWeekends && isWeekend {
				lastWeYear, yOk := sd.LastWeekendWorkedYear[p]
				lastWeWeek, wOk := sd.LastWeekendWorked[p]
				if yOk && wOk {
					if lastWeYear == currYear && lastWeWeek == currWeek-1 {
						continue
					} else if lastWeYear == currYear-1 && lastWeWeek == 52 && currWeek == 1 {
						continue
					}
				}
			}
			valid = append(valid, p)
		}
		return valid
	}

	// Order roles by weight descending so hardest roles get assigned first
	rolesToAssign := append([]string{}, opts.EnabledRoles...)
	sort.Slice(rolesToAssign, func(i, j int) bool {
		wI := currentState.RoleConfigs[rolesToAssign[i]].Weight
		wJ := currentState.RoleConfigs[rolesToAssign[j]].Weight
		return wI > wJ
	})

	totalReq := 0
	for _, role := range rolesToAssign {
		totalReq += currentState.RoleConfigs[role].Required
	}

	candidates := filterCandidates(available, true, true)
	if len(candidates) < totalReq {
		candidates = filterCandidates(available, false, true)
	}
	if len(candidates) < totalReq {
		candidates = filterCandidates(available, false, false)
	}
	if len(candidates) < totalReq {
		candidates = append([]string{}, available...)
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(candidates), func(i, j int) {
		candidates[i], candidates[j] = candidates[j], candidates[i]
	})

	sort.SliceStable(candidates, func(i, j int) bool {
		return scores[candidates[i]] < scores[candidates[j]]
	})

	escaladosMap := make(map[string][]string)
	remainingCandidates := append([]string{}, candidates...)

	for _, roleName := range rolesToAssign {
		req := currentState.RoleConfigs[roleName].Required
		aptosList := currentState.RoleConfigs[roleName].Aptos
		aptosMap := make(map[string]bool)
		for _, a := range aptosList {
			aptosMap[a] = true
		}

		var selected []string

		for i := 0; i < len(remainingCandidates); {
			p := remainingCandidates[i]
			if len(selected) >= req {
				break
			}
			pData := currentState.Pessoas[p]

			// Role Aptitude Filtering
			if len(aptosList) == 0 {
				// According to new rules, if empty, NO ONE is apt
				i++
				continue
			}
			if !aptosMap[p] {
				i++
				continue
			}

			if pData.ApenasSemana {
				lowerRole := strings.ToLower(roleName)
				if !strings.Contains(lowerRole, "plant") {
					i++
					continue
				}
			}
			selected = append(selected, p)
			remainingCandidates = append(remainingCandidates[:i], remainingCandidates[i+1:]...)
		}

		if len(selected) < req {
			return HistoricoEscala{}, fmt.Errorf("Não há militares aptos suficientes para a função '%s'. Requisitado: %d, Alocados: %d. Por favor, adicione mais militares aptos na aba Configurações.", roleName, req, len(selected))
		}

		escaladosMap[roleName] = selected
	}

	diaSemanaPython := wkdy - 1
	if diaSemanaPython == -1 {
		diaSemanaPython = 6
	}

	return HistoricoEscala{
		Data:          opts.TargetDate,
		DiaSemana:     diaSemanaPython,
		Escalados:     escaladosMap,
		SemExpediente: targetIsVermelha,
		GuardaComp:    make(map[string]string),
	}, nil
}
