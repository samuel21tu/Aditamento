import { useState, useEffect } from 'react';
import { Calendar, Users, ClipboardList, Settings, Trophy, FileText, CheckCircle2, Plus, Trash2, Edit2, Check, Download, Printer, Upload } from 'lucide-react';
import './App.css';
import { GenerateSchedule, GenerateDocumentHTML, GetState, SaveState } from '../wailsjs/go/main/App';
// @ts-ignore
import brasaoImg from './assets/brasao.png';

const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

const printHtmlDocument = (html: string) => {
    const existingContainer = document.getElementById('print-container');
    if (existingContainer) existingContainer.remove();
    
    const existingStyle = document.getElementById('print-style-override');
    if (existingStyle) existingStyle.remove();

    const printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    printContainer.innerHTML = html;
    document.body.appendChild(printContainer);

    const style = document.createElement('style');
    style.id = 'print-style-override';
    style.innerHTML = `
        @media print {
            html, body {
                height: auto !important;
                overflow: visible !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            body > *:not(#print-container):not(#print-style-override) {
                display: none !important;
            }
            #print-container {
                display: block !important;
            }
            /* CSS Reset for print container to prevent dark mode leaking */
            #print-container, #print-container * {
                color: black !important;
            }
            #print-container table {
                border-spacing: 0 !important;
            }
            #print-container th, #print-container td {
                background-color: transparent;
                text-transform: none;
            }
        }
        @media screen {
            #print-container {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        window.print();
        
        const afterPrintHandler = () => {
            const pc = document.getElementById('print-container');
            if (pc) pc.remove();
            const ps = document.getElementById('print-style-override');
            if (ps) ps.remove();
            window.removeEventListener('afterprint', afterPrintHandler);
        };
        window.addEventListener('afterprint', afterPrintHandler);
    }, 500);
};

function App() {
    const [activeTab, setActiveTab] = useState('gerador');
    const [state, setState] = useState<any>(null);
    const [targetDate, setTargetDate] = useState(getTomorrow());
    const [schedulePreview, setSchedulePreview] = useState<any>(null);

    const [boletimNr, setBoletimNr] = useState('');
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
    const [newPostoGrad, setNewPostoGrad] = useState('Cabo/Soldado EP');

    // Dispensas
    const [dispensaModalOpen, setDispensaModalOpen] = useState(false);
    const [selectedPessoaId, setSelectedPessoaId] = useState('');
    const [dispStart, setDispStart] = useState('');
    const [dispEnd, setDispEnd] = useState('');

    // Histórico Edit
    const [editHistModalOpen, setEditHistModalOpen] = useState(false);
    const [editHistIndex, setEditHistIndex] = useState(-1);
    const [editHistData, setEditHistData] = useState<any>(null);

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
                root.style.setProperty('--primary', '#37474f');
                root.style.setProperty('--primary-hover', '#455a64');
                root.style.setProperty('--glass-border', 'rgba(69, 90, 100, 0.6)');
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
            setState(data);
            
            // @ts-ignore
            const todos = await window.go.main.App.GetAllMilitares();
            setAllMilitares(todos || []);

            if (data?.role_configs) {
                setEnabledRoles(Object.keys(data.role_configs));
            }
            if (data) {
                setAditamentoNr(data.aditamento_nr || 1);
                setBoletimNr(data.boletim_interno_nr ? String(data.boletim_interno_nr) : "");
            }
        } catch (err) {
            console.error("Error loading state", err);
        }
    };

    const handleInitialize = async (unidade: string) => {
        try {
            // @ts-ignore
            const newState = await window.go.main.App.InitializeState(unidade);
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

    const confirmarEscala = async () => {
        if (!schedulePreview || !state) return;
        const newState = { ...state };
        const finalSchedule = { ...schedulePreview };
        finalSchedule.manual_roles = manualRoles;
        finalSchedule.boletim_nr = boletimNr;
        finalSchedule.aditamento_nr = aditamentoNr; // Save current aditamentoNr
        finalSchedule.instrucao_nome = instrucaoNome;
        finalSchedule.instrucao_horario = instrucaoHorario;
        finalSchedule.instrucao_fardamento = instrucaoFardamento;
        finalSchedule.assuntos_gerais_text = assuntosGerais;
        finalSchedule.assuntos_admin_text = assuntosAdmin;
        finalSchedule.atividade_tipo = atividadeTipo;
        finalSchedule.parada_diaria = paradaDiaria;
        finalSchedule.justica_disciplina_text = justicaDisciplina;

        newState.historico_escalas = [...(newState.historico_escalas || []), finalSchedule];
        
        // Save the manual aditamento_nr so it persists for the next scale if user wants to group
        newState.aditamento_nr = aditamentoNr;
        
        await handleSave(newState);
        showAlert("Escala confirmada e salva no histórico! (Mantenha o mesmo Aditamento Nr. se quiser juntar com a próxima)");
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
                itemsToPrint = state.historico_escalas.filter((i: any) => i.aditamento_nr === preview.aditamento_nr && i.boletim_interno_nr === preview.boletim_interno_nr);
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
                itemsToPrint = state.historico_escalas.filter((i: any) => i.aditamento_nr === preview.aditamento_nr && i.boletim_interno_nr === preview.boletim_interno_nr);
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
        return {
            ...schedulePreview,
            aditamento_nr: aditamentoNr,
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

    const abrirEdicaoHistorico = (h: any, index: number) => {
        setEditHistIndex(index);
        setEditHistData(JSON.parse(JSON.stringify(h)));
        setEditHistModalOpen(true);
    };

    const salvarEdicaoHistorico = async () => {
        const newState = { ...state };
        newState.historico_escalas[editHistIndex] = editHistData;
        await handleSave(newState);
        setEditHistModalOpen(false);
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
        newState.dispensas_v2[selectedPessoaId].push({ inicio: dispStart, fim: dispEnd });
        await handleSave(newState);
        setDispensaModalOpen(false);
        setDispStart('');
        setDispEnd('');
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
            is_ep: newPostoGrad !== 'Soldado EV',
            posto_grad: newPostoGrad
        };
        await handleSave(newState);
        setEpModalOpen(false);
        setNewEPName('');
        setNewPostoGrad('Cabo/Soldado EP');
    };

    const removerPessoa = async (id: string) => {
        if (!state) return;
        showConfirm(`Deseja remover ${id}?`, async () => {
            const newState = { ...state };
            delete newState.pessoas[id];
            await handleSave(newState);
        });
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
                const isEP = p.is_ep || false;
                if (missaoTarget === 'EP' && !isEP) return false;
                if (missaoTarget === 'EV' && isEP) return false;

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
        if (type === 'preta') mapPts = scoresData.pontos_preta;
        else if (type === 'vermelha') mapPts = scoresData.pontos_vermelha;
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
                const isEP = p.is_ep || false;
                return (group === 'EP') ? isEP : !isEP;
            })
            .sort((a, b) => mapPts[a] - mapPts[b]);

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
                        <tr><td colSpan={3} style={{textAlign: 'center'}}>Nenhum militar</td></tr>
                    )}
                    {sortedPessoas.map((id, index) => (
                        <tr key={id} className={state.pessoas[id]?.ativo ? '' : 'inactive-row'} style={{opacity: state.pessoas[id]?.ativo ? 1 : 0.5}}>
                            <td><strong>{index + 1}º</strong></td>
                            <td>{id} {!state.pessoas[id]?.ativo ? '(Baixado)' : (state.pessoas[id]?.apenas_semana ? '(Plantão Sem)' : '')}</td>
                            <td>{mapPts[id]?.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const carregarArranchamentoData = (dateStr: string) => {
        if (!state) return;
        const savedArr = state.historico_arranchamentos?.find((a: any) => a.data === dateStr);
        if (savedArr && savedArr.refeicoes) {
            setArranchados(savedArr.refeicoes);
            return;
        }

        const escala = state.historico_escalas?.find((e: any) => e.data === dateStr);
        if (escala) {
            let names: string[] = [];
            Object.values(escala.escalados || {}).forEach((list: any) => {
                names.push(...list);
            });
            Object.values(escala.manual_roles || {}).forEach((val: any) => {
                if (val.trim() !== "") names.push(val.trim());
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
            const current = prev[nome] || { c: false, a: false, j: false };
            const updated = { ...current, [meal]: !current[meal] };
            return { ...prev, [nome]: updated };
        });
    };

    const toggleArranchadoAll = (nome: string, checked?: boolean) => {
        setArranchados(prev => {
            const current = prev[nome] || { c: false, a: false, j: false };
            const isAll = current.c && current.a && current.j;
            const targetVal = checked !== undefined ? checked : !isAll;
            return {
                ...prev,
                [nome]: { c: targetVal, a: targetVal, j: targetVal }
            };
        });
    };

    const toggleArrancharTodos = (checked?: boolean) => {
        if (!state) return;
        const keys = Object.keys(state.pessoas);
        const isAllSelected = keys.length > 0 && keys.every(id => {
            const r = arranchados[id];
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
                <h4 style={{color: 'var(--primary-color)'}}>{title}</h4>
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
                                        <button className="btn-outline btn-sm" onClick={() => { setSelectedPessoaId(id); setDispensaModalOpen(true); }} disabled={p.foi_de_rota}>+ Dispensa</button>
                                        {!p.foi_de_rota && (
                                            <button className="btn-danger btn-sm" onClick={() => togglePessoaAtributo(id, 'foi_de_rota')} style={{padding: '4px 8px', fontSize: '11px'}} title="Marcar como 'Foi de Rota' (Irreversível)">Rota</button>
                                        )}
                                    </div>
                                    {state?.dispensas_v2?.[id]?.map((d: any, idx: number) => (
                                        <div key={idx} style={{fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px', marginBottom: '2px', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                            <span>{d.inicio} a {d.fim}</span>
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
                        <button className="btn" style={{background: '#37474f', color: '#fff', padding: '15px', fontSize: '1.1em'}} onClick={() => handleInitialize('2BO')}>2ª Bateria de Obuses (2ª Bia O)</button>
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
                    <div className="date-display">{new Date().toLocaleDateString('pt-BR')}</div>
                </header>

                <div className="content-area" style={{position: 'relative'}}>
                    {activeTab === 'gerador' && state && (
                        <div className="tab-gerador slide-up">
                            <datalist id="pessoas-list">
                                {Object.keys(state.pessoas).sort().map(id => (
                                    <option key={id} value={id} />
                                ))}
                            </datalist>
                            <h2 style={{ color: '#a3b18a', marginTop: '10px', marginBottom: '20px', textTransform: 'capitalize', paddingLeft: '5px' }}>
                                {new Date(targetDate + "T00:00:00").toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h2>
                            <div className="gerador-grid">
                            <div className="card">
                                <h3>1. Configurar Serviço</h3>
                                
                                <p style={{marginTop:'15px', marginBottom:'5px', color:'var(--text-light)', fontWeight: 'bold'}}>Selecione as funções que precisam ser preenchidas:</p>
                                <div className="checkbox-group">
                                    {state.role_configs && Object.keys(state.role_configs).map(rName => (
                                        <label key={rName}>
                                            <input 
                                                type="checkbox" 
                                                checked={enabledRoles.includes(rName)} 
                                                onChange={(e) => setRoleEnabled(rName, e.target.checked)}
                                            /> 
                                            {rName} ({state.role_configs[rName].required}x)
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="card">
                                <h3>2. Dados Manuais do Aditamento</h3>
                                <div className="form-group row" style={{display: 'flex', gap: '20px'}}>
                                    <div style={{flex: 1}}>
                                        <label>Aditamento Nr:</label>
                                        <input type="number" value={aditamentoNr} onChange={(e) => setAditamentoNr(parseInt(e.target.value) || 1)} placeholder="Ex: 8" className="input-modern"/>
                                    </div>
                                    <div style={{flex: 1}}>
                                        <label>Boletim Interno Nr:</label>
                                        <input type="text" value={boletimNr} onChange={(e) => setBoletimNr(e.target.value)} placeholder="Ex: 2/2026" className="input-modern"/>
                                    </div>
                                </div>
                                <p style={{marginTop:'10px', fontSize:'0.9em', color:'var(--text-light)'}}>Preencha os dados dos serviços manuais (Formato: Posto/Grad | Nome):</p>
                                {Object.keys(manualRoles).map(mr => (
                                    <div className="form-group" key={mr}>
                                        <label>{mr}</label>
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
                                            placeholder={`Pesquise o nome do militar...`}
                                            className="input-modern"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="card">
                                <h3>3. Instrução (Opcional)</h3>
                                <p style={{marginBottom:'10px', fontSize:'0.9em', color:'var(--text-light)'}}>Preencha se houver instrução prevista na 2ª Parte. Caso contrário, sairá como "Sem Alteração".</p>
                                
                                <div className="form-group row">
                                    <label>Instrução:</label>
                                    <input type="text" value={instrucaoNome} onChange={(e) => setInstrucaoNome(e.target.value)} placeholder="Ex: TFM / Armamento / etc" className="input-modern"/>
                                </div>
                                <div className="form-group row" style={{display: 'flex', gap: '20px'}}>
                                    <div style={{flex: 1}}>
                                        <label>Horário:</label>
                                        <input type="text" value={instrucaoHorario} onChange={(e) => setInstrucaoHorario(e.target.value)} placeholder="Ex: 08:00 às 10:00" className="input-modern"/>
                                    </div>
                                    <div style={{flex: 1}}>
                                        <label>Fardamento:</label>
                                        <input type="text" value={instrucaoFardamento} onChange={(e) => setInstrucaoFardamento(e.target.value)} placeholder="Ex: 9º B2 / 14º" className="input-modern"/>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3>4. Assuntos Gerais e Administrativos (Opcional)</h3>
                                <p style={{marginBottom:'10px', fontSize:'0.9em', color:'var(--text-light)'}}>Preencha os campos abaixo. O que ficar em branco será substituído por "- Sem Alteração." e/ou o cabeçalho padrão de Expediente.</p>
                                <div style={{display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap'}}>
                                    <button className="btn-outline btn-sm" onClick={() => setMissaoModalOpen(true)}>+ Adicionar Missão / Escala Extra</button>
                                    <button className="btn-outline btn-sm" onClick={() => setPalestraModalOpen(true)}>+ Aviso de Palestra</button>
                                    <button className="btn-outline btn-sm" onClick={() => setFormaturaModalOpen(true)}>+ Treinamento de Formatura</button>
                                </div>
                                
                                <div className="form-group row" style={{display: 'flex', flexDirection: 'column'}}>
                                    <label>1. Assuntos Gerais:</label>
                                    <textarea 
                                        value={assuntosGerais} 
                                        onChange={(e) => setAssuntosGerais(e.target.value)} 
                                        placeholder="Ex: - MILITARES SOBRE AVISO...&#10;- APOIO AO CB DE DIA..." 
                                        className="input-modern"
                                        style={{minHeight: '80px', resize: 'vertical'}}
                                    />
                                </div>

                                <div className="form-group row" style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                    <label>2. Assuntos Administrativos:</label>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '5px'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                            <span style={{fontSize: '0.85em', color: 'var(--text-light)'}}>Atividade:</span>
                                            <select 
                                                className="input-modern" 
                                                value={atividadeTipo} 
                                                onChange={(e) => setAtividadeTipo(e.target.value)}
                                                style={{padding: '5px 10px', fontSize: '0.85em', width: 'auto'}}
                                            >
                                                <option value="TFM">TFM</option>
                                                <option value="FAXINA">Faxina</option>
                                                <option value="SEÇÃO">Seção</option>
                                                <option value="SEM EXPEDIENTE">Sem Expediente</option>
                                                <option value="PERSONALIZADO">Personalizado (em branco)</option>
                                            </select>
                                        </div>

                                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                            <span style={{fontSize: '0.85em', color: 'var(--text-light)'}}>Parada Diária:</span>
                                            <select 
                                                className="input-modern" 
                                                value={paradaDiaria} 
                                                onChange={(e) => setParadaDiaria(e.target.value)}
                                                style={{padding: '5px 10px', fontSize: '0.85em', width: 'auto'}}
                                            >
                                                <option value="09h30">09h30</option>
                                                <option value="07h30">07h30</option>
                                                <option value="Personalizado">Personalizado (em branco)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={assuntosAdmin} 
                                        onChange={(e) => setAssuntosAdmin(e.target.value)} 
                                        placeholder={`Deixe em branco para manter o formato padrão de Início de Expediente e ${atividadeTipo}.`} 
                                        className="input-modern"
                                        style={{minHeight: '100px', resize: 'vertical'}}
                                    />
                                </div>
                            </div>

                            <div className="card span-full">
                                <h3>5. Justiça e Disciplina (Opcional)</h3>
                                <p style={{marginBottom:'10px', fontSize:'0.9em', color:'var(--text-light)'}}>Preencha os campos abaixo. O que ficar em branco será substituído por "- Sem Alteração.".</p>
                                
                                <div className="form-group row" style={{display: 'flex', flexDirection: 'column'}}>
                                    <textarea 
                                        value={justicaDisciplina} 
                                        onChange={(e) => setJusticaDisciplina(e.target.value)} 
                                        placeholder="Ex: - SD EP 123 SILVA: Punido com 2 dias de impedimento..." 
                                        className="input-modern"
                                        style={{minHeight: '80px', resize: 'vertical'}}
                                    />
                                </div>
                            </div>
                            </div>
                            
                            <div className="actions card row">
                                <button className="btn-primary" onClick={gerarPrevia}><Calendar size={18}/> GERAR PRÉVIA</button>
                            </div>

                            {schedulePreview && (
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
                                                <p>{schedulePreview.escalados[role]?.length > 0 ? schedulePreview.escalados[role].join(" - ") : "Nenhum"}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="actions row" style={{justifyContent: 'center', marginTop: '20px'}}>
                                        <button className="btn-success" onClick={confirmarEscala}><Check size={18}/> Confirmar e Salvar no Histórico</button>
                                    </div>
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
                                        const militarKeys = Object.keys(state.pessoas);
                                        const todosArranchadosTudo = militarKeys.length > 0 && militarKeys.every(id => {
                                            const r = arranchados[id];
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
                                                        const r = arranchados[id] || { c: false, a: false, j: false };
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
                                                                    <input type="checkbox" checked={r.c} onChange={() => toggleArranchadoMeal(id, 'c')} /> C
                                                                </label>
                                                                <label style={{marginRight: '15px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                                                                    <input type="checkbox" checked={r.a} onChange={() => toggleArranchadoMeal(id, 'a')} /> A
                                                                </label>
                                                                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                                                                    <input type="checkbox" checked={r.j} onChange={() => toggleArranchadoMeal(id, 'j')} /> J
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
                                {state.historico_arranchamentos?.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Quantidade</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...state.historico_arranchamentos].reverse().map((h: any, reversedIndex: number) => {
                                                const i = state.historico_arranchamentos.length - 1 - reversedIndex;
                                                return (
                                                    <tr key={i}>
                                                        <td>{h.data}</td>
                                                        <td>{Object.keys(h.refeicoes || {}).filter(k => h.refeicoes[k].c || h.refeicoes[k].a || h.refeicoes[k].j).length} militares</td>
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
                                {state.historico_escalas?.length > 0 ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Dia (Semana)</th>
                                                <th>Funções Cobertas</th>
                                                <th>Vermelha?</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...state.historico_escalas].reverse().map((h: any, reversedIndex: number) => {
                                                const i = state.historico_escalas.length - 1 - reversedIndex;
                                                const rolesCovered = Object.keys(h.escalados || {}).join(", ");
                                                return (
                                                    <tr key={i}>
                                                        <td>{h.data}</td>
                                                        <td>{['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(h.data).getDay() + 1] || h.dia_semana}</td>
                                                        <td style={{fontSize:'0.85em'}}>{rolesCovered || 'Legado (Guarda/Plantão)'}</td>
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
                            <h2 style={{color: 'var(--primary-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px'}}>Rankings EP (Profissionais)</h2>
                            <div className="row" style={{marginBottom: '20px'}}>
                                <div className="card" style={{flex: 1, border: '2px solid var(--primary-color)'}}>
                                    <h3>🏆 Geral EP (Semana + FDS)</h3>
                                    {renderRankingList('geral', 'EP')}
                                </div>
                            </div>
                            <div className="row" style={{marginBottom: '40px'}}>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Preta EP</h3>
                                    {renderRankingList('preta', 'EP')}
                                </div>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Vermelha EP</h3>
                                    {renderRankingList('vermelha', 'EP')}
                                </div>
                            </div>

                            <h2 style={{color: 'var(--primary-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px'}}>Rankings EV (Recrutas)</h2>
                            <div className="row" style={{marginBottom: '20px'}}>
                                <div className="card" style={{flex: 1, border: '2px solid var(--primary-color)'}}>
                                    <h3>🏆 Geral EV (Semana + FDS)</h3>
                                    {renderRankingList('geral', 'EV')}
                                </div>
                            </div>
                            <div className="row">
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Preta EV</h3>
                                    {renderRankingList('preta', 'EV')}
                                </div>
                                <div className="card" style={{flex: 1}}>
                                    <h3>Escala Vermelha EV</h3>
                                    {renderRankingList('vermelha', 'EV')}
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
                                            <option value="AMBOS">Ambos (EP e EV)</option>
                                            <option value="EV">Soldados EV</option>
                                            <option value="EP">Cabos e Soldados EP</option>
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
                                        value={state.aditamento_nr || 0} 
                                        onChange={(e) => {
                                            const ns = {...state}; ns.aditamento_nr = parseInt(e.target.value) || 0; setState(ns);
                                        }}
                                        onBlur={() => handleSave(state)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Número do Boletim Interno Atual:</label>
                                    <input 
                                        type="number" 
                                        className="input-modern" 
                                        value={state.boletim_interno_nr || 0} 
                                        onChange={(e) => {
                                            const ns = {...state}; ns.boletim_interno_nr = parseInt(e.target.value) || 0; setState(ns);
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
                </div>

                {/* MODALS */}
                {dispensaModalOpen && (
                    <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '350px'}}>
                            <h3>Adicionar Dispensa</h3>
                            <p>Militar ID: {selectedPessoaId}</p>
                            <div className="form-group">
                                <label>Início:</label>
                                <input type="date" className="input-modern" value={dispStart} onChange={e=>setDispStart(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Fim:</label>
                                <input type="date" className="input-modern" value={dispEnd} onChange={e=>setDispEnd(e.target.value)} />
                            </div>
                            <div className="row" style={{marginTop: '15px'}}>
                                <button className="btn-outline" onClick={()=>setDispensaModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={adicionarDispensa}>Salvar</button>
                            </div>
                        </div>
                    </div>
                )}

                {editHistModalOpen && editHistData && (
                    <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '500px', maxHeight: '80vh', overflowY: 'auto'}}>
                            <h3>Editar Histórico ({editHistData.data})</h3>
                            <p style={{color:'var(--text-light)'}}>Altere os IDs separados por vírgula se precisar corrigir quem tirou o serviço (ex: militar doente foi substituído).</p>
                            
                            {Object.keys(editHistData.escalados || {}).map(role => (
                                <div className="form-group" key={role}>
                                    <label>{role}</label>
                                    <input 
                                        type="text" 
                                        className="input-modern" 
                                        value={editHistData.escalados[role].join(", ")}
                                        onChange={(e) => atualizarEditHistData(role, e.target.value)}
                                    />
                                </div>
                            ))}

                            <div className="row" style={{marginTop: '20px'}}>
                                <button className="btn-outline" onClick={()=>setEditHistModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={salvarEdicaoHistorico}>Salvar Histórico</button>
                            </div>
                        </div>
                    </div>
                )}

                {editRoleModalOpen && (
                    <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                                    <option value="AMBOS">Ambos (EP e EV)</option>
                                    <option value="EV">Soldados EV (Efetivo Variável)</option>
                                    <option value="EP">Cabos e Soldados EP (Profissional)</option>
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
                    <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
                        <div className="card modal-card" style={{width: '650px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                            <h3>Gerenciar Aptidões: {aptidaoRoleName}</h3>
                            <p style={{color:'var(--text-light)', fontSize: '0.88em', marginBottom: '10px'}}>
                                Destinado a: <strong>{state?.role_configs[aptidaoRoleName]?.destinado_a === 'EP' ? 'Cabos / Soldados EP' : state?.role_configs[aptidaoRoleName]?.destinado_a === 'EV' ? 'Soldados EV' : 'Ambos (EP e EV)'}</strong>
                            </p>
                            <p style={{color:'var(--text-light)', fontSize: '0.84em', marginBottom: '15px', background:'rgba(0,0,0,0.2)', padding:'8px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.05)'}}>
                                💡 <strong>Dica:</strong> Se nenhum militar for marcado individualmente, <u>todos</u> os militares da categoria selecionada são considerados aptos automaticamente.
                            </p>
                            
                            {/* Quick selection bar */}
                            <div style={{display:'flex', gap:'8px', marginBottom:'15px', flexWrap:'wrap'}}>
                                <button 
                                    type="button" 
                                    className="btn-outline btn-sm" 
                                    onClick={() => {
                                        const epList = Object.keys(state?.pessoas || {}).filter(m => state?.pessoas[m].posto_grad === "Soldado EP" || state?.pessoas[m].posto_grad === "Cabo" || state?.pessoas[m].is_ep);
                                        setAptidaoList(Array.from(new Set([...aptidaoList, ...epList])));
                                    }}
                                >
                                    + Marcar Todos EP
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-outline btn-sm" 
                                    onClick={() => {
                                        const evList = Object.keys(state?.pessoas || {}).filter(m => state?.pessoas[m].posto_grad === "Soldado EV" || (!state?.pessoas[m].is_ep && state?.pessoas[m].posto_grad !== "Cabo"));
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
                                    <h4 style={{marginBottom: '10px', color: '#aed581'}}>Cabos / Soldados EP</h4>
                                    <div style={{overflowY: 'auto', flex: 1}}>
                                        {Object.keys(state?.pessoas || {}).filter(m => state?.pessoas[m].posto_grad === "Soldado EP" || state?.pessoas[m].posto_grad === "Cabo" || state?.pessoas[m].is_ep).map(m => (
                                            <label key={m} style={{display: 'block', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer'}}>
                                                <input type="checkbox" checked={aptidaoList.includes(m)} onChange={() => toggleAptidao(m)} style={{marginRight: '10px'}} />
                                                {m}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{flex: 1, border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column'}}>
                                    <h4 style={{marginBottom: '10px', color: '#90caf9'}}>Soldados EV</h4>
                                    <div style={{overflowY: 'auto', flex: 1}}>
                                        {Object.keys(state?.pessoas || {}).filter(m => state?.pessoas[m].posto_grad === "Soldado EV" || (!state?.pessoas[m].is_ep && state?.pessoas[m].posto_grad !== "Cabo" && !state?.pessoas[m].posto_grad?.includes('Sgt'))).map(m => (
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
                    <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                                    <option value="Soldado EV">Soldado EV (Recruta)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nome (Identificação):</label>
                                <input type="text" className="input-modern" value={newEPName} onChange={e=>setNewEPName(e.target.value)} placeholder="Ex: SD EP SILVA" />
                            </div>
                            <div className="row" style={{marginTop: '15px'}}>
                                <button className="btn-outline" onClick={()=>setEpModalOpen(false)}>Cancelar</button>
                                <button className="btn-success" onClick={adicionarMilitar}>Salvar</button>
                            </div>
                        </div>
                    </div>
                )}

                {dialogOpen && (
                    <div className="modal-overlay fade-in" style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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

                {missaoModalOpen && (
                    <div className="modal-overlay fade-in" style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                    <div className="modal-overlay fade-in" style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                    <div className="modal-overlay fade-in" style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                    <div className="modal-overlay fade-in" style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
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
                                        background: state.unidade === '2BO' ? '#37474f' : 'rgba(55, 71, 79, 0.4)', 
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
