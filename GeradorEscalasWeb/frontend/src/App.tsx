import React, { useState, useEffect, Component } from 'react';
import { Calendar, Users, ClipboardList, Settings, Trophy, FileText, CheckCircle2, Plus, Trash2, Edit2, Check, Download, Printer, Upload } from 'lucide-react';
import './App.css';
import { GenerateSchedule, GenerateDocumentHTML, GetState, SaveState, GetScores } from '../wailsjs/go/main/App';
// @ts-ignore
import brasaoImg from './assets/brasao.png';

const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

const getDiaSemanaExtenso = (dateStr: string, fallback?: any) => {
    if (!dateStr) return fallback || '';
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            return dias[d.getDay()] || fallback || '';
        }
    } catch (e) {}
    return fallback || '';
};

const isSoldadoEV = (m: string, p?: any, statePessoas?: any) => {
    const pessoa = p || statePessoas?.[m];
    if (pessoa?.posto_grad === "Soldado EV") return true;
    if (pessoa?.posto_grad && pessoa.posto_grad !== "Soldado EV") return false;
    const nome = (m || '').trim();
    if (nome.startsWith("SD EV") || nome.startsWith("Sd EV")) return true;
    if (/^[345]\d{2}\s/.test(nome) && !nome.includes("Sgt") && !nome.includes("Ten") && !nome.includes("Cb") && !nome.includes("Cap")) return true;
    return false;
};

const isSoldadoEP = (m: string, p?: any, statePessoas?: any) => {
    const pessoa = p || statePessoas?.[m];
    if (pessoa?.posto_grad === "Soldado EP") return true;
    if (pessoa?.posto_grad && pessoa.posto_grad !== "Soldado EP") return false;
    const nome = (m || '').trim();
    if (nome.startsWith("SD EP") || nome.startsWith("Sd EP")) return true;
    return false;
};

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ErrorBoundary capturou um erro:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="card" style={{margin: '30px auto', maxWidth: '650px', padding: '30px', textAlign: 'center', border: '1px solid var(--danger)'}}>
                    <h3 style={{color: 'var(--danger)', borderBottom: 'none'}}>Ocorreu um erro ao exibir este conteúdo</h3>
                    <p style={{color: 'var(--text-light)', marginBottom: '20px', fontSize: '0.9em'}}>
                        {this.state.error?.message || String(this.state.error)}
                    </p>
                    <button className="btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
                        Recarregar Tela
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const printHtmlDocument = (html: string) => {
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        // Give it time to render images/styles
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // Clean up iframe after a generous delay (handles cases where afterprint doesn't fire)
            setTimeout(() => {
                const el = document.getElementById('print-iframe');
                if (el) el.remove();
            }, 60000); // 1 minute cleanup fallback
        }, 500);
    }
};

