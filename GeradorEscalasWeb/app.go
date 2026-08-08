package main

import (
	"context"
	"fmt"
	"path/filepath"
	"time"
	"os"
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
