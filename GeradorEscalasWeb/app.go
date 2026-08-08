package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"GeradorEscalasWeb/backend"
)

// App struct
type App struct {
	ctx   context.Context
	state backend.AppState
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	state, err := backend.LoadState(a.getStatePath())
	if err != nil {
		fmt.Println("Error loading state:", err)
		state = backend.GetDefaultState("") // Retorna estado vazio para forçar seleção
	}
	a.state = state
}

func (a *App) InitializeState(unidade string) backend.AppState {
	newState := backend.GetDefaultState(unidade)
	a.state = newState
	_ = a.SaveState(newState)
	return newState
}

func (a *App) GetAllMilitares() []string {
	var all []string
	all = append(all, backend.ListaMilitaresBC...)
	all = append(all, backend.ListaMilitares1BO...)
	all = append(all, backend.ListaMilitares2BO...)
	return all
}

func (a *App) getStatePath() string {
	return filepath.Join(".", "state.json")
}

func (a *App) GetState() backend.AppState {
	return a.state
}

func (a *App) SaveState(state backend.AppState) error {
	a.state = state
	return backend.SaveState(a.getStatePath(), state)
}

func (a *App) ExportBackup() error {
	stateBytes, err := json.MarshalIndent(a.state, "", "    ")
	if err != nil {
		return err
	}

	today := time.Now().Format("2006-01-02")
	defaultFilename := fmt.Sprintf("Backup_Escalas_%s.json", today)

	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Title:           "Exportar Backup do Sistema",
		Filters: []runtime.FileFilter{
			{DisplayName: "Arquivo de Backup JSON (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}
	if savePath == "" {
		return nil
	}

	return os.WriteFile(savePath, stateBytes, 0644)
}

func (a *App) ImportBackup() (backend.AppState, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Importar Backup do Sistema",
		Filters: []runtime.FileFilter{
			{DisplayName: "Arquivo de Backup JSON (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return a.state, err
	}
	if filePath == "" {
		return a.state, nil
	}

	newState, err := backend.LoadState(filePath)
	if err != nil {
		return a.state, fmt.Errorf("arquivo de backup inválido: %w", err)
	}

	a.state = newState
	if err := a.SaveState(newState); err != nil {
		return a.state, fmt.Errorf("erro ao salvar backup importado: %w", err)
	}

	return a.state, nil
}

func (a *App) ImportBackupJSON(jsonStr string) (backend.AppState, error) {
	var newState backend.AppState
	if err := json.Unmarshal([]byte(jsonStr), &newState); err != nil {
		return a.state, fmt.Errorf("JSON de backup inválido: %w", err)
	}
	a.state = newState
	if err := a.SaveState(newState); err != nil {
		return a.state, fmt.Errorf("erro ao salvar backup importado: %w", err)
	}
	return a.state, nil
}

func (a *App) GenerateSchedule(opts backend.GenerateOpts) (backend.HistoricoEscala, error) {
	return backend.GenerateDailySchedule(opts, a.state)
}

func (a *App) GenerateDocumentHTML(items []backend.HistoricoEscala, cmtName string, unidade string) (string, error) {
	return backend.GenerateHTMLReport(items, cmtName, unidade, a.state, false)
}

func (a *App) DownloadWordMulti(items []backend.HistoricoEscala, cmtName string, unidade string, defaultFilename string) error {
	html, err := backend.GenerateHTMLReport(items, cmtName, unidade, a.state, true)
	if err != nil {
		return err
	}
	
	docBytes := []byte("\ufeff" + html)
	
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Title: "Salvar Aditamento",
		Filters: []runtime.FileFilter{
			{DisplayName: "Documento Word (*.doc)", Pattern: "*.doc"},
		},
	})
	if err != nil {
		return err
	}
	if savePath == "" {
		return nil
	}
	
	return os.WriteFile(savePath, docBytes, 0644)
}

func (a *App) GenerateDocumentArranchamentoHTML(targetDate string, arranchados map[string]backend.Refeicoes) (string, error) {
	return backend.GenerateArranchamentoHTML(targetDate, arranchados, a.state)
}

func (a *App) DownloadArranchamento(targetDate string, arranchados map[string]backend.Refeicoes) error {
	html, err := backend.GenerateArranchamentoHTML(targetDate, arranchados, a.state)
	if err != nil {
		return err
	}
	
	docBytes := []byte("\ufeff" + html)
	
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "Arranchamento_" + targetDate + ".doc",
		Title: "Salvar Arranchamento",
		Filters: []runtime.FileFilter{
			{DisplayName: "Documento Word (*.doc)", Pattern: "*.doc"},
		},
	})
	if err != nil {
		return err
	}
	if savePath == "" {
		return nil
	}
	
	return os.WriteFile(savePath, docBytes, 0644)
}

func (a *App) GetScores(targetDate string) (backend.ScoreData, error) {
	if a.state.Pessoas == nil {
		a.state = backend.GetDefaultState("BC")
	}

	pessoasKeys := make([]string, 0, len(a.state.Pessoas))
	for k := range a.state.Pessoas {
		pessoasKeys = append(pessoasKeys, k)
	}

	tDate, err := time.Parse("2006-01-02", targetDate)
	if err != nil {
		tDate = time.Now()
	}

	sd := backend.CalculatePoints(a.state.HistoricoEscalas, pessoasKeys, tDate, a.state.RoleConfigs)
	return sd, nil
}