function App() {
    const [activeTab, setActiveTab] = useState('gerador');
    const [state, setState] = useState<any>(null);
    const [targetDate, setTargetDate] = useState(getTomorrow());
    const [schedulePreview, setSchedulePreview] = useState<any>(null);

    const [boletimNr, setBoletimNr] = useState('1');
    const [aditamentoNr, setAditamentoNr] = useState(1);
    
    // Instrução
    const [instrucaoNome, setInstrucaoNome] = useState('');
    const [instrucaoHorario, setInstrucaoHorario] = useState('');
    const [instrucaoFardamento, setInstrucaoFardamento] = useState('');

    // Assuntos Gerais e Administrativos
    const [assuntosGerais, setAssuntosGerais] = useState('');
    const [assuntosAdmin, setAssuntosAdmin] = useState('');
    const [atividadeTipo, setAtividadeTipo] = useState('TFM');
    const [paradaDiaria, setParadaDiaria] = useState('09h30');
    const [justicaDisciplina, setJusticaDisciplina] = useState('');
    const [punidos, setPunidos] = useState<{proc: string, nome: string, tipo: string, inicio: string, termino: string}[]>([]);
    const [punidosModalOpen, setPunidosModalOpen] = useState(false);
    const [punidoForm, setPunidoForm] = useState({proc: '', nome: '', tipo: '', inicio: '', termino: ''});

    // Missões e Avisos Modals
    const [missaoModalOpen, setMissaoModalOpen] = useState(false);
    const [missaoNome, setMissaoNome] = useState('');
    const [missaoTarget, setMissaoTarget] = useState('EP');
    const [missaoTodos, setMissaoTodos] = useState(false);
    const [missaoQtd, setMissaoQtd] = useState(1);

    const [palestraModalOpen, setPalestraModalOpen] = useState(false);
    const [palestraAssunto, setPalestraAssunto] = useState('');
    const [palestraDataHora, setPalestraDataHora] = useState('');
    const [palestraLocal, setPalestraLocal] = useState('');
    const [palestraUniforme, setPalestraUniforme] = useState('9º B2');

    const [formaturaModalOpen, setFormaturaModalOpen] = useState(false);
    const [formaturaTexto, setFormaturaTexto] = useState('- QUADRO HORÁRIO - TREINAMENTO FORMATURA\n0630H - PRONTO NO PÁTIO\n0700H - INÍCIO DO TREINAMENTO\n\nOBS:\n0630H - MOTORISTAS NO PÁTIO');

    const [trocarBateriaModalOpen, setTrocarBateriaModalOpen] = useState(false);

    // Custom Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogType, setDialogType] = useState<'alert' | 'confirm'>('alert');
    const [dialogOnConfirm, setDialogOnConfirm] = useState<(() => void) | null>(null);

    const showAlert = (msg: string) => {
        setDialogMessage(msg);
        setDialogType('alert');
        setDialogOpen(true);
    };

    const showConfirm = (msg: string, onConfirm: () => void) => {
        setDialogMessage(msg);
        setDialogType('confirm');
        setDialogOnConfirm(() => onConfirm);
        setDialogOpen(true);
    };

    const [manualRoles, setManualRoles] = useState<any>({
        "OF DIA": "",
        "ADJ OF DIA": "",
        "SGT DIA Bia C": "",
        "CB DIA Bia C": "",
        "MOT DIA": ""
    });

    const [enabledRoles, setEnabledRoles] = useState<string[]>([]);
    const [scoresData, setScoresData] = useState<any>(null);

    // Temp variables for creating a new role
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleWeight, setNewRoleWeight] = useState(1.0);
    const [newRoleReq, setNewRoleReq] = useState(2);
    const [newRoleServiceType, setNewRoleServiceType] = useState('Interno'); // 'Interno' ou 'Externo'
    const [newRoleDestinadoA, setNewRoleDestinadoA] = useState('AMBOS'); // 'AMBOS', 'EV', 'EP'

    // Edit Role
    const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
    const [editRoleName, setEditRoleName] = useState('');
    const [editRoleWeight, setEditRoleWeight] = useState<number>(1);
    const [editRoleReq, setEditRoleReq] = useState<number>(1);
    const [editRoleServiceType, setEditRoleServiceType] = useState<string>("Interno");
    const [editRoleDestinadoA, setEditRoleDestinadoA] = useState<string>("AMBOS");

    const [aptidaoModalOpen, setAptidaoModalOpen] = useState(false);
    const [aptidaoRoleName, setAptidaoRoleName] = useState("");
    const [aptidaoList, setAptidaoList] = useState<string[]>([]);

    // Efetivo Profissional
    const [epModalOpen, setEpModalOpen] = useState(false);
    const [newEPName, setNewEPName] = useState('');
    const [newPostoGrad, setNewPostoGrad] = useState('Soldado EP');

    // Dispensas
    const [dispensaModalOpen, setDispensaModalOpen] = useState(false);
    const [selectedPessoaId, setSelectedPessoaId] = useState('');
    const [dispStart, setDispStart] = useState('');
    const [dispEnd, setDispEnd] = useState('');
    const [dispMotivo, setDispMotivo] = useState('');

    // Editar Militar
    const [editMilitarModalOpen, setEditMilitarModalOpen] = useState(false);
    const [editMilitarOldId, setEditMilitarOldId] = useState('');
    const [editMilitarNewName, setEditMilitarNewName] = useState('');
    const [editMilitarNewPostoGrad, setEditMilitarNewPostoGrad] = useState('');

    // Histórico Edit
    const [editHistModalOpen, setEditHistModalOpen] = useState(false);
    const [editHistIndex, setEditHistIndex] = useState(-1);
    const [editHistData, setEditHistData] = useState<any>(null);
    const [histScoresData, setHistScoresData] = useState<any>(null);

    // Substituição de Soldados (EP/EV)
    const [substModalOpen, setSubstModalOpen] = useState(false);
    const [substRole, setSubstRole] = useState('');
    const [substMilitarSai, setSubstMilitarSai] = useState('');
    const [substMilitarEntra, setSubstMilitarEntra] = useState('');
    const [substMotivo, setSubstMotivo] = useState('');
    const [substSource, setSubstSource] = useState<'history' | 'preview'>('history');

    // Visualização de Trocas
    const [verTrocasModalOpen, setVerTrocasModalOpen] = useState(false);
    const [verTrocasData, setVerTrocasData] = useState<any>(null);

    const [arranchados, setArranchados] = useState<Record<string, {c: boolean, a: boolean, j: boolean}>>({});
    const [allMilitares, setAllMilitares] = useState<string[]>([]);

    useEffect(() => {
        loadState();
    }, []);

    useEffect(() => {
        if (state?.unidade) {
            const root = document.documentElement;
            if (state.unidade === '1BO') {
                root.style.setProperty('--primary', '#b71c1c');
                root.style.setProperty('--primary-hover', '#c62828');
                root.style.setProperty('--glass-border', 'rgba(183, 28, 28, 0.6)');
            } else if (state.unidade === '2BO') {
                root.style.setProperty('--primary', '#111111');
                root.style.setProperty('--primary-hover', '#222222');
                root.style.setProperty('--glass-border', 'rgba(34, 34, 34, 0.6)');
            } else { // BC
                root.style.setProperty('--primary', '#4b5320');
                root.style.setProperty('--primary-hover', '#5c6628');
                root.style.setProperty('--glass-border', 'rgba(75, 83, 32, 0.6)');
            }
        }
    }, [state?.unidade]);

    const loadState = async () => {
        try {
            const data = await GetState();
            if (data) {
                if (!data.historico_escalas) data.historico_escalas = [];
                if (!data.historico_arranchamentos) data.historico_arranchamentos = [];
            }
            setState(data);
            
            if ((window as any).go?.main?.App?.GetAllMilitares) {
                const todos = await (window as any).go.main.App.GetAllMilitares();
                setAllMilitares(todos || []);
            } else if (data?.pessoas) {
                setAllMilitares(Object.keys(data.pessoas));
            }

            if (data?.role_configs) {
                setEnabledRoles(Object.keys(data.role_configs));
            }
            if (data) {
                let initialAdit = (data.aditamento_nr && data.aditamento_nr > 0) ? Number(data.aditamento_nr) : 0;
                let initialBol = (data.boletim_interno_nr && data.boletim_interno_nr > 0) ? Number(data.boletim_interno_nr) : 0;

                if (initialAdit === 0 && data.historico_escalas && data.historico_escalas.length > 0) {
                    const maxAdit = Math.max(...data.historico_escalas.map((h: any) => h.aditamento_nr || 0));
                    if (maxAdit > 0) initialAdit = maxAdit + 1;
                }
                if (initialBol === 0 && data.historico_escalas && data.historico_escalas.length > 0) {
                    const maxBol = Math.max(...data.historico_escalas.map((h: any) => h.boletim_interno_nr || parseInt(h.boletim_nr, 10) || 0));
                    if (maxBol > 0) initialBol = maxBol + 1;
                }

                if (!initialAdit || initialAdit < 1) initialAdit = 1;
                if (!initialBol || initialBol < 1) initialBol = 1;

                setAditamentoNr(initialAdit);
                setBoletimNr(String(initialBol));
            }
        } catch (err) {
            console.error("Error loading state", err);
        }
    };

    const handleInitialize = async (unidade: string) => {
        try {
            // @ts-ignore
            const newState = await window.go.main.App.InitializeState(unidade);
            if (newState) {
                if (!newState.historico_escalas) newState.historico_escalas = [];
                if (!newState.historico_arranchamentos) newState.historico_arranchamentos = [];
            }
            setState(newState);
        } catch (err) {
            console.error(err);
        }
    };

    const trocarBateria = (novaUnidade: string) => {
        if (novaUnidade === state?.unidade) {
            setTrocarBateriaModalOpen(false);
            return;
        }
        showConfirm(`Deseja alterar a Bateria para ${novaUnidade}? Isso carregará o efetivo e configurações da nova bateria.`, async () => {
            setTrocarBateriaModalOpen(false);
            await handleInitialize(novaUnidade);
            showAlert(`Bateria alterada para ${novaUnidade} com sucesso!`);
        });
    };

    const handleSave = async (newState: any) => {
        try {
            if (newState) {
                if (!newState.historico_escalas) newState.historico_escalas = [];
                if (!newState.historico_arranchamentos) newState.historico_arranchamentos = [];
            }
            await SaveState(newState);
            setState(newState);
        } catch (err) {
            console.error(err);
        }
    };

    const carregarRanking = async () => {
        if (!state) return;
        try {
            // @ts-ignore
            const sData = await window.go.main.App.GetScores(targetDate);
            setScoresData(sData);
        } catch(err) {
            console.error("Erro ao carregar placar", err);
        }
    };

    useEffect(() => {
        carregarRanking();
    }, [activeTab, targetDate]);

    const gerarPrevia = async () => {
        try {
            // @ts-ignore
            const result = await window.go.main.App.GenerateSchedule({
                TargetDate: targetDate,
                EnabledRoles: enabledRoles
            });
            
            setSchedulePreview(result);
        } catch (err) {
            showAlert("Erro ao gerar escala: " + err);
        }
    };

    const validarDuplicidadeEscala = (escaladosMap: Record<string, string[]>, manualRolesMap: Record<string, string>) => {
        const mapaAlocacoes: Record<string, string[]> = {};

        // 1. Funções Manuais (Oficiais / Sargentos / Cabos / Motorista)
        if (manualRolesMap) {
            Object.keys(manualRolesMap).forEach(role => {
                const val = (manualRolesMap[role] || '').trim();
                if (val) {
                    if (!mapaAlocacoes[val]) mapaAlocacoes[val] = [];
                    mapaAlocacoes[val].push(`${role} (Manual)`);
                }
            });
        }

        // 2. Funções Automáticas / Escalados (Soldados EP / EV)
        if (escaladosMap) {
            Object.keys(escaladosMap).forEach(role => {
                const list = escaladosMap[role];
                if (Array.isArray(list)) {
                    list.forEach(militar => {
                        const m = (militar || '').trim();
                        if (m) {
                            if (!mapaAlocacoes[m]) mapaAlocacoes[m] = [];
                            mapaAlocacoes[m].push(role);
                        }
                    });
                }
            });
        }

        // 3. Checar duplicados
        const duplicados: { militar: string; roles: string[] }[] = [];
        Object.keys(mapaAlocacoes).forEach(militar => {
            if (mapaAlocacoes[militar].length > 1) {
                duplicados.push({ militar, roles: mapaAlocacoes[militar] });
            }
        });

        if (duplicados.length > 0) {
            const detalhes = duplicados.map(d => 
                `• ${d.militar}: escalado em [${d.roles.join(', ')}]`
            ).join('\n');
            return {
                isValid: false,
                error: `Bloqueio de Duplicidade!\n\nNão é permitido escalar a mesma pessoa para mais de uma função no mesmo dia:\n\n${detalhes}\n\nPor favor, escolha outro militar para uma das funções antes de salvar.`
            };
        }

        return { isValid: true, error: '' };
    };

    const abrirModalSubstituicao = (role: string, militar: string, source: 'history' | 'preview' = 'history') => {
        setSubstRole(role);
        setSubstMilitarSai(militar);
        setSubstMilitarEntra('');
        setSubstMotivo('');
        setSubstSource(source);
        setSubstModalOpen(true);
    };

    const removerSoldadoRole = (role: string, militar: string, source: 'history' | 'preview' = 'history') => {
        if (source === 'preview' && schedulePreview) {
            const list = (schedulePreview.escalados?.[role] || []).filter((m: string) => m !== militar);
            setSchedulePreview({
                ...schedulePreview,
                escalados: {
                    ...schedulePreview.escalados,
                    [role]: list
                }
            });
        } else if (editHistData) {
            const list = (editHistData.escalados?.[role] || []).filter((m: string) => m !== militar);
            setEditHistData({
                ...editHistData,
                escalados: {
                    ...editHistData.escalados,
                    [role]: list
                }
            });
        }
    };

    const getCandidatosSubstituicao = (roleName: string, dataStr: string, militarSaindo: string, source: 'history' | 'preview' = 'history') => {
        if (!state?.pessoas) return [];
        
        const roleConf = state.role_configs?.[roleName];
        const aptosConfig = roleConf?.aptos || [];
        const destinadoA = roleConf?.destinado_a || (roleName.includes('EP') ? 'EP' : roleName.includes('EV') ? 'EV' : 'AMBOS');
        
        // Quem já está escalado no dia
        const escaladosHoje = new Set<string>();
        const activeData = (source === 'preview') ? schedulePreview : editHistData;
        const activeManual = (source === 'preview') ? manualRoles : (editHistData?.manual_roles || {});

        if (activeData?.escalados) {
            Object.values(activeData.escalados).forEach((list: any) => {
                if (Array.isArray(list)) list.forEach(m => escaladosHoje.add(m));
            });
        }
        if (activeManual) {
            Object.values(activeManual).forEach((val: any) => {
                if (val && typeof val === 'string' && val.trim() !== "") {
                    escaladosHoje.add(val.trim());
                }
            });
        }

        // Pontos de cansaço para a data
        const scores = (source === 'history') ? (histScoresData || scoresData) : scoresData;
        const mapPts: Record<string, number> = {};
        Object.keys(state.pessoas).forEach(id => {
            mapPts[id] = (scores?.pontos_preta?.[id] || 0) + (scores?.pontos_vermelha?.[id] || 0);
        });

        const targetDateObj = new Date(dataStr + "T00:00:00");

        // Filtrar pessoas aptas
        const candidatos = Object.keys(state.pessoas).filter(id => {
            if (id === militarSaindo) return false;

            const p = state.pessoas[id];
            if (!p || !p.ativo || p.foi_de_rota) return false;

            // O sistema só escala Soldados EP e EV para funções do aditamento
            const isEP = isSoldadoEP(id, p, state.pessoas);
            const isEV = isSoldadoEV(id, p, state.pessoas);
            if (!isEP && !isEV) return false;

            if (aptosConfig.length > 0) {
                if (!aptosConfig.includes(id)) return false;
            } else {
                if (destinadoA === 'EP' && !isEP) return false;
                if (destinadoA === 'EV' && !isEV) return false;
            }

            // Bloqueio de duplicidade: não pode já estar escalado em outra função hoje
            if (escaladosHoje.has(id)) return false;

            // Não pode estar dispensado na data
            if (state.dispensas_v2?.[id]) {
                for (let d of state.dispensas_v2[id]) {
                    const start = new Date(d.inicio + "T00:00:00");
                    const end = new Date(d.fim + "T23:59:59");
                    if (targetDateObj >= start && targetDateObj <= end) return false;
                }
            }

            return true;
        });

        // Ordenar rigorosamente em ordem de cansaço: SENDO O PRIMEIRO O MAIS DESCANSADO!
        candidatos.sort((a, b) => {
            const ptsA = mapPts[a] ?? 0;
            const ptsB = mapPts[b] ?? 0;
            if (ptsA !== ptsB) return ptsA - ptsB;
            return a.localeCompare(b);
        });

        return candidatos.map((id, index) => ({
            id,
            pontos: mapPts[id] ?? 0,
            tipo: isSoldadoEP(id, state.pessoas[id], state.pessoas) ? 'EP' : 'EV',
            posicao: index + 1
        }));
    };

    const confirmarSubstituicao = () => {
        if (!substMilitarEntra) {
            showAlert("Selecione o soldado que entrará no lugar!");
            return;
        }
        if (!substMotivo.trim()) {
            showAlert("Por favor, informe o motivo da substituição (ex: Atestado médico, dispensa, etc).");
            return;
        }

        const dataHoraAgora = new Date().toLocaleString('pt-BR');
        const novoRegistro = {
            data_hora: dataHoraAgora,
            funcao: substRole,
            saiu: substMilitarSai,
            entrou: substMilitarEntra,
            motivo: substMotivo.trim()
        };

        if (substSource === 'preview' && schedulePreview) {
            const newEscalados = { ...schedulePreview.escalados };
            const list = [...(newEscalados[substRole] || [])];
            const idx = list.indexOf(substMilitarSai);
            if (idx !== -1) {
                list[idx] = substMilitarEntra;
            } else {
                list.push(substMilitarEntra);
            }
            newEscalados[substRole] = list;

            const existingTrocas = schedulePreview.trocas_registro || [];
            setSchedulePreview({
                ...schedulePreview,
                escalados: newEscalados,
                trocas_registro: [...existingTrocas, novoRegistro]
            });
        } else if (editHistData) {
            const newEscalados = { ...editHistData.escalados };
            const list = [...(newEscalados[substRole] || [])];
            const idx = list.indexOf(substMilitarSai);
            if (idx !== -1) {
                list[idx] = substMilitarEntra;
            } else {
                list.push(substMilitarEntra);
            }
            newEscalados[substRole] = list;

            const existingTrocas = editHistData.trocas_registro || [];
            setEditHistData({
                ...editHistData,
                escalados: newEscalados,
                trocas_registro: [...existingTrocas, novoRegistro]
            });
        }

        setSubstModalOpen(false);
        showAlert(`Substituição registrada com sucesso!\n${substMilitarSai} ➔ ${substMilitarEntra}\nMotivo: ${substMotivo.trim()}`);
    };

    const confirmarEscala = async () => {
        if (!schedulePreview || !state) return;

        // Validação Estrita de Duplicidade
        const validacao = validarDuplicidadeEscala(schedulePreview.escalados || {}, manualRoles || {});
        if (!validacao.isValid) {
            showAlert(validacao.error);
            return;
        }

        const currentAditNr = parseInt(String(aditamentoNr), 10) || 1;
        const currentBolNr = parseInt(String(boletimNr), 10) || 1;

        const newState = { ...state };
        const finalSchedule = { ...schedulePreview };
        finalSchedule.manual_roles = manualRoles;
        finalSchedule.boletim_nr = String(currentBolNr);
        finalSchedule.boletim_interno_nr = currentBolNr;
        finalSchedule.aditamento_nr = currentAditNr;
        finalSchedule.instrucao_nome = instrucaoNome;
        finalSchedule.instrucao_horario = instrucaoHorario;
        finalSchedule.instrucao_fardamento = instrucaoFardamento;
        finalSchedule.assuntos_gerais_text = assuntosGerais;
        finalSchedule.assuntos_admin_text = assuntosAdmin;
        finalSchedule.atividade_tipo = atividadeTipo;
        finalSchedule.parada_diaria = paradaDiaria;
        finalSchedule.justica_disciplina_text = justicaDisciplina;
        finalSchedule.punidos = punidos;

        newState.historico_escalas = [...(newState.historico_escalas || []), finalSchedule];
        
        // Auto increment aditamento_nr and boletim_interno_nr by 1 for the next aditamento
        const nextAditamentoNr = currentAditNr + 1;
        const nextBoletimNr = currentBolNr + 1;

        newState.aditamento_nr = nextAditamentoNr;
        newState.boletim_interno_nr = nextBoletimNr;
        
        setAditamentoNr(nextAditamentoNr);
        setBoletimNr(String(nextBoletimNr));

        await handleSave(newState);
        showAlert(`Escala confirmada e salva no histórico!\nAditamento avançou para Nº ${nextAditamentoNr} e Boletim Interno para Nº ${nextBoletimNr}.`);
        setSchedulePreview(null);

        // Auto advance targetDate
        const d = new Date(targetDate + "T00:00:00");
        d.setDate(d.getDate() + 1);
        setTargetDate(d.toISOString().split('T')[0]);
    };

    const imprimirEscalaBase = async (preview: any, isFromHistory: boolean = false) => {
        if (!preview || !state) return;
        try {
            let itemsToPrint = [preview];
            if (isFromHistory && preview.aditamento_nr) {
                const bolComp = preview.boletim_interno_nr || parseInt(preview.boletim_nr, 10) || 0;
                itemsToPrint = (state.historico_escalas || []).filter((i: any) => 
                    i.aditamento_nr === preview.aditamento_nr && 
                    ((i.boletim_interno_nr || parseInt(i.boletim_nr, 10) || 0) === bolComp || !bolComp)
                );
                itemsToPrint.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
            }

            // @ts-ignore
            const html = await window.go.main.App.GenerateDocumentHTML(itemsToPrint, state.nome_cmt, state.unidade);
            printHtmlDocument(html);
        } catch (err) {
            showAlert("Erro ao gerar documento: " + err);
        }
    };

    const baixarWord = async (preview: any) => {
        if (!preview || !state) return;
        try {
            let itemsToPrint = [preview];
            if (preview.aditamento_nr) {
                const bolComp = preview.boletim_interno_nr || parseInt(preview.boletim_nr, 10) || 0;
                itemsToPrint = (state.historico_escalas || []).filter((i: any) => 
                    i.aditamento_nr === preview.aditamento_nr && 
                    ((i.boletim_interno_nr || parseInt(i.boletim_nr, 10) || 0) === bolComp || !bolComp)
                );
                itemsToPrint.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
            }

            // @ts-ignore
            await window.go.main.App.DownloadWordMulti(itemsToPrint, state.nome_cmt, state.unidade, `Aditamento_${preview.aditamento_nr || preview.data}.doc`);
        } catch (err) {
            showAlert("Erro ao baixar documento: " + err);
        }
    };

    const getMergedPreview = () => {
        if (!schedulePreview) return null;
        const currentAditNr = parseInt(String(aditamentoNr), 10) || 1;
        const currentBolNr = parseInt(String(boletimNr), 10) || 1;
        return {
            ...schedulePreview,
            aditamento_nr: currentAditNr,
            boletim_nr: String(currentBolNr),
            boletim_interno_nr: currentBolNr,
            manual_roles: manualRoles,
            instrucao_nome: instrucaoNome,
            instrucao_horario: instrucaoHorario,
            instrucao_fardamento: instrucaoFardamento,
            assuntos_gerais_text: assuntosGerais,
            assuntos_admin_text: assuntosAdmin,
            atividade_tipo: atividadeTipo,
            parada_diaria: paradaDiaria,
            justica_disciplina_text: justicaDisciplina
        };
    };

    const imprimirEscala = () => {
        const p = getMergedPreview();
        if (p) imprimirEscalaBase(p);
    };
    const imprimirHistorico = (h: any) => imprimirEscalaBase(h, true);

    const abrirEdicaoHistorico = async (h: any, index: number) => {
        setEditHistIndex(index);
        setEditHistData(JSON.parse(JSON.stringify(h)));
        setEditHistModalOpen(true);
        try {
            // @ts-ignore
            const sData = await window.go.main.App.GetScores(h.data);
            setHistScoresData(sData);
        } catch (e) {
            console.error("Erro ao carregar scores para histórico:", e);
        }
    };

    const salvarEdicaoHistorico = async () => {
        if (!editHistData || editHistIndex < 0 || !state) return;

        // Validação Estrita de Duplicidade ao salvar edição no Histórico
        const validacao = validarDuplicidadeEscala(editHistData.escalados || {}, editHistData.manual_roles || {});
        if (!validacao.isValid) {
            showAlert(validacao.error);
            return;
        }

        const currentAdit = parseInt(String(editHistData.aditamento_nr), 10) || 1;
        const currentBol = parseInt(String(editHistData.boletim_interno_nr || editHistData.boletim_nr), 10) || 1;
        editHistData.aditamento_nr = currentAdit;
        editHistData.boletim_interno_nr = currentBol;
        editHistData.boletim_nr = String(currentBol);

        const newState = { ...state };
        newState.historico_escalas[editHistIndex] = editHistData;
        await handleSave(newState);
        setEditHistModalOpen(false);
        showAlert("Histórico da escala atualizado com sucesso!");
    };

    const apagarHistorico = async (h: any, index: number) => {
        const histDate = new Date(h.data + "T00:00:00");
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const diffTime = today.getTime() - histDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 2) {
            showAlert("Não é possível apagar aditamentos de 2 ou mais dias atrás. Apenas edição é permitida para manter o histórico integro.");
            return;
        }
        
        showConfirm(`Deseja apagar o aditamento do dia ${h.data}?`, async () => {
            const newState = { ...state };
            newState.historico_escalas.splice(index, 1);
            await handleSave(newState);
            showAlert("Aditamento apagado com sucesso. A próxima data de geração foi ajustada automaticamente.");
        });
    };

    const atualizarEditHistData = (role: string, val: string) => {
        const split = val.split(",").map(s => s.trim()).filter(s => s);
        setEditHistData({
            ...editHistData,
            escalados: {
                ...editHistData.escalados,
                [role]: split
            }
        });
    }

    const togglePessoaAtributo = async (id: string, attr: string) => {
        if (!state) return;
        const newState = { ...state };
        newState.pessoas[id] = {
            ...newState.pessoas[id],
            [attr]: !newState.pessoas[id][attr]
        };
        await handleSave(newState);
    };

    const adicionarDispensa = async () => {
        if (!dispStart || !dispEnd || !state) return;
        const newState = { ...state };
        if (!newState.dispensas_v2) newState.dispensas_v2 = {};
        if (!newState.dispensas_v2[selectedPessoaId]) newState.dispensas_v2[selectedPessoaId] = [];
        newState.dispensas_v2[selectedPessoaId].push({ 
            inicio: dispStart, 
            fim: dispEnd, 
            motivo: dispMotivo.trim() 
        });
        await handleSave(newState);
        setDispensaModalOpen(false);
        setDispStart('');
        setDispEnd('');
        setDispMotivo('');
    };
    
    const removerDispensa = async (id: string, index: number) => {
        const newState = { ...state };
        newState.dispensas_v2[id].splice(index, 1);
        await handleSave(newState);
    }

    const adicionarMilitar = async () => {
        if (!newEPName.trim() || !state) return;
        const newState = { ...state };
        newState.pessoas[newEPName.trim()] = {
            ativo: true,
            is_ep: newPostoGrad === 'Soldado EP',
            posto_grad: newPostoGrad
        };
        await handleSave(newState);
        setEpModalOpen(false);
        setNewEPName('');
        setNewPostoGrad('Soldado EP');
    };

    const removerPessoa = async (id: string) => {
        if (!state) return;
        showConfirm(`Deseja remover ${id}?`, async () => {
            const newState = { ...state };
            delete newState.pessoas[id];
            await handleSave(newState);
        });
    };

    const salvarEdicaoMilitar = async () => {
        if (!editMilitarNewName.trim() || !state) return;
        const newId = editMilitarNewName.trim();
        const oldId = editMilitarOldId;
        
        const newState = { ...state };
        
        // Se o nome mudou, copia para a nova chave e deleta a velha
        if (newId !== oldId) {
            newState.pessoas[newId] = { ...newState.pessoas[oldId] };
            delete newState.pessoas[oldId];
            
            // Migrar dispensas se existirem
            if (newState.dispensas_v2 && newState.dispensas_v2[oldId]) {
                newState.dispensas_v2[newId] = [...newState.dispensas_v2[oldId]];
                delete newState.dispensas_v2[oldId];
            }
        }
        
        // Atualiza os dados
        newState.pessoas[newId].posto_grad = editMilitarNewPostoGrad;
        newState.pessoas[newId].is_ep = editMilitarNewPostoGrad === 'Soldado EP';
        
        await handleSave(newState);
        setEditMilitarModalOpen(false);
    };

    const adicionarFuncao = async () => {
        if (!newRoleName.trim() || !state) return;
        const newState = { ...state };
        if (!newState.role_configs) newState.role_configs = {};
        newState.role_configs[newRoleName.trim()] = {
            name: newRoleName.trim(),
            weight: Number(newRoleWeight),
            required: Number(newRoleReq),
            service_type: newRoleServiceType,
            destinado_a: newRoleDestinadoA,
            aptos: []
        };
        await handleSave(newState);
        setNewRoleName('');
        setNewRoleWeight(1.0);
        setNewRoleReq(2);
        setNewRoleServiceType('Interno');
        setNewRoleDestinadoA('AMBOS');
        showAlert("Função adicionada com sucesso!");
    };

    const abrirEdicaoFuncao = (rName: string) => {
        const roleData = state.role_configs[rName];
        setEditRoleName(rName);
        setEditRoleWeight(roleData.weight);
        setEditRoleReq(roleData.required);
        setEditRoleServiceType(roleData.service_type || "Interno");
        setEditRoleDestinadoA(roleData.destinado_a || (rName.includes('EP') ? 'EP' : rName.includes('EV') ? 'EV' : 'AMBOS'));
        setEditRoleModalOpen(true);
    };

    const salvarEdicaoFuncao = async () => {
        if (!state) return;
        const newState = { ...state };
        newState.role_configs[editRoleName] = {
            name: editRoleName,
            weight: Number(editRoleWeight),
            required: Number(editRoleReq),
            service_type: editRoleServiceType,
            destinado_a: editRoleDestinadoA,
            aptos: state.role_configs[editRoleName]?.aptos || []
        };
        await handleSave(newState);
        setEditRoleModalOpen(false);
    };

    const abrirAptidaoModal = (rName: string) => {
        if (!state) return;
        setAptidaoRoleName(rName);
        setAptidaoList(state.role_configs[rName].aptos || []);
        setAptidaoModalOpen(true);
    };

    const toggleAptidao = (militar: string) => {
        if (aptidaoList.includes(militar)) {
            setAptidaoList(aptidaoList.filter(m => m !== militar));
        } else {
            setAptidaoList([...aptidaoList, militar]);
        }
    };

    const salvarAptidao = async () => {
        if (!state) return;
        const newState = { ...state };
        newState.role_configs[aptidaoRoleName].aptos = aptidaoList;
        await handleSave(newState);
        setAptidaoModalOpen(false);
    };

    const removerFuncao = async (roleName: string) => {
        if (!state) return;
        showConfirm(`Deseja remover a função ${roleName}?`, async () => {
            const newState = { ...state };
            delete newState.role_configs[roleName];
            await handleSave(newState);
        });
    };

    const isProtegida = (nome: string) => {
        const n = nome.toLowerCase();
        return n.includes("plantão") || n.includes("plantao") || n.includes("guarda");
    };

    const setRoleEnabled = (role: string, checked: boolean) => {
        if (checked) {
            setEnabledRoles([...enabledRoles, role]);
        } else {
            setEnabledRoles(enabledRoles.filter(r => r !== role));
        }
    };

    const gerarEscalaMissao = () => {
        if (!missaoNome) {
            showAlert("Digite o nome da missão!");
            return;
        }

        let texto = `- ${missaoNome.toUpperCase()}`;
        let escaladosIds: string[] = [];

        if (missaoTodos) {
            texto += `\n- PARA TODOS OF - ST - SGT - CB E SD ${missaoTarget}`;
        } else {
            // Frontend scheduling logic
            if (!scoresData) {
                showAlert("Aguarde, calculando rank...");
                carregarRanking();
                return;
            }

            let mapPts: any = {};
            Object.keys(state.pessoas).forEach(id => {
                mapPts[id] = (scoresData.pontos_preta?.[id] || 0) + (scoresData.pontos_vermelha?.[id] || 0);
            });
            
            const tDateStr = targetDate + "T00:00:00";
            const targetD = new Date(tDateStr);

            let available = Object.keys(mapPts).filter(id => {
                const p = state.pessoas[id];
                if (!p || !p.ativo || p.foi_de_rota) return false;

                // Check dispensa
                if (state.dispensas_v2?.[id]) {
                    for (let d of state.dispensas_v2[id]) {
                        const start = new Date(d.inicio + "T00:00:00");
                        const end = new Date(d.fim + "T23:59:59");
                        if (targetD >= start && targetD <= end) return false;
                    }
                }

                // EP/EV matching
                const isEP = isSoldadoEP(id, p, state.pessoas);
                const isEV = isSoldadoEV(id, p, state.pessoas);
                if (missaoTarget === 'EP' && !isEP) return false;
                if (missaoTarget === 'EV' && !isEV) return false;

                return true;
            }).sort((a, b) => mapPts[a] - mapPts[b]);

            escaladosIds = available.slice(0, missaoQtd);
            texto += `\n- MILITARES ESCALADOS: ` + escaladosIds.join(" - ");
        }

        // Add to Assuntos Gerais
        setAssuntosGerais(prev => {
            let newVal = prev.trim();
            if (newVal) newVal += "\n\n";
            return newVal + texto;
        });

        // Add to backend tracker (we'll save it inside schedulePreview.escalados)
        if (escaladosIds.length > 0) {
            if (!schedulePreview) {
                showAlert("Para descontar pontos, você precisa gerar a prévia da escala 1ª e 2ª parte primeiro!");
                return;
            }
            const key = `MISSÃO: ${missaoNome}`;
            setSchedulePreview({
                ...schedulePreview,
                escalados: {
                    ...schedulePreview.escalados,
                    [key]: escaladosIds
                }
            });
        }

        setMissaoModalOpen(false);
        setMissaoNome('');
        setMissaoQtd(1);
    };

    const gerarAvisoPalestra = () => {
        if (!palestraAssunto) return;
        const texto = `- AVISO DE PALESTRA: ${palestraAssunto.toUpperCase()}
- DATA/HORA: ${palestraDataHora}
- LOCAL: ${palestraLocal}
- UNIFORME: ${palestraUniforme}`;

        setAssuntosGerais(prev => {
            let newVal = prev.trim();
            if (newVal) newVal += "\n\n";
            return newVal + texto;
        });
        
        setPalestraModalOpen(false);
        setPalestraAssunto('');
        setPalestraDataHora('');
        setPalestraLocal('');
    };

    const gerarAvisoFormatura = () => {
        if (!formaturaTexto) return;
        setAssuntosGerais(prev => {
            let newVal = prev.trim();
            if (newVal) newVal += "\n\n";
            return newVal + formaturaTexto;
        });
        setFormaturaModalOpen(false);
    };

    // Utils for ranking display
    const renderRankingList = (type: 'preta' | 'vermelha' | 'geral', group: 'EP' | 'EV') => {
        if (!scoresData || !state?.pessoas) return null;
        
        let mapPts: any = {};
        if (type === 'preta') mapPts = scoresData.pontos_preta || {};
        else if (type === 'vermelha') mapPts = scoresData.pontos_vermelha || {};
        else {
            Object.keys(state.pessoas).forEach(id => {
                mapPts[id] = (scoresData.pontos_preta?.[id] || 0) + (scoresData.pontos_vermelha?.[id] || 0);
            });
        }
        
        if (!mapPts) return null;

        const sortedPessoas = Object.keys(mapPts)
            .filter(id => {
                const p = state.pessoas[id];
                if (!p || p.foi_de_rota) return false;
                return (group === 'EP') ? isSoldadoEP(id, p, state.pessoas) : isSoldadoEV(id, p, state.pessoas);
            })
            .sort((a, b) => (mapPts[a] || 0) - (mapPts[b] || 0));

        return (
            <table>
                <thead>
                    <tr>
                        <th>Posição (Vez)</th>
                        <th>ID Militar</th>
                        <th>Pontos ({type})</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedPessoas.length === 0 && (
                        <tr><td colSpan={3} style={{textAlign: 'center'}}>{group === 'EP' ? 'Nenhum Soldado EP com pontuação registrada.' : 'Nenhum Soldado EV com pontuação registrada.'}</td></tr>
                    )}
                    {sortedPessoas.map((id, index) => (
                        <tr key={id} className={state.pessoas[id]?.ativo ? '' : 'inactive-row'} style={{opacity: state.pessoas[id]?.ativo ? 1 : 0.5}}>
                            <td><strong>{index + 1}º</strong></td>
                            <td>{id} {!state.pessoas[id]?.ativo ? '(Baixado)' : (state.pessoas[id]?.apenas_semana ? '(Plantão Sem)' : '')}</td>
                            <td>{(mapPts[id] || 0).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const carregarArranchamentoData = (dateStr: string) => {
        if (!state) return;
        const historicoArr = state.historico_arranchamentos || [];
        const savedArr = historicoArr.find((a: any) => a && a.data === dateStr);
        if (savedArr && savedArr.refeicoes) {
            setArranchados(savedArr.refeicoes);
            return;
        }

        const historicoEsc = state.historico_escalas || [];
        const escala = historicoEsc.find((e: any) => e && e.data === dateStr);
        if (escala) {
            let names: string[] = [];
            Object.values(escala.escalados || {}).forEach((list: any) => {
                if (Array.isArray(list)) {
                    names.push(...list);
                }
            });
            Object.values(escala.manual_roles || {}).forEach((val: any) => {
                if (val && typeof val === 'string' && val.trim() !== "") {
                    names.push(val.trim());
                }
            });
            
            const initialMap: Record<string, {c: boolean, a: boolean, j: boolean}> = {};
            Array.from(new Set(names)).forEach(nome => {
                initialMap[nome] = { c: true, a: true, j: true };
            });
            setArranchados(initialMap);
        } else {
            setArranchados({});
        }
    };

    useEffect(() => {
        if (activeTab === 'arranchamento') {
            carregarArranchamentoData(targetDate);
        }
    }, [activeTab, targetDate, state?.historico_arranchamentos, state?.historico_escalas]);

    const toggleArranchadoMeal = (nome: string, meal: 'c' | 'a' | 'j') => {
        setArranchados(prev => {
            const current = prev?.[nome] || { c: false, a: false, j: false };
            const updated = { ...current, [meal]: !current[meal] };
            return { ...(prev || {}), [nome]: updated };
        });
    };

    const toggleArranchadoAll = (nome: string, checked?: boolean) => {
        setArranchados(prev => {
            const current = prev?.[nome] || { c: false, a: false, j: false };
            const isAll = current.c && current.a && current.j;
            const targetVal = checked !== undefined ? checked : !isAll;
            return {
                ...(prev || {}),
                [nome]: { c: targetVal, a: targetVal, j: targetVal }
            };
        });
    };

    const toggleArrancharTodos = (checked?: boolean) => {
        if (!state || !state.pessoas) return;
        const keys = Object.keys(state.pessoas);
        const isAllSelected = keys.length > 0 && keys.every(id => {
            const r = arranchados?.[id];
            return r && r.c && r.a && r.j;
        });
        const targetVal = checked !== undefined ? checked : !isAllSelected;
        
        const newMap: Record<string, { c: boolean, a: boolean, j: boolean }> = {};
        keys.forEach(id => {
            newMap[id] = { c: targetVal, a: targetVal, j: targetVal };
        });
        setArranchados(newMap);
    };

    const salvarArranchamento = async () => {
        if (!state) return;
        const newState = { ...state };
        if (!newState.historico_arranchamentos) newState.historico_arranchamentos = [];
        
        const idx = newState.historico_arranchamentos.findIndex((a: any) => a.data === targetDate);
        const novo = { data: targetDate, refeicoes: arranchados };
        
        if (idx >= 0) {
            newState.historico_arranchamentos[idx] = novo;
        } else {
            newState.historico_arranchamentos.push(novo);
        }
        await handleSave(newState);
        showAlert("Arranchamento salvo com sucesso!");
    };

    const apagarArranchamento = async (index: number) => {
        showConfirm(`Deseja apagar este arranchamento?`, async () => {
            const newState = { ...state };
            newState.historico_arranchamentos.splice(index, 1);
            await handleSave(newState);
            showAlert("Arranchamento apagado.");
        });
    };

    const imprimirArranchamentoBase = async (h: any) => {
        if (!state) return;
        try {
            // @ts-ignore
            const html = await window.go.main.App.GenerateDocumentArranchamentoHTML(h.data, h.refeicoes);
            printHtmlDocument(html);
        } catch (err) {
            showAlert("Erro ao gerar documento: " + err);
        }
    };

    const baixarArranchamentoWord = async (h: any) => {
        try {
            // @ts-ignore
            await window.go.main.App.DownloadArranchamento(h.data, h.refeicoes);
        } catch (err) {
            showAlert("Erro ao baixar documento: " + err);
        }
    };

    const exportarBackup = async () => {
        try {
            // @ts-ignore
            if (window.go?.main?.App?.ExportBackup) {
                // @ts-ignore
                await window.go.main.App.ExportBackup();
                showAlert("Backup exportado com sucesso!");
            } else {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 4));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `Backup_Escalas_${new Date().toISOString().slice(0, 10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showAlert("Backup baixado com sucesso!");
            }
        } catch (err) {
            showAlert("Erro ao exportar backup: " + err);
        }
    };

    const importarBackup = async () => {
        try {
            // @ts-ignore
            if (window.go?.main?.App?.ImportBackup) {
                // @ts-ignore
                const newState = await window.go.main.App.ImportBackup();
                if (newState && newState.pessoas) {
                    setState(newState);
                    showAlert("Backup importado com sucesso! Dados restaurados.");
                }
            } else {
                const fileInput = document.getElementById('backup-file-input') as HTMLInputElement;
                if (fileInput) fileInput.click();
            }
        } catch (err) {
            showAlert("Erro ao importar backup: " + err);
        }
    };

    const handleFileInputBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                // @ts-ignore
                if (window.go?.main?.App?.ImportBackupJSON) {
                    // @ts-ignore
                    const newState = await window.go.main.App.ImportBackupJSON(text);
                    setState(newState);
                } else {
                    const parsed = JSON.parse(text);
                    if (!parsed.pessoas) throw new Error("Estrutura do backup inválida.");
                    await handleSave(parsed);
                }
                showAlert("Backup importado com sucesso! Dados restaurados.");
            } catch (err) {
                showAlert("Erro ao ler arquivo de backup: " + err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const renderEfetivoTable = (title: string, postoGrad: string) => {
        const list = Object.entries(state?.pessoas || {})
            .filter(([_, p]: [string, any]) => p.posto_grad === postoGrad)
            .sort();

        if (list.length === 0) return null;

        return (
            <div style={{marginBottom: '30px'}}>
                <h4 style={{color: 'var(--text-dark)'}}>{title}</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Identificação</th>
                            <th>Status</th>
                            <th>Apenas Plantão Sem.</th>
                            <th>Apenas Serviço FDS</th>
                            <th>Dispensas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map(([id, p]: [string, any]) => (
                            <tr key={id}>
                                <td>
                                    <div style={{display:'flex', alignItems:'center'}}>
                                        <strong style={{marginRight: '10px'}}>{id}</strong>
                                        <button className="icon-btn" style={{marginRight: '5px', color: 'var(--text-dark)'}} onClick={() => {
                                            setEditMilitarOldId(id);
                                            setEditMilitarNewName(id);
                                            setEditMilitarNewPostoGrad(p.posto_grad || '');
                                            setEditMilitarModalOpen(true);
                                        }} title="Editar"><Settings size={16} /></button>
                                        <button className="icon-btn danger" onClick={() => removerPessoa(id)} title="Remover"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                                <td>
                                    <div style={{display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-start'}}>
                                        <span 
                                            className={p.foi_de_rota ? 'badge' : (p.ativo ? 'badge-active' : 'badge-inactive')} 
                                            onClick={() => {
                                                if(p.foi_de_rota) return;
                                                togglePessoaAtributo(id, 'ativo');
                                            }}
                                            style={{cursor: p.foi_de_rota ? 'not-allowed' : 'pointer', background: p.foi_de_rota ? '#666' : undefined}}
                                        >
                                            {p.foi_de_rota ? 'Foi de Rota' : (p.ativo ? 'Ativo' : 'Baixado')}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={p.apenas_semana || false} 
                                        onChange={() => togglePessoaAtributo(id, 'apenas_semana')}
                                        disabled={p.foi_de_rota}
                                    />
                                </td>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={p.apenas_fim_de_semana || false} 
                                        onChange={() => togglePessoaAtributo(id, 'apenas_fim_de_semana')}
                                        disabled={p.foi_de_rota}
                                    />
                                </td>
                                <td>
                                    <div style={{display:'flex', gap: '5px', marginBottom: '5px', flexWrap: 'wrap'}}>
                                        <button className="btn-outline btn-sm" onClick={() => { setSelectedPessoaId(id); setDispMotivo(''); setDispStart(''); setDispEnd(''); setDispensaModalOpen(true); }} disabled={p.foi_de_rota}>+ Dispensa</button>
                                        <button 
                                            className={p.foi_de_rota ? "btn-outline btn-sm" : "btn-danger btn-sm"} 
                                            onClick={() => togglePessoaAtributo(id, 'foi_de_rota')} 
                                            style={{padding: '4px 8px', fontSize: '11px', marginLeft: '5px'}} 
                                            title={p.foi_de_rota ? "Desmarcar 'Foi de Rota'" : "Marcar como 'Foi de Rota'"}
                                        >
                                            {p.foi_de_rota ? "Desfazer Rota" : "Rota"}
                                        </button>
                                    </div>
                                    {state?.dispensas_v2?.[id]?.map((d: any, idx: number) => (
                                        <div key={idx} style={{fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '4px', marginBottom: '2px', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                            <span>
                                                {d.inicio} a {d.fim}
                                                {d.motivo ? <span style={{color: 'var(--primary-color)', marginLeft: '5px', fontWeight: 'bold'}}>({d.motivo})</span> : null}
                                            </span>
                                            <button className="icon-btn danger" style={{padding:'2px', marginLeft:'5px'}} onClick={()=>removerDispensa(id, idx)}><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!state) return <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center', background: 'var(--bg-color)'}}><h2>Carregando...</h2></div>;

    if (state.unidade === "") {
        return (
            <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center', background: 'var(--bg-color)'}}>
                <div className="card" style={{maxWidth: '500px', textAlign: 'center'}}>
                    <h2>Bem-vindo ao Gerador de Escalas</h2>
                    <p style={{marginTop: '10px', color: 'var(--text-light)'}}>Selecione a Bateria para configurar o aplicativo:</p>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px'}}>
                        <button className="btn" style={{background: '#4b5320', color: '#fff', padding: '15px', fontSize: '1.1em'}} onClick={() => handleInitialize('BC')}>Bateria de Comando (BC)</button>
                        <button className="btn" style={{background: '#b71c1c', color: '#fff', padding: '15px', fontSize: '1.1em'}} onClick={() => handleInitialize('1BO')}>1ª Bateria de Obuses (1ª Bia O)</button>
                        <button className="btn" style={{background: '#111111', color: '#fff', padding: '15px', fontSize: '1.1em'}} onClick={() => handleInitialize('2BO')}>2ª Bateria de Obuses (2ª Bia O)</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="App" className="glass-container">
            <nav className="sidebar">
                <div className="logo-area">
                    <img src={brasaoImg} alt="Brasão" className="logo-image" />
                    <h2>Gerador de Escalas</h2>
                    <span 
                        className="badge badge-clickable" 
                        title="Clique para trocar de Bateria"
                        onClick={() => setTrocarBateriaModalOpen(true)}
                    >
                        {state?.unidade || 'Bateria'} ▾
                    </span>
                </div>
                
                <ul className="nav-links">
                    <li className={activeTab === 'gerador' ? 'active' : ''} onClick={() => setActiveTab('gerador')}>
                        <Calendar size={20}/> <span>Aditamento</span>
                    </li>
                    <li className={activeTab === 'arranchamento' ? 'active' : ''} onClick={() => setActiveTab('arranchamento')}>
                        <FileText size={20}/> <span>Arranchamento</span>
                    </li>
                    <li className={activeTab === 'historico' ? 'active' : ''} onClick={() => setActiveTab('historico')}>
                        <ClipboardList size={20}/> <span>Histórico</span>
                    </li>
                    <li className={activeTab === 'efetivo' ? 'active' : ''} onClick={() => setActiveTab('efetivo')}>
                        <Users size={20}/> <span>Efetivo e Dispensas</span>
                    </li>
                    <li className={activeTab === 'ranking' ? 'active' : ''} onClick={() => setActiveTab('ranking')}>
                        <Trophy size={20}/> <span>Rank de Cansaço</span>
                    </li>
                    <li className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>
                        <Settings size={20}/> <span>Configurações</span>
                    </li>
                </ul>
            </nav>

            <main className="main-content">
                <header className="topbar">
                    <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    <div className="date-display" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Data Alvo:</span>
                        <input 
                            type="date" 
                            value={targetDate} 
                            onChange={(e) => {
                                if (e.target.value) setTargetDate(e.target.value);
                            }}
                            title="Alterar Data"
                            className="input-modern"
                            style={{ padding: '4px 8px', fontSize: '14px', width: 'auto', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    </div>
                </header>

                <div className="content-area" style={{position: 'relative'}}>
                    <ErrorBoundary>
                    {activeTab === 'gerador' && state && (
                        <div className="tab-gerador slide-up">
                            <datalist id="pessoas-list">
                                {Object.keys(state.pessoas).sort().map(id => (
                                    <option key={id} value={id} />
                                ))}
                            </datalist>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', marginBottom: '20px', paddingLeft: '5px' }}>
                                <h2 style={{ color: 'var(--text-dark)', margin: 0, textTransform: 'capitalize' }}>
                                    {new Date(targetDate + "T00:00:00").toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h2>
                            </div>
                            <div className="gerador-grid">
                            {/* 1. CONFIGURAR SERVIÇO */}
                            <div className="card card-config-servico">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px'}}>
                                    <h3 style={{margin: 0, borderBottom: 'none', paddingBottom: 0}}>1. Configurar Serviço</h3>
                                    <div style={{display: 'flex', gap: '6px'}}>
                                        <button 
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 8px'}}
                                            onClick={() => {
                                                if (state?.role_configs) setEnabledRoles(Object.keys(state.role_configs));
                                            }}
                                            title="Marcar todas as funções"
                                        >
                                            Todos
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 8px'}}
                                            onClick={() => setEnabledRoles([])}
                                            title="Desmarcar todas"
                                        >
                                            Nenhum
                                        </button>
                                    </div>
                                </div>
                                
                                <p style={{marginTop: 0, marginBottom:'10px', color:'var(--text-light)', fontSize: '0.82rem'}}>
                                    Funções a escalar ({enabledRoles.length} de {state.role_configs ? Object.keys(state.role_configs).length : 0} ativas):
                                </p>
                                <div className="role-checkbox-container">
                                    {state.role_configs && Object.keys(state.role_configs).map(rName => {
                                        const isChecked = enabledRoles.includes(rName);
                                        const req = state.role_configs[rName].required;
                                        const dest = state.role_configs[rName].destinado_a || (rName.includes('EP') ? 'EP' : rName.includes('EV') ? 'EV' : 'AMBOS');
                                        return (
                                            <label key={rName} className={`role-badge-label ${isChecked ? 'role-badge-checked' : ''}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={(e) => setRoleEnabled(rName, e.target.checked)}
                                                /> 
                                                <span className="role-title" title={rName}>{rName}</span>
                                                <span className="role-badge-pill">{req}x</span>
                                                <span className="role-dest-pill">{dest}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* 2. DADOS MANUAIS DO ADITAMENTO */}
                            <div className="card card-dados-manuais">
                                <h3>2. Dados Manuais do Aditamento</h3>
                                <div className="form-group row" style={{display: 'flex', gap: '15px', marginBottom: '10px'}}>
                                    <div style={{flex: 1}}>
                                        <label style={{fontSize: '0.82rem', color: 'var(--text-light)'}}>Aditamento Nr:</label>
                                        <input 
                                            type="number" 
                                            value={aditamentoNr} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10) || 1;
                                                setAditamentoNr(val);
                                                if (state) {
                                                    setState({ ...state, aditamento_nr: val });
                                                }
                                            }} 
                                            onBlur={() => {
                                                if (state) {
                                                    const val = parseInt(String(aditamentoNr), 10) || 1;
                                                    handleSave({ ...state, aditamento_nr: val });
                                                }
                                            }}
                                            placeholder="Ex: 8" 
                                            className="input-modern" 
                                            style={{padding: '8px 12px'}}
                                        />
                                    </div>
                                    <div style={{flex: 1}}>
                                        <label style={{fontSize: '0.82rem', color: 'var(--text-light)'}}>Boletim Interno Nr:</label>
                                        <input 
                                            type="number" 
                                            value={boletimNr} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10) || 1;
                                                setBoletimNr(String(val));
                                                if (state) {
                                                    setState({ ...state, boletim_interno_nr: val });
                                                }
                                            }} 
                                            onBlur={() => {
                                                if (state) {
                                                    const val = parseInt(String(boletimNr), 10) || 1;
                                                    handleSave({ ...state, boletim_interno_nr: val });
                                                }
                                            }}
                                            placeholder="Ex: 2" 
                                            className="input-modern" 
                                            style={{padding: '8px 12px'}}
                                        />
                                    </div>
                                </div>
                                <p style={{margin: '0 0 8px 0', fontSize:'0.82rem', color:'var(--text-light)'}}>Serviços manuais (Posto/Grad | Nome):</p>
                                <div className="manual-roles-grid">
                                    {Object.keys(manualRoles).map(mr => (
                                        <div className="form-group" key={mr} style={{marginBottom: 0}}>
                                            <label style={{fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '3px'}}>{mr}:</label>
                                            <input 
                                                type="text" 
                                                list="pessoas-list"
                                                value={manualRoles[mr]} 
                                                onChange={(e) => setManualRoles({...manualRoles, [mr]: e.target.value.toUpperCase()})} 
                                                onBlur={(e) => {
                                                    let val = e.target.value.trim().toUpperCase();
                                                    if (val && allMilitares && allMilitares.length > 0) {
                                                        const ids = allMilitares;
                                                        const exact = ids.find(id => id === val);
                                                        if (!exact) {
                                                            const partial = ids.find(id => id.includes(val) || val.includes(id));
                                                            if (partial) val = partial;
                                                        }
                                                    }
                                                    setManualRoles({...manualRoles, [mr]: val});
                                                }}
                                                placeholder="Pesquise o militar..."
                                                className="input-modern"
                                                style={{padding: '8px 10px', fontSize: '0.88rem'}}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. INSTRUÇÃO (OPCIONAL) */}
                            <div className="card card-instrucao">
                                <h3>3. Instrução (Opcional)</h3>
                                <p style={{marginBottom:'10px', fontSize:'0.82rem', color:'var(--text-light)'}}>Preencha se houver instrução prevista na 2ª Parte:</p>
                                
                                <div className="form-group" style={{marginBottom: '10px'}}>
                                    <label style={{fontSize: '0.82rem', color: 'var(--text-light)'}}>Instrução:</label>
                                    <input 
                                        type="text" 
                                        value={instrucaoNome} 
                                        onChange={(e) => setInstrucaoNome(e.target.value)} 
                                        placeholder="Ex: TFM / Armamento / Tiro" 
                                        className="input-modern"
                                        style={{padding: '8px 12px'}}
                                    />
                                </div>
                                <div className="form-group row" style={{display: 'flex', gap: '15px', marginBottom: '10px'}}>
                                    <div style={{flex: 1}}>
                                        <label style={{fontSize: '0.82rem', color: 'var(--text-light)'}}>Horário:</label>
                                        <input 
                                            type="text" 
                                            value={instrucaoHorario} 
                                            onChange={(e) => setInstrucaoHorario(e.target.value)} 
                                            placeholder="Ex: 08:00 às 10:00" 
                                            className="input-modern"
                                            style={{padding: '8px 12px'}}
                                        />
                                    </div>
                                    <div style={{flex: 1}}>
                                        <label style={{fontSize: '0.82rem', color: 'var(--text-light)'}}>Fardamento:</label>
                                        <input 
                                            type="text" 
                                            value={instrucaoFardamento} 
                                            onChange={(e) => setInstrucaoFardamento(e.target.value)} 
                                            placeholder="Ex: 9º B2 / 14º" 
                                            className="input-modern"
                                            style={{padding: '8px 12px'}}
                                        />
                                    </div>
                                </div>
                                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px'}}>
                                    {[
                                        { nome: 'TFM', fard: '14º', hora: '08:00 às 09:30' },
                                        { nome: 'Armamento e Tiro', fard: '9º B2', hora: '08:00 às 11:30' },
                                        { nome: 'Ordem Unida', fard: '9º B2', hora: '08:00 às 10:00' },
                                        { nome: 'Sem Alteração', fard: '', hora: '' }
                                    ].map(item => (
                                        <button 
                                            key={item.nome}
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 8px'}}
                                            onClick={() => {
                                                setInstrucaoNome(item.nome === 'Sem Alteração' ? '' : item.nome);
                                                setInstrucaoFardamento(item.fard);
                                                setInstrucaoHorario(item.hora);
                                            }}
                                        >
                                            {item.nome}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4. ASSUNTOS GERAIS E ADMINISTRATIVOS */}
                            <div className="card card-assuntos span-2">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px'}}>
                                    <h3 style={{margin: 0, borderBottom: 'none', paddingBottom: 0}}>4. Assuntos Gerais e Administrativos (Opcional)</h3>
                                    <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                                        <button type="button" className="btn-outline btn-sm" style={{fontSize: '11px', padding: '3px 8px'}} onClick={() => setMissaoModalOpen(true)}>+ Missão / Escala Extra</button>
                                        <button type="button" className="btn-outline btn-sm" style={{fontSize: '11px', padding: '3px 8px'}} onClick={() => setPalestraModalOpen(true)}>+ Palestra</button>
                                        <button type="button" className="btn-outline btn-sm" style={{fontSize: '11px', padding: '3px 8px'}} onClick={() => setFormaturaModalOpen(true)}>+ Formatura</button>
                                    </div>
                                </div>
                                
                                <div className="assuntos-subgrid">
                                    <div className="form-group" style={{display: 'flex', flexDirection: 'column', margin: 0}}>
                                        <label style={{fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px'}}>
                                            1. Assuntos Gerais:
                                        </label>
                                        <textarea 
                                            value={assuntosGerais} 
                                            onChange={(e) => setAssuntosGerais(e.target.value)} 
                                            placeholder="Ex: - MILITARES SOBRE AVISO...&#10;- APOIO AO CB DE DIA..." 
                                            className="input-modern"
                                            style={{flex: 1, minHeight: '125px', resize: 'vertical'}}
                                        />
                                    </div>

                                    <div className="form-group" style={{display: 'flex', flexDirection: 'column', margin: 0}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px'}}>
                                            <label style={{fontWeight: 'bold', fontSize: '0.85rem', margin: 0}}>
                                                2. Assuntos Administrativos:
                                            </label>
                                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    <span style={{fontSize: '0.76rem', color: 'var(--text-light)'}}>Atividade:</span>
                                                    <select 
                                                        className="input-modern" 
                                                        value={atividadeTipo} 
                                                        onChange={(e) => setAtividadeTipo(e.target.value)}
                                                        style={{padding: '2px 6px', fontSize: '0.76rem', width: 'auto'}}
                                                    >
                                                        <option value="TFM">TFM</option>
                                                        <option value="FAXINA">Faxina</option>
                                                        <option value="SEÇÃO">Seção</option>
                                                        <option value="SEM EXPEDIENTE">Sem Expediente</option>
                                                        <option value="PERSONALIZADO">Personalizado</option>
                                                    </select>
                                                </div>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    <span style={{fontSize: '0.76rem', color: 'var(--text-light)'}}>Parada:</span>
                                                    <select 
                                                        className="input-modern" 
                                                        value={paradaDiaria} 
                                                        onChange={(e) => setParadaDiaria(e.target.value)}
                                                        style={{padding: '2px 6px', fontSize: '0.76rem', width: 'auto'}}
                                                    >
                                                        <option value="09h30">09h30</option>
                                                        <option value="07h30">07h30</option>
                                                        <option value="Personalizado">Personalizado</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={assuntosAdmin} 
                                            onChange={(e) => setAssuntosAdmin(e.target.value)} 
                                            placeholder={`Deixe em branco para manter o formato padrão de Início de Expediente e ${atividadeTipo}.`} 
                                            className="input-modern"
                                            style={{flex: 1, minHeight: '125px', resize: 'vertical'}}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 5. JUSTIÇA E DISCIPLINA */}
                            <div className="card card-justica span-1">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px'}}>
                                    <h3 style={{margin: 0, borderBottom: 'none', paddingBottom: 0}}>5. Justiça e Disciplina (Opcional)</h3>
                                    <button 
                                        type="button" 
                                        className="btn-outline btn-sm" 
                                        style={{fontSize: '11px', padding: '3px 8px', borderColor: '#ffa726', color: '#ffa726'}}
                                        onClick={() => setPunidosModalOpen(true)}
                                    >
                                        + Punido (Pernoite)
                                    </button>
                                </div>
                                <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px'}}>
                                    {[
                                        { label: 'Sem Alteração', text: '- Sem Alteração.' },
                                        { label: 'Elogio', text: '- Elogio individual aos militares de serviço pelo excelente desempenho.' }
                                    ].map(item => (
                                        <button 
                                            key={item.label}
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 7px'}}
                                            onClick={() => setJusticaDisciplina(item.text)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                {punidos.length > 0 && (
                                    <div style={{marginBottom: '10px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px'}}>
                                        <h4 style={{margin: '0 0 5px 0', fontSize: '11px', color: '#ffa726'}}>Militares Punidos ({punidos.length}):</h4>
                                        <ul style={{margin: 0, paddingLeft: '15px', fontSize: '11px'}}>
                                            {punidos.map((p, idx) => (
                                                <li key={idx} style={{marginBottom: '3px'}}>
                                                    <strong>{p.nome}</strong> - {p.tipo} ({p.inicio} a {p.termino})
                                                    <button type="button" className="icon-btn danger" style={{padding: '0 4px', marginLeft: '5px'}} onClick={() => setPunidos(punidos.filter((_, i) => i !== idx))}>
                                                        <Trash2 size={10}/>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="form-group" style={{display: 'flex', flexDirection: 'column', flex: 1, margin: 0}}>
                                    <textarea 
                                        value={justicaDisciplina} 
                                        onChange={(e) => setJusticaDisciplina(e.target.value)} 
                                        placeholder="Ex: - SD EP 123 SILVA: Punido com 2 dias de impedimento... (deixe em branco para '- Sem Alteração.')" 
                                        className="input-modern"
                                        style={{flex: 1, minHeight: '125px', resize: 'vertical'}}
                                    />
                                </div>
                            </div>
                            </div>
                            
                            <div className="actions card row" style={{justifyContent: 'center', marginTop: '15px', padding: '15px'}}>
                                <button className="btn-primary" onClick={gerarPrevia} style={{fontSize: '1rem', padding: '12px 28px'}}>
                                    <Calendar size={18}/> GERAR PRÉVIA DA ESCALA
                                </button>
                            </div>

                            {schedulePreview ? (
                                <div className="card preview-card fade-in">
                                    <h3>Visualização da Escala</h3>
                                    <div className="preview-content">
                                        {Object.keys(manualRoles).filter(mr => manualRoles[mr].trim() !== "").map(role => (
                                            <div className="preview-col" key={`manual-${role}`} style={{borderLeft: '3px solid var(--success-color)'}}>
                                                <h4>{role} <span style={{fontSize:'10px', color:'var(--success-color)'}}>(Manual)</span></h4>
                                                <p>{manualRoles[role]}</p>
                                            </div>
                                        ))}
                                        {Object.keys(schedulePreview.escalados || {}).map(role => (
                                            <div className="preview-col" key={role}>
                                                <h4>{role}</h4>
                                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px'}}>
                                                    {schedulePreview.escalados[role]?.length > 0 ? (
                                                        schedulePreview.escalados[role].map((soldier: string) => (
                                                            <div 
                                                                key={soldier} 
                                                                style={{
                                                                    display: 'inline-flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '6px', 
                                                                    background: 'rgba(255,255,255,0.06)', 
                                                                    padding: '3px 8px', 
                                                                    borderRadius: '4px', 
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                <span>{soldier}</span>
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-outline btn-sm" 
                                                                    style={{padding: '1px 5px', fontSize: '10px'}}
                                                                    title="Substituir pelo mais descansado"
                                                                    onClick={() => abrirModalSubstituicao(role, soldier, 'preview')}
                                                                >
                                                                    ⇄ Trocar
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>Nenhum</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="actions row" style={{justifyContent: 'center', marginTop: '20px'}}>
                                        <button className="btn-success" onClick={confirmarEscala}><Check size={18}/> Confirmar e Salvar no Histórico</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{textAlign: 'center', padding: '35px 20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)'}}>
                                    <Calendar size={32} style={{color: 'var(--text-light)', opacity: 0.6, marginBottom: '10px'}} />
                                    <h4 style={{margin: '0 0 8px 0', color: 'var(--text-dark)', fontWeight: 600, fontSize: '1.05rem'}}>Nenhuma Prévia Gerada</h4>
                                    <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>Preencha ou revise as informações acima e clique em <strong>"GERAR PRÉVIA"</strong> para calcular a escala e habilitar a exportação do aditamento.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'arranchamento' && state && (
                        <div className="tab-content slide-up">
                            <div className="card">
                                <h3>Gerar / Editar Arranchamento</h3>
                                <p style={{marginBottom: '15px', color: 'var(--text-light)'}}>
                                    Selecione a data para pré-carregar os militares de serviço do aditamento (se houver). Marque os demais militares (ex: os que dormem no quartel) e clique em Salvar.
                                </p>
                                <div className="form-group" style={{maxWidth: '250px'}}>
                                    <label>Data do Arranchamento</label>
                                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input-modern" />
                                </div>
                                
                                <div style={{maxHeight: '450px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '20px'}}>
                                    {(() => {
                                        const militarKeys = Object.keys(state.pessoas || {});
                                        const todosArranchadosTudo = militarKeys.length > 0 && militarKeys.every(id => {
                                            const r = arranchados?.[id];
                                            return r && r.c && r.a && r.j;
                                        });

                                        return (
                                            <>
                                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px'}}>
                                                    <h4 style={{margin: 0, color: 'var(--primary-color)'}}>Efetivo ({militarKeys.length} militares)</h4>
                                                    <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                                                        <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: 'rgba(255,255,255,0.08)', padding: '5px 10px', borderRadius: '4px'}}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={todosArranchadosTudo} 
                                                                onChange={(e) => toggleArrancharTodos(e.target.checked)} 
                                                            />
                                                            Selecionar Tudo (Todos)
                                                        </label>
                                                        <button type="button" className="btn-outline btn-sm" onClick={() => toggleArrancharTodos(true)}>Marcar Todos</button>
                                                        <button type="button" className="btn-outline btn-sm" onClick={() => toggleArrancharTodos(false)}>Desmarcar Todos</button>
                                                        <button type="button" className="btn-outline btn-sm" onClick={() => carregarArranchamentoData(targetDate)}>Apenas Escalados</button>
                                                    </div>
                                                </div>
                                                <div className="checkbox-group" style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px'}}>
                                                    {militarKeys.sort().map(id => {
                                                        const r = arranchados?.[id] || { c: false, a: false, j: false };
                                                        const isAllPerson = r.c && r.a && r.j;
                                                        return (
                                                            <div key={id} style={{display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px'}}>
                                                                <div style={{flex: 1, fontWeight: 'bold'}}>{id}</div>
                                                                <label style={{marginRight: '15px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: isAllPerson ? 'var(--primary-color)' : 'inherit', fontWeight: 'bold'}}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isAllPerson} 
                                                                        onChange={(e) => toggleArranchadoAll(id, e.target.checked)} 
                                                                    /> Tudo
                                                                </label>
                                                                <label style={{marginRight: '15px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                                                                    <input type="checkbox" checked={!!r.c} onChange={() => toggleArranchadoMeal(id, 'c')} /> C
                                                                </label>
                                                                <label style={{marginRight: '15px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                                                                    <input type="checkbox" checked={!!r.a} onChange={() => toggleArranchadoMeal(id, 'a')} /> A
                                                                </label>
                                                                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                                                                    <input type="checkbox" checked={!!r.j} onChange={() => toggleArranchadoMeal(id, 'j')} /> J
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                
                                <div className="actions row" style={{marginTop: '20px'}}>
                                    <button className="btn-success" onClick={salvarArranchamento}><Check size={18}/> Salvar Arranchamento</button>
                                </div>
                            </div>

                            <div className="card" style={{marginTop: '20px'}}>
                                <h3>Histórico de Arranchamentos</h3>
                                {(state.historico_arranchamentos || []).length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Quantidade</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...(state.historico_arranchamentos || [])].reverse().map((h: any, reversedIndex: number) => {
                                                const i = (state.historico_arranchamentos || []).length - 1 - reversedIndex;
                                                const totalMilitares = Object.keys(h.refeicoes || {}).filter(k => h.refeicoes?.[k]?.c || h.refeicoes?.[k]?.a || h.refeicoes?.[k]?.j).length;
                                                return (
                                                    <tr key={i}>
                                                        <td>{h.data}</td>
                                                        <td>{totalMilitares} militares</td>
                                                        <td>
                                                            <div style={{display:'flex', gap: '8px', flexWrap: 'wrap'}}>
                                                                <button className="btn-outline btn-sm" onClick={() => imprimirArranchamentoBase(h)}><Printer size={14}/> IMPRIMIR</button>
                                                                <button className="btn-primary btn-sm" onClick={() => baixarArranchamentoWord(h)}><Download size={14}/> WORD</button>
                                                                <button className="btn-success btn-sm" onClick={() => setTargetDate(h.data)}><Edit2 size={14}/> EDITAR</button>
                                                                <button className="btn-danger btn-sm" onClick={() => apagarArranchamento(i)}><Trash2 size={14}/> APAGAR</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>Nenhum arranchamento salvo no histórico.</p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'efetivo' && state && (
                        <div className="tab-efetivo slide-up">
                            <div className="card">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                    <h3 style={{margin: 0}}>Gerenciar Efetivo</h3>
                                    <button className="btn-primary" onClick={() => setEpModalOpen(true)}>+ Cadastrar Militar</button>
                                </div>
                                
                                {renderEfetivoTable("Coronel", "Coronel")}
                                {renderEfetivoTable("Tenente Coronel", "Tenente Coronel")}
                                {renderEfetivoTable("Major", "Major")}
                                {renderEfetivoTable("Capitão", "Capitão")}
                                {renderEfetivoTable("1º Tenente", "1º Tenente")}
                                {renderEfetivoTable("2º Tenente", "2º Tenente")}
                                {renderEfetivoTable("Aspirante", "Aspirante")}
                                {renderEfetivoTable("Subtenente", "Subtenente")}
                                {renderEfetivoTable("1º Sargento", "1º Sargento")}
                                {renderEfetivoTable("2º Sargento", "2º Sargento")}
                                {renderEfetivoTable("3º Sargento", "3º Sargento")}
                                {renderEfetivoTable("Cabo", "Cabo")}
                                {renderEfetivoTable("Soldado EP", "Soldado EP")}
                                {renderEfetivoTable("Soldado EV", "Soldado EV")}

                            </div>
                        </div>
                    )}

                    {activeTab === 'historico' && state && (
                        <div className="tab-historico slide-up">
                            <div className="card">
                                <h3>Histórico de Escalas Geradas</h3>
                                {(state.historico_escalas || []).length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Dia (Semana)</th>
                                                <th>Funções Cobertas</th>
                                                <th>Trocas</th>
                                                <th>Vermelha?</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...(state.historico_escalas || [])].reverse().map((h: any, reversedIndex: number) => {
                                                const i = (state.historico_escalas || []).length - 1 - reversedIndex;
                                                const rolesCovered = Object.keys(h.escalados || {}).join(", ");
                                                const qtdTrocas = h.trocas_registro?.length || 0;
                                                return (
                                                    <tr key={i}>
                                                        <td>{h.data}</td>
                                                        <td>{getDiaSemanaExtenso(h.data, h.dia_semana)}</td>
                                                        <td style={{fontSize:'0.85em'}}>{rolesCovered || 'Legado (Guarda/Plantão)'}</td>
                                                        <td>
                                                            {qtdTrocas > 0 ? (
                                                                <button 
                                                                    className="btn-outline btn-sm" 
                                                                    style={{borderColor: '#ffa726', color: '#ffa726', padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}
                                                                    onClick={() => { setVerTrocasData(h); setVerTrocasModalOpen(true); }}
                                                                    title="Ver detalhes das trocas registradas nesta escala"
                                                                >
                                                                    ⇄ {qtdTrocas} Troca{qtdTrocas > 1 ? 's' : ''}
                                                                </button>
                                                            ) : (
                                                                <span style={{color: 'var(--text-light)', fontSize: '11px'}}>-</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {h.sem_expediente ? <span className="badge-inactive">Sim</span> : <span className="badge-active">Não</span>}
                                                        </td>
                                                        <td>
                                                            <div style={{display:'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center'}}>
                                                                <button className="btn-outline btn-sm" onClick={() => imprimirHistorico(h)} style={{display:'flex', alignItems:'center', gap:'4px'}}><Printer size={14}/> IMPRIMIR</button>
                                                                <button className="btn-primary btn-sm" onClick={() => baixarWord(h)} style={{display:'flex', alignItems:'center', gap:'4px'}}><Download size={14}/> WORD</button>
                                                                <button className="btn-success btn-sm" onClick={() => abrirEdicaoHistorico(h, i)} style={{display:'flex', alignItems:'center', gap:'4px'}}><Edit2 size={14}/> EDITAR</button>
                                                                <button className="btn-danger btn-sm" onClick={() => apagarHistorico(h, i)} style={{display:'flex', alignItems:'center', gap:'4px'}}><Trash2 size={14}/> APAGAR</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>Nenhuma escala registrada no histórico ainda.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ranking' && state && (
                        <div className="tab-ranking slide-up">
                            <h2 style={{color: 'var(--text-dark)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px'}}>Rankings Soldados EV (Recrutas)</h2>
                            <div className="row" style={{marginBottom: '20px'}}>
                                <div className="card" style={{flex: 1, border: '2px solid var(--primary)'}}>
                                    <h3>🏆 Geral Soldados EV (Semana + FDS)</h3>
                                    {renderRankingList('geral', 'EV')}
                                </div>
                            </div>
                            <div className="row" style={{marginBottom: '40px'}}>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Preta EV</h3>
                                    {renderRankingList('preta', 'EV')}
                                </div>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Vermelha EV</h3>
                                    {renderRankingList('vermelha', 'EV')}
                                </div>
                            </div>

                            <h2 style={{color: 'var(--text-dark)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px'}}>Rankings Soldados EP (Profissionais)</h2>
                            <div className="row" style={{marginBottom: '20px'}}>
                                <div className="card" style={{flex: 1, border: '2px solid var(--primary)'}}>
                                    <h3>🏆 Geral Soldados EP (Semana + FDS)</h3>
                                    {renderRankingList('geral', 'EP')}
                                </div>
                            </div>
                            <div className="row">
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Preta Soldados EP</h3>
                                    {renderRankingList('preta', 'EP')}
                                </div>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Vermelha Soldados EP</h3>
                                    {renderRankingList('vermelha', 'EP')}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'config' && state && (
                        <div className="tab-config slide-up">
                            <div className="card">
                                <h3>Funções Dinâmicas</h3>
                                <p style={{color:'var(--text-light)'}}>Crie ou altere as funções do serviço e o peso (nível de cansaço). Quem tira funções de peso maior vai para o final da fila (demora mais a tirar serviço de novo).</p>
                                
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nome da Função</th>
                                            <th>Peso</th>
                                            <th>Vagas</th>
                                            <th>Destinado a</th>
                                            <th>Tipo de Serviço</th>
                                            <th>Aptidão</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {state.role_configs && Object.keys(state.role_configs).sort().map(rName => {
                                            const dest = state.role_configs[rName].destinado_a || (rName.includes('EP') ? 'EP' : rName.includes('EV') ? 'EV' : 'AMBOS');
                                            return (
                                                <tr key={rName}>
                                                    <td><strong>{rName}</strong> {isProtegida(rName) && <span style={{fontSize:'10px', color:'var(--danger)'}}>(Fixa)</span>}</td>
                                                    <td>{state.role_configs[rName].weight.toFixed(1)}</td>
                                                    <td>{state.role_configs[rName].required}x</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 8px', 
                                                            borderRadius: '4px', 
                                                            fontSize: '11px', 
                                                            fontWeight: 'bold',
                                                            background: dest === 'EP' ? 'rgba(75, 83, 32, 0.5)' : dest === 'EV' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                                            color: dest === 'EP' ? '#aed581' : dest === 'EV' ? '#90caf9' : 'var(--text-light)',
                                                            border: `1px solid ${dest === 'EP' ? 'rgba(174, 213, 129, 0.4)' : dest === 'EV' ? 'rgba(144, 202, 249, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`
                                                        }}>
                                                            {dest === 'EP' ? 'Cabos/Sd EP' : dest === 'EV' ? 'Soldados EV' : 'Ambos (EP e EV)'}
                                                        </span>
                                                    </td>
                                                    <td>{state.role_configs[rName].service_type || 'Interno'}</td>
                                                    <td>
                                                        <button className="btn-outline btn-sm" onClick={() => abrirAptidaoModal(rName)}>
                                                            Gerenciar Aptidões ({state.role_configs[rName].aptos?.length ? state.role_configs[rName].aptos.length : 'Todos'})
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <div style={{display:'flex', gap:'10px'}}>
                                                            <button onClick={() => abrirEdicaoFuncao(rName)} style={{background:'transparent', color:'var(--primary-color)', padding: 0}} title="Editar Função">
                                                                <Edit2 size={20} />
                                                            </button>
                                                            {!isProtegida(rName) && (
                                                                <button onClick={() => removerFuncao(rName)} style={{background:'transparent', color:'var(--danger)', padding: 0}} title="Excluir Função">
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <h4 style={{marginTop: '20px'}}>Nova Função</h4>
                                <div className="row" style={{alignItems: 'flex-end', background: 'rgba(0,0,0,0.2)', padding:'15px', borderRadius: '8px', border:'1px dashed var(--glass-border)', flexWrap: 'wrap', gap: '15px'}}>
                                    <div className="form-group" style={{flex: 1, minWidth: '150px'}}>
                                        <label>Nome:</label>
                                        <input type="text" className="input-modern" value={newRoleName} onChange={e=>setNewRoleName(e.target.value)}/>
                                    </div>
                                    <div className="form-group" style={{width: '90px'}}>
                                        <label>Peso:</label>
                                        <input type="number" step="0.5" className="input-modern" value={newRoleWeight} onChange={e=>setNewRoleWeight(e.target.value as any)}/>
                                    </div>
                                    <div className="form-group" style={{width: '90px'}}>
                                        <label>Vagas:</label>
                                        <input type="number" className="input-modern" value={newRoleReq} onChange={e=>setNewRoleReq(e.target.value as any)}/>
                                    </div>
                                    <div className="form-group" style={{minWidth: '160px'}}>
                                        <label>Destinado a:</label>
                                        <select className="input-modern" value={newRoleDestinadoA} onChange={e=>setNewRoleDestinadoA(e.target.value)}>
                                            <option value="AMBOS">Ambos (Soldados EP e EV)</option>
                                            <option value="EV">Soldados EV</option>
                                            <option value="EP">Soldados EP</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{width: '120px'}}>
                                        <label>Serviço:</label>
                                        <select className="input-modern" value={newRoleServiceType} onChange={e=>setNewRoleServiceType(e.target.value)}>
                                            <option value="Interno">Interno</option>
                                            <option value="Externo">Externo</option>
                                        </select>
                                    </div>
                                    <button className="btn-success" style={{height: '38px', marginBottom: '15px'}} onClick={adicionarFuncao}><Plus size={16}/> Adicionar</button>
                                </div>
                            </div>

                            <div className="card">
                                <h3>Configurações do Relatório</h3>
                                <div className="form-group">
                                    <label>Comandante / Assinatura:</label>
                                    <input 
                                        type="text" 
                                        className="input-modern" 
                                        value={state.nome_cmt} 
                                        onChange={(e) => {
                                            const ns = {...state}; ns.nome_cmt = e.target.value; setState(ns);
                                        }}
                                        onBlur={() => handleSave(state)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sargenteante:</label>
                                    <input 
                                        type="text" 
                                        className="input-modern" 
                                        value={state.nome_sgte} 
                                        onChange={(e) => {
                                            const ns = {...state}; ns.nome_sgte = e.target.value; setState(ns);
                                        }}
                                        onBlur={() => handleSave(state)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Número do Aditamento Atual:</label>
                                    <input 
                                        type="number" 
                                        className="input-modern" 
                                        value={state.aditamento_nr || 1} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 1;
                                            const ns = {...state, aditamento_nr: val};
                                            setState(ns);
                                            setAditamentoNr(val);
                                        }}
                                        onBlur={() => handleSave(state)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Número do Boletim Interno Atual:</label>
                                    <input 
                                        type="number" 
                                        className="input-modern" 
                                        value={state.boletim_interno_nr || 1} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 1;
                                            const ns = {...state, boletim_interno_nr: val};
                                            setState(ns);
                                            setBoletimNr(String(val));
                                        }}
                                        onBlur={() => handleSave(state)}
                                    />
                                </div>
                            </div>

                            <div className="card">
                                <h3>Backup e Restauração de Dados</h3>
                                <p style={{color: 'var(--text-light)', marginBottom: '15px'}}>
                                    Exporte um arquivo de segurança com todas as escalas, histórico, arranchamentos e configurações para salvar em um pendrive ou computador. Você também pode importar um backup anterior para restaurar todos os dados.
                                </p>
                                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
                                    <button type="button" className="btn-primary" onClick={exportarBackup} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 'bold'}}>
                                        <Download size={18} /> Exportar Backup (.json)
                                    </button>
                                    <button type="button" className="btn-success" onClick={importarBackup} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 'bold'}}>
                                        <Upload size={18} /> Importar Backup (.json)
                                    </button>
                                    <input 
                                        type="file" 
                                        id="backup-file-input" 
                                        accept=".json" 
                                        style={{display: 'none'}} 
                                        onChange={handleFileInputBackup} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    </ErrorBoundary>
                </div>

                {/* MODALS */}
                {dispensaModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '380px'}}>
                            <h3>Adicionar Dispensa</h3>
                            <p style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>{selectedPessoaId}</p>
                            <div className="form-group">
                                <label>Início:</label>
                                <input type="date" className="input-modern" value={dispStart} onChange={e=>setDispStart(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Fim:</label>
                                <input type="date" className="input-modern" value={dispEnd} onChange={e=>setDispEnd(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Motivo da Dispensa:</label>
                                <input 
                                    type="text" 
                                    className="input-modern" 
                                    value={dispMotivo} 
                                    onChange={e=>setDispMotivo(e.target.value)} 
                                    placeholder="Ex: Atestado Médico, Férias, Núpcias..." 
                                />
                                <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px'}}>
                                    {['Atestado Médico', 'Férias', 'Luto', 'Núpcias', 'Missão', 'Dispensa Recompensa', 'Estudo'].map(m => (
                                        <button 
                                            key={m} 
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 6px'}}
                                            onClick={() => setDispMotivo(m)}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="row" style={{marginTop: '20px', justifyContent: 'flex-end', gap: '10px'}}>
                                <button className="btn-outline" onClick={()=>setDispensaModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={adicionarDispensa}>Salvar</button>
                            </div>
                        </div>
                    </div>
                )}

                {editHistModalOpen && editHistData && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '640px', maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                <h3 style={{margin: 0}}>Editar Escala ({editHistData.data})</h3>
                                <button className="icon-btn" onClick={() => setEditHistModalOpen(false)}>✕</button>
                            </div>
                            <p style={{color:'var(--text-light)', fontSize: '13px', marginBottom: '15px'}}>
                                Clique em <strong>"⇄ Substituir"</strong> em qualquer soldado para abrir a lista ordenada pelo mais descansado e registrar o motivo da troca.
                            </p>
                            
                            {/* Identificação do Aditamento */}
                            <div style={{display: 'flex', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)'}}>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '11px', color: 'var(--text-light)', display: 'block', marginBottom: '2px'}}>Aditamento Nr:</label>
                                    <input 
                                        type="number" 
                                        className="input-modern" 
                                        style={{fontSize: '12px', padding: '6px 8px'}}
                                        value={editHistData.aditamento_nr || 1}
                                        onChange={(e) => {
                                            setEditHistData({ ...editHistData, aditamento_nr: parseInt(e.target.value, 10) || 1 });
                                        }}
                                    />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '11px', color: 'var(--text-light)', display: 'block', marginBottom: '2px'}}>Boletim Interno Nr:</label>
                                    <input 
                                        type="number" 
                                        className="input-modern" 
                                        style={{fontSize: '12px', padding: '6px 8px'}}
                                        value={editHistData.boletim_interno_nr || parseInt(editHistData.boletim_nr, 10) || 1}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 1;
                                            setEditHistData({ ...editHistData, boletim_interno_nr: val, boletim_nr: String(val) });
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Funções Manuais (Oficiais / Sargentos / Cabos) se existirem */}
                            {editHistData.manual_roles && Object.keys(editHistData.manual_roles).length > 0 && (
                                <div style={{marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)'}}>
                                    <h4 style={{fontSize: '12px', color: 'var(--success-color)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                                        Funções Manuais (Oficiais / Sargentos / Cabos)
                                    </h4>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px'}}>
                                        {Object.keys(editHistData.manual_roles).map(mr => (
                                            <div key={`hist-manual-${mr}`}>
                                                <label style={{fontSize: '11px', color: 'var(--text-light)', display: 'block', marginBottom: '2px'}}>{mr}:</label>
                                                <input 
                                                    type="text" 
                                                    list="pessoas-list"
                                                    className="input-modern" 
                                                    style={{fontSize: '12px', padding: '6px 8px'}}
                                                    value={editHistData.manual_roles[mr] || ''}
                                                    onChange={(e) => {
                                                        setEditHistData({
                                                            ...editHistData,
                                                            manual_roles: {
                                                                ...editHistData.manual_roles,
                                                                [mr]: e.target.value.toUpperCase()
                                                            }
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Funções dos Soldados EP e EV */}
                            <h4 style={{fontSize: '12px', color: 'var(--primary-color)', margin: '15px 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                                Funções da Escala (Soldados EP / EV)
                            </h4>
                            
                            {Object.keys(editHistData.escalados || {}).map(role => (
                                <div className="form-group" key={role} style={{marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                        <label style={{fontWeight: 'bold', margin: 0, fontSize: '13px'}}>{role}</label>
                                        <span style={{fontSize: '11px', color: 'var(--text-light)'}}>
                                            {state?.role_configs?.[role]?.destinado_a === 'EP' ? 'Soldados EP' : state?.role_configs?.[role]?.destinado_a === 'EV' ? 'Soldados EV' : 'Soldados EP / EV'}
                                        </span>
                                    </div>
                                    
                                    {/* Soldados escalados */}
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                                        {(editHistData.escalados[role] || []).length > 0 ? (
                                            editHistData.escalados[role].map((soldier: string) => (
                                                <div 
                                                    key={soldier} 
                                                    style={{
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px', 
                                                        background: 'rgba(255,255,255,0.08)', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '4px',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}
                                                >
                                                    <span style={{fontWeight: 'bold', fontSize: '13px'}}>{soldier}</span>
                                                    <button 
                                                        type="button" 
                                                        className="btn-outline btn-sm" 
                                                        style={{padding: '2px 6px', fontSize: '11px', borderColor: 'var(--primary-color)', color: 'var(--primary-color)'}}
                                                        title="Substituir pelo soldado mais descansado"
                                                        onClick={() => abrirModalSubstituicao(role, soldier, 'history')}
                                                    >
                                                        ⇄ Substituir
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="icon-btn danger" 
                                                        style={{padding: '2px'}}
                                                        title="Remover da função"
                                                        onClick={() => removerSoldadoRole(role, soldier, 'history')}
                                                    >
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span style={{fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic'}}>Nenhum soldado escalado</span>
                                        )}
                                    </div>

                                    {/* Fallback texto manual */}
                                    <details style={{fontSize: '11px', color: 'var(--text-light)', marginTop: '4px'}}>
                                        <summary style={{cursor: 'pointer'}}>Editar texto manualmente</summary>
                                        <input 
                                            type="text" 
                                            className="input-modern" 
                                            style={{marginTop: '4px', fontSize: '12px'}}
                                            value={editHistData.escalados[role].join(", ")}
                                            onChange={(e) => atualizarEditHistData(role, e.target.value)}
                                            placeholder="IDs separados por vírgula"
                                        />
                                    </details>
                                </div>
                            ))}

                            {/* Histórico de Substituições da Escala */}
                            {editHistData.trocas_registro && editHistData.trocas_registro.length > 0 && (
                                <div style={{marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px'}}>
                                    <h4 style={{fontSize: '13px', color: '#ffa726', margin: '0 0 8px 0'}}>
                                        Substituições Registradas nesta Escala ({editHistData.trocas_registro.length})
                                    </h4>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto'}}>
                                        {editHistData.trocas_registro.map((t: any, idx: number) => (
                                            <div key={idx} style={{fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '4px', borderLeft: '3px solid #ffa726'}}>
                                                <div><strong>{t.funcao}</strong>: <span style={{color: '#ff6b6b'}}>{t.saiu}</span> ➔ <span style={{color: '#4caf50'}}>{t.entrou}</span></div>
                                                <div style={{color: 'var(--text-light)', fontStyle: 'italic'}}>Motivo: {t.motivo} ({t.data_hora})</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="row" style={{marginTop: '20px', justifyContent: 'flex-end', gap: '10px'}}>
                                <button className="btn-outline" onClick={()=>setEditHistModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={salvarEdicaoHistorico}>Salvar Histórico</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE SUBSTITUIÇÃO ORDENADO POR CANSAÇO */}
                {substModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1100}}>
                        <div className="card modal-card" style={{width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary-color)'}}>
                            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0'}}>
                                <span>⇄</span> Substituição de Soldado
                            </h3>
                            
                            <div style={{background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.08)'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px'}}>
                                    <div><strong>Função:</strong> <span style={{color: 'var(--primary-color)'}}>{substRole}</span></div>
                                    <div><strong>Data da Escala:</strong> {substSource === 'preview' ? targetDate : editHistData?.data}</div>
                                    <div style={{gridColumn: '1 / -1'}}>
                                        <strong>Militar a ser Substituído (Sai):</strong>{' '}
                                        <span style={{color: 'var(--danger-color, #ff6b6b)', fontWeight: 'bold'}}>{substMilitarSai}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group" style={{marginBottom: '15px'}}>
                                <label style={{fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Motivo da Substituição / Troca: *</span>
                                    <span style={{fontSize: '11px', color: 'var(--text-light)'}}>Obrigatório para registro</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="input-modern" 
                                    value={substMotivo} 
                                    onChange={e => setSubstMotivo(e.target.value)} 
                                    placeholder="Ex: Atestado médico de 3 dias, Troca autorizada pelo Cmt, etc."
                                />
                                <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px'}}>
                                    {['Atestado Médico', 'Dispensa Recompensa', 'Troca Autorizada', 'Missão Urgente', 'Problema Particular', 'Férias'].map(m => (
                                        <button 
                                            key={m} 
                                            type="button" 
                                            className="btn-outline btn-sm" 
                                            style={{fontSize: '11px', padding: '2px 8px'}}
                                            onClick={() => setSubstMotivo(m)}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span>Selecione o Soldado Substituto (Entra): *</span>
                                    <span style={{fontSize: '11px', color: 'var(--primary-color)'}}>⚡ Ordenado pelo mais descansado</span>
                                </label>
                                <p style={{fontSize: '11px', color: 'var(--text-light)', margin: '2px 0 8px 0'}}>
                                    Apenas soldados aptos para a função, não dispensados nesta data e que não estejam em outra função no mesmo dia. O 1º da lista é o mais descansado.
                                </p>

                                {(() => {
                                    const dataStr = substSource === 'preview' ? targetDate : (editHistData?.data || '');
                                    const candidatos = getCandidatosSubstituicao(substRole, dataStr, substMilitarSai, substSource);

                                    if (candidatos.length === 0) {
                                        return (
                                            <div style={{padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-light)'}}>
                                                Nenhum outro soldado apto disponível encontrado sem duplicidade ou dispensa nesta data.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={{maxHeight: '260px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)'}}>
                                            <table style={{width: '100%', margin: 0, fontSize: '12px'}}>
                                                <thead>
                                                    <tr style={{position: 'sticky', top: 0, background: 'var(--card-bg, #1e1e1e)', zIndex: 1}}>
                                                        <th style={{width: '40px'}}>Sel.</th>
                                                        <th>Posição</th>
                                                        <th>Militar</th>
                                                        <th>Tipo</th>
                                                        <th>Pontos Cansaço</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {candidatos.map(c => {
                                                        const isSelected = substMilitarEntra === c.id;
                                                        return (
                                                            <tr 
                                                                key={c.id} 
                                                                onClick={() => setSubstMilitarEntra(c.id)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    background: isSelected ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                                                                    borderLeft: isSelected ? '3px solid var(--success-color, #4caf50)' : '3px solid transparent'
                                                                }}
                                                            >
                                                                <td style={{textAlign: 'center'}}>
                                                                    <input 
                                                                        type="radio" 
                                                                        name="substMilitar" 
                                                                        checked={isSelected} 
                                                                        onChange={() => setSubstMilitarEntra(c.id)} 
                                                                    />
                                                                </td>
                                                                <td>
                                                                    {c.posicao === 1 ? (
                                                                        <span style={{color: '#4caf50', fontWeight: 'bold'}}>1º (Mais descansado)</span>
                                                                    ) : (
                                                                        <span>{c.posicao}º</span>
                                                                    )}
                                                                </td>
                                                                <td style={{fontWeight: isSelected ? 'bold' : 'normal'}}>{c.id}</td>
                                                                <td><span className="badge-active" style={{fontSize: '10px'}}>{c.tipo}</span></td>
                                                                <td>{c.pontos.toFixed(2)} pts</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="row" style={{marginTop: '20px', justifyContent: 'flex-end', gap: '10px'}}>
                                <button className="btn-outline" onClick={() => setSubstModalOpen(false)}>Cancelar</button>
                                <button 
                                    className="btn-success" 
                                    onClick={confirmarSubstituicao}
                                    disabled={!substMilitarEntra}
                                >
                                    Confirmar Substituição
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE VISUALIZAÇÃO DE TROCAS */}
                {verTrocasModalOpen && verTrocasData && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1100}}>
                        <div className="card modal-card" style={{width: '600px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                <h3 style={{margin: 0}}>Registro de Substituições ({verTrocasData.data})</h3>
                                <button className="icon-btn" onClick={() => setVerTrocasModalOpen(false)}>✕</button>
                            </div>
                            
                            {(!verTrocasData.trocas_registro || verTrocasData.trocas_registro.length === 0) ? (
                                <p style={{color: 'var(--text-light)'}}>Nenhuma substituição registrada para esta escala.</p>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {verTrocasData.trocas_registro.map((t: any, idx: number) => (
                                        <div key={idx} style={{background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #ffa726'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-light)', marginBottom: '5px'}}>
                                                <span><strong>Função:</strong> {t.funcao}</span>
                                                <span>{t.data_hora}</span>
                                            </div>
                                            <div style={{fontSize: '14px', marginBottom: '6px', fontWeight: 'bold'}}>
                                                <span style={{color: '#ff6b6b'}}>{t.saiu}</span>
                                                <span style={{margin: '0 8px', color: 'var(--text-light)'}}>➔</span>
                                                <span style={{color: '#4caf50'}}>{t.entrou}</span>
                                            </div>
                                            <div style={{fontSize: '12px'}}>
                                                <strong>Motivo:</strong> <span style={{fontStyle: 'italic'}}>{t.motivo || 'Não especificado'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="row" style={{marginTop: '20px', justifyContent: 'flex-end'}}>
                                <button className="btn-primary" onClick={() => setVerTrocasModalOpen(false)}>Fechar</button>
                            </div>
                        </div>
                    </div>
                )}

                {editRoleModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '380px'}}>
                            <h3>Editar Função: {editRoleName}</h3>
                            <div className="form-group">
                                <label>Peso (Cansaço):</label>
                                <input type="number" step="0.5" className="input-modern" value={editRoleWeight} onChange={e=>setEditRoleWeight(e.target.value as any)} />
                            </div>
                            <div className="form-group">
                                <label>Qtd Vagas:</label>
                                <input type="number" className="input-modern" value={editRoleReq} onChange={e=>setEditRoleReq(e.target.value as any)} />
                            </div>
                            <div className="form-group">
                                <label>Destinado a (Efetivo):</label>
                                <select className="input-modern" value={editRoleDestinadoA} onChange={e=>setEditRoleDestinadoA(e.target.value)}>
                                    <option value="AMBOS">Ambos (Soldados EP e EV)</option>
                                    <option value="EV">Soldados EV (Efetivo Variável)</option>
                                    <option value="EP">Soldados EP (Profissional)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Serviço:</label>
                                <select className="input-modern" value={editRoleServiceType} onChange={e=>setEditRoleServiceType(e.target.value)}>
                                    <option value="Interno">Interno</option>
                                    <option value="Externo">Externo</option>
                                </select>
                            </div>
                            <div className="row" style={{marginTop: '15px'}}>
                                <button className="btn-outline" onClick={()=>setEditRoleModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={salvarEdicaoFuncao}>Salvar Edição</button>
                            </div>
                        </div>
                    </div>
                )}

                {aptidaoModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '650px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                            <h3>Gerenciar Aptidões: {aptidaoRoleName}</h3>
                            <p style={{color:'var(--text-light)', fontSize: '0.88em', marginBottom: '10px'}}>
                                Destinado a: <strong>{state?.role_configs[aptidaoRoleName]?.destinado_a === 'EP' ? 'Soldados EP' : state?.role_configs[aptidaoRoleName]?.destinado_a === 'EV' ? 'Soldados EV' : 'Ambos (Soldados EP e EV)'}</strong>
                            </p>
                            <p style={{color:'var(--text-light)', fontSize: '0.84em', marginBottom: '15px', background:'rgba(0,0,0,0.2)', padding:'8px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.05)'}}>
                                💡 <strong>Dica:</strong> Se nenhum militar for marcado individualmente, <u>todos</u> os soldados da categoria selecionada são considerados aptos automaticamente.
                            </p>
                            
                            {/* Quick selection bar */}
                            <div style={{display:'flex', gap:'8px', marginBottom:'15px', flexWrap:'wrap'}}>
                                <button 
                                    type="button" 
                                    className="btn-outline btn-sm" 
                                    onClick={() => {
                                        const epList = Object.keys(state?.pessoas || {}).filter(m => isSoldadoEP(m, undefined, state.pessoas));
                                        setAptidaoList(Array.from(new Set([...aptidaoList, ...epList])));
                                    }}
                                >
                                    + Marcar Todos EP
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-outline btn-sm" 
                                    onClick={() => {
                                        const evList = Object.keys(state?.pessoas || {}).filter(m => isSoldadoEV(m, undefined, state.pessoas));
                                        setAptidaoList(Array.from(new Set([...aptidaoList, ...evList])));
                                    }}
                                >
                                    + Marcar Todos EV
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-outline btn-sm" 
                                    onClick={() => setAptidaoList([])}
                                    style={{color:'var(--warning)'}}
                                >
                                    Limpar (Usar Padrão: Todos Aptos)
                                </button>
                            </div>

                            <div style={{display: 'flex', gap: '20px', flex: 1, minHeight:'250px', overflowY: 'hidden'}}>
                                <div style={{flex: 1, border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column'}}>
                                    <h4 style={{marginBottom: '10px', color: '#aed581'}}>Soldados EP ({Object.keys(state?.pessoas || {}).filter(m => isSoldadoEP(m, undefined, state.pessoas)).length})</h4>
                                    <div style={{overflowY: 'auto', flex: 1}}>
                                        {Object.keys(state?.pessoas || {}).filter(m => isSoldadoEP(m, undefined, state.pessoas)).sort().map(m => (
                                            <label key={m} style={{display: 'block', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer'}}>
                                                <input type="checkbox" checked={aptidaoList.includes(m)} onChange={() => toggleAptidao(m)} style={{marginRight: '10px'}} />
                                                {m}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{flex: 1, border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column'}}>
                                    <h4 style={{marginBottom: '10px', color: '#90caf9'}}>Soldados EV ({Object.keys(state?.pessoas || {}).filter(m => isSoldadoEV(m, undefined, state.pessoas)).length})</h4>
                                    <div style={{overflowY: 'auto', flex: 1}}>
                                        {Object.keys(state?.pessoas || {}).filter(m => isSoldadoEV(m, undefined, state.pessoas)).sort().map(m => (
                                            <label key={m} style={{display: 'block', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer'}}>
                                                <input type="checkbox" checked={aptidaoList.includes(m)} onChange={() => toggleAptidao(m)} style={{marginRight: '10px'}} />
                                                {m}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="row" style={{marginTop: '20px'}}>
                                <button className="btn-outline" onClick={()=>setAptidaoModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={salvarAptidao}>Salvar Aptidões</button>
                            </div>
                        </div>
                    </div>
                )}

                {epModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '350px'}}>
                            <h3>Cadastrar Militar</h3>
                            <p style={{fontSize: '0.9em', color:'var(--text-light)'}}>Selecione a patente e digite o nome do militar.</p>
                            
                            <div className="form-group">
                                <label>Posto/Graduação:</label>
                                <select className="input-modern" value={newPostoGrad} onChange={e=>setNewPostoGrad(e.target.value)}>
                                    <option value="Coronel">Coronel</option>
                                    <option value="Tenente Coronel">Tenente Coronel</option>
                                    <option value="Major">Major</option>
                                    <option value="Capitão">Capitão</option>
                                    <option value="1º Tenente">1º Tenente</option>
                                    <option value="2º Tenente">2º Tenente</option>
                                    <option value="Aspirante">Aspirante</option>
                                    <option value="Subtenente">Subtenente</option>
                                    <option value="1º Sargento">1º Sargento</option>
                                    <option value="2º Sargento">2º Sargento</option>
                                    <option value="3º Sargento">3º Sargento</option>
                                    <option value="Cabo">Cabo</option>
                                    <option value="Soldado EP">Soldado EP</option>
                                    <option value="Soldado EV">Soldado EV</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nome de Guerra:</label>
                                <input type="text" className="input-modern" placeholder="Ex: Silva" value={newEPName} onChange={e=>setNewEPName(e.target.value)} />
                            </div>
                            <div className="row" style={{marginTop: '15px'}}>
                                <button className="btn-outline" onClick={()=>setEpModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={adicionarMilitar}>Salvar</button>
                            </div>
                        </div>
                    </div>
                )}
                {editMilitarModalOpen && (
                    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '350px'}}>
                            <h3>Editar Militar</h3>
                            <div className="form-group">
                                <label>Posto/Graduação:</label>
                                <select className="input-modern" value={editMilitarNewPostoGrad} onChange={e=>setEditMilitarNewPostoGrad(e.target.value)}>
                                    <option value="Coronel">Coronel</option>
                                    <option value="Tenente Coronel">Tenente Coronel</option>
                                    <option value="Major">Major</option>
                                    <option value="Capitão">Capitão</option>
                                    <option value="1º Tenente">1º Tenente</option>
                                    <option value="2º Tenente">2º Tenente</option>
                                    <option value="Aspirante">Aspirante</option>
                                    <option value="Subtenente">Subtenente</option>
                                    <option value="1º Sargento">1º Sargento</option>
                                    <option value="2º Sargento">2º Sargento</option>
                                    <option value="3º Sargento">3º Sargento</option>
                                    <option value="Cabo">Cabo</option>
                                    <option value="Soldado EP">Soldado EP</option>
                                    <option value="Soldado EV">Soldado EV</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Nome de Guerra:</label>
                                <input type="text" className="input-modern" placeholder="Ex: Silva" value={editMilitarNewName} onChange={e=>setEditMilitarNewName(e.target.value)} />
                            </div>
                            
                            <div className="row" style={{marginTop: '15px'}}>
                                <button className="btn-outline" onClick={()=>setEditMilitarModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={salvarEdicaoMilitar}>Salvar</button>
                            </div>
                        </div>
                    </div>
                )}
                {dialogOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '400px', textAlign: 'center'}}>
                            <h3 style={{borderBottom: 'none', marginBottom: '15px'}}>{dialogType === 'confirm' ? 'Confirmação' : 'Aviso'}</h3>
                            <p style={{marginBottom: '25px', lineHeight: '1.5'}}>{dialogMessage}</p>
                            <div className="actions row" style={{justifyContent: 'center'}}>
                                {dialogType === 'confirm' && (
                                    <button className="btn-outline" onClick={() => setDialogOpen(false)}>Cancelar</button>
                                )}
                                <button className="btn-primary" onClick={() => {
                                    setDialogOpen(false);
                                    if (dialogType === 'confirm' && dialogOnConfirm) {
                                        dialogOnConfirm();
                                    }
                                }}>OK</button>
                            </div>
                        </div>
                    </div>
                )}

                {punidosModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '400px'}}>
                            <h3>Adicionar Militar Punido</h3>
                            <div className="form-group">
                                <label>Processo / Sindicância (Opcional):</label>
                                <input type="text" className="input-modern" value={punidoForm.proc} onChange={e=>setPunidoForm({...punidoForm, proc: e.target.value})} placeholder="Ex: Sindicância nº 01/26" />
                            </div>
                            <div className="form-group">
                                <label>Graduação e Nome: *</label>
                                <input type="text" className="input-modern" value={punidoForm.nome} onChange={e=>setPunidoForm({...punidoForm, nome: e.target.value})} placeholder="Ex: SD EP FULANO" />
                            </div>
                            <div className="form-group">
                                <label>Tipo de Punição: *</label>
                                <input type="text" className="input-modern" value={punidoForm.tipo} onChange={e=>setPunidoForm({...punidoForm, tipo: e.target.value})} placeholder="Ex: 2 Dias de Prisão" />
                            </div>
                            <div className="form-group row" style={{display: 'flex', gap: '15px'}}>
                                <div style={{flex: 1}}>
                                    <label>Data de Início: *</label>
                                    <input type="text" className="input-modern" value={punidoForm.inicio} onChange={e=>setPunidoForm({...punidoForm, inicio: e.target.value})} placeholder="Ex: 17 Set 26" />
                                </div>
                                <div style={{flex: 1}}>
                                    <label>Data de Término: *</label>
                                    <input type="text" className="input-modern" value={punidoForm.termino} onChange={e=>setPunidoForm({...punidoForm, termino: e.target.value})} placeholder="Ex: 19 Set 26" />
                                </div>
                            </div>
                            <div className="row" style={{marginTop: '20px', justifyContent: 'flex-end', gap: '10px'}}>
                                <button className="btn-outline" onClick={() => setPunidosModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={() => {
                                    if(!punidoForm.nome || !punidoForm.tipo || !punidoForm.inicio || !punidoForm.termino) {
                                        showAlert("Preencha Nome, Tipo, Início e Término!");
                                        return;
                                    }
                                    const novoPunido = {...punidoForm, proc: punidoForm.proc || "-"};
                                    setPunidos([...punidos, novoPunido]);
                                    
                                    // Update JusticaDisciplinaText
                                    const procStr = novoPunido.proc !== "-" ? ` (Ref. ${novoPunido.proc})` : "";
                                    const textoAdicional = `- ${novoPunido.nome}: Cumpre ${novoPunido.tipo}${procStr}, a contar de ${novoPunido.inicio} até ${novoPunido.termino}.`;
                                    
                                    setJusticaDisciplina(prev => {
                                        if (prev === "" || prev === "- Sem Alteração.") return textoAdicional;
                                        return prev + "\n" + textoAdicional;
                                    });
                                    
                                    setPunidoForm({proc: '', nome: '', tipo: '', inicio: '', termino: ''});
                                    setPunidosModalOpen(false);
                                }}>Adicionar Punido</button>
                            </div>
                        </div>
                    </div>
                )}

                {missaoModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '400px'}}>
                            <h3>Adicionar Missão / Escala Extra</h3>
                            <div className="form-group">
                                <label>Nome da Missão (Ex: APOIO AO CB DE DIA):</label>
                                <input type="text" className="input-modern" value={missaoNome} onChange={e=>setMissaoNome(e.target.value)} />
                            </div>
                            <div className="form-group row" style={{display: 'flex', gap: '15px'}}>
                                <div style={{flex: 1}}>
                                    <label>Alvo:</label>
                                    <select className="input-modern" value={missaoTarget} onChange={e=>setMissaoTarget(e.target.value)}>
                                        <option value="EP">EP</option>
                                        <option value="EV">EV</option>
                                    </select>
                                </div>
                                <div style={{flex: 1, display: 'flex', alignItems: 'center', marginTop: '15px'}}>
                                    <label style={{display:'flex', alignItems:'center', cursor:'pointer', gap: '5px'}}>
                                        <input type="checkbox" checked={missaoTodos} onChange={e=>setMissaoTodos(e.target.checked)} />
                                        Todos os {missaoTarget}?
                                    </label>
                                </div>
                            </div>
                            {!missaoTodos && (
                                <div className="form-group">
                                    <label>Quantidade de Militares:</label>
                                    <input type="number" className="input-modern" min={1} value={missaoQtd} onChange={e=>setMissaoQtd(parseInt(e.target.value) || 1)} />
                                    <p style={{fontSize: '0.85em', color: 'var(--text-light)', marginTop: '5px'}}>Os militares serão escolhidos com base no ranqueamento de cansaço.</p>
                                </div>
                            )}
                            <div className="row" style={{marginTop: '20px'}}>
                                <button className="btn-outline" onClick={()=>setMissaoModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={gerarEscalaMissao}>Escalar e Adicionar</button>
                            </div>
                        </div>
                    </div>
                )}

                {palestraModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '400px'}}>
                            <h3>Aviso de Palestra</h3>
                            <div className="form-group">
                                <label>Assunto / Título:</label>
                                <input type="text" className="input-modern" value={palestraAssunto} onChange={e=>setPalestraAssunto(e.target.value)} placeholder="Ex: Uso Ético de Redes Sociais" />
                            </div>
                            <div className="form-group">
                                <label>Data e Hora:</label>
                                <input type="text" className="input-modern" value={palestraDataHora} onChange={e=>setPalestraDataHora(e.target.value)} placeholder="Ex: 22 Jul 26 às 10:00" />
                            </div>
                            <div className="form-group">
                                <label>Local:</label>
                                <input type="text" className="input-modern" value={palestraLocal} onChange={e=>setPalestraLocal(e.target.value)} placeholder="Ex: Auditório" />
                            </div>
                            <div className="form-group">
                                <label>Uniforme:</label>
                                <input type="text" className="input-modern" value={palestraUniforme} onChange={e=>setPalestraUniforme(e.target.value)} placeholder="Ex: 9º B2" />
                            </div>
                            <div className="row" style={{marginTop: '20px'}}>
                                <button className="btn-outline" onClick={()=>setPalestraModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={gerarAvisoPalestra}>Adicionar Texto</button>
                            </div>
                        </div>
                    </div>
                )}

                {formaturaModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '500px'}}>
                            <h3>Treinamento de Formatura</h3>
                            <div className="form-group" style={{display: 'flex', flexDirection: 'column'}}>
                                <label>Texto Base (Edite como quiser):</label>
                                <textarea 
                                    className="input-modern" 
                                    value={formaturaTexto} 
                                    onChange={e=>setFormaturaTexto(e.target.value)}
                                    style={{minHeight: '150px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px'}}
                                />
                            </div>
                            <div className="row" style={{marginTop: '20px'}}>
                                <button className="btn-outline" onClick={()=>setFormaturaModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={gerarAvisoFormatura}>Adicionar Texto</button>
                            </div>
                        </div>
                    </div>
                )}

                {trocarBateriaModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card slide-up" style={{width: '450px', textAlign: 'center'}}>
                            <h3>Trocar de Bateria</h3>
                            <p style={{marginTop: '10px', color: 'var(--text-light)', fontSize: '13px'}}>
                                Bateria atual: <strong>{state.unidade === 'BC' ? 'Bateria de Comando (BC)' : state.unidade === '1BO' ? '1ª Bateria de Obuses (1ª Bia O)' : state.unidade === '2BO' ? '2ª Bateria de Obuses (2ª Bia O)' : state.unidade}</strong>
                            </p>
                            <p style={{color: 'var(--text-light)', fontSize: '12px', marginBottom: '20px'}}>
                                Selecione a Bateria para alternar o ambiente de trabalho:
                            </p>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                <button 
                                    type="button" 
                                    className="btn" 
                                    style={{
                                        background: state.unidade === 'BC' ? '#4b5320' : 'rgba(75, 83, 32, 0.4)', 
                                        color: '#fff', 
                                        padding: '14px', 
                                        fontSize: '1.05em',
                                        border: state.unidade === 'BC' ? '2px solid #8bc34a' : '1px solid rgba(255,255,255,0.1)',
                                        fontWeight: state.unidade === 'BC' ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }} 
                                    onClick={() => trocarBateria('BC')}
                                >
                                    Bateria de Comando (BC) {state.unidade === 'BC' && '✓ (Atual)'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn" 
                                    style={{
                                        background: state.unidade === '1BO' ? '#b71c1c' : 'rgba(183, 28, 28, 0.4)', 
                                        color: '#fff', 
                                        padding: '14px', 
                                        fontSize: '1.05em',
                                        border: state.unidade === '1BO' ? '2px solid #ff5252' : '1px solid rgba(255,255,255,0.1)',
                                        fontWeight: state.unidade === '1BO' ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }} 
                                    onClick={() => trocarBateria('1BO')}
                                >
                                    1ª Bateria de Obuses (1ª Bia O) {state.unidade === '1BO' && '✓ (Atual)'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn" 
                                    style={{
                                        background: state.unidade === '2BO' ? '#111111' : 'rgba(17, 17, 17, 0.4)', 
                                        color: '#fff', 
                                        padding: '14px', 
                                        fontSize: '1.05em',
                                        border: state.unidade === '2BO' ? '2px solid #90a4ae' : '1px solid rgba(255,255,255,0.1)',
                                        fontWeight: state.unidade === '2BO' ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }} 
                                    onClick={() => trocarBateria('2BO')}
                                >
                                    2ª Bateria de Obuses (2ª Bia O) {state.unidade === '2BO' && '✓ (Atual)'}
                                </button>
                            </div>

                            <div className="row" style={{marginTop: '20px', justifyContent: 'center'}}>
                                <button type="button" className="btn-outline" onClick={() => setTrocarBateriaModalOpen(false)}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

export default App;
